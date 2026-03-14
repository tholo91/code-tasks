import { describe, it, expect } from 'vitest'
import type { Task } from '../../../types/task'
import type { PriorityFilter } from '../../../types/task'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-uuid-1',
    username: 'testuser',
    title: 'Test task',
    body: '',
    isImportant: false,
    createdAt: '2026-03-14T10:00:00Z',
    syncStatus: 'pending',
    githubIssueNumber: null,
    ...overrides,
  }
}

function applyPriorityFilter(tasks: Task[], filter: PriorityFilter): Task[] {
  if (filter === 'all') return tasks
  if (filter === 'important') return tasks.filter((t) => t.isImportant)
  return tasks.filter((t) => !t.isImportant)
}

const sampleTasks: Task[] = [
  createTask({ id: '1', title: 'Important task', isImportant: true }),
  createTask({ id: '2', title: 'Normal task', isImportant: false }),
  createTask({ id: '3', title: 'Another important', isImportant: true }),
  createTask({ id: '4', title: 'Another normal', isImportant: false }),
]

describe('priority filter pipeline', () => {
  it('filter "all" returns all tasks', () => {
    const result = applyPriorityFilter(sampleTasks, 'all')
    expect(result).toHaveLength(4)
  })

  it('filter "important" returns only isImportant: true tasks', () => {
    const result = applyPriorityFilter(sampleTasks, 'important')
    expect(result).toHaveLength(2)
    expect(result.every((t) => t.isImportant)).toBe(true)
  })

  it('filter "not-important" returns only isImportant: false tasks', () => {
    const result = applyPriorityFilter(sampleTasks, 'not-important')
    expect(result).toHaveLength(2)
    expect(result.every((t) => !t.isImportant)).toBe(true)
  })

  it('returns empty array when no tasks match filter', () => {
    const allImportant = [
      createTask({ id: '1', isImportant: true }),
      createTask({ id: '2', isImportant: true }),
    ]
    const result = applyPriorityFilter(allImportant, 'not-important')
    expect(result).toHaveLength(0)
  })

  it('handles empty task list', () => {
    const result = applyPriorityFilter([], 'important')
    expect(result).toHaveLength(0)
  })
})
