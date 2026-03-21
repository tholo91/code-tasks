import type { Octokit } from 'octokit'
import type { Task } from '../../types/task'
import { recoverOctokit } from './octokit-provider'
import { useSyncStore } from '../../stores/useSyncStore'
import { buildFileContent, buildFullFileContent, parseTasksFromMarkdown } from '../../features/sync/utils/markdown-templates'
import { sortTasksForDisplay } from '../../utils/task-sorting'
import { generateUUID } from '../../utils/uuid'

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

export interface SyncResult {
  syncedCount: number
  error?: string
  errorType?: SyncErrorType
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
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
    const existing = await getFileContent(octokit, owner, repo, filePath, branch)

    const updatedContent = buildFileContent(
      existing?.content ?? null,
      tasks,
      username,
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
        message: `sync: update ${pendingCount ?? tasks.length} task${(pendingCount ?? tasks.length) > 1 ? 's' : ''} via code-tasks`,
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
} {
  if (!err || typeof err !== 'object') {
    return { message: 'Sync failed', errorType: 'unknown' }
  }

  const status = getErrorStatus(err)
  const msg = getErrorMessage(err, 'Sync failed')
  const msgLower = msg.toLowerCase()

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
    }
  }

  // Auth errors
  if (status === 401 || (status === 403 && msgLower.includes('token'))) {
    return { message: 'Authentication failed. Please log in again.', errorType: 'auth' }
  }

  // Network errors (no status code)
  if (status === null || msgLower.includes('network') || msgLower.includes('fetch')) {
    return { message: 'Network error. Please check your connection.', errorType: 'network' }
  }

  return { message: msg, errorType: 'unknown' }
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
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      return await syncAllRepoTasksOnce(options)
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
      }
    }
  }

  return { syncedCount: 0 }
}

async function syncAllRepoTasksOnce(options: SyncOptions): Promise<SyncResult> {
  const { tasks, selectedRepo, user, repoSyncMeta, setRepoSyncMeta } = useSyncStore.getState()

  if (!selectedRepo || !user) {
    return { syncedCount: 0, error: 'No repo or user selected' }
  }

  const selectedLower = selectedRepo.fullName.toLowerCase()

  const repoTasks = tasks.filter(
    (t) =>
      t.username === user.login &&
      t.repoFullName.toLowerCase() === selectedLower,
  )

  const filePath = getScopedFileName(user.login)
  const [owner, repo] = selectedRepo.fullName.split('/')

  const octokit = await recoverOctokit()

  const repoKey = selectedRepo.fullName.toLowerCase()
  const syncMeta = repoSyncMeta[repoKey]
  const targetBranch = options.branch

  // If pushing to a fallback branch, ensure it exists
  if (targetBranch) {
    const defaultBranch = await getDefaultBranch(octokit, owner, repo)
    await ensureBranchExists(octokit, owner, repo, targetBranch, defaultBranch)
  }

  // Get existing file for SHA — use branch ref if targeting a fallback branch
  const existing = await getFileContent(octokit, owner, repo, filePath, targetBranch)
  const remoteSha = existing?.sha ?? null

  // Conflict detection (skip for branch fallback — branch is append-only for Gitty)
  if (!targetBranch && !options.allowConflict && syncMeta?.lastSyncedSha) {
    if (remoteSha !== syncMeta.lastSyncedSha) {
      setRepoSyncMeta(selectedRepo.fullName, {
        conflict: {
          remoteSha,
          detectedAt: new Date().toISOString(),
        },
      })
      return {
        syncedCount: 0,
        error: 'Remote file changed since last sync',
        status: 'conflict',
        remoteSha,
      }
    }
  }

  // Full rebuild from all current tasks
  const content = buildFullFileContent(repoTasks, user.login)

  // Descriptive commit message with task counts
  const activeCount = repoTasks.filter(t => !t.isCompleted).length
  const completedCount = repoTasks.filter(t => t.isCompleted).length
  const total = repoTasks.length
  const commitMessage = total > 0
    ? `sync: ${total} tasks (${activeCount} active, ${completedCount} completed) via code-tasks`
    : 'sync: clear tasks via code-tasks'

  // Push to GitHub with conflict retry loop
  let newSha: string | null = null
  for (let conflictAttempt = 0; conflictAttempt < MAX_CONFLICT_RETRIES; conflictAttempt++) {
    const currentExisting = conflictAttempt === 0
      ? existing
      : await getFileContent(octokit, owner, repo, filePath, targetBranch)

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
      break
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        err.status === 409 &&
        conflictAttempt < MAX_CONFLICT_RETRIES - 1
      ) {
        continue
      }
      throw err
    }
  }

  // Update sync meta
  setRepoSyncMeta(selectedRepo.fullName, {
    lastSyncedSha: newSha ?? remoteSha,
    lastSyncAt: new Date().toISOString(),
    lastSyncedRevision: syncMeta?.localRevision ?? 0,
    conflict: null,
  })

  // Mark ALL repo tasks as synced
  const { markTaskSynced } = useSyncStore.getState()
  for (const task of repoTasks) {
    markTaskSynced(task.id, null)
  }

  // Reset pending deletions
  useSyncStore.setState({ hasPendingDeletions: false })

  return { syncedCount: Math.max(repoTasks.length, 1) }
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
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      return await syncPendingTasksOnce(options)
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
      }
    }
  }

  return { syncedCount: 0 }
}

