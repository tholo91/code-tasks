import { describe, it, expect } from 'vitest'
import type { Task } from '../../../types/task'
import {
  HEADER_SIGNATURE,
  MANAGED_START,
  MANAGED_END,
  AGENT_FRONT_DOOR_SIGNATURE,
  getAIReadyHeader,
  hasAIReadyHeader,
  splitAtMarkers,
  formatTaskAsMarkdown,
  formatTasksAsMarkdown,
  buildFileContent,
  buildFullFileContent,
  parseTasksFromMarkdown,
  getAgentFrontDoor,
  getAgentFrontDoorDE,
  hasAgentFrontDoor,
  appendAgentFrontDoor,
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
      expect(header).toContain('# Captured Ideas - thomas')
    })

    it('includes AI agent instructions about managed section', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('Instructions for AI Agents')
      expect(header).toContain('managed-start')
      expect(header).toContain('managed-end')
      expect(header).toContain('Tasks between the `managed-start` and `managed-end` markers are auto-generated. Never edit them by hand.')
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

    it('directively tells the agent to scan and print unchecked tasks grouped by priority', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('First action every session:')
      expect(header).toContain('scan the managed block for unchecked items')
      expect(header).toContain('grouped by priority')
      expect(header).toContain('Then wait for direction. Do not execute silently.')
    })

    it('provides trivial-vs-non-trivial decision criteria', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('Trivial')
      expect(header).toContain('≤ 30 min, clearly bounded, no design choices')
      expect(header).toContain('Non-trivial')
      expect(header).toContain('propose turning it into a story or quick spec')
    })

    it('does not use the old passive task-check phrasing', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).not.toContain('check for new open tasks')
    })

    it('includes note that content below managed-end is not overwritten', () => {
      const header = getAIReadyHeader('testuser')
      expect(header).toContain('You may add notes or context **below** the `managed-end` marker. They will not be overwritten')
    })

    it('includes the branch-awareness line when a syncBranch is provided', () => {
      const header = getAIReadyHeader('tholo91', 'gitty/tholo91')
      expect(header).toContain('> 8. 📍 This file is synced to branch `gitty/tholo91` in this repo. To get the latest captures from another branch, run: `git fetch && git show origin/gitty/tholo91:captured-ideas-tholo91.md`.')
    })

    it('omits the branch-awareness line when no syncBranch is provided', () => {
      const header = getAIReadyHeader('tholo91')
      expect(header).not.toContain('📍')
      expect(header).not.toContain('This file is synced to branch')
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
        '- [ ] **Fix the login bug** ([Created: 2026-03-14]) (Priority: ⚪ Normal) <!-- ct:test-id-1 -->',
      )
    })

    it('formats a task with body on the next line', () => {
      const task = createTask()
      const result = formatTaskAsMarkdown(task)
      expect(result).toBe(
        '- [ ] **Fix the login bug** ([Created: 2026-03-14]) (Priority: ⚪ Normal) <!-- ct:test-id-1 -->\n  Users are seeing an error on the login page',
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
      expect(result).toContain('# Captured Ideas - testuser')
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

    it('writes full template with managed markers around an empty task list on a fresh repo, and hasAIReadyHeader detects it', () => {
      // Fresh repo: no existing file (null), no tasks yet
      const result = buildFileContent(null, [], username)

      expect(hasAIReadyHeader(result)).toBe(true)
      expect(result).toContain(HEADER_SIGNATURE)
      expect(result).toContain(MANAGED_START)
      expect(result).toContain(MANAGED_END)

      // managed-start precedes managed-end and nothing task-like sits between them
      const startIdx = result.indexOf(MANAGED_START) + MANAGED_START.length
      const endIdx = result.indexOf(MANAGED_END)
      expect(startIdx).toBeLessThan(endIdx)
      expect(result.substring(startIdx, endIdx).trim()).toBe('')
    })

    it('emits the branch line when a syncBranch is passed (new file)', () => {
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(null, tasks, username, 'gitty/testuser')
      expect(result).toContain('> 8. 📍 This file is synced to branch `gitty/testuser` in this repo.')
      expect(result).toContain('git show origin/gitty/testuser:captured-ideas-testuser.md')
    })

    it('emits the branch line when a syncBranch is passed (headerless existing file)', () => {
      const existing = '- [ ] Old task from manual entry'
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(existing, tasks, username, 'gitty/testuser')
      expect(result).toContain('> 8. 📍 This file is synced to branch `gitty/testuser` in this repo.')
    })

    it('omits the branch line when no syncBranch is passed (new file)', () => {
      const tasks = [createTask({ body: '' })]
      const result = buildFileContent(null, tasks, username)
      expect(result).not.toContain('📍')
    })

    it('refreshes a stale branch line on incremental sync when the branch changes (Case 4)', () => {
      const tasks = [createTask({ body: '' })]
      // First sync writes the file pointing at the old branch.
      const firstSync = buildFileContent(null, tasks, username, 'gitty/old-branch')
      expect(firstSync).toContain('synced to branch `gitty/old-branch`')
      // User changes the branch override; an incremental sync (Case 4 — file
      // already has markers) must rewrite the branch line, not preserve it.
      const secondSync = buildFileContent(firstSync, tasks, username, 'gitty/new-branch')
      expect(secondSync).toContain('synced to branch `gitty/new-branch`')
      expect(secondSync).not.toContain('gitty/old-branch')
      // Header signature stays present exactly once (no duplication).
      expect(secondSync.split(HEADER_SIGNATURE).length - 1).toBe(1)
    })

    it('preserves the existing header on incremental sync when no syncBranch is passed (Case 4)', () => {
      const tasks = [createTask({ body: '' })]
      const firstSync = buildFileContent(null, tasks, username, 'gitty/main')
      const secondSync = buildFileContent(firstSync, tasks, username)
      // Common main-branch path: header untouched, stale-or-not, to avoid latency churn.
      expect(secondSync).toContain('synced to branch `gitty/main`')
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

    it('emits the branch line when a syncBranch is passed', () => {
      const tasks = [createTask({ id: '1', title: 'Active task', body: '' })]
      const result = buildFullFileContent(tasks, 'testuser', 'gitty/testuser')
      expect(result).toContain('> 8. 📍 This file is synced to branch `gitty/testuser` in this repo.')
      expect(result).toContain('git show origin/gitty/testuser:captured-ideas-testuser.md')
    })

    it('emits the branch line for an empty task list when a syncBranch is passed', () => {
      const result = buildFullFileContent([], 'testuser', 'gitty/testuser')
      expect(result).toContain('> 8. 📍 This file is synced to branch `gitty/testuser` in this repo.')
      expect(result).toContain('No active tasks')
    })

    it('omits the branch line when no syncBranch is passed', () => {
      const tasks = [createTask({ id: '1', title: 'Active task', body: '' })]
      const result = buildFullFileContent(tasks, 'testuser')
      expect(result).not.toContain('📍')
    })

    it('preserves agent notes below managed-end when existing content is passed', () => {
      const tasks = [createTask({ id: '1', title: 'Active task', body: '' })]
      const existing = buildFullFileContent(tasks, 'testuser')
      const withNote = existing.replace(
        MANAGED_END + '\n',
        MANAGED_END + '\n\n## Agent Notes\n\nClaude: estimated 2h for this task.\n',
      )

      const rebuilt = buildFullFileContent(tasks, 'testuser', undefined, withNote)

      expect(rebuilt).toContain('## Agent Notes')
      expect(rebuilt).toContain('Claude: estimated 2h for this task.')
      // Note must live AFTER the managed-end marker, not inside the managed block.
      expect(rebuilt.indexOf('## Agent Notes')).toBeGreaterThan(rebuilt.indexOf(MANAGED_END))
    })

    it('does not duplicate the managed block when rebuilding with existing content', () => {
      const tasks = [createTask({ id: '1', title: 'Active task', body: '' })]
      const existing = buildFullFileContent(tasks, 'testuser')
      const rebuilt = buildFullFileContent(tasks, 'testuser', undefined, existing)

      expect(rebuilt.split(MANAGED_START).length - 1).toBe(1)
      expect(rebuilt.split(MANAGED_END).length - 1).toBe(1)
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

  describe('parseTasksFromMarkdown — stable id anchor', () => {
    it('extracts the id from a <!-- ct:ID --> anchor', () => {
      const content = `- [ ] **Fix login** ([Created: 2026-03-14]) (Priority: ⚪ Normal) <!-- ct:abc-123 -->`
      const tasks = parseTasksFromMarkdown(content)
      expect(tasks[0].id).toBe('abc-123')
    })

    it('returns null id for legacy lines without an anchor', () => {
      const content = `- [ ] **Fix login** ([Created: 2026-03-14]) (Priority: ⚪ Normal)`
      const tasks = parseTasksFromMarkdown(content)
      expect(tasks[0].id).toBeNull()
    })

    it('the anchor does not leak into title, processedBy or importance', () => {
      const content = `- [x] **Fix login** ([Created: 2026-03-14]) (Priority: 🔴 Important) [Processed by: Claude] <!-- ct:xyz-9 -->`
      const tasks = parseTasksFromMarkdown(content)
      expect(tasks[0].title).toBe('Fix login')
      expect(tasks[0].processedBy).toBe('Claude')
      expect(tasks[0].isImportant).toBe(true)
      expect(tasks[0].id).toBe('xyz-9')
    })

    it('round-trip: format then parse preserves the task id', () => {
      const task = createTask({ id: 'stable-uuid-7' })
      const markdown = formatTaskAsMarkdown(task)
      const parsed = parseTasksFromMarkdown(markdown)
      expect(parsed[0].id).toBe('stable-uuid-7')
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

    it('round-trip: title containing ** is stable and not truncated', () => {
      const task = createTask({ title: 'Add **bold** emphasis to docs', body: '' })
      const markdown = formatTaskAsMarkdown(task)
      const parsed = parseTasksFromMarkdown(markdown)
      // Title is non-empty, displayable, and not truncated at the inner **
      expect(parsed[0].title).toBe('Add *bold* emphasis to docs')

      // Second round-trip is stable (idempotent)
      const markdown2 = formatTaskAsMarkdown({ ...task, title: parsed[0].title })
      const parsed2 = parseTasksFromMarkdown(markdown2)
      expect(parsed2[0].title).toBe(parsed[0].title)
    })

    it('round-trip: 3-line body preserves all lines', () => {
      const body = 'Line one\nLine two\nLine three'
      const task = createTask({ body })
      const markdown = formatTaskAsMarkdown(task)
      const parsed = parseTasksFromMarkdown(markdown)
      expect(parsed[0].body).toBe(body)
    })
  })

  describe('Agent Front-Door Block', () => {
    describe('AGENT_FRONT_DOOR_SIGNATURE', () => {
      it('is an HTML comment marker', () => {
        expect(AGENT_FRONT_DOOR_SIGNATURE).toBe('<!-- code-tasks:agent-front-door -->')
      })
    })

    describe('getAgentFrontDoor (English)', () => {
      it('includes the signature marker', () => {
        const block = getAgentFrontDoor()
        expect(block).toContain(AGENT_FRONT_DOOR_SIGNATURE)
      })

      it('includes git fetch instruction', () => {
        const block = getAgentFrontDoor()
        expect(block).toContain('git fetch --quiet')
      })

      it('includes captured-ideas reference', () => {
        const block = getAgentFrontDoor()
        expect(block).toContain('captured-ideas-*.md')
      })

      it('includes AI agent instructions heading', () => {
        const block = getAgentFrontDoor()
        expect(block).toContain('Captured Ideas (Gitty)')
      })
    })

    describe('getAgentFrontDoorDE (German)', () => {
      it('includes the signature marker', () => {
        const block = getAgentFrontDoorDE()
        expect(block).toContain(AGENT_FRONT_DOOR_SIGNATURE)
      })

      it('includes German fetch instruction', () => {
        const block = getAgentFrontDoorDE()
        expect(block).toContain('git fetch --quiet')
      })

      it('is in German language', () => {
        const block = getAgentFrontDoorDE()
        expect(block).toContain('Captured Ideas (Gitty)')
        expect(block).toContain('Dieses Repo ist mit der Gitty-App')
      })
    })

    describe('hasAgentFrontDoor', () => {
      it('returns true when signature is present', () => {
        const content = 'Some content\n' + getAgentFrontDoor()
        expect(hasAgentFrontDoor(content)).toBe(true)
      })

      it('returns false when signature is absent', () => {
        const content = 'Some content without the marker'
        expect(hasAgentFrontDoor(content)).toBe(false)
      })

      it('returns false for empty string', () => {
        expect(hasAgentFrontDoor('')).toBe(false)
      })
    })

    describe('appendAgentFrontDoor', () => {
      it('appends block to non-empty content', () => {
        const existing = '# My Custom Readme\n\nSome description'
        const result = appendAgentFrontDoor(existing, false)
        expect(result).toContain(existing)
        expect(result).toContain(AGENT_FRONT_DOOR_SIGNATURE)
        expect(result).toContain('git fetch --quiet')
      })

      it('returns block unchanged when already present (idempotent)', () => {
        const block = getAgentFrontDoor()
        const content = 'Preamble\n\n' + block + '\n\nEpilogue'
        const result = appendAgentFrontDoor(content, false)
        expect(result).toBe(content)
      })

      it('returns just the block for null/empty input', () => {
        const result = appendAgentFrontDoor(null, false)
        expect(result).toContain(AGENT_FRONT_DOOR_SIGNATURE)
        expect(result).toContain('git fetch --quiet')
      })

      it('returns German block when isGerman=true', () => {
        const result = appendAgentFrontDoor(null, true)
        expect(result).toContain('Dieses Repo ist mit der Gitty-App')
      })

      it('idempotent: re-appending does not duplicate', () => {
        let content = appendAgentFrontDoor(null, false)
        const before = content
        content = appendAgentFrontDoor(content, false)
        expect(content).toBe(before)
      })

      it('preserves existing content when appending', () => {
        const existing = '## Section 1\n\nContent here.'
        const result = appendAgentFrontDoor(existing, false)
        expect(result).toContain(existing)
        expect(result).toContain(AGENT_FRONT_DOOR_SIGNATURE)
      })
    })
  })
})
