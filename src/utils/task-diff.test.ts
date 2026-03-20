import { describe, it, expect } from 'vitest'
import { computeImportDiff, buildMergedTaskList, buildImportFeedbackMessage, isAllZero } from './task-diff'
import type { Task } from '../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-' + Math.random().toString(36).slice(2),
    username: 'user',
    repoFullName: 'owner/repo',
    title: 'Test task',
    body: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    isImportant: false,
    isCompleted: false,
    completedAt: null,
    updatedAt: null,
    order: 0,
    syncStatus: 'synced',
    githubIssueNumber: null,
    ...overrides,
  }
}

describe('computeImportDiff', () => {
  it('counts completions by agent (remote completed, local not)', () => {
    const local = [
      makeTask({ title: 'Task A', isCompleted: false, syncStatus: 'synced' }),
      makeTask({ title: 'Task B', isCompleted: false, syncStatus: 'synced' }),
    ]
    const remote = [
      makeTask({ title: 'Task A', isCompleted: true }),
      makeTask({ title: 'Task B', isCompleted: true }),
    ]
    const diff = computeImportDiff(local, remote)
    expect(diff.completedByAgent).toBe(2)
  })

  it('counts updatedWithNotes when remote body is longer and local is synced', () => {
    const local = [makeTask({ title: 'Task A', body: 'short', syncStatus: 'synced' })]
    const remote = [makeTask({ title: 'Task A', body: 'much longer body with notes' })]
    const diff = computeImportDiff(local, remote)
    expect(diff.updatedWithNotes).toBe(1)
  })

  it('does NOT count updatedWithNotes if local is pending (F3 guard)', () => {
    const local = [makeTask({ title: 'Task A', body: 'short', syncStatus: 'pending' })]
    const remote = [makeTask({ title: 'Task A', body: 'much longer body with notes' })]
    const diff = computeImportDiff(local, remote)
    expect(diff.updatedWithNotes).toBe(0)
  })

  it('counts processedByAdded when remote has processedBy but local does not', () => {
    const local = [makeTask({ title: 'Task A', processedBy: null })]
    const remote = [makeTask({ title: 'Task A', processedBy: 'Claude' })]
    const diff = computeImportDiff(local, remote)
    expect(diff.processedByAdded).toBe(1)
  })

  it('counts archived for local synced tasks missing from remote', () => {
    const local = [makeTask({ title: 'Task A', syncStatus: 'synced' })]
    const remote: Task[] = []
    const diff = computeImportDiff(local, remote)
    expect(diff.archived).toBe(1)
  })

  it('counts newFromRemote for remote tasks with no local match', () => {
    const local: Task[] = []
    const remote = [makeTask({ title: 'Brand new task' })]
    const diff = computeImportDiff(local, remote)
    expect(diff.newFromRemote).toBe(1)
  })

  it('counts localSafeCount for local pending tasks', () => {
    const local = [
      makeTask({ title: 'Unpushed A', syncStatus: 'pending' }),
      makeTask({ title: 'Unpushed B', syncStatus: 'pending' }),
      makeTask({ title: 'Synced task', syncStatus: 'synced' }),
    ]
    const remote: Task[] = []
    const diff = computeImportDiff(local, remote)
    expect(diff.localSafeCount).toBe(2)
  })

  it('does not double-count for duplicate-titled local tasks', () => {
    const local = [
      makeTask({ title: 'Dup', isCompleted: false, syncStatus: 'synced' }),
      makeTask({ title: 'Dup', isCompleted: false, syncStatus: 'synced' }),
    ]
    const remote = [makeTask({ title: 'Dup', isCompleted: true })]
    const diff = computeImportDiff(local, remote)
    expect(diff.completedByAgent).toBe(1)
    // Second local task is unmatched synced → archived
    expect(diff.archived).toBe(1)
  })

  it('returns all zeros when local and remote are identical', () => {
    const task = makeTask({ title: 'Task A', syncStatus: 'synced' })
    const diff = computeImportDiff([task], [task])
    expect(diff.completedByAgent).toBe(0)
    expect(diff.updatedWithNotes).toBe(0)
    expect(diff.processedByAdded).toBe(0)
    expect(diff.archived).toBe(0)
    expect(diff.newFromRemote).toBe(0)
    expect(diff.localSafeCount).toBe(0)
  })
})

