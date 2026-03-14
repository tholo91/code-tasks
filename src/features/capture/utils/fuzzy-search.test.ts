import { describe, it, expect } from 'vitest'
import { createTaskFuse, searchTasks } from './fuzzy-search'
import type { Task } from '../../../types/task'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-uuid-1',
    username: 'testuser',
    title: 'Fix login bug',
    body: 'The login button is broken on mobile',
    isImportant: false,
    createdAt: '2026-03-14T10:00:00Z',
    syncStatus: 'pending',
    githubIssueNumber: null,
    ...overrides,
  }
}

const sampleTasks: Task[] = [
  createTask({ id: '1', title: 'Fix login bug', body: 'Auth flow is broken' }),
  createTask({ id: '2', title: 'Add dark mode', body: 'Support theme switching' }),
  createTask({ id: '3', title: 'Refactor component structure', body: '' }),
  createTask({ id: '4', title: 'Update dependencies', body: 'Bump React to v19' }),
]

describe('fuzzy-search', () => {
  describe('createTaskFuse', () => {
    it('creates a Fuse instance from tasks', () => {
      const fuse = createTaskFuse(sampleTasks)
      expect(fuse).toBeDefined()
      expect(typeof fuse.search).toBe('function')
    })
  })

  describe('searchTasks', () => {
    it('returns task on exact title match', () => {
      const fuse = createTaskFuse(sampleTasks)
      const results = searchTasks(fuse, 'dark mode')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('2')
    })

    it('returns task on fuzzy title match (typo)', () => {
      const fuse = createTaskFuse(sampleTasks)
      const results = searchTasks(fuse, 'compnent')
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.some((t) => t.id === '3')).toBe(true)
    })

    it('returns task on body match', () => {
      const fuse = createTaskFuse(sampleTasks)
      const results = searchTasks(fuse, 'theme switching')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('2')
    })

    it('returns empty array when no match', () => {
      const fuse = createTaskFuse(sampleTasks)
      const results = searchTasks(fuse, 'xyznonexistent')
      expect(results).toHaveLength(0)
    })

    it('handles empty task list', () => {
      const fuse = createTaskFuse([])
      const results = searchTasks(fuse, 'anything')
      expect(results).toHaveLength(0)
    })
  })
})
