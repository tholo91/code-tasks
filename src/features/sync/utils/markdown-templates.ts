import type { Task } from '../../../types/task'

/**
 * Signature string used to detect if the AI-Ready header is already present.
 */
export const HEADER_SIGNATURE = '<!-- code-tasks:ai-ready-header -->'

/**
 * Managed section markers. Content between these markers is fully rewritten on each sync.
 */
export const MANAGED_START = '<!-- code-tasks:managed-start -->'
export const MANAGED_END = '<!-- code-tasks:managed-end -->'

/**
 * Standardized AI-Ready instruction header for captured-ideas files.
 * Follows the BMad "Living Document" standard for AI agent consumption.
 */
export function getAIReadyHeader(username: string): string {
  return `${HEADER_SIGNATURE}
# Captured Ideas — ${username}

> **Instructions for AI Agents:**
> This file is managed by [code-tasks](https://github.com/tholo91/code-tasks).
> The task list between the \`managed-start\` and \`managed-end\` markers below
> is auto-generated on each sync. Do not manually edit tasks between the
> markers — changes will be overwritten on the next push.
>
> - Tasks use Markdown checkboxes (\`- [ ]\` / \`- [x]\`)
> - Priority: 🔴 Important or ⚪ Normal
> - Mark tasks as done (\`- [x]\`) after processing
> - Add your own notes BELOW the managed-end marker

---

${MANAGED_START}
`
}

/**
 * Checks whether file content already contains the AI-Ready header.
 */
export function hasAIReadyHeader(content: string): boolean {
  return content.includes(HEADER_SIGNATURE)
}

/**
 * Splits file content at managed section markers.
 * Returns the content before, inside, and after the markers.
 * If no markers are found, returns the full content as `before` (legacy case).
 * Throws if markers are malformed (missing one, or in wrong order).
 */
export function splitAtMarkers(content: string): {
  before: string
  managed: string
  after: string
} {
  const startIdx = content.indexOf(MANAGED_START)
  const endIdx = content.indexOf(MANAGED_END)

  if (startIdx === -1 && endIdx === -1) {
    return { before: content, managed: '', after: '' }
  }

  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    throw new Error('Malformed managed section markers')
  }

  const before = content.substring(0, startIdx)
  const managed = content.substring(startIdx + MANAGED_START.length, endIdx)
  const after = content.substring(endIdx + MANAGED_END.length)

  return { before, managed, after }
}

/**
 * Formats a single task as a Markdown item with title, timestamp, priority, and description.
 *
 * Format: `- [ ] **Task Title** ([Created: 2026-03-14]) (Priority: 🔴 Important)`
 *         `  Description text on next line`
 */
export function formatTaskAsMarkdown(task: Task): string {
  const priority = task.isImportant ? '🔴 Important' : '⚪ Normal'
  const createdDate = task.createdAt.split('T')[0]
  const checkbox = task.isCompleted ? '- [x]' : '- [ ]'
  
  let line = `${checkbox} **${task.title}** ([Created: ${createdDate}]) (Priority: ${priority})`

  if (task.updatedAt) {
    const updatedDate = task.updatedAt.split('T')[0]
    line += ` [Updated: ${updatedDate}]`
  }

  if (task.isCompleted && task.completedAt) {
    const completedDate = task.completedAt.split('T')[0]
    line += ` [Completed: ${completedDate}]`
  }

  if (task.body) {
    line += `\n  ${task.body}`
  }
  return line
}

/**
 * Formats multiple tasks as Markdown, separated by newlines.
 */
export function formatTasksAsMarkdown(tasks: Task[]): string {
  return tasks.map(formatTaskAsMarkdown).join('\n\n')
}

export interface ParsedMarkdownTask {
  title: string
  body: string
  createdAt: string | null
  updatedAt: string | null
  completedAt: string | null
  isCompleted: boolean
  isImportant: boolean
}

