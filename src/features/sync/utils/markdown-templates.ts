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
 *
 * When `syncBranch` is provided, a branch-awareness line (point 8) is inserted
 * inside the blockquote so AI agents know which branch holds the freshest file
 * and how to fetch it. When omitted, the header is identical to the unbranched
 * version (backward compatible).
 */
export function getAIReadyHeader(username: string, syncBranch?: string): string {
  const branchLine = syncBranch
    ? `> 8. 📍 This file is synced to branch \`${syncBranch}\` in this repo. To get the latest captures from another branch, run: \`git fetch && git show origin/${syncBranch}:captured-ideas-${username}.md\`.\n`
    : ''

  return `${HEADER_SIGNATURE}
# Captured Ideas - ${username}

> **Instructions for AI Agents (read this first, every session):**
>
> 1. This file is managed by [code-tasks](https://github.com/tholo91/code-tasks). Tasks between the \`managed-start\` and \`managed-end\` markers are auto-generated. Never edit them by hand.
> 2. **First action every session:** scan the managed block for unchecked items (\`- [ ]\`). Print them back to the user **grouped by priority** (🔴 Important first, then ⚪ Normal), with a one-line suggested approach per task. Then wait for direction. Do not execute silently.
> 3. **These are on-the-go captures** — quick sketches and loose thoughts typed on the go, not polished specs. If a task's intent, scope, or wording is ambiguous, **ask clarifying questions before acting**. Confirm your understanding of unclear items with the user instead of guessing.
> 4. **Decide per task:**
>    - **Trivial** (≤ 30 min, clearly bounded, no design choices) → execute, mark \`- [x]\`, append \`[Processed by: YourAgentName]\` to the task line, and add a brief note in the task body describing the change.
>    - **Non-trivial** → propose turning it into a story or quick spec. Do not implement until the user confirms scope.
> 5. Tasks use markdown checkboxes (\`- [ ]\` / \`- [x]\`). Priority: 🔴 Important or ⚪ Normal.
> 6. Never delete or reorder tasks. Only the mobile app manages task lifecycle.
> 7. You may add notes or context **below** the \`managed-end\` marker. They will not be overwritten.
${branchLine}
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
  
  // Collapse any literal `**` in the title to a single `*` so the `**...**`
  // wrapper stays the only bold marker on the line. Without this, a title
  // containing `**` truncates on the non-greedy parser regex round-trip.
  const safeTitle = task.title.replace(/\*\*/g, '*')

  let line = `${checkbox} **${safeTitle}** ([Created: ${createdDate}]) (Priority: ${priority})`

  if (task.updatedAt) {
    const updatedDate = task.updatedAt.split('T')[0]
    line += ` [Updated: ${updatedDate}]`
  }

  if (task.isCompleted && task.completedAt) {
    const completedDate = task.completedAt.split('T')[0]
    line += ` [Completed: ${completedDate}]`
  }

  if (task.processedBy) {
    line += ` [Processed by: ${task.processedBy}]`
  }

  if (task.body) {
    // Indent EVERY line of a multiline body with 2 spaces so the parser
    // (which strips a 2-space prefix per line) round-trips all lines, not
    // just the first.
    const indentedBody = task.body
      .split('\n')
      .map((bodyLine) => `  ${bodyLine}`)
      .join('\n')
    line += `\n${indentedBody}`
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
  processedBy: string | null
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

function extractBracketValue(source: string, label: 'Created' | 'Updated' | 'Completed' | 'Processed by'): string | null {
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
    const processedBy = extractBracketValue(meta, 'Processed by')

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
      processedBy,
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
export function buildFullFileContent(tasks: Task[], username: string, syncBranch?: string): string {
  const header = getAIReadyHeader(username, syncBranch)

  // Archived tasks (body starts with "[Archived] ") are excluded from push
  // to prevent zombie loops — they live locally as a record only.
  const nonArchived = tasks.filter(t => !t.body.startsWith('[Archived] '))

  const active = nonArchived
    .filter(t => !t.isCompleted)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const completed = nonArchived
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
  syncBranch?: string,
): string {
  const tasksMarkdown = formatTasksAsMarkdown(tasks)

  // Case 1: New file
  if (existingContent === null) {
    return getAIReadyHeader(username, syncBranch) + '\n' + tasksMarkdown + '\n\n' + MANAGED_END + '\n'
  }

  // Case 4: File already has both markers — split, rewrite managed section, reassemble
  if (existingContent.includes(MANAGED_START) && existingContent.includes(MANAGED_END)) {
    const { before, after } = splitAtMarkers(existingContent)
    const managedContent = tasksMarkdown.length > 0
      ? '\n\n' + tasksMarkdown + '\n\n'
      : '\n\n'
    // When a branch is provided, regenerate the header so the branch-awareness
    // line (point 7) reflects the current sync branch. Without this, switching
    // the branch override leaves a stale branch line in every incremental sync
    // until the next full rebuild. `before` is always just the header — agent
    // notes live after `managed-end` (header instruction #6) — so replacing it
    // is safe. When syncBranch is omitted (common main-branch path), the header
    // is preserved verbatim to avoid any latency regression.
    const freshHeader = getAIReadyHeader(username, syncBranch)
    const headerPrefix = freshHeader.slice(0, freshHeader.indexOf(MANAGED_START))
    const newBefore = syncBranch && before.includes(HEADER_SIGNATURE)
      ? headerPrefix
      : before
    return newBefore + MANAGED_START + managedContent + MANAGED_END + after
  }

  // Case 2: Existing file without header — prepend header, preserve original content after managed-end
  if (!hasAIReadyHeader(existingContent)) {
    const preservedContent = existingContent.trim()
    const afterSection = preservedContent.length > 0 ? '\n\n' + preservedContent + '\n' : '\n'
    return getAIReadyHeader(username, syncBranch) + '\n' + tasksMarkdown + '\n\n' + MANAGED_END + afterSection
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

/**
 * Signature string used to detect if the agent front-door block is already present.
 */
export const AGENT_FRONT_DOOR_SIGNATURE = '<!-- code-tasks:agent-front-door -->'

/**
 * Generates the shared agent front-door block (language-agnostic).
 * This block instructs any agent (Claude Code, Cursor, Codex) to:
 * 1. Fetch the latest from GitHub
 * 2. Read the freshest captured-ideas-*.md file
 * 3. Follow its built-in AI agent instructions
 */
export function getAgentFrontDoor(): string {
  return `${AGENT_FRONT_DOOR_SIGNATURE}
## Captured Ideas (Gitty)

This repo is connected to the Gitty app for mobile task capture. Captures land in \`captured-ideas-<username>.md\`.

**At the start of every session, before other work:**
1. Run \`git fetch --quiet\` to get the latest without touching the working tree.
2. Read the freshest \`captured-ideas-*.md\` — if the local copy may be behind, read the remote directly: \`git show origin/<branch>:captured-ideas-<username>.md\`.
3. Follow the "Instructions for AI Agents" header inside that file: list the open \`- [ ]\` items grouped by priority and wait for direction. Do not execute silently.
`
}

