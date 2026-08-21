import { describe, it, expect } from 'vitest'
import { computeImportDiff, buildMergedTaskList, buildImportFeedbackMessage, isAllZero } from './task-diff'
import type { Task } from '../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  const task: Task = {
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
  if (task.isCompleted && !Object.prototype.hasOwnProperty.call(overrides, 'handoffStatus')) {
    task.captureRevision = task.captureRevision ?? task.id
    task.handoffStatus = 'done'
    task.proofUrl = 'https://github.com/owner/repo/commit/proof'
    task.processedBy = 'TestAgent'
    task.handledAt = task.completedAt ?? '2026-03-18T00:00:00.000Z'
  }
  return task
}

describe('computeImportDiff', () => {
  it('counts completions by agent (remote completed, local not)', () => {
    const local = [
      makeTask({ id: 'a', captureRevision: 'ra', title: 'Task A', isCompleted: false, syncStatus: 'synced' }),
      makeTask({ id: 'b', captureRevision: 'rb', title: 'Task B', isCompleted: false, syncStatus: 'synced' }),
    ]
    const remote = [
      makeTask({ id: 'a', captureRevision: 'ra', title: 'Task A', isCompleted: true }),
      makeTask({ id: 'b', captureRevision: 'rb', title: 'Task B', isCompleted: true }),
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

  it('counts updatedWithNotes for a pending task when the agent added a distinct note (preserved by append)', () => {
    const local = [makeTask({ title: 'Task A', body: 'short', syncStatus: 'pending' })]
    const remote = [makeTask({ title: 'Task A', body: 'much longer body with notes' })]
    const diff = computeImportDiff(local, remote)
    expect(diff.updatedWithNotes).toBe(1)
  })

  it('does NOT count updatedWithNotes for a pending task when remote note is already contained locally', () => {
    const local = [makeTask({ title: 'Task A', body: 'my edit\n\n---\nAgent note: done', syncStatus: 'pending' })]
    const remote = [makeTask({ title: 'Task A', body: 'done' })]
    const diff = computeImportDiff(local, remote)
    expect(diff.updatedWithNotes).toBe(0)
  })

  it('counts processedByAdded when remote has processedBy but local does not', () => {
    const local = [makeTask({ title: 'Task A', processedBy: null })]
    const remote = [makeTask({ title: 'Task A', processedBy: 'Claude' })]
    const diff = computeImportDiff(local, remote)
    expect(diff.processedByAdded).toBe(1)
  })

  it('counts a matching remote handoff receipt as actionable', () => {
    const local = [makeTask({ id: 'task-1', captureRevision: 'revision-1' })]
    const remote = [makeTask({
      id: 'task-1',
      captureRevision: 'revision-1',
      processedBy: 'Codex',
      handledAt: '2026-07-22T10:00:00.000Z',
      handoffStatus: 'filed',
      proofUrl: 'https://github.com/owner/repo/issues/42',
    })]

    expect(computeImportDiff(local, remote).handoffUpdates).toBe(1)
  })

  it('counts archived (kept, not deleted) for local synced tasks missing from remote', () => {
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
      makeTask({ id: 'dup-1', captureRevision: 'dup-r1', title: 'Dup', isCompleted: false, syncStatus: 'synced' }),
      makeTask({ id: 'dup-2', captureRevision: 'dup-r2', title: 'Dup', isCompleted: false, syncStatus: 'synced' }),
    ]
    const remote = [makeTask({ id: 'dup-1', captureRevision: 'dup-r1', title: 'Dup', isCompleted: true })]
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

  it('returns false when any actionable change count is non-zero', () => {
    expect(isAllZero({ completedByAgent: 1, updatedWithNotes: 0, processedByAdded: 0, archived: 0, newFromRemote: 0, localSafeCount: 0 })).toBe(false)
    expect(isAllZero({ completedByAgent: 0, updatedWithNotes: 0, processedByAdded: 0, archived: 0, newFromRemote: 1, localSafeCount: 0 })).toBe(false)
  })

  it('returns true when only localSafeCount is non-zero (local state, not a remote change)', () => {
    expect(isAllZero({ completedByAgent: 0, updatedWithNotes: 0, processedByAdded: 0, archived: 0, newFromRemote: 0, localSafeCount: 3 })).toBe(true)
  })

  it('returns true when only archived (vanished-but-kept) is non-zero — safe silent self-heal, no banner', () => {
    expect(isAllZero({ completedByAgent: 0, updatedWithNotes: 0, processedByAdded: 0, archived: 2, newFromRemote: 0, localSafeCount: 0 })).toBe(true)
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
    const local = makeTask({ id: 'fix', captureRevision: 'fix-r', title: 'Fix bug', isCompleted: false, syncStatus: 'synced' })
    const remote = makeTask({ id: 'fix', captureRevision: 'fix-r', title: 'Fix bug', isCompleted: true, completedAt: '2026-03-18T10:00:00.000Z' })
    const result = buildMergedTaskList([local], [remote])
    expect(result[0].isCompleted).toBe(true)
    expect(result[0].completedAt).toBe('2026-03-18T10:00:00.000Z')
  })

  it('imports a matching receipt without changing the capture content', () => {
    const local = makeTask({ id: 'task-1', captureRevision: 'revision-1', title: 'Original capture' })
    const remote = makeTask({
      id: 'task-1',
      captureRevision: 'revision-1',
      seenRevision: 'revision-1',
      seenBy: 'Codex',
      seenAt: '2026-07-22T10:00:00.000Z',
      handoffStatus: 'done',
      proofUrl: 'https://github.com/owner/repo/pull/42',
      handledAt: '2026-07-22T10:10:00.000Z',
      processedBy: 'Codex',
      title: 'Original capture',
    })

    const merged = buildMergedTaskList([local], [remote])[0]

    expect(merged.title).toBe('Original capture')
    expect(merged.handoffStatus).toBe('done')
    expect(merged.proofUrl).toBe('https://github.com/owner/repo/pull/42')
  })

  it('ignores a stale receipt for an older capture revision', () => {
    const local = makeTask({ id: 'task-1', captureRevision: 'revision-2', title: 'Newer capture' })
    const remote = makeTask({
      id: 'task-1',
      captureRevision: 'revision-1',
      seenRevision: 'revision-1',
      seenBy: 'Codex',
      seenAt: '2026-07-22T10:00:00.000Z',
      handoffStatus: 'done',
      proofUrl: 'https://github.com/owner/repo/pull/42',
      processedBy: 'Codex',
      isCompleted: true,
      body: 'Old agent note',
      title: 'Older capture',
    })

    const merged = buildMergedTaskList([local], [remote])[0]

    expect(merged.captureRevision).toBe('revision-2')
    expect(merged.handoffStatus).toBeUndefined()
    expect(merged.title).toBe('Newer capture')
    expect(merged.processedBy).toBeUndefined()
    expect(merged.isCompleted).toBe(false)
    expect(merged.body).toBe('')
  })

  it('keeps newer audit metadata when an equal-rank receipt is re-imported', () => {
    const local = makeTask({
      id: 'task-1',
      captureRevision: 'revision-1',
      seenRevision: 'revision-1',
      seenBy: 'Codex',
      seenAt: '2026-07-22T11:00:00.000Z',
      handoffStatus: 'filed',
      proofUrl: 'https://github.com/owner/repo/issues/42',
      handledAt: '2026-07-22T11:10:00.000Z',
      processedBy: 'Codex',
    })
    const remote = makeTask({
      id: 'task-1',
      captureRevision: 'revision-1',
      seenRevision: 'revision-1',
      seenBy: 'Claude',
      seenAt: '2026-07-22T10:00:00.000Z',
      handoffStatus: 'filed',
      proofUrl: 'https://github.com/owner/repo/issues/42',
      handledAt: '2026-07-22T10:10:00.000Z',
      processedBy: 'Claude',
    })

    const merged = buildMergedTaskList([local], [remote])[0]

    expect(merged.seenBy).toBe('Codex')
    expect(merged.seenAt).toBe('2026-07-22T11:00:00.000Z')
    expect(merged.handledAt).toBe('2026-07-22T11:10:00.000Z')
    expect(merged.processedBy).toBe('Codex')
  })

  it('does not apply a receipt that lacks agent audit metadata', () => {
    const local = makeTask({ id: 'task-1', captureRevision: 'revision-1' })
    const remote = makeTask({
      id: 'task-1',
      captureRevision: 'revision-1',
      seenRevision: 'revision-1',
      handoffStatus: 'filed',
      proofUrl: 'https://github.com/owner/repo/issues/42',
      isCompleted: true,
      processedBy: 'Codex',
    })

    const merged = buildMergedTaskList([local], [remote])[0]

    expect(merged.handoffStatus).toBeUndefined()
    expect(merged.isCompleted).toBe(false)
    expect(merged.processedBy).toBeUndefined()
  })

  it('takes remote body when longer AND local is synced', () => {
    const local = makeTask({ title: 'Task', body: 'short', syncStatus: 'synced' })
    const remote = makeTask({ title: 'Task', body: 'longer body with agent notes' })
    const result = buildMergedTaskList([local], [remote])
    expect(result[0].body).toBe('longer body with agent notes')
  })

  it('never overwrites a pending local edit; preserves the agent note by appending it', () => {
    const local = makeTask({ title: 'Task', body: 'my local edit', syncStatus: 'pending' })
    const remote = makeTask({ title: 'Task', body: 'agent note from desktop' })
    const result = buildMergedTaskList([local], [remote])
    expect(result[0].body).toContain('my local edit')
    expect(result[0].body).toContain('agent note from desktop')
    // Local edit comes first; agent note is appended below a divider.
    expect(result[0].body.indexOf('my local edit')).toBeLessThan(result[0].body.indexOf('agent note from desktop'))
  })

  it('appending the agent note is idempotent across repeated merges', () => {
    const local = makeTask({ title: 'Task', body: 'my local edit', syncStatus: 'pending' })
    const remote = makeTask({ title: 'Task', body: 'agent note' })
    const once = buildMergedTaskList([local], [remote])[0]
    const twice = buildMergedTaskList([once], [remote])[0]
    expect(twice.body).toBe(once.body)
  })

  it('KEEPS local synced tasks missing from remote untouched (no archive, no silent complete)', () => {
    const local = makeTask({ title: 'Vanished on remote', syncStatus: 'synced', body: 'original body', isCompleted: false })
    const result = buildMergedTaskList([local], [])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(local)
  })

  it('adds remote-only tasks with synced status', () => {
    const remote = makeTask({ title: 'New from remote', syncStatus: 'synced' })
    const result = buildMergedTaskList([], [remote])
    expect(result).toHaveLength(1)
    expect(result[0].syncStatus).toBe('synced')
    expect(result[0].title).toBe('New from remote')
  })

  it('title matching is case-insensitive and trims whitespace', () => {
    const local = makeTask({ id: 'fix', captureRevision: 'fix-r', title: '  Fix Bug  ', syncStatus: 'synced' })
    const remote = makeTask({ id: 'fix', captureRevision: 'fix-r', title: 'fix bug', isCompleted: true, completedAt: '2026-03-18T00:00:00.000Z' })
    const result = buildMergedTaskList([local], [remote])
    expect(result[0].isCompleted).toBe(true)
  })

  it('first-occurrence wins when duplicate titles exist; the unmatched twin is kept untouched', () => {
    const local1 = makeTask({ id: 'id-1', captureRevision: 'dup-r1', title: 'Duplicate', syncStatus: 'synced', order: 0 })
    const local2 = makeTask({ id: 'id-2', captureRevision: 'dup-r2', title: 'Duplicate', syncStatus: 'synced', order: 1, isCompleted: false })
    const remote = makeTask({ id: 'id-1', captureRevision: 'dup-r1', title: 'Duplicate', isCompleted: true, completedAt: '2026-03-18T00:00:00.000Z' })
    const result = buildMergedTaskList([local1, local2], [remote])
    // First local task is updated; the second has no remote to match and is kept as-is (not archived).
    expect(result.find((t) => t.id === 'id-1')?.isCompleted).toBe(true)
    expect(result.find((t) => t.id === 'id-2')?.isCompleted).toBe(false)
  })

  it('matches by stable id even when the agent renamed the task', () => {
    const local = makeTask({ id: 'shared-id', title: 'Fix login bug', syncStatus: 'synced' })
    const remote = makeTask({ id: 'shared-id', title: 'Fix OAuth redirect', isCompleted: true, completedAt: '2026-03-18T00:00:00.000Z' })
    const result = buildMergedTaskList([local], [remote])
    // One task, not a duplicate + a ghost.
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('shared-id')
    expect(result[0].isCompleted).toBe(true)
    // Synced local adopts the agent's rename.
    expect(result[0].title).toBe('Fix OAuth redirect')
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
  it('shows completed tasks and safe ideas (vanished-but-kept tasks are not counted as completed)', () => {
    const msg = buildImportFeedbackMessage({
      completedByAgent: 2, archived: 1, updatedWithNotes: 0,
      processedByAdded: 0, newFromRemote: 0, localSafeCount: 3,
    })
    expect(msg).toBe('2 tasks completed. Your 3 ideas are safe.')
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
