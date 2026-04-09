import { describe, it, expect } from 'vitest'
import type { Task } from '../../../types/task'
import {
  HEADER_SIGNATURE,
  MANAGED_START,
  MANAGED_END,
  getAIReadyHeader,
  hasAIReadyHeader,
  splitAtMarkers,
  formatTaskAsMarkdown,
  formatTasksAsMarkdown,
  buildFileContent,
  buildFullFileContent,
  parseTasksFromMarkdown,
} from './markdown-templates'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-id-1',
    username: 'testuser',
    repoFullName: 'testuser/repo',
    title: 'Fix the login bug',
    body: 'Users are seeing an error on the login page',
    createdAt: '2026-03-14T10:00:00.000Z',
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

describe('markdown-templates', () => {
  describe('HEADER_SIGNATURE', () => {
    it('is an HTML comment marker', () => {
      expect(HEADER_SIGNATURE).toBe('<!-- code-tasks:ai-ready-header -->')
    })
  })

  describe('MANAGED_START / MANAGED_END', () => {
    it('are HTML comment markers', () => {
      expect(MANAGED_START).toBe('<!-- code-tasks:managed-start -->')
      expect(MANAGED_END).toBe('<!-- code-tasks:managed-end -->')
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

    it('includes AI agent instructions about managed section', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('Instructions for AI Agents')
      expect(header).toContain('managed-start')
      expect(header).toContain('managed-end')
      expect(header).toContain('Do not manually edit tasks between the')
    })

    it('includes the MANAGED_START marker', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain(MANAGED_START)
    })

    it('ends with the managed-start marker and newline', () => {
      const header = getAIReadyHeader('testuser')
      expect(header.endsWith(MANAGED_START + '\n')).toBe(true)
    })

    it('includes updated mark-tasks instruction with [Processed by] tag format', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('[Processed by: YourAgentName]')
    })

    it('includes proactive task-check instruction for agents', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('At the start of each session')
      expect(header).toContain('check for new open tasks')
    })

    it('includes note that content below managed-end is not overwritten', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('You may add notes or context below the `managed-end` marker — they will not be overwritten')
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

  describe('splitAtMarkers', () => {
    it('splits content correctly at valid markers', () => {
      const content = `Before\n${MANAGED_START}\nTask content\n${MANAGED_END}\nAfter`
      const result = splitAtMarkers(content)
      expect(result.before).toBe('Before\n')
      expect(result.managed).toBe('\nTask content\n')
      expect(result.after).toBe('\nAfter')
    })

    it('returns full content as before when no markers present', () => {
      const content = 'Just some content without markers'
      const result = splitAtMarkers(content)
      expect(result).toEqual({ before: content, managed: '', after: '' })
    })

    it('throws when only start marker is present', () => {
      const content = `Before\n${MANAGED_START}\nContent`
      expect(() => splitAtMarkers(content)).toThrow('Malformed managed section markers')
    })

    it('throws when only end marker is present', () => {
      const content = `Before\n${MANAGED_END}\nContent`
      expect(() => splitAtMarkers(content)).toThrow('Malformed managed section markers')
    })

    it('throws when start comes after end', () => {
      const content = `${MANAGED_END}\nMiddle\n${MANAGED_START}`
      expect(() => splitAtMarkers(content)).toThrow('Malformed managed section markers')
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

    it('formats completed task with - [x] prefix and completed date', () => {
      const task = createTask({ isCompleted: true, completedAt: '2026-03-14T12:00:00Z', body: '' })
      const result = formatTaskAsMarkdown(task)
      expect(result).toMatch(/^- \[x\] /)
      expect(result).toContain('[Completed: 2026-03-14]')
    })

    it('formats active task with - [ ] prefix', () => {
      const task = createTask({ body: '' })
      const result = formatTaskAsMarkdown(task)
      expect(result).toMatch(/^- \[ \] /)
    })

    it('formats task with updatedAt including [Updated: date]', () => {
      const task = createTask({ updatedAt: '2026-03-16T14:00:00.000Z', body: '' })
      const result = formatTaskAsMarkdown(task)
      expect(result).toContain('[Updated: 2026-03-16]')
    })

    it('does not include [Updated:] when updatedAt is null', () => {
      const task = createTask({ updatedAt: null, body: '' })
      const result = formatTaskAsMarkdown(task)
      expect(result).not.toContain('[Updated:')
    })

    it('places [Updated:] before [Completed:] in output', () => {
      const task = createTask({
        updatedAt: '2026-03-15T10:00:00.000Z',
        isCompleted: true,
        completedAt: '2026-03-16T12:00:00.000Z',
        body: '',
      })
      const result = formatTaskAsMarkdown(task)
      const updatedIdx = result.indexOf('[Updated:')
      const completedIdx = result.indexOf('[Completed:')
      expect(updatedIdx).toBeGreaterThan(-1)
      expect(completedIdx).toBeGreaterThan(-1)
      expect(updatedIdx).toBeLessThan(completedIdx)
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
    it('joins multiple tasks with double newlines', () => {
      const tasks = [
        createTask({ id: '1', title: 'Task A', body: '' }),
        createTask({ id: '2', title: 'Task B', body: '' }),
      ]
      const result = formatTasksAsMarkdown(tasks)
      expect(result).toContain('**Task A**')
      expect(result).toContain('**Task B**')
      // Tasks separated by blank line
      expect(result).toContain('\n\n')
      const parts = result.split('\n\n')
      expect(parts[0]).toContain('**Task A**')
      expect(parts[1]).toContain('**Task B**')
    })
  })

  describe('buildFileContent', () => {
    const username = 'testuser'

    it('creates new file with header + markers + tasks when no existing content', () => {
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(null, tasks, username)

      expect(result).toContain(HEADER_SIGNATURE)
      expect(result).toContain('# Captured Ideas — testuser')
      expect(result).toContain(MANAGED_START)
      expect(result).toContain(MANAGED_END)
      expect(result).toContain('**Fix the login bug**')

      // Order: header (with managed-start) → tasks → managed-end
      const startIdx = result.indexOf(MANAGED_START)
      const taskIdx = result.indexOf('**Fix the login bug**')
      const endIdx = result.indexOf(MANAGED_END)
      expect(startIdx).toBeLessThan(taskIdx)
      expect(taskIdx).toBeLessThan(endIdx)
    })

    it('prepends header to existing content without header and preserves original after managed-end', () => {
      const existing = '- [ ] Old task from manual entry'
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(existing, tasks, username)

      expect(result).toContain(HEADER_SIGNATURE)
      expect(result).toContain(MANAGED_START)
      expect(result).toContain(MANAGED_END)
      expect(result).toContain('**Fix the login bug**')
      // Original content preserved AFTER managed-end (not inside managed section)
      expect(result).toContain('Old task from manual entry')
      const endIdx = result.indexOf(MANAGED_END)
      const oldIdx = result.indexOf('Old task from manual entry')
      expect(oldIdx).toBeGreaterThan(endIdx)
    })

    it('wraps legacy file content in markers on first sync', () => {
      // Legacy file: has header signature but no managed markers
      const legacyContent = `${HEADER_SIGNATURE}
# Captured Ideas — testuser

> Some instructions

---

- [ ] Old task one
- [ ] Old task two
`
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(legacyContent, tasks, username)

      expect(result).toContain(MANAGED_START)
      expect(result).toContain(MANAGED_END)
      expect(result).toContain('**Fix the login bug**')
    })

    it('handles legacy file with header but no separator gracefully', () => {
      // Legacy file with header signature but no '---\n' separator
      const legacyContent = `${HEADER_SIGNATURE}
# Captured Ideas — testuser

Some content without a separator line
`
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(legacyContent, tasks, username)

      expect(result).toContain(MANAGED_START)
      expect(result).toContain(MANAGED_END)
      expect(result).toContain('**Fix the login bug**')
      // Should not throw
    })

    it('rewrites between markers and preserves content outside', () => {
      const existing = getAIReadyHeader(username) +
        '\n\n- [ ] **Old Task** ([Created: 2026-03-13]) (Priority: ⚪ Normal)\n\n' +
        MANAGED_END +
        '\n\n## Agent Notes\n\nSome notes here\n'
      const tasks = [createTask({ title: 'New Task', body: '' })]
      const result = buildFileContent(existing, tasks, username)

      // Old task should be gone (rewritten)
      expect(result).not.toContain('**Old Task**')
      // New task should be present
      expect(result).toContain('**New Task**')
      // Content after MANAGED_END preserved
      expect(result).toContain('## Agent Notes')
      expect(result).toContain('Some notes here')
    })

    it('preserves content after managed-end (Notes section)', () => {
      const existing = getAIReadyHeader(username) +
        '\n\n- [ ] **Task** ([Created: 2026-03-13]) (Priority: ⚪ Normal)\n\n' +
        MANAGED_END +
        '\n\n## AI Agent Notes\n\nThese were added by an AI agent.\n'
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(existing, tasks, username)

      expect(result).toContain('## AI Agent Notes')
      expect(result).toContain('These were added by an AI agent.')
    })

    it('removes deleted tasks (task was in file but not in task list)', () => {
      const existing = getAIReadyHeader(username) +
        '\n\n- [ ] **Deleted Task** ([Created: 2026-03-13]) (Priority: ⚪ Normal)\n\n' +
        MANAGED_END + '\n'
      // Pass empty task list — the deleted task should be gone
      const result = buildFileContent(existing, [], username)

      expect(result).not.toContain('**Deleted Task**')
      expect(result).toContain(MANAGED_START)
      expect(result).toContain(MANAGED_END)
    })

    it('preserves task order matching array order', () => {
      const existing = getAIReadyHeader(username) + '\n\n' + MANAGED_END + '\n'
      const tasks = [
        createTask({ id: '1', title: 'First', body: '' }),
        createTask({ id: '2', title: 'Second', body: '' }),
        createTask({ id: '3', title: 'Third', body: '' }),
      ]
      const result = buildFileContent(existing, tasks, username)

      const firstIdx = result.indexOf('**First**')
      const secondIdx = result.indexOf('**Second**')
      const thirdIdx = result.indexOf('**Third**')
      expect(firstIdx).toBeLessThan(secondIdx)
      expect(secondIdx).toBeLessThan(thirdIdx)
    })

    it('creates empty managed section when task list is empty', () => {
      const existing = getAIReadyHeader(username) + '\n\nSome task\n\n' + MANAGED_END + '\n'
      const result = buildFileContent(existing, [], username)

      expect(result).toContain(MANAGED_START)
      expect(result).toContain(MANAGED_END)
      // No task content between markers
      const startIdx = result.indexOf(MANAGED_START) + MANAGED_START.length
      const endIdx = result.indexOf(MANAGED_END)
      const between = result.substring(startIdx, endIdx).trim()
      expect(between).toBe('')
    })

    it('separates tasks with blank lines (\\n\\n) in output', () => {
      const tasks = [
        createTask({ id: '1', title: 'Task A', body: '' }),
        createTask({ id: '2', title: 'Task B', body: '' }),
      ]
      const result = buildFileContent(null, tasks, username)

      // Between tasks there should be a blank line
      const taskAEnd = result.indexOf('(Priority: ⚪ Normal)', result.indexOf('**Task A**'))
      const taskBStart = result.indexOf('- [ ] **Task B**')
      const between = result.substring(taskAEnd, taskBStart)
      expect(between).toContain('\n\n')
    })
  })

  describe('buildFullFileContent', () => {
    it('generates header + active + completed sections', () => {
      const tasks = [
        createTask({ id: '1', title: 'Active task', body: '', order: 0 }),
        createTask({
          id: '2',
          title: 'Done task',
          body: '',
          isCompleted: true,
          completedAt: '2026-03-14T12:00:00Z',
          order: 1,
        }),
      ]
      const result = buildFullFileContent(tasks, 'testuser')

      expect(result).toContain(HEADER_SIGNATURE)
      expect(result).toContain('**Active task**')
      expect(result).toContain('## Completed')
      expect(result).toContain('**Done task**')
      expect(result).toContain(MANAGED_END)
    })

    it('sorts active tasks by order ascending', () => {
      const tasks = [
        createTask({ id: '1', title: 'Third', body: '', order: 2 }),
        createTask({ id: '2', title: 'First', body: '', order: 0 }),
        createTask({ id: '3', title: 'Second', body: '', order: 1 }),
      ]
      const result = buildFullFileContent(tasks, 'testuser')

      const firstIdx = result.indexOf('**First**')
      const secondIdx = result.indexOf('**Second**')
      const thirdIdx = result.indexOf('**Third**')
      expect(firstIdx).toBeLessThan(secondIdx)
      expect(secondIdx).toBeLessThan(thirdIdx)
    })

    it('sorts completed tasks by completedAt descending', () => {
      const tasks = [
        createTask({
          id: '1', title: 'Older', body: '',
          isCompleted: true, completedAt: '2026-03-10T12:00:00Z',
        }),
        createTask({
          id: '2', title: 'Newer', body: '',
          isCompleted: true, completedAt: '2026-03-14T12:00:00Z',
        }),
      ]
      const result = buildFullFileContent(tasks, 'testuser')

      const newerIdx = result.indexOf('**Newer**')
      const olderIdx = result.indexOf('**Older**')
      expect(newerIdx).toBeLessThan(olderIdx)
    })

    it('does not include deleted tasks (not in input = not in output)', () => {
      // Deleted tasks simply aren't in the array
      const tasks = [
        createTask({ id: '1', title: 'Kept task', body: '' }),
      ]
      const result = buildFullFileContent(tasks, 'testuser')

      expect(result).toContain('**Kept task**')
      expect(result).not.toContain('Deleted')
    })

    it('returns header + "No active tasks" note for empty task list', () => {
      const result = buildFullFileContent([], 'testuser')

      expect(result).toContain(HEADER_SIGNATURE)
      expect(result).toContain('No active tasks')
      expect(result).toContain('code-tasks')
      expect(result).toContain(MANAGED_END)
    })

    it('only shows active section when no completed tasks', () => {
      const tasks = [
        createTask({ id: '1', title: 'Active only', body: '' }),
      ]
      const result = buildFullFileContent(tasks, 'testuser')

      expect(result).toContain('**Active only**')
      expect(result).not.toContain('## Completed')
    })

    it('only shows completed section when no active tasks', () => {
      const tasks = [
        createTask({
          id: '1', title: 'Done only', body: '',
          isCompleted: true, completedAt: '2026-03-14T12:00:00Z',
        }),
      ]
      const result = buildFullFileContent(tasks, 'testuser')

      expect(result).toContain('## Completed')
      expect(result).toContain('**Done only**')
    })
  })

  describe('parseTasksFromMarkdown', () => {
    it('parses tasks from managed section', () => {
      const content = `${getAIReadyHeader('testuser')}
- [ ] **Task one** ([Created: 2026-03-10]) (Priority: ⚪ Normal)

- [x] **Task two** ([Created: 2026-03-11]) (Priority: 🔴 Important) [Completed: 2026-03-12]
  Follow-up line

${MANAGED_END}
`
      const tasks = parseTasksFromMarkdown(content)
      expect(tasks).toHaveLength(2)
      expect(tasks[0].title).toBe('Task one')
      expect(tasks[0].isCompleted).toBe(false)
      expect(tasks[1].isCompleted).toBe(true)
      expect(tasks[1].isImportant).toBe(true)
      expect(tasks[1].body).toBe('Follow-up line')
    })

    it('falls back to parsing entire content when no markers exist', () => {
      const content = `
- [ ] **Loose task** ([Created: 2026-03-01]) (Priority: ⚪ Normal)
  Notes here
`
      const tasks = parseTasksFromMarkdown(content)
      expect(tasks).toHaveLength(1)
      expect(tasks[0].title).toBe('Loose task')
      expect(tasks[0].body).toBe('Notes here')
    })

    it('ignores unrelated checkbox lines', () => {
      const content = `
- [ ] Not matching title format
- [x] **Proper task** ([Created: 2026-03-05]) (Priority: ⚪ Normal)
`
      const tasks = parseTasksFromMarkdown(content)
      expect(tasks).toHaveLength(1)
      expect(tasks[0].title).toBe('Proper task')
    })

    it('extracts processedBy from [Processed by: Claude] tag', () => {
      const content = `- [x] **Fix login** ([Created: 2026-03-14]) (Priority: ⚪ Normal) [Processed by: Claude]`
      const tasks = parseTasksFromMarkdown(content)
      expect(tasks).toHaveLength(1)
      expect(tasks[0].processedBy).toBe('Claude')
    })

    it('returns null for processedBy when tag is absent', () => {
      const content = `- [ ] **Fix login** ([Created: 2026-03-14]) (Priority: ⚪ Normal)`
      const tasks = parseTasksFromMarkdown(content)
      expect(tasks[0].processedBy).toBeNull()
    })
  })

  describe('formatTaskAsMarkdown — processedBy', () => {
    it('outputs [Processed by: Claude] when processedBy is set', () => {
      const task = createTask({ processedBy: 'Claude' })
      const result = formatTaskAsMarkdown(task)
      expect(result).toContain('[Processed by: Claude]')
    })

    it('omits [Processed by] tag when processedBy is null', () => {
      const task = createTask({ processedBy: null })
      const result = formatTaskAsMarkdown(task)
      expect(result).not.toContain('[Processed by:')
    })

    it('round-trip: format then parse preserves processedBy', () => {
      const task = createTask({ processedBy: 'Gemini' })
      const markdown = formatTaskAsMarkdown(task)
      const parsed = parseTasksFromMarkdown(markdown)
      expect(parsed[0].processedBy).toBe('Gemini')
    })
  })
})
