import type { Task } from '../types/task'

export interface ImportDiffSummary {
  completedByAgent: number
  updatedWithNotes: number
  processedByAdded: number
  archived: number
  newFromRemote: number
  localSafeCount: number
}

const titleKey = (t: Task) => t.title.trim().toLowerCase()

/**
 * Computes a summary of what would change if the remote tasks were merged
 * into the local task list. Pure function — no side effects.
 */
export function computeImportDiff(localTasks: Task[], remoteTasks: Task[]): ImportDiffSummary {
  const remoteMap = new Map(remoteTasks.map((t) => [titleKey(t), t]))
  const consumedRemoteKeys = new Set<string>()

  let completedByAgent = 0
  let updatedWithNotes = 0
  let processedByAdded = 0
  let archived = 0

  for (const local of localTasks) {
    const key = titleKey(local)
    const remote = !consumedRemoteKeys.has(key) ? remoteMap.get(key) : undefined

    if (remote) {
      consumedRemoteKeys.add(key)
      if (remote.isCompleted && !local.isCompleted) {
        completedByAgent++
      }
      if (
        remote.body.length > local.body.length &&
        local.syncStatus === 'synced'
      ) {
        updatedWithNotes++
      }
      if (remote.processedBy && !local.processedBy) {
        processedByAdded++
      }
    } else if (local.syncStatus === 'synced') {
      archived++
    }
  }

  let newFromRemote = 0
  const localTitleSet = new Set(localTasks.map(titleKey))
  for (const remote of remoteTasks) {
    if (!localTitleSet.has(titleKey(remote))) {
      newFromRemote++
    }
  }

  const localSafeCount = localTasks.filter((t) => t.syncStatus === 'pending').length

  return { completedByAgent, updatedWithNotes, processedByAdded, archived, newFromRemote, localSafeCount }
}

/**
 * Builds a human-readable feedback message from an ImportDiffSummary.
 * Used for the post-import confirmation toast.
 */
export function buildImportFeedbackMessage(diff: ImportDiffSummary): string {
  const parts: string[] = []

  const totalCompleted = diff.completedByAgent + diff.archived
  if (totalCompleted > 0) {
    parts.push(`${totalCompleted} task${totalCompleted === 1 ? '' : 's'} completed`)
  }
  if (diff.updatedWithNotes > 0) {
    parts.push(`${diff.updatedWithNotes} updated with notes`)
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
 * Returns true if all counts in the diff summary are zero.
 */
export function isAllZero(diff: ImportDiffSummary): boolean {
  return (
    diff.completedByAgent === 0 &&
    diff.updatedWithNotes === 0 &&
    diff.processedByAdded === 0 &&
    diff.archived === 0 &&
    diff.newFromRemote === 0
  )
}

/**
 * Builds a merged task list by applying additive merge rules:
 * - Matched tasks: update completion, processedBy, and body (if remote is longer and local is synced)
 * - Local-only pending tasks: preserved as-is (unpushed ideas are sacred)
 * - Local synced tasks missing from remote: archived (marked completed, body prefixed with "[Archived] ")
 * - Remote-only tasks: added with syncStatus 'synced'
 *
 * Pure function — no store access, no side effects.
 */
export function buildMergedTaskList(localTasks: Task[], remoteTasks: Task[]): Task[] {
  const remoteMap = new Map(remoteTasks.map((t) => [titleKey(t), t]))
  const consumedRemoteKeys = new Set<string>()

  const result: Task[] = []

  for (const local of localTasks) {
    const key = titleKey(local)
    const remote = !consumedRemoteKeys.has(key) ? remoteMap.get(key) : undefined

    if (remote) {
      consumedRemoteKeys.add(key)

      let merged = { ...local }

      // Update completion from remote
      if (remote.isCompleted && !local.isCompleted) {
        merged = {
          ...merged,
          isCompleted: true,
          completedAt: remote.completedAt ?? new Date().toISOString(),
        }
      }

      // Update processedBy from remote
      if (remote.processedBy) {
        merged = { ...merged, processedBy: remote.processedBy }
      }

      // Take remote body only if longer AND local is synced (not pending)
      if (remote.body.length > local.body.length && local.syncStatus === 'synced') {
        merged = { ...merged, body: remote.body }
      }

      result.push(merged)
    } else if (local.syncStatus === 'synced') {
      // Local synced task missing from remote — archive it
      const prefix = '[Archived] '
      const archivedBody = local.body.startsWith(prefix)
        ? local.body
        : prefix + local.body
      result.push({
        ...local,
        isCompleted: true,
        completedAt: new Date().toISOString(),
        body: archivedBody,
      })
    } else {
      // Local pending task — keep as-is (unpushed idea)
      result.push(local)
    }
  }

  // Add remote-only tasks
  let maxOrder = result.reduce((max, t) => Math.max(max, t.order ?? 0), -1)
  for (const remote of remoteTasks) {
    if (!consumedRemoteKeys.has(titleKey(remote))) {
      maxOrder++
      result.push({ ...remote, syncStatus: 'synced', order: maxOrder })
    }
  }

  // Safety guard: every local task ID must exist in the output
  const resultIds = new Set(result.map((t) => t.id))
  const missingIds = localTasks.filter((t) => !resultIds.has(t.id))
  if (missingIds.length > 0) {
    console.warn(
      `[buildMergedTaskList] Safety guard triggered: ${missingIds.length} local task(s) missing from merge result. Returning local tasks + new remote tasks as fail-safe.`,
    )
    const localIds = new Set(localTasks.map((t) => t.id))
    const remoteOnly = result.filter((t) => !localIds.has(t.id))
    return [...localTasks, ...remoteOnly]
  }

  return result
}
