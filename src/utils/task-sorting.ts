import type { Task } from '../types/task'

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
  const { pendingToggleIds } = options

  for (const task of tasks) {
    const isPending = pendingToggleIds?.has(task.id) ?? false
    const effectiveCompleted = isPending ? !task.isCompleted : task.isCompleted
    if (effectiveCompleted) {
      completed.push(task)
    } else {
      active.push(task)
    }
  }

  active.sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0)
    if (orderDiff !== 0) return orderDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  completed.sort((a, b) => getCompletedTimestamp(b) - getCompletedTimestamp(a))

  return { active, completed, all: [...active, ...completed] }
}
