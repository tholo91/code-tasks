import type { Octokit } from 'octokit'
import type { Task } from '../../types/task'
import { recoverOctokit } from './octokit-provider'
import { useSyncStore } from '../../stores/useSyncStore'
import { buildFileContent, buildFullFileContent, parseTasksFromMarkdown, appendAgentFrontDoor } from '../../features/sync/utils/markdown-templates'
import { generateUUID } from '../../utils/uuid'
import { buildMergedTaskList } from '../../utils/task-diff'

const MAX_CONFLICT_RETRIES = 3
const DEFAULT_MAX_RETRIES = 2

/** Encode a UTF-8 string to base64 (handles non-ASCII like Umlauts correctly) */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/** Decode a base64 string back to UTF-8 (handles non-ASCII like Umlauts correctly) */
function base64ToUtf8(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}
const BASE_RETRY_DELAY_MS = 600

/**
 * Returns the user-scoped file name for captured ideas.
 * Each user gets their own file to prevent merge conflicts in shared repos.
 * Format: `captured-ideas-{username}.md`
 */
export function getScopedFileName(username: string): string {
  return `captured-ideas-${username}.md`
}

interface FileContent {
  content: string
  sha: string
}

export type SyncErrorType = 'branch-protection' | 'auth' | 'network' | 'unknown'

export interface RawSyncError {
  status: number | null
  message: string
}

export interface SyncResult {
  syncedCount: number
  error?: string
  errorType?: SyncErrorType
  rawError?: RawSyncError
  status?: 'conflict'
  remoteSha?: string | null
}

export interface RemoteTasksResult {
  tasks: Task[]
  sha: string | null
  error?: string
}

export interface SyncOptions {
  allowConflict?: boolean
  maxRetries?: number
  branch?: string
  skipCi?: boolean
}

export interface SyncRepoInput extends SyncOptions {
  repoFullName: string
  reason: 'capture' | 'debounce' | 'background' | 'repo-switch' | 'reconnect' | 'resume' | 'retry'
}

const repoSyncFlights = new Map<string, Promise<SyncResult>>()

export function syncRepo({ repoFullName, reason, ...options }: SyncRepoInput): Promise<SyncResult> {
  void reason
  const key = repoFullName.toLowerCase()
  const current = repoSyncFlights.get(key)
  if (current) return current
  const flight = syncAllRepoTasksForRepo(repoFullName, options).finally(() => {
    repoSyncFlights.delete(key)
  })
  repoSyncFlights.set(key, flight)
  return flight
}

/**
 * Fetches the captured-ideas file from the selected repo.
 * Returns null if the file doesn't exist yet.
 */
async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<FileContent | null> {
  try {
    const params: { owner: string; repo: string; path: string; ref?: string } = {
      owner,
      repo,
      path,
    }
    if (ref) params.ref = ref
    const { data } = await octokit.rest.repos.getContent(params)

    if ('content' in data && 'sha' in data) {
      const content = base64ToUtf8(data.content.replace(/\n/g, ''))
      return { content, sha: data.sha }
    }

    return null
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      return null
    }
    throw err
  }
}

/**
 * Creates or updates the captured-ideas file with appended tasks.
 * Uses the Atomic Commit (Get-Modify-Set) pattern to prevent data loss.
 * Injects the AI-Ready header if the file is new or lacks it.
 */
async function commitTasks(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  tasks: Task[],
  username: string,
  pendingCount?: number,
  branch?: string,
  skipCi?: boolean,
  syncBranch?: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
    const existing = await getFileContent(octokit, owner, repo, filePath, branch)

    const updatedContent = buildFileContent(
      existing?.content ?? null,
      tasks,
      username,
      syncBranch,
    )
    const sha = existing?.sha

    try {
      const commitParams: {
        owner: string
        repo: string
        path: string
        message: string
        content: string
        sha?: string
        branch?: string
      } = {
        owner,
        repo,
        path: filePath,
        message: `sync: update ${pendingCount ?? tasks.length} task${(pendingCount ?? tasks.length) > 1 ? 's' : ''} via code-tasks${skipCi ? ' [skip ci]' : ''}`,
        content: utf8ToBase64(updatedContent),
      }

      if (sha) {
        commitParams.sha = sha
      }

      if (branch) {
        commitParams.branch = branch
      }

      const response = await octokit.rest.repos.createOrUpdateFileContents(commitParams)
      const responseSha = (() => {
        if (response && typeof response === 'object' && 'data' in response) {
          const data = response.data as {
            content?: { sha?: string | null }
          }
          return data?.content?.sha ?? null
        }
        return null
      })()
      return responseSha ?? sha ?? null
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        err.status === 409 &&
        attempt < MAX_CONFLICT_RETRIES - 1
      ) {
        // Conflict: re-fetch and retry
        continue
      }
      throw err
    }
  }

  throw new Error('Failed to commit after maximum conflict retries')
}

