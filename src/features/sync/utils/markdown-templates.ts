import type { HandoffStatus, Task } from '../../../types/task'

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
    ? `> 7. This inbox lives on \`${syncBranch}\`. On an explicit inbox request, run \`git fetch origin ${syncBranch}\` and read \`git show origin/${syncBranch}:captured-ideas-${username}.md\`.\n`
    : ''

  return `${HEADER_SIGNATURE}
# Captured Ideas - ${username}

> **Gitty Inbox Protocol v1 — instructions for AI agents:**
>
> 1. Stay silent about Gitty during normal work. Only inspect this inbox when the user says “Check my Gitty inbox”, \`/gitty\`, \`/captured-ideas\`, or an equivalent explicit request.
> 2. On request, fetch the exact capture branch, list open Inbox items compactly, and wait for the user to choose one. Never execute a capture automatically.
> 3. These are rough, on-the-go thoughts, not polished specs. Ask a clarifying question when a selected capture is ambiguous.
> 4. Keep task identity, title, order, priority, body, and \`Capture revision\` unchanged. Only Gitty manages capture content and deletion.
> 5. A selected task may move from Inbox to \`[Gitty: Filed]\` when deliberately transferred to an issue, story, or plan. Add \`[Handled: ISO-8601]\` and \`[Processed by: AgentName]\`; add \`[Proof: https://...]\` when available.
> 6. Use \`[Gitty: Done]\` only for verified work with a valid HTTPS \`[Proof: ...]\`. Receipts are accepted only while their \`Capture revision\` still matches the phone's capture.
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

  const captureRevision = task.captureRevision ?? task.id
  line += ` [Capture revision: ${captureRevision}]`

  const proofUrl = getSafeProofUrl(task.proofUrl)
  const handoffStatus = task.handoffStatus === 'done' && !proofUrl
    ? null
    : task.handoffStatus
  if (handoffStatus) {
    line += ` [Gitty: ${handoffStatus === 'done' ? 'Done' : 'Filed'}]`
  }

  if (handoffStatus && proofUrl) {
    line += ` [Proof: ${proofUrl}]`
  }

  if (handoffStatus && task.handledAt) {
    line += ` [Handled: ${task.handledAt}]`
  }

  // Stable identity anchor as an HTML comment — invisible in rendered markdown
  // (and never surfaced in the mobile UI, which renders from parsed Task objects,
  // not raw text). Lets the merge match a task across reformatting, reordering,
  // and renaming by an AI agent instead of guessing by title.
  line += ` <!-- ct:${task.id} -->`

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
  /** Stable id from the `<!-- ct:ID -->` anchor, null for legacy files without it */
  id: string | null
  title: string
  body: string
  createdAt: string | null
  updatedAt: string | null
  completedAt: string | null
  isCompleted: boolean
  isImportant: boolean
  processedBy: string | null
  captureRevision: string | null
  handoffStatus: HandoffStatus | null
  proofUrl: string | null
  handledAt: string | null
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

function extractBracketValue(
  source: string,
  label: 'Created' | 'Updated' | 'Completed' | 'Processed by' | 'Capture revision' | 'Gitty' | 'Proof' | 'Handled',
): string | null {
  const match = source.match(new RegExp(`\\[${label}:\\s*([^\\]]+)\\]`))
  return match ? match[1].trim() : null
}

function getSafeProofUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

function parseHandoffStatus(value: string | null, proofUrl: string | null): HandoffStatus | null {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'filed') return 'filed'
  if (normalized === 'done' && proofUrl) return 'done'
  return null
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

    // Stable identity anchor written by formatTaskAsMarkdown. Absent in legacy
    // files — those fall back to title matching during merge.
    const idMatch = meta.match(/<!--\s*ct:([^\s]+?)\s*-->/)
    const id = idMatch ? idMatch[1] : null

    const createdAt = normalizeDate(extractBracketValue(meta, 'Created'))
    const updatedAt = normalizeDate(extractBracketValue(meta, 'Updated'))
    const completedAt = normalizeDate(extractBracketValue(meta, 'Completed'))
    const processedBy = extractBracketValue(meta, 'Processed by')
    const captureRevision = extractBracketValue(meta, 'Capture revision')
    const parsedProofUrl = getSafeProofUrl(extractBracketValue(meta, 'Proof'))
    const handoffStatus = parseHandoffStatus(extractBracketValue(meta, 'Gitty'), parsedProofUrl)
    const proofUrl = handoffStatus ? parsedProofUrl : null
    const handledAt = handoffStatus ? normalizeDate(extractBracketValue(meta, 'Handled')) : null

    const bodyLines: string[] = []
    let cursor = i + 1
    while (cursor < lines.length && lines[cursor].startsWith('  ')) {
      bodyLines.push(lines[cursor].replace(/^ {2}/, ''))
      cursor += 1
    }
    if (cursor > i + 1) {
      i = cursor - 1
    }

    tasks.push({
      id,
      title,
      body: bodyLines.join('\n').trim(),
      createdAt,
      updatedAt,
      completedAt,
      isCompleted,
      isImportant,
      processedBy,
      captureRevision,
      handoffStatus,
      proofUrl,
      handledAt,
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
export function buildFullFileContent(
  tasks: Task[],
  username: string,
  syncBranch?: string,
  existingContent?: string | null,
): string {
  const header = getAIReadyHeader(username, syncBranch)

  // Preserve anything the agent wrote BELOW the managed-end marker (header
  // rule #7 promises it is never overwritten). The full rebuild regenerates
  // header + managed block from scratch, so without this the agent's notes
  // would be silently dropped on the next mobile sync. Matches buildFileContent
  // Case 4 (`... + MANAGED_END + after`).
  let afterSection = '\n'
  if (
    existingContent &&
    existingContent.includes(MANAGED_START) &&
    existingContent.includes(MANAGED_END)
  ) {
    try {
      const { after } = splitAtMarkers(existingContent)
      if (after.trim().length > 0) afterSection = after
    } catch {
      // Malformed markers — keep the default trailing newline.
    }
  }

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
    return header + '\n> No active tasks. Capture new ideas with [code-tasks](https://github.com/tholo91/code-tasks).\n\n' + MANAGED_END + afterSection
  }

  let managed = ''

  if (active.length > 0) {
    managed += '\n' + formatTasksAsMarkdown(active)
  }

  if (completed.length > 0) {
    if (active.length > 0) managed += '\n\n'
    managed += '\n## Completed\n\n' + formatTasksAsMarkdown(completed)
  }

  return header + managed + '\n\n' + MANAGED_END + afterSection
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
    // Regenerate Gitty's managed header on every incremental sync. This migrates
    // connected repositories from older agent instructions without touching
    // task content or notes below managed-end. `before` is only the header;
    // agent notes live after managed-end and remain untouched.
    const freshHeader = getAIReadyHeader(username, syncBranch)
    const headerPrefix = freshHeader.slice(0, freshHeader.indexOf(MANAGED_START))
    const newBefore = before.includes(HEADER_SIGNATURE)
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
export const AGENT_FRONT_DOOR_SIGNATURE = '<!-- gitty:agent-connect:v3 -->'
export const LEGACY_AGENT_FRONT_DOOR_SIGNATURE = '<!-- code-tasks:agent-front-door -->'
const LEGACY_V2_AGENT_FRONT_DOOR_SIGNATURE = '<!-- code-tasks:agent-front-door:v2 -->'
const LEGACY_AGENT_FRONT_DOOR_END = '<!-- /code-tasks:agent-front-door -->'
const AGENT_FRONT_DOOR_END = '<!-- /gitty:agent-connect -->'

/**
 * Generates the shared agent front-door block (language-agnostic).
 * This block instructs any agent (Claude Code, Cursor, Codex) to:
 * 1. Fetch the latest from GitHub
 * 2. Read the freshest captured-ideas-*.md file
 * 3. Follow its built-in AI agent instructions
 */
export function getAgentFrontDoor(username: string, captureBranch: string): string {
  return `${AGENT_FRONT_DOOR_SIGNATURE}