export async function fetchRemoteTasksForRepo(
  repoFullName: string,
  username: string,
): Promise<RemoteTasksResult> {
  const [owner, repo] = repoFullName.split('/')
  const filePath = getScopedFileName(username)
  const octokit = await recoverOctokit()

  try {
    const existing = await getFileContent(octokit, owner, repo, filePath)
    if (!existing) {
      return { tasks: [], sha: null }
    }

    const parsed = parseTasksFromMarkdown(existing.content)
    const nowIso = new Date().toISOString()

    const tasks = parsed.map((parsedTask, index) => {
      const createdAt = parsedTask.createdAt ?? nowIso
      const updatedAt = parsedTask.updatedAt
      let completedAt = parsedTask.completedAt
      if (parsedTask.isCompleted && !completedAt) {
        completedAt = updatedAt ?? createdAt
      }

      return {
        id: generateUUID(),
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
): Promise<{ content: string | null; sha: string | null; error?: string }> {
  const [owner, repo] = repoFullName.split('/')
  const filePath = getScopedFileName(username)
  const octokit = await recoverOctokit()

  try {
    const existing = await getFileContent(octokit, owner, repo, filePath)
    if (!existing) {
      return { content: null, sha: null }
    }
    return { content: existing.content, sha: existing.sha }
  } catch (err) {
    return { content: null, sha: null, error: getErrorMessage(err, 'Failed to fetch remote file') }
  }
}

async function syncPendingTasksOnce(options: SyncOptions): Promise<SyncResult> {
  const { tasks, selectedRepo, user, repoSyncMeta, setRepoSyncMeta } = useSyncStore.getState()

  if (!selectedRepo || !user) {
    return { syncedCount: 0, error: 'No repo or user selected' }
  }

  const selectedLower = selectedRepo.fullName.toLowerCase()

  // Get ALL tasks for this repo (for full file rewrite)
  const repoTasks = tasks.filter(
    (t) =>
      t.username === user.login &&
      t.repoFullName.toLowerCase() === selectedLower,
  )

  // Only sync if there are pending changes or pending deletions
  const pendingTasks = repoTasks.filter((t) => t.syncStatus === 'pending')
  const { hasPendingDeletions } = useSyncStore.getState()
  if (pendingTasks.length === 0 && !hasPendingDeletions) {
    return { syncedCount: 0 }
  }

  const filePath = getScopedFileName(user.login)
  const [owner, repo] = selectedRepo.fullName.split('/')

  const octokit = await recoverOctokit()

  const repoKey = selectedRepo.fullName.toLowerCase()
  const syncMeta = repoSyncMeta[repoKey]
  const targetBranch = options.branch

  // If pushing to a fallback branch, ensure it exists
  if (targetBranch) {
    const defaultBranch = await getDefaultBranch(octokit, owner, repo)
    await ensureBranchExists(octokit, owner, repo, targetBranch, defaultBranch)
  }

  const existing = await getFileContent(octokit, owner, repo, filePath, targetBranch)
  const remoteSha = existing?.sha ?? null

  if (!targetBranch && !options.allowConflict && syncMeta?.lastSyncedSha) {
    if (remoteSha !== syncMeta.lastSyncedSha) {
      setRepoSyncMeta(selectedRepo.fullName, {
        conflict: {
          remoteSha,
          detectedAt: new Date().toISOString(),
        },
      })
      return {
        syncedCount: 0,
        error: 'Remote file changed since last sync',
        status: 'conflict',
        remoteSha,
      }
    }
  }

  const sortedTasks = sortTasksForDisplay(repoTasks).all

  const newSha = await commitTasks(
    octokit,
    owner,
    repo,
    filePath,
    sortedTasks,
    user.login,
    pendingTasks.length,
    targetBranch,
  )

  setRepoSyncMeta(selectedRepo.fullName, {
    lastSyncedSha: newSha ?? remoteSha,
    lastSyncAt: new Date().toISOString(),
    lastSyncedRevision: syncMeta?.localRevision ?? 0,
    conflict: null,
  })

  // Mark ALL repo tasks as synced (full rebuild means all are now in sync)
  const { markTaskSynced } = useSyncStore.getState()
  for (const task of repoTasks) {
    if (task.syncStatus === 'pending') {
      markTaskSynced(task.id, null)
    }
  }

  return { syncedCount: Math.max(pendingTasks.length, hasPendingDeletions ? 1 : 0) }
}

// Export for testing
export { getFileContent, commitTasks }
// Re-export getScopedFileName, classifySyncError, syncAllRepoTasks (already exported at definition)