export interface PrepareAgentConnectInput {
  repo: string
  defaultBranch: string
  captureBranch: string
  username: string
}

export interface AgentConnectResult {
  setupBranch: string
  compareUrl: string
  preview: string
}

export function getAgentConnectPreview(username: string, captureBranch: string): string {
  return appendAgentFrontDoor(null, username, captureBranch).trim()
}

export async function prepareAgentConnectBranch({
  repo: repoFullName,
  defaultBranch,
  captureBranch,
  username,
}: PrepareAgentConnectInput): Promise<AgentConnectResult> {
  const octokit = await recoverOctokit()
  const [owner, repo] = repoFullName.split('/')
  const setupBranch = `gitty/connect-${username}`
  await ensureBranchExists(octokit, owner, repo, setupBranch, defaultBranch)

  for (const fileName of ['AGENTS.md', 'CLAUDE.md']) {
    const existing = await getFileContent(octokit, owner, repo, fileName, setupBranch)
    const updated = appendAgentFrontDoor(existing?.content ?? null, username, captureBranch)
    if (existing?.content === updated) continue
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: fileName,
      message: 'docs: connect Gitty inbox [skip ci]',
      content: utf8ToBase64(updated),
      branch: setupBranch,
      ...(existing?.sha ? { sha: existing.sha } : {}),
    })
  }

  return {
    setupBranch,
    compareUrl: `https://github.com/${repoFullName}/compare/${encodeURIComponent(defaultBranch)}...${encodeURIComponent(setupBranch)}?expand=1`,
    preview: getAgentConnectPreview(username, captureBranch),
  }
}

export async function isAgentConnected({
  repo: repoFullName,
  defaultBranch,
  captureBranch,
  username,
}: PrepareAgentConnectInput): Promise<boolean> {
  const octokit = await recoverOctokit()
  const [owner, repo] = repoFullName.split('/')
  const expected = getAgentConnectPreview(username, captureBranch)
  for (const fileName of ['AGENTS.md', 'CLAUDE.md']) {
    const existing = await getFileContent(octokit, owner, repo, fileName, defaultBranch)
    if (existing?.content.includes(expected)) return true
  }
  return false
}

function getRetryDelay(attempt: number): number {
  const jitter = Math.floor(Math.random() * 200)
  return Math.min(8000, BASE_RETRY_DELAY_MS * 2 ** attempt) + jitter
}

function getErrorStatus(err: unknown): number | null {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status
    return typeof status === 'number' ? status : null
  }
  return null
}

function isRetryableError(err: unknown): boolean {
  const status = getErrorStatus(err)
  if (status && [429, 500, 502, 503, 504].includes(status)) {
    return true
  }
  if (status === 403 && err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message?: string }).message ?? '').toLowerCase()
    if (message.includes('rate limit')) {
      return true
    }
  }
  return err instanceof TypeError
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message?: string }).message ?? fallback)
  }
  return fallback
}

function taskSyncFingerprint(task: Task): string {
  return JSON.stringify([
    task.id,
    task.username,
    task.repoFullName.toLowerCase(),
    task.title,
    task.body,
    task.createdAt,
    task.isImportant,
    task.isCompleted,
    task.completedAt,
    task.updatedAt,
    task.processedBy ?? null,
    task.captureRevision ?? task.id,
    task.handoffStatus ?? null,
    task.proofUrl ?? null,
    task.handledAt ?? null,
    task.order,
  ])
}

