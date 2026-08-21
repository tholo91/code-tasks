import type { Task } from '../types/task'

export interface ImportDiffSummary {
  completedByAgent: number
  updatedWithNotes: number
  processedByAdded: number
  handoffUpdates?: number
  /** Synced tasks missing from remote that were KEPT (not archived). Self-heal on next push. */
  archived: number
  newFromRemote: number
  localSafeCount: number
}

const titleKey = (t: Task) => t.title.trim().toLowerCase()

function captureRevision(task: Task): string {
  return task.captureRevision ?? task.id
}

function hasConflictingCaptureRevisions(local: Task, remote: Task): boolean {
  return Boolean(
    local.captureRevision &&
    remote.captureRevision &&
    local.captureRevision !== remote.captureRevision,
  )
}

function hasSafeProofUrl(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function receiptRank(task: Task): number {
  if (task.handoffStatus === 'done' && hasSafeProofUrl(task.proofUrl)) return 3
  if (task.handoffStatus === 'filed') return 2
  return 0
}

function canApplyRemoteReceipt(local: Task, remote: Task): boolean {
  return Boolean(
    remote.handoffStatus &&
    remote.processedBy &&
    remote.handledAt &&
    captureRevision(remote) === captureRevision(local) &&
    (remote.handoffStatus !== 'done' || hasSafeProofUrl(remote.proofUrl)),
  )
}

function hasReceiptMetadata(task: Task): boolean {
  return Boolean(
    task.handoffStatus ||
    task.proofUrl ||
    task.handledAt,
  )
}

function receiptChanged(local: Task, remote: Task): boolean {
  if (!canApplyRemoteReceipt(local, remote)) return false
  const remoteRank = receiptRank(remote)
  const localRank = receiptRank(local)
  if (remoteRank > localRank) return true
  if (remoteRank < localRank || remoteRank === 0) return false

  return (
    (!local.proofUrl && Boolean(remote.proofUrl)) ||
    (!local.handledAt && Boolean(remote.handledAt)) ||
    (!local.processedBy && Boolean(remote.processedBy))
  )
}

/** Divider used when preserving an agent's remote note on a locally-edited task. */
const AGENT_NOTE_DIVIDER = '\n\n---\nAgent note: '

/**
 * Matches remote tasks to local tasks by stable id first, then by title for any
 * leftovers. The id anchor (`<!-- ct:ID -->`) survives an AI agent reformatting,
 * reordering, or renaming a task; title matching is the legacy/no-anchor fallback.
 *
 * Pure: returns a map from local id → matched remote task, plus the remote tasks
 * that matched nothing (genuinely new from remote). Shared by computeImportDiff
 * and buildMergedTaskList so the preview and the merge can never disagree.
 */
function matchRemoteToLocal(
  localTasks: Task[],
  remoteTasks: Task[],
): { matchByLocalId: Map<string, Task>; remoteOnly: Task[] } {
  const remoteById = new Map<string, Task>()
  for (const r of remoteTasks) {
    if (!remoteById.has(r.id)) remoteById.set(r.id, r)
  }

  const remoteByTitle = new Map<string, Task[]>()
  for (const r of remoteTasks) {
    const k = titleKey(r)
    const queue = remoteByTitle.get(k)
    if (queue) queue.push(r)
    else remoteByTitle.set(k, [r])
  }

  const consumed = new Set<Task>()
  const matchByLocalId = new Map<string, Task>()

  // Pass 1 — authoritative id match.
  for (const local of localTasks) {
    const r = remoteById.get(local.id)
    if (r && !consumed.has(r)) {
      consumed.add(r)
      matchByLocalId.set(local.id, r)
    }
  }

  // Pass 2 — title match for locals still unmatched (legacy files, or a task
  // captured on two devices before either had an id).
  for (const local of localTasks) {
    if (matchByLocalId.has(local.id)) continue
    const queue = remoteByTitle.get(titleKey(local))
    const r = queue?.find((x) => !consumed.has(x))
    if (r) {
      consumed.add(r)
      matchByLocalId.set(local.id, r)
    }
  }

  const remoteOnly = remoteTasks.filter((r) => !consumed.has(r))
  return { matchByLocalId, remoteOnly }
}

/**
 * Computes a summary of what would change if the remote tasks were merged into
 * the local task list. Pure function — no side effects. Mirrors the exact merge
 * decisions in buildMergedTaskList so isAllZero is a faithful "nothing to import"
 * predicate for the phantom-banner guard.
 */
export function computeImportDiff(localTasks: Task[], remoteTasks: Task[]): ImportDiffSummary {
  const { matchByLocalId, remoteOnly } = matchRemoteToLocal(localTasks, remoteTasks)

  let completedByAgent = 0
  let updatedWithNotes = 0
  let processedByAdded = 0
  let handoffUpdates = 0
  let archived = 0

  for (const local of localTasks) {
    const remote = matchByLocalId.get(local.id)

    if (!remote) {
      // Vanished from remote. We keep it (no archiving) — count it only so the
      // store can surface it later if wanted; it does NOT drive the banner.
      if (local.syncStatus === 'synced') archived++
      continue
    }

    if (
      hasConflictingCaptureRevisions(local, remote) ||
      (hasReceiptMetadata(remote) && !canApplyRemoteReceipt(local, remote))
    ) continue

    if (remote.isCompleted && remote.handoffStatus === 'done' && hasSafeProofUrl(remote.proofUrl) && !local.isCompleted) completedByAgent++

    if (local.syncStatus === 'synced') {
      if (remote.body !== local.body) updatedWithNotes++
    } else if (
      remote.body &&
      remote.body !== local.body &&
      !local.body.includes(remote.body)
    ) {
      // Pending task: the agent's note would be appended (preserved), not dropped.
      updatedWithNotes++
    }

    if (remote.processedBy && !local.processedBy) processedByAdded++
    if (receiptChanged(local, remote)) handoffUpdates++
  }

  const localSafeCount = localTasks.filter((t) => t.syncStatus === 'pending').length

  return {
    completedByAgent,
    updatedWithNotes,
    processedByAdded,
    handoffUpdates,
    archived,
    newFromRemote: remoteOnly.length,
    localSafeCount,
  }
}

/**
 * Builds a human-readable feedback message from an ImportDiffSummary.
 * Used for the post-import confirmation toast.
 */
export function buildImportFeedbackMessage(diff: ImportDiffSummary): string {
  const parts: string[] = []

  if (diff.completedByAgent > 0) {
    parts.push(`${diff.completedByAgent} task${diff.completedByAgent === 1 ? '' : 's'} completed`)
  }
  if (diff.updatedWithNotes > 0) {
    parts.push(`${diff.updatedWithNotes} updated with notes`)
  }
  if ((diff.handoffUpdates ?? 0) > 0) {
    parts.push(`${diff.handoffUpdates} handoff${diff.handoffUpdates === 1 ? '' : 's'} updated`)
  }
  if (diff.newFromRemote > 0) {
    parts.push(`${diff.newFromRemote} new from remote`)
  }

  const headline = parts.length > 0 ? parts.join(', ') + '.' : 'Nothing changed locally.'

  if (diff.localSafeCount > 0) {
    const verb = diff.localSafeCount === 1 ? 'is' : 'are'
    return `${headline} Your ${diff.localSafeCount} idea${diff.localSafeCount === 1 ? '' : 's'} ${verb} safe.`
  }
  return headline
}

/**
 * Returns true if the diff carries no change the user needs to act on.
 *
 * `archived` (synced tasks missing from remote, which we KEEP) is intentionally
 * excluded: keeping a vanished task is a safe, silent self-heal — it re-pushes on
 * the next sync — so it must not raise a banner on its own.
 */
export function isAllZero(diff: ImportDiffSummary): boolean {
  return (
    diff.completedByAgent === 0 &&
    diff.updatedWithNotes === 0 &&
    diff.processedByAdded === 0 &&
    (diff.handoffUpdates ?? 0) === 0 &&
    diff.newFromRemote === 0
  )
}

/**
 * Merges one matched (local, remote) pair under the safety policy:
 * - status: completed wins (local OR remote) — never silently un-completes.
 * - processedBy: additive — adopt remote's agent name.
 * - body, local synced (== last-synced base): remote is the newer truth (even shorter).
 * - body, local pending (user edited since last sync): NEVER overwrite the user's
 *   edit. If the agent added distinct content, append it once (idempotent) so the
 *   agent's note is preserved instead of lost.
 * - title: adopt a remote rename only for id-matched pairs (titleKey differs),
 *   never for a mere case/whitespace difference.
 */
function mergeOne(local: Task, remote: Task): Task {
  const merged: Task = { ...local }
  const sameCaptureRevision = !hasConflictingCaptureRevisions(local, remote)

  if (!sameCaptureRevision) return merged
  if (hasReceiptMetadata(remote) && !canApplyRemoteReceipt(local, remote)) return merged

  // Status — completed wins, no silent re-open.
  if (remote.isCompleted && remote.handoffStatus === 'done' && hasSafeProofUrl(remote.proofUrl) && !local.isCompleted) {
    merged.isCompleted = true
    merged.completedAt = remote.completedAt ?? new Date().toISOString()
  }

  // processedBy — additive.
  if (!merged.processedBy && remote.processedBy) {
    merged.processedBy = remote.processedBy
  }

  if (canApplyRemoteReceipt(local, remote)) {
    const localRank = receiptRank(local)
    const remoteRank = receiptRank(remote)

    if (remoteRank > localRank || remoteRank === localRank) {
      if (remoteRank > localRank) {
        merged.handoffStatus = remote.handoffStatus ?? null
        merged.proofUrl = remote.proofUrl ?? null
        merged.handledAt = remote.handledAt ?? null
      } else {
        if (!merged.proofUrl && remote.proofUrl) merged.proofUrl = remote.proofUrl
        if (!merged.handledAt && remote.handledAt) merged.handledAt = remote.handledAt
      }
    }
  }

  // Body.
  if (local.syncStatus === 'synced') {
    if (remote.body !== local.body) merged.body = remote.body
  } else if (
    remote.body &&
    remote.body !== local.body &&
    !local.body.includes(remote.body)
  ) {
    merged.body = local.body
      ? `${local.body}${AGENT_NOTE_DIVIDER}${remote.body}`
      : remote.body
  }

  // Title — only a genuine rename on an id-matched task.
  if (local.syncStatus === 'synced' && titleKey(remote) !== titleKey(local)) {
    merged.title = remote.title
  }

  return merged
}

/**
 * Builds a merged task list by applying additive, non-destructive merge rules
 * (see mergeOne). Local-only tasks are preserved:
 * - pending  → kept as-is (unpushed idea, sacred).
 * - synced but missing from remote → KEPT UNTOUCHED (never completed/archived).
 *   A parser glitch or an agent dropping a line must not look like "done"; the
 *   task re-pushes on the next outbound sync (self-heal).
 * Remote-only tasks are added with syncStatus 'synced'.
 *
 * Pure function — no store access, no side effects.
 */
export function buildMergedTaskList(localTasks: Task[], remoteTasks: Task[]): Task[] {
  const { matchByLocalId, remoteOnly } = matchRemoteToLocal(localTasks, remoteTasks)

  const result: Task[] = []

  for (const local of localTasks) {
    const remote = matchByLocalId.get(local.id)
    result.push(remote ? mergeOne(local, remote) : local)
  }

  // Add remote-only tasks at the end, after the current max order.
  let maxOrder = result.reduce((max, t) => Math.max(max, t.order ?? 0), -1)
  for (const remote of remoteOnly) {
    maxOrder++
    result.push({ ...remote, syncStatus: 'synced', order: maxOrder })
  }

  // Safety guard: every local task id must survive the merge.
  const resultIds = new Set(result.map((t) => t.id))
  const missingIds = localTasks.filter((t) => !resultIds.has(t.id))
  if (missingIds.length > 0) {
    console.warn(
      `[buildMergedTaskList] Safety guard triggered: ${missingIds.length} local task(s) missing from merge result. Returning local tasks + new remote tasks as fail-safe.`,
    )
    const localIds = new Set(localTasks.map((t) => t.id))
    const remoteOnlyResult = result.filter((t) => !localIds.has(t.id))
    return [...localTasks, ...remoteOnlyResult]
  }

  return result
}