/**
 * Generates the agent front-door block in German (for German-speaking repos).
 */
export function getAgentFrontDoorDE(): string {
  return `${AGENT_FRONT_DOOR_SIGNATURE}
## Captured Ideas (Gitty)

Dieses Repo ist mit der Gitty-App für mobiles Task-Capturing verbunden. Captures landen in \`captured-ideas-<username>.md\`.

**Zu Beginn jeder Session, vor allem anderen:**
1. \`git fetch --quiet\` ausführen, um den neuesten Stand zu holen, ohne den Working Tree anzufassen.
2. Die frischeste \`captured-ideas-*.md\` lesen — falls die lokale Kopie veraltet sein könnte, direkt remote: \`git show origin/<branch>:captured-ideas-<username>.md\`.
3. Dem Header „Instructions for AI Agents" in der Datei folgen: offene \`- [ ]\` Punkte nach Priorität gruppiert auflisten und auf Anweisung warten. Nicht still ausführen.
`
}

/**
 * Checks whether content already contains the agent front-door block.
 */
export function hasAgentFrontDoor(content: string): boolean {
  return content.includes(AGENT_FRONT_DOOR_SIGNATURE)
}

/**
 * Idempotently appends the agent front-door block to existing content.
 * If the block is already present (signature found), returns content unchanged.
 * If absent, appends the block to the end of content.
 */
export function appendAgentFrontDoor(
  existingContent: string | null,
  isGerman: boolean = false,
): string {
  const block = isGerman ? getAgentFrontDoorDE() : getAgentFrontDoor()

  // If no content yet, just return the block
  if (existingContent === null || existingContent.trim() === '') {
    return block + '\n'
  }

  // If block already present, return unchanged
  if (hasAgentFrontDoor(existingContent)) {
    return existingContent
  }

  // Append block to end
  return existingContent.trimEnd() + '\n\n' + block + '\n'
}