function hasSameCaptureContent(local: Task, remote: Task): boolean {
  return (
    local.title === remote.title &&
    local.body === remote.body &&
    local.isImportant === remote.isImportant
  )
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function getDefaultBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string> {
  const { data } = await octokit.rest.repos.get({ owner, repo })
  return data.default_branch
}

async function ensureBranchExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  defaultBranch: string,
): Promise<void> {
  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branchName}` })
    // Branch already exists
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      // Branch doesn't exist — create from default branch HEAD
      const { data: refData } = await octokit.rest.git.getRef({
        owner, repo, ref: `heads/${defaultBranch}`,
      })
      await octokit.rest.git.createRef({
        owner, repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      })
    } else {
      throw err
    }
  }
}

export function classifySyncError(err: unknown): {
  message: string
  errorType: SyncErrorType
  rawError: RawSyncError
} {
  if (!err || typeof err !== 'object') {
    return { message: 'Sync failed', errorType: 'unknown', rawError: { status: null, message: 'Sync failed' } }
  }

  const status = getErrorStatus(err)
  const msg = getErrorMessage(err, 'Sync failed')
  const msgLower = msg.toLowerCase()
  const rawError: RawSyncError = { status, message: msg }

  // Branch protection patterns
  if (
    (status === 403 || status === 422) &&
    (msgLower.includes('protect') ||
     msgLower.includes('pull request') ||
     msgLower.includes('rule violation'))
  ) {
    return {
      message: 'This repository has branch protection rules that prevent direct pushes.',
      errorType: 'branch-protection',
      rawError,
    }
  }

  // Auth errors
  if (status === 403 && msgLower.includes('resource not accessible by personal access token')) {
    return {
      message: 'This GitHub token cannot write to this repository. Re-authorize Gitty with contents write access for this repo, or include the repo in the token access list.',
      errorType: 'auth',
      rawError,
    }
  }

  if (status === 401 || (status === 403 && msgLower.includes('token'))) {
    return { message: 'Authentication failed. Please log in again.', errorType: 'auth', rawError }
  }

  // Network errors (no status code)
  if (status === null || msgLower.includes('network') || msgLower.includes('fetch')) {
    return { message: 'Network error. Please check your connection.', errorType: 'network', rawError }
  }

  return { message: msg, errorType: 'unknown', rawError }
}

/**
 * Full file rebuild sync — pushes the definitive state of ALL repo tasks to GitHub.
 * This is the primary sync function called by the SyncFAB.
 *
 * Flow:
 * 1. Get ALL tasks for the current repo+user
 * 2. Rebuild the entire markdown file content
 * 3. Push to GitHub (Get SHA → rebuild content → PUT)
 * 4. Mark ALL repo tasks as synced
 * 5. Reset hasPendingDeletions
 */
export async function syncAllRepoTasks(options: SyncOptions = {}): Promise<SyncResult> {
  const repoFullName = useSyncStore.getState().selectedRepo?.fullName
  if (!repoFullName) return { syncedCount: 0, error: 'No repo or user selected' }
  return syncAllRepoTasksForRepo(repoFullName, options)
}

async function syncAllRepoTasksForRepo(repoFullName: string, options: SyncOptions = {}): Promise<SyncResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      return await syncAllRepoTasksOnce(repoFullName, options)
    } catch (err) {
      if (attempt < maxRetries && isRetryableError(err)) {
        await delay(getRetryDelay(attempt))
        attempt += 1
        continue
      }
      const classified = classifySyncError(err)
      return {
        syncedCount: 0,
        error: classified.message,
        errorType: classified.errorType,
        rawError: classified.rawError,
      }
    }
  }

  return { syncedCount: 0 }
}

async function syncAllRepoTasksOnce(repoFullName: string, options: SyncOptions): Promise<SyncResult> {
  const { tasks, user, repoSyncMeta, repoSyncBranches, repoTombstones, setRepoSyncMeta } = useSyncStore.getState()

  if (!user) {
    return { syncedCount: 0, error: 'No repo or user selected' }
  }

  const selectedLower = repoFullName.toLowerCase()

  const repoTasks = tasks.filter(
    (t) =>
      t.username === user.login &&
      t.repoFullName.toLowerCase() === selectedLower,
  )
  const pendingTasks = repoTasks.filter((task) => task.syncStatus === 'pending')
  const tombstones = repoTombstones[selectedLower] ?? []
  if (pendingTasks.length === 0 && tombstones.length === 0) {
    return { syncedCount: 0 }
  }

  const filePath = getScopedFileName(user.login)
  const [owner, repo] = repoFullName.split('/')

  const octokit = await recoverOctokit()

  const repoKey = repoFullName.toLowerCase()
  const syncMeta = repoSyncMeta[repoKey]
  const targetBranch = options.branch

  // Resolve the branch that briefs the AI agent in the header (Story 9-15, F2).
  // Priority: per-repo override → explicit targetBranch → already-fetched default
  // branch (only when we fetched it for the fallback-branch path). We never add a
  // network round-trip just to learn the default branch. If none is available
  // without one and there is no override, syncBranch stays undefined and the
  // header omits the 📍 line (no latency regression on the common main path).
  const branchOverride = repoSyncBranches[repoKey]
  let syncBranch: string | undefined = branchOverride ?? targetBranch

  // If pushing to a fallback branch, ensure it exists
  if (targetBranch) {
    const defaultBranch = await getDefaultBranch(octokit, owner, repo)
    await ensureBranchExists(octokit, owner, repo, targetBranch, defaultBranch)
    syncBranch = branchOverride ?? targetBranch ?? defaultBranch
  }

  // Get existing file for SHA — use branch ref if targeting a fallback branch
  const existing = await getFileContent(octokit, owner, repo, filePath, targetBranch)
  const remoteSha = existing?.sha ?? null

  const mergeLatestRemote = async (): Promise<SyncResult | null> => {
    const remoteResult = await fetchRemoteTasksForRepo(repoFullName, user.login, targetBranch)
    if (remoteResult.error) {
      throw new Error(remoteResult.error)
    }
    const liveState = useSyncStore.getState()
    const liveRepoTasks = liveState.tasks.filter(
      (task) =>
        task.username === user.login &&
        task.repoFullName.toLowerCase() === repoKey,
    )
    const liveTombstones = liveState.repoTombstones[repoKey] ?? []
    const localById = new Map(liveRepoTasks.map((task) => [task.id, task]))
    const tombstoneById = new Map(liveTombstones.map((item) => [item.taskId, item]))
    const conflictTaskIds = remoteResult.tasks.flatMap((remoteTask) => {
      const local = localById.get(remoteTask.id)
      const tombstone = tombstoneById.get(remoteTask.id)
      const remoteRevision = remoteTask.captureRevision ?? remoteTask.id
      const localRevision = local?.captureRevision ?? local?.id

      if (
        local?.syncStatus === 'pending' &&
        localRevision === remoteRevision &&
        !hasSameCaptureContent(local, remoteTask)
      ) {
        return [remoteTask.id]
      }
      if (tombstone && tombstone.captureRevision !== remoteRevision) {
        return [remoteTask.id]
      }
      return []
    })

    if (conflictTaskIds.length > 0) {
      setRepoSyncMeta(repoFullName, {
        deliveryState: 'needs-attention',
        conflict: {
          remoteSha: remoteResult.sha,
          detectedAt: new Date().toISOString(),
          taskIds: conflictTaskIds,
        },
      })
      return {
        syncedCount: 0,
        error: 'A capture changed on the phone and in the repository',
        status: 'conflict',
        remoteSha: remoteResult.sha,
      }
    }

    const remoteWithoutDeleted = remoteResult.tasks.filter((task) => !tombstoneById.has(task.id))
    const merged = buildMergedTaskList(liveRepoTasks, remoteWithoutDeleted)
    useSyncStore.setState((state) => ({
      tasks: [
        ...state.tasks.filter((task) => task.repoFullName.toLowerCase() !== repoKey),
        ...merged,
      ],
    }))
    repoTasks.splice(0, repoTasks.length, ...merged)
    return null
  }

  // Conflict detection — applies to branch syncs too, since desktop AI agents
  // may write check-offs back to the fallback branch.
  if (!options.allowConflict && remoteSha !== (syncMeta?.lastSyncedSha ?? null)) {
    const conflict = await mergeLatestRemote()
    if (conflict) return conflict
  }

  // Push to GitHub with conflict retry loop
  let newSha: string | null = null
  let committedTasks: Task[] = []
  for (let conflictAttempt = 0; conflictAttempt < MAX_CONFLICT_RETRIES; conflictAttempt++) {
    const currentExisting = conflictAttempt === 0
      ? existing
      : await getFileContent(octokit, owner, repo, filePath, targetBranch)

    if (conflictAttempt > 0 && !options.allowConflict) {
      const conflict = await mergeLatestRemote()
      if (conflict) return conflict
    }

    // Rebuild on every attempt so a remote update racing the first PUT is merged
    // into the retry instead of being overwritten by stale Markdown.
    const attemptTasks = repoTasks.map((task) => ({ ...task }))
    const content = buildFullFileContent(attemptTasks, user.login, syncBranch, currentExisting?.content)
    const countedTasks = attemptTasks.filter(t => !t.body.startsWith('[Archived] '))
    const activeCount = countedTasks.filter(t => !t.isCompleted).length
    const completedCount = countedTasks.filter(t => t.isCompleted).length
    const total = countedTasks.length
    const skipCiSuffix = options.skipCi ? ' [skip ci]' : ''
    const commitMessage = total > 0
      ? `sync: ${total} tasks (${activeCount} active, ${completedCount} completed) via code-tasks${skipCiSuffix}`
      : `sync: clear tasks via code-tasks${skipCiSuffix}`

    try {
      const commitParams: {
        owner: string
        repo: string
        path: string
        message: string
        content: string
        sha?: string
        branch?: string
      } = {
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: utf8ToBase64(content),
      }

      if (currentExisting?.sha) {
        commitParams.sha = currentExisting.sha
      }
      if (targetBranch) {
        commitParams.branch = targetBranch
      }

      const response = await octokit.rest.repos.createOrUpdateFileContents(commitParams)
      const responseSha = (() => {
        if (response && typeof response === 'object' && 'data' in response) {
          const data = response.data as { content?: { sha?: string | null } }
          return data?.content?.sha ?? null
        }
        return null
      })()
      newSha = responseSha ?? currentExisting?.sha ?? null
      committedTasks = attemptTasks
      break
    } catch (err: unknown) {
      const is409 =
        err && typeof err === 'object' && 'status' in err && err.status === 409

      if (is409 && conflictAttempt < MAX_CONFLICT_RETRIES - 1) {
        continue
      }
      throw err
    }
  }

  // Only acknowledge the exact task versions that were included in the
  // successful PUT. A phone edit while the request is in flight must remain
  // pending for the next sync.
  const committedPendingById = new Map(
    committedTasks
      .filter((task) => task.syncStatus === 'pending')
      .map((task) => [task.id, task]),
  )
  const { markTaskSynced } = useSyncStore.getState()
  for (const currentTask of useSyncStore.getState().tasks) {
    const committedTask = committedPendingById.get(currentTask.id)
    if (
      committedTask &&
      currentTask.syncStatus === 'pending' &&
      taskSyncFingerprint(currentTask) === taskSyncFingerprint(committedTask)
    ) {
      markTaskSynced(currentTask.id, null)
    }
  }

  // Tombstones are also snapshot-scoped. New deletions created while the PUT
  // is in flight remain queued instead of being cleared with the old batch.
  const committedTombstones = new Set(tombstones)
  useSyncStore.setState((state) => {
    const remaining = (state.repoTombstones[repoKey] ?? [])
      .filter((tombstone) => !committedTombstones.has(tombstone))
    const repoTombstones = { ...state.repoTombstones }
    if (remaining.length > 0) repoTombstones[repoKey] = remaining
    else delete repoTombstones[repoKey]
    return { repoTombstones }
  })

  const currentState = useSyncStore.getState()
  const hasRemainingChanges =
    currentState.tasks.some(
      (task) =>
        task.username === user.login &&
        task.repoFullName.toLowerCase() === repoKey &&
        task.syncStatus === 'pending',
    ) || (currentState.repoTombstones[repoKey]?.length ?? 0) > 0

  setRepoSyncMeta(repoFullName, {
    lastSyncedSha: newSha ?? remoteSha,
    lastSyncAt: new Date().toISOString(),
    lastSyncedRevision: syncMeta?.localRevision ?? 0,
    conflict: null,
    setupState:
      syncMeta?.setupState === 'ready' || syncMeta?.setupState === 'connect-pending'
        ? syncMeta.setupState
        : 'inbox-ready',
    deliveryState: hasRemainingChanges ? 'queued' : 'in-repo',
  })

  return { syncedCount: Math.max(pendingTasks.length, tombstones.length > 0 ? 1 : 0) }
}

/**
 * Syncs all pending local tasks to GitHub.
 * Implements batched updates: one commit per sync cycle.
 *
 * Flow:
 * 1. Get pending tasks from store
 * 2. Recover Octokit instance
 * 3. Get-Modify-Set the captured-ideas file
 * 4. Mark tasks as synced in store
 */
export async function syncPendingTasks(options: SyncOptions = {}): Promise<SyncResult> {
  return syncAllRepoTasks(options)
}

export async function fetchRemoteTasksForRepo(
  repoFullName: string,
  username: string,
  branch?: string,
): Promise<RemoteTasksResult> {
  const [owner, repo] = repoFullName.split('/')
  const filePath = getScopedFileName(username)
  const octokit = await recoverOctokit()

  try {
    const existing = await getFileContent(octokit, owner, repo, filePath, branch)
    if (!existing) {
      return { tasks: [], sha: null }
    }

    const parsed = parseTasksFromMarkdown(existing.content)
    const nowIso = new Date().toISOString()

    const tasks = parsed.map((parsedTask, index) => {
      const id = parsedTask.id ?? generateUUID()
      const createdAt = parsedTask.createdAt ?? nowIso
      const updatedAt = parsedTask.updatedAt
      let completedAt = parsedTask.completedAt
      if (parsedTask.isCompleted && !completedAt) {
        completedAt = updatedAt ?? createdAt
      }

      return {
        // Reuse the stable id from the file's `<!-- ct:ID -->` anchor so remote
        // tasks keep the same identity as their local counterparts across the
        // round-trip. Legacy files without the anchor get a fresh UUID and fall
        // back to title matching during merge.
        id,
        username,
        repoFullName,
        title: parsedTask.title,
        body: parsedTask.body ?? '',
        createdAt,
        updatedAt,
        isImportant: parsedTask.isImportant,
        isCompleted: parsedTask.isCompleted,
        completedAt,
        processedBy: parsedTask.processedBy ?? null,
        captureRevision: parsedTask.captureRevision ?? undefined,
        handoffStatus: parsedTask.handoffStatus ?? null,
        proofUrl: parsedTask.proofUrl ?? null,
        handledAt: parsedTask.handledAt ?? null,
        order: index,
        syncStatus: 'synced' as const,
        githubIssueNumber: null,
      }
    })

    return { tasks, sha: existing.sha }
  } catch (err) {
    return { tasks: [], sha: null, error: getErrorMessage(err, 'Failed to fetch remote tasks') }
  }
}

export async function fetchRemoteFileContent(
  repoFullName: string,
  username: string,
  branch?: string,
): Promise<{ content: string | null; sha: string | null; error?: string }> {
  const [owner, repo] = repoFullName.split('/')
  const filePath = getScopedFileName(username)
  const octokit = await recoverOctokit()

  try {
    const existing = await getFileContent(octokit, owner, repo, filePath, branch)
    if (!existing) {
      return { content: null, sha: null }
    }
    return { content: existing.content, sha: existing.sha }
  } catch (err) {
    return { content: null, sha: null, error: getErrorMessage(err, 'Failed to fetch remote file') }
  }
}

// Export for testing
export { getFileContent, commitTasks }
// Re-export getScopedFileName, classifySyncError, syncAllRepoTasks (already exported at definition)