## Gitty mobile repo inbox

Gitty captures for \`${username}\` live at \`${getScopedInboxPath(username)}\` on \`${captureBranch}\`.

Stay silent about Gitty during normal work. Only open the inbox when the user says “Check my Gitty inbox”, \`/gitty\`, \`/captured-ideas\`, or an equivalent explicit request.

On an explicit request:
1. Run \`git fetch origin ${captureBranch}\`.
2. Read \`git show origin/${captureBranch}:${getScopedInboxPath(username)}\`.
3. List Inbox items compactly and wait for the user to choose. Never execute captures automatically.
4. Follow the Gitty Inbox Protocol in that file for Filed and Done receipts.
${AGENT_FRONT_DOOR_END}
`
}

function getScopedInboxPath(username: string): string {
  return `captured-ideas-${username}.md`
}

/**
 * Generates the agent front-door block in German (for German-speaking repos).
 */
export function getAgentFrontDoorDE(username: string, captureBranch: string): string {
  return getAgentFrontDoor(username, captureBranch)
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
  username: string,
  captureBranch: string,
): string {
  const block = getAgentFrontDoor(username, captureBranch)

  // If no content yet, just return the block
  if (existingContent === null || existingContent.trim() === '') {
    return block + '\n'
  }

  // Replace an existing managed block so branch and username cannot go stale.
  if (hasAgentFrontDoor(existingContent)) {
    const start = existingContent.indexOf(AGENT_FRONT_DOOR_SIGNATURE)
    const end = existingContent.indexOf(AGENT_FRONT_DOOR_END, start)
    if (end !== -1) {
      const after = end + AGENT_FRONT_DOOR_END.length
      return existingContent.slice(0, start) + block.trimEnd() + existingContent.slice(after)
    }
  }

  const legacyV2Index = existingContent.indexOf(LEGACY_V2_AGENT_FRONT_DOOR_SIGNATURE)
  if (legacyV2Index !== -1) {
    const legacyEnd = existingContent.indexOf(LEGACY_AGENT_FRONT_DOOR_END, legacyV2Index)
    if (legacyEnd !== -1) {
      const after = legacyEnd + LEGACY_AGENT_FRONT_DOOR_END.length
      return existingContent.slice(0, legacyV2Index) + block.trimEnd() + existingContent.slice(after)
    }
  }

  const legacyBlockIndex = existingContent.indexOf(LEGACY_AGENT_FRONT_DOOR_SIGNATURE)
  if (legacyBlockIndex !== -1) {
    // The v1 block was always appended as the final generated content and had
    // no end marker. Replace that known suffix instead of leaving contradictory
    // instructions for tools that read the first matching block.
    const contentBeforeLegacyBlock = existingContent.slice(0, legacyBlockIndex).trimEnd()
    return (contentBeforeLegacyBlock ? contentBeforeLegacyBlock + '\n\n' : '') + block + '\n'
  }

  // Keep user-authored content intact when no generated v1 block is present.
  return existingContent.trimEnd() + '\n\n' + block + '\n'
}
