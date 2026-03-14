/**
 * Task type definitions for local-first task capture.
 * Tasks are created locally with UUID v4 IDs and synced to GitHub later.
 */

export type SyncStatus = 'pending' | 'synced'

export type PriorityFilter = 'all' | 'important' | 'not-important'

export interface Task {
  /** UUID v4 — unique per task, scoped by username */
  id: string
  /** Username that created this task (scoping key) */
  username: string
  /** First line of the captured text (title) */
  title: string
  /** Remaining lines (body), may be empty */
  body: string
  /** ISO 8601 timestamp of creation */
  createdAt: string
  /** Whether the task was marked as important at capture time */
  isImportant: boolean
  /** Sync status: 'pending' = local only, 'synced' = pushed to GitHub */
  syncStatus: SyncStatus
  /** GitHub issue number once synced, null while pending */
  githubIssueNumber: number | null
}