describe('isAllZero', () => {
  it('returns true for all-zero summary', () => {
    expect(isAllZero({ completedByAgent: 0, updatedWithNotes: 0, processedByAdded: 0, archived: 0, newFromRemote: 0, localSafeCount: 0 })).toBe(true)
  })

  it('returns false when any change count is non-zero', () => {
    expect(isAllZero({ completedByAgent: 1, updatedWithNotes: 0, processedByAdded: 0, archived: 0, newFromRemote: 0, localSafeCount: 0 })).toBe(false)
    expect(isAllZero({ completedByAgent: 0, updatedWithNotes: 0, processedByAdded: 0, archived: 1, newFromRemote: 0, localSafeCount: 0 })).toBe(false)
  })

  it('returns true when only localSafeCount is non-zero (local state, not a remote change)', () => {
    expect(isAllZero({ completedByAgent: 0, updatedWithNotes: 0, processedByAdded: 0, archived: 0, newFromRemote: 0, localSafeCount: 3 })).toBe(true)
  })
})

describe('buildMergedTaskList', () => {
  it('preserves local pending tasks (unpushed ideas are sacred)', () => {
    const pendingTask = makeTask({ title: 'My idea', syncStatus: 'pending', body: 'local draft' })
    const remote: Task[] = []
    const result = buildMergedTaskList([pendingTask], remote)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(pendingTask)
  })

  it('updates completion from remote', () => {
    const local = makeTask({ title: 'Fix bug', isCompleted: false, syncStatus: 'synced' })
    const remote = makeTask({ title: 'Fix bug', isCompleted: true, completedAt: '2026-03-18T10:00:00.000Z' })
    const result = buildMergedTaskList([local], [remote])
    expect(result[0].isCompleted).toBe(true)
    expect(result[0].completedAt).toBe('2026-03-18T10:00:00.000Z')
  })

  it('takes remote body when longer AND local is synced', () => {
    const local = makeTask({ title: 'Task', body: 'short', syncStatus: 'synced' })
    const remote = makeTask({ title: 'Task', body: 'longer body with agent notes' })
    const result = buildMergedTaskList([local], [remote])
    expect(result[0].body).toBe('longer body with agent notes')
  })

  it('keeps local body when local is pending even if remote is longer', () => {
    const local = makeTask({ title: 'Task', body: 'my local edit', syncStatus: 'pending' })
    const remote = makeTask({ title: 'Task', body: 'much longer remote body that should not win' })
    const result = buildMergedTaskList([local], [remote])
    expect(result[0].body).toBe('my local edit')
  })

  it('archives local synced tasks missing from remote with "[Archived] " prefix', () => {
    const local = makeTask({ title: 'Deleted on remote', syncStatus: 'synced', body: 'original body' })
    const result = buildMergedTaskList([local], [])
    expect(result[0].isCompleted).toBe(true)
    expect(result[0].body).toBe('[Archived] original body')
  })

  it('does not double-prefix "[Archived] " if already archived', () => {
    const local = makeTask({ title: 'Already archived', syncStatus: 'synced', body: '[Archived] original body' })
    const result = buildMergedTaskList([local], [])
    expect(result[0].body).toBe('[Archived] original body')
  })

  it('adds remote-only tasks with synced status', () => {
    const remote = makeTask({ title: 'New from remote', syncStatus: 'synced' })
    const result = buildMergedTaskList([], [remote])
    expect(result).toHaveLength(1)
    expect(result[0].syncStatus).toBe('synced')
    expect(result[0].title).toBe('New from remote')
  })

  it('title matching is case-insensitive and trims whitespace', () => {
    const local = makeTask({ title: '  Fix Bug  ', syncStatus: 'synced' })
    const remote = makeTask({ title: 'fix bug', isCompleted: true, completedAt: '2026-03-18T00:00:00.000Z' })
    const result = buildMergedTaskList([local], [remote])
    expect(result[0].isCompleted).toBe(true)
  })

  it('first-occurrence wins when duplicate titles exist', () => {
    const local1 = makeTask({ id: 'id-1', title: 'Duplicate', syncStatus: 'synced', order: 0 })
    const local2 = makeTask({ id: 'id-2', title: 'Duplicate', syncStatus: 'synced', order: 1 })
    const remote = makeTask({ title: 'Duplicate', isCompleted: true, completedAt: '2026-03-18T00:00:00.000Z' })
    const result = buildMergedTaskList([local1, local2], [remote])
    // First local task should be updated, second archived (no match since remote was consumed)
    expect(result.find((t) => t.id === 'id-1')?.isCompleted).toBe(true)
    expect(result.find((t) => t.id === 'id-2')?.body).toMatch(/^\[Archived\]/)
  })

  it('preserves local id, order, isImportant, createdAt, syncStatus for matched tasks', () => {
    const local = makeTask({
      id: 'local-id',
      title: 'Task',
      order: 5,
      isImportant: true,
      createdAt: '2026-01-15T00:00:00.000Z',
      syncStatus: 'synced',
    })
    const remote = makeTask({ title: 'Task', isCompleted: true, completedAt: '2026-03-18T00:00:00.000Z' })
    const result = buildMergedTaskList([local], [remote])
    expect(result[0].id).toBe('local-id')
    expect(result[0].order).toBe(5)
    expect(result[0].isImportant).toBe(true)
    expect(result[0].createdAt).toBe('2026-01-15T00:00:00.000Z')
  })

  it('never returns fewer tasks than the local input (safety guard)', () => {
    const local = [
      makeTask({ id: 'a', title: 'Task A', syncStatus: 'synced' }),
      makeTask({ id: 'b', title: 'Task B', syncStatus: 'pending' }),
      makeTask({ id: 'c', title: 'Task C', syncStatus: 'synced' }),
    ]
    const remote = [makeTask({ title: 'Task A', isCompleted: true })]
    const result = buildMergedTaskList(local, remote)
    expect(result.length).toBeGreaterThanOrEqual(local.length)
    // Every local task ID must exist in result
    const resultIds = new Set(result.map((t) => t.id))
    for (const t of local) {
      expect(resultIds.has(t.id)).toBe(true)
    }
  })

  it('preserves all local IDs even with empty remote', () => {
    const local = [
      makeTask({ id: 'x', title: 'Idea 1', syncStatus: 'pending' }),
      makeTask({ id: 'y', title: 'Idea 2', syncStatus: 'synced' }),
    ]
    const result = buildMergedTaskList(local, [])
    const resultIds = new Set(result.map((t) => t.id))
    expect(resultIds.has('x')).toBe(true)
    expect(resultIds.has('y')).toBe(true)
  })
})

