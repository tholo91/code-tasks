import { describe, it, expect } from 'vitest'
import type { Task } from '../../../types/task'
import {
  HEADER_SIGNATURE,
  getAIReadyHeader,
  hasAIReadyHeader,
  formatTaskAsMarkdown,
  formatTasksAsMarkdown,
  buildFileContent,
} from './markdown-templates'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-id-1',
    username: 'testuser',
    title: 'Fix the login bug',
    body: 'Users are seeing an error on the login page',
    createdAt: '2026-03-14T10:00:00.000Z',
    isImportant: false,
    syncStatus: 'pending',
    githubIssueNumber: null,
    ...overrides,
  }
}

describe('markdown-templates', () => {
  describe('HEADER_SIGNATURE', () => {
    it('is an HTML comment marker', () => {
      expect(HEADER_SIGNATURE).toBe('<!-- code-tasks:ai-ready-header -->')
    })
  })

  describe('getAIReadyHeader', () => {
    it('includes the signature', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain(HEADER_SIGNATURE)
    })

    it('includes the username in the title', () => {
      const header = getAIReadyHeader('thomas')
      expect(header).toContain('# Captured Ideas — thomas')
    })

    it('includes AI agent instructions', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('Instructions for AI Agents')
      expect(header).toContain('living document')
      expect(header).toContain('Mark tasks as done')
    })

    it('includes priority legend references', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('🔴 Important')
      expect(header).toContain('⚪ Normal')
    })

    it('ends with a separator', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('---')
    })
  })

  describe('hasAIReadyHeader', () => {
    it('returns true when content contains the signature', () => {
      const content = `${HEADER_SIGNATURE}\n# Captured Ideas\nSome content`
      expect(hasAIReadyHeader(content)).toBe(true)
    })

    it('returns false when content lacks the signature', () => {
      const content = '# Some Other File\nNo header here'
      expect(hasAIReadyHeader(content)).toBe(false)
    })

    it('returns false for empty content', () => {
      expect(hasAIReadyHeader('')).toBe(false)
    })
  })

  describe('formatTaskAsMarkdown', () => {
    it('formats a normal priority task without body', () => {
      const task = createTask({ body: '' })
      const result = formatTaskAsMarkdown(task)
      expect(result).toBe(
        '- [ ] **Fix the login bug** ([Created: 2026-03-14]) (Priority: ⚪ Normal)',
      )
    })

    it('formats a task with body on the next line', () => {
      const task = createTask()
      const result = formatTaskAsMarkdown(task)
      expect(result).toBe(
        '- [ ] **Fix the login bug** ([Created: 2026-03-14]) (Priority: ⚪ Normal)\n  Users are seeing an error on the login page',
      )
    })

    it('formats an important task', () => {
      const task = createTask({ isImportant: true, body: '' })
      const result = formatTaskAsMarkdown(task)
      expect(result).toContain('Priority: 🔴 Important')
    })

    it('extracts date from ISO timestamp', () => {
      const task = createTask({
        createdAt: '2026-01-15T23:45:00.000Z',
        body: '',
      })
      const result = formatTaskAsMarkdown(task)
      expect(result).toContain('[Created: 2026-01-15]')
    })
  })

  describe('formatTasksAsMarkdown', () => {
    it('joins multiple tasks with newlines', () => {
      const tasks = [
        createTask({ id: '1', title: 'Task A', body: '' }),
        createTask({ id: '2', title: 'Task B', body: '' }),
      ]
      const result = formatTasksAsMarkdown(tasks)
      const lines = result.split('\n')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('**Task A**')
      expect(lines[1]).toContain('**Task B**')
    })
  })

  describe('buildFileContent', () => {
    const username = 'testuser'

    it('creates new file with header + tasks when no existing content', () => {
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(null, tasks, username)

      expect(result).toContain(HEADER_SIGNATURE)
      expect(result).toContain('# Captured Ideas — testuser')
      expect(result).toContain('**Fix the login bug**')
    })

    it('prepends header to existing content without header', () => {
      const existing = '- [ ] Old task from manual entry'
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(existing, tasks, username)

      expect(result).toContain(HEADER_SIGNATURE)
      expect(result).toContain('Old task from manual entry')
      expect(result).toContain('**Fix the login bug**')
      // Header should come before old content
      const headerIdx = result.indexOf(HEADER_SIGNATURE)
      const oldIdx = result.indexOf('Old task')
      const newIdx = result.indexOf('Fix the login bug')
      expect(headerIdx).toBeLessThan(oldIdx)
      expect(oldIdx).toBeLessThan(newIdx)
    })

    it('appends tasks only when header already exists', () => {
      const existing = getAIReadyHeader(username) + '- [ ] Existing task'
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(existing, tasks, username)

      // Should have only one header
      const firstIdx = result.indexOf(HEADER_SIGNATURE)
      const secondIdx = result.indexOf(HEADER_SIGNATURE, firstIdx + 1)
      expect(secondIdx).toBe(-1)

      expect(result).toContain('Existing task')
      expect(result).toContain('**Fix the login bug**')
    })

    it('includes task body indented under the task', () => {
      const tasks = [createTask()]
      const result = buildFileContent(null, tasks, username)
      expect(result).toContain(
        '\n  Users are seeing an error on the login page',
      )
    })

    it('ends with a trailing newline', () => {
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(null, tasks, username)
      expect(result.endsWith('\n')).toBe(true)
    })
  })
})