function normalizeDate(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null
  const trimmed = dateValue.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function extractBracketValue(source: string, label: 'Created' | 'Updated' | 'Completed'): string | null {
  const match = source.match(new RegExp(`\\[${label}:\\s*([^\\]]+)\\]`))
  return match ? match[1].trim() : null
}

/**
 * Parses Markdown managed section into structured task data.
 * Designed to parse the format produced by `formatTaskAsMarkdown`.
 */
export function parseTasksFromMarkdown(content: string): ParsedMarkdownTask[] {
  let section = content
  if (content.includes(MANAGED_START) && content.includes(MANAGED_END)) {
    section = splitAtMarkers(content).managed
  }

  const lines = section.split('\n')
  const tasks: ParsedMarkdownTask[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trimEnd()
    if (!line.startsWith('- [')) continue

    const match = line.match(/^- \[(x| )\]\s+\*\*(.+?)\*\*(.*)$/i)
    if (!match) continue

    const checkbox = match[1].toLowerCase()
    const title = match[2].trim()
    const meta = match[3] ?? ''
    const isCompleted = checkbox === 'x'
    const isImportant = meta.includes('Important')

    const createdAt = normalizeDate(extractBracketValue(meta, 'Created'))
    const updatedAt = normalizeDate(extractBracketValue(meta, 'Updated'))
    const completedAt = normalizeDate(extractBracketValue(meta, 'Completed'))

    const bodyLines: string[] = []
    let cursor = i + 1
    while (cursor < lines.length && lines[cursor].startsWith('  ')) {
      bodyLines.push(lines[cursor].replace(/^  /, ''))
      cursor += 1
    }
    if (cursor > i + 1) {
      i = cursor - 1
    }

    tasks.push({
      title,
      body: bodyLines.join('\n').trim(),
      createdAt,
      updatedAt,
      completedAt,
      isCompleted,
      isImportant,
    })
  }

  return tasks
}

/**
 * Builds the COMPLETE file content from scratch for a full file rebuild.
 * Used by syncAllRepoTasks — produces header + active tasks (sorted by order)
 * + completed tasks (sorted by completedAt desc). Deleted tasks are absent
 * because they're not in the input array.
 */
export function buildFullFileContent(tasks: Task[], username: string): string {
  const header = getAIReadyHeader(username)

  const active = tasks
    .filter(t => !t.isCompleted)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const completed = tasks
    .filter(t => t.isCompleted)
    .sort((a, b) =>
      new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
    )

  if (active.length === 0 && completed.length === 0) {
    return header + '\n> No active tasks. Capture new ideas with [code-tasks](https://github.com/tholo91/code-tasks).\n\n' + MANAGED_END + '\n'
  }

  let managed = ''

  if (active.length > 0) {
    managed += '\n' + formatTasksAsMarkdown(active)
  }

  if (completed.length > 0) {
    if (active.length > 0) managed += '\n\n'
    managed += '\n## Completed\n\n' + formatTasksAsMarkdown(completed)
  }

  return header + managed + '\n\n' + MANAGED_END + '\n'
}

/**
 * Builds the complete file content using managed-section rewrite.
 *
 * Strategy:
 * 1. New file (null content): create header + markers + tasks
 * 2. Existing file without header: prepend header (with markers)
 * 3. Legacy file with header but no markers: insert markers around existing task content
 * 4. File with markers: split at markers, rewrite managed section, reassemble
 *
 * The `tasks` parameter is ALL repo tasks in display order (not just pending).
 */
export function buildFileContent(
  existingContent: string | null,
  tasks: Task[],
  username: string,
): string {
  const tasksMarkdown = formatTasksAsMarkdown(tasks)

  // Case 1: New file
  if (existingContent === null) {
    return getAIReadyHeader(username) + '\n' + tasksMarkdown + '\n\n' + MANAGED_END + '\n'
  }

  // Case 4: File already has both markers — split, rewrite managed section, reassemble
  if (existingContent.includes(MANAGED_START) && existingContent.includes(MANAGED_END)) {
    const { before, after } = splitAtMarkers(existingContent)
    const managedContent = tasksMarkdown.length > 0
      ? '\n\n' + tasksMarkdown + '\n\n'
      : '\n\n'
    return before + MANAGED_START + managedContent + MANAGED_END + after
  }

  // Case 2: Existing file without header — prepend header, preserve original content after managed-end
  if (!hasAIReadyHeader(existingContent)) {
    const preservedContent = existingContent.trim()
    const afterSection = preservedContent.length > 0 ? '\n\n' + preservedContent + '\n' : '\n'
    return getAIReadyHeader(username) + '\n' + tasksMarkdown + '\n\n' + MANAGED_END + afterSection
  }

  // Case 3: Legacy file with header but no markers
  // Anchor '---\n' search after HEADER_SIGNATURE to avoid matching body horizontal rules
  const headerSigIdx = existingContent.indexOf(HEADER_SIGNATURE)
  const separatorIdx = existingContent.indexOf('---\n', headerSigIdx + HEADER_SIGNATURE.length)
  if (separatorIdx !== -1) {
    const afterSeparator = separatorIdx + '---\n'.length
    const before = existingContent.substring(0, afterSeparator)
    return before + '\n' + MANAGED_START + '\n\n' + tasksMarkdown + '\n\n' + MANAGED_END + '\n'
  }

  // Fallback: header exists but no separator found — append markers at end
  return existingContent.trimEnd() + '\n\n' + MANAGED_START + '\n\n' + tasksMarkdown + '\n\n' + MANAGED_END + '\n'
}
