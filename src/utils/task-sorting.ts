import type { Task, SortMode } from '../types/task'

export interface SortedTasks {
  active: Task[]
  completed: Task[]
  all: Task[]
}

interface SortOptions {
  /**
   * Optional set of task IDs that are mid-toggle.
   * When provided, those tasks are treated as if their completion state is inverted.
   */
  pendingToggleIds?: Set<string>
  /**
   * Sort mode for active tasks. Defaults to 'manual' (order asc).
   */
  sortMode?: SortMode
}

function getCompletedTimestamp(task: Task): number {
  if (task.completedAt) return new Date(task.completedAt).getTime()
  return new Date(task.createdAt).getTime()
}

/**
 * Centralized task sorting to keep UI and sync output in lockstep.
 * - Active tasks: order asc (fallback to createdAt desc)
 * - Completed tasks: completedAt desc (fallback to createdAt desc)
 */
export function sortTasksForDisplay(tasks: Task[], options: SortOptions = {}): SortedTasks {
  const active: Task[] = []
  const completed: Task[] = []
  const { pendingToggleIds, sortMode = 'manual' } = options

  for (const task of tasks) {
    const isPending = pendingToggleIds?.has(task.id) ?? false
    const effectiveCompleted = isPending ? !task.isCompleted : task.isCompleted
    if (effectiveCompleted) {
      completed.push(task)
    } else {
      active.push(task)
    }
  }

  switch (sortMode) {
    case 'created-desc':
      active.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      break
    case 'updated-desc':
      active.sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.createdAt).getTime()
        const bTime = new Date(b.updatedAt ?? b.createdAt).getTime()
        return bTime - aTime
      })
      break
    case 'priority-first':
      active.sort((a, b) => {
        if (a.isImportant !== b.isImportant) {
          return a.isImportant ? -1 : 1
        }
        const orderDiff = (a.order ?? 0) - (b.order ?? 0)
        if (orderDiff !== 0) return orderDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      break
    case 'manual':
    default:
      active.sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0)
        if (orderDiff !== 0) return orderDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }

  completed.sort((a, b) => getCompletedTimestamp(b) - getCompletedTimestamp(a))

  return { active, completed, all: [...active, ...completed] }
}