describe('buildImportFeedbackMessage', () => {
  it('shows completed tasks and safe ideas', () => {
    const msg = buildImportFeedbackMessage({
      completedByAgent: 2, archived: 1, updatedWithNotes: 0,
      processedByAdded: 0, newFromRemote: 0, localSafeCount: 3,
    })
    expect(msg).toBe('3 tasks completed. Your 3 ideas are safe.')
  })

  it('shows new from remote', () => {
    const msg = buildImportFeedbackMessage({
      completedByAgent: 0, archived: 0, updatedWithNotes: 0,
      processedByAdded: 0, newFromRemote: 1, localSafeCount: 0,
    })
    expect(msg).toBe('1 new from remote.')
  })

  it('shows nothing changed when all zeros', () => {
    const msg = buildImportFeedbackMessage({
      completedByAgent: 0, archived: 0, updatedWithNotes: 0,
      processedByAdded: 0, newFromRemote: 0, localSafeCount: 0,
    })
    expect(msg).toBe('Nothing changed locally.')
  })

  it('appends safe ideas count when > 0', () => {
    const msg = buildImportFeedbackMessage({
      completedByAgent: 0, archived: 0, updatedWithNotes: 0,
      processedByAdded: 0, newFromRemote: 0, localSafeCount: 5,
    })
    expect(msg).toBe('Nothing changed locally. Your 5 ideas are safe.')
  })

  it('uses singular for 1 idea', () => {
    const msg = buildImportFeedbackMessage({
      completedByAgent: 1, archived: 0, updatedWithNotes: 0,
      processedByAdded: 0, newFromRemote: 0, localSafeCount: 1,
    })
    expect(msg).toBe('1 task completed. Your 1 idea is safe.')
  })
})
