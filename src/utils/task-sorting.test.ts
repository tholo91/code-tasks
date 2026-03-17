import { describe, it, expect } from 'vitest'
import type { Task } from '../types/task'
import { sortTasksForDisplay } from './task-sorting'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-id',
    username: 'user',
    repoFullName: 'user/repo',
    title: 'Test task',
    body: '',
    createdAt: '2026-03-10T10:00:00.000Z',
    isImportant: false,
    isCompleted: false,
    completedAt: null,
    updatedAt: null,
    order: 0,
    syncStatus: 'pending',
    githubIssueNumber: null,
    ...overrides,
  }
}

describe('sortTasksForDisplay', () => {
  describe('manual sort (default)', () => {
    it('sorts active tasks by order asc', () => {
      const tasks = [
        makeTask({ id: '1', order: 2, title: 'Second' }),
        makeTask({ id: '2', order: 0, title: 'First' }),
        makeTask({ id: '3', order: 1, title: 'Third' }),
      ]
      const result = sortTasksForDisplay(tasks)
      expect(result.active.map(t => t.title)).toEqual(['First', 'Third', 'Second'])
    })

    it('backward compatibility: calling without sortMode uses manual order', () => {
      const tasks = [
        makeTask({ id: '1', order: 1, title: 'B' }),
        makeTask({ id: '2', order: 0, title: 'A' }),
      ]
      const result = sortTasksForDisplay(tasks, {})
      expect(result.active[0].title).toBe('A')
    })

    it('explicit manual mode matches default behavior', () => {
      const tasks = [
        makeTask({ id: '1', order: 1, title: 'B' }),
        makeTask({ id: '2', order: 0, title: 'A' }),
      ]
      const result = sortTasksForDisplay(tasks, { sortMode: 'manual' })
      expect(result.active[0].title).toBe('A')
    })
  })

  describe('created-desc sort', () => {
    it('sorts active tasks by createdAt desc (newest first)', () => {
      const tasks = [
        makeTask({ id: '1', createdAt: '2026-03-10T10:00:00.000Z', title: 'Older', order: 0 }),
        makeTask({ id: '2', createdAt: '2026-03-15T10:00:00.000Z', title: 'Newer', order: 1 }),
      ]
      const result = sortTasksForDisplay(tasks, { sortMode: 'created-desc' })
      expect(result.active[0].title).toBe('Newer')
      expect(result.active[1].title).toBe('Older')
    })
  })

  describe('updated-desc sort', () => {
    it('task with updatedAt comes before task without updatedAt', () => {
      const tasks = [
        makeTask({ id: '1', createdAt: '2026-03-10T10:00:00.000Z', updatedAt: null, title: 'NoUpdate', order: 0 }),
        makeTask({ id: '2', createdAt: '2026-03-08T10:00:00.000Z', updatedAt: '2026-03-16T10:00:00.000Z', title: 'WithUpdate', order: 1 }),
      ]
      const result = sortTasksForDisplay(tasks, { sortMode: 'updated-desc' })
      expect(result.active[0].title).toBe('WithUpdate')
    })

    it('among two tasks with updatedAt, later one comes first', () => {
      const tasks = [
        makeTask({ id: '1', updatedAt: '2026-03-14T10:00:00.000Z', title: 'OlderUpdate', order: 0 }),
        makeTask({ id: '2', updatedAt: '2026-03-16T10:00:00.000Z', title: 'NewerUpdate', order: 1 }),
      ]
      const result = sortTasksForDisplay(tasks, { sortMode: 'updated-desc' })
      expect(result.active[0].title).toBe('NewerUpdate')
    })

    it('tasks without updatedAt fall back to createdAt desc', () => {
      const tasks = [
        makeTask({ id: '1', createdAt: '2026-03-10T10:00:00.000Z', updatedAt: null, title: 'OlderCreated', order: 0 }),
        makeTask({ id: '2', createdAt: '2026-03-14T10:00:00.000Z', updatedAt: null, title: 'NewerCreated', order: 1 }),
      ]
      const result = sortTasksForDisplay(tasks, { sortMode: 'updated-desc' })
      expect(result.active[0].title).toBe('NewerCreated')
    })
  })

  describe('priority-first sort', () => {
    it('important tasks appear before normal tasks', () => {
      const tasks = [
        makeTask({ id: '1', isImportant: false, order: 0, title: 'Normal' }),
        makeTask({ id: '2', isImportant: true, order: 1, title: 'Important' }),
      ]
      const result = sortTasksForDisplay(tasks, { sortMode: 'priority-first' })
      expect(result.active[0].title).toBe('Important')
      expect(result.active[1].title).toBe('Normal')
    })

    it('within same importance group, manual order is preserved', () => {
      const tasks = [
        makeTask({ id: '1', isImportant: true, order: 2, title: 'Imp-Second' }),
        makeTask({ id: '2', isImportant: true, order: 0, title: 'Imp-First' }),
      ]
      const result = sortTasksForDisplay(tasks, { sortMode: 'priority-first' })
      expect(result.active[0].title).toBe('Imp-First')
      expect(result.active[1].title).toBe('Imp-Second')
    })

    it('normal tasks also respect manual order within their group', () => {
      const tasks = [
        makeTask({ id: '1', isImportant: false, order: 3, title: 'Normal-Last' }),
        makeTask({ id: '2', isImportant: true, order: 1, title: 'Important' }),
        makeTask({ id: '3', isImportant: false, order: 0, title: 'Normal-First' }),
      ]
      const result = sortTasksForDisplay(tasks, { sortMode: 'priority-first' })
      expect(result.active[0].title).toBe('Important')
      expect(result.active[1].title).toBe('Normal-First')
      expect(result.active[2].title).toBe('Normal-Last')
    })
  })

  describe('completed tasks', () => {
    it('completed sort is by completedAt desc regardless of sortMode', () => {
      const tasks = [
        makeTask({ id: '1', isCompleted: true, completedAt: '2026-03-10T10:00:00.000Z', title: 'OlderDone', order: 0 }),
        makeTask({ id: '2', isCompleted: true, completedAt: '2026-03-15T10:00:00.000Z', title: 'NewerDone', order: 1 }),
      ]
      const result = sortTasksForDisplay(tasks, { sortMode: 'created-desc' })
      expect(result.completed[0].title).toBe('NewerDone')
      expect(result.completed[1].title).toBe('OlderDone')
    })
  })
})
