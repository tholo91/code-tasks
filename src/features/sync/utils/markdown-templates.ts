import type { Task } from '../../../types/task'

/**
 * Signature string used to detect if the AI-Ready header is already present.
 */
export const HEADER_SIGNATURE = '<!-- code-tasks:ai-ready-header -->'

/**
 * Standardized AI-Ready instruction header for captured-ideas files.
 * Follows the BMad "Living Document" standard for AI agent consumption.
 */
export function getAIReadyHeader(username: string): string {
  return `${HEADER_SIGNATURE}
# Captured Ideas — ${username}

> **Instructions for AI Agents:**
> This is a living document managed by [code-tasks](https://github.com/tholo91/code-tasks).
> Each task below is a captured idea from the developer, formatted for immediate processing.
>
> - Tasks are listed as Markdown checkboxes (\`- [ ]\`)
> - Priority is indicated per task: 🔴 Important or ⚪ Normal
> - Timestamps show when each idea was captured
> - Mark tasks as done (\`- [x]\`) after processing
> - Do NOT remove tasks — mark them complete to preserve history

---

`
}

/**
 * Checks whether file content already contains the AI-Ready header.
 */
export function hasAIReadyHeader(content: string): boolean {
  return content.includes(HEADER_SIGNATURE)
}

/**
 * Formats a single task as a Markdown item with title, timestamp, priority, and description.
 *
 * Format: `- [ ] **Task Title** ([Created: 2026-03-14]) (Priority: 🔴 Important)`
 *         `  Description text on next line`
 */
export function formatTaskAsMarkdown(task: Task): string {
  const priority = task.isImportant ? '🔴 Important' : '⚪ Normal'
  const date = task.createdAt.split('T')[0]
  let line = `- [ ] **${task.title}** ([Created: ${date}]) (Priority: ${priority})`
  if (task.body) {
    line += `\n  ${task.body}`
  }
  return line
}

/**
 * Formats multiple tasks as Markdown, separated by newlines.
 */
export function formatTasksAsMarkdown(tasks: Task[]): string {
  return tasks.map(formatTaskAsMarkdown).join('\n')
}

/**
 * Builds the complete file content with header injection and task appending.
 *
 * - If no existing content: creates file with header + tasks
 * - If existing content without header: prepends header, appends tasks
 * - If existing content with header: appends tasks only
 */
export function buildFileContent(
  existingContent: string | null,
  tasks: Task[],
  username: string,
): string {
  const newTasksMarkdown = formatTasksAsMarkdown(tasks)

  if (!existingContent) {
    // New file: header + tasks
    return getAIReadyHeader(username) + newTasksMarkdown + '\n'
  }

  if (!hasAIReadyHeader(existingContent)) {
    // Existing file without header: prepend header + existing + tasks
    return (
      getAIReadyHeader(username) +
      existingContent.trimEnd() +
      '\n\n' +
      newTasksMarkdown +
      '\n'
    )
  }

  // Existing file with header: append tasks only
  return existingContent.trimEnd() + '\n\n' + newTasksMarkdown + '\n'
}
