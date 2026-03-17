---
title: 'Sync Format Integrity — Managed Section Rewrite'
slug: 'sync-format-integrity'
created: '2026-03-17'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript 5.8', 'React 19', 'Zustand 5', 'Vitest', 'Octokit']
files_to_modify: ['src/features/sync/utils/markdown-templates.ts', 'src/services/github/sync-service.ts', 'src/features/sync/utils/markdown-templates.test.ts', 'src/services/github/sync-service.test.ts']
code_patterns: ['Get-Modify-Set atomic commit', 'formatTaskAsMarkdown serialization', 'managed-section split-rewrite-reassemble', 'fire-and-forget IDB persist']
test_patterns: ['Vitest + vi.mock', 'createTask factory pattern', 'mockOctokit for GitHub API']
---

# Tech-Spec: Sync Format Integrity — Managed Section Rewrite

**Created:** 2026-03-17

## Overview

### Problem Statement

`buildFileContent` uses a fragile per-task regex patch approach that can only add or update individual tasks. It cannot reorder tasks to match the user's sort order (Story 7.6), cannot remove deleted tasks from the file (Story 7.7), and has already broken once due to regex complexity (Story 7.4 review). Meanwhile, content added to the file by external actors (AI agents, manual edits) must be preserved.

### Solution

Replace the regex-patch approach with a **managed-section rewrite** strategy. The markdown file is divided into sections by HTML comment markers. On every sync, the app pulls the latest file (Get-Modify-Set), rewrites ONLY the content between `managed-start` and `managed-end` markers with the full sorted task list, and preserves everything outside the markers (header, notes, AI agent content).

### Target File Format

```markdown
<!-- code-tasks:ai-ready-header -->
# Captured Ideas — thomas

> **Instructions for AI Agents:**
> This file is managed by code-tasks. The task list between the
> `managed-start` and `managed-end` markers below is auto-generated
> on each sync. Do not manually edit tasks between the markers —
> changes will be overwritten on the next push.
>
> - Tasks use Markdown checkboxes (- [ ] / - [x])
> - Priority: 🔴 Important or ⚪ Normal
> - Mark tasks as done (- [x]) after processing
> - Add your own notes BELOW the managed-end marker

---

<!-- code-tasks:managed-start -->

- [ ] **Fix auth redirect** ([Created: 2026-03-14]) (Priority: 🔴 Important)
  Users are seeing an error on the login page

- [x] **Add dark mode toggle** ([Created: 2026-03-13]) (Priority: ⚪ Normal) [Completed: 2026-03-15]

<!-- code-tasks:managed-end -->

## Agent Notes

These notes were added by an AI agent and are preserved across syncs.
```

### Scope

**In Scope:**
- Add `MANAGED_START` / `MANAGED_END` HTML comment markers
- Rewrite `buildFileContent` to split-at-markers, full-rewrite middle, reassemble
- Add `splitAtMarkers` helper with defensive validation
- Delete `getTaskRegex` (no longer needed)
- Update `syncPendingTasks` to pass ALL repo tasks (sorted), not just pending
- Update AI-Ready header text to explain managed section to AI agents
- Include `MANAGED_START` marker in the header output
- Defensive marker validation (exactly one start + one end, in order)
- Migration logic for legacy files without markers
- Change `formatTasksAsMarkdown` to join with `\n\n` (double newline between tasks)
- Update commit message from "add N ideas" to "sync N tasks"
- Updated tests

**Out of Scope:**
- Subtask / nested checkbox support (separate future story)
- Bidirectional sync (parsing tasks FROM the file back into the app)
- `order` field on Task type (Story 7.6 adds this — this spec uses existing sort order)
- Auto-creating a Notes section (only appears when someone adds content below `MANAGED_END` organically)

## Context for Development

### Codebase Patterns

- **Get-Modify-Set:** `commitTasks` in `sync-service.ts` already pulls the file via `getFileContent()`, modifies via `buildFileContent()`, and pushes with SHA. Preserved — the only change is what happens inside `buildFileContent`.
- **Task serialization:** `formatTaskAsMarkdown` and `formatTasksAsMarkdown` already handle converting Task objects to markdown lines. Reused with `\n\n` join change.
- **Atomic commit with conflict retry:** Up to 3 retries on SHA conflict (409). Preserved — on retry, re-pull gets the latest content outside markers.
- **Single callsite:** `buildFileContent` is only called from `sync-service.ts:70`. Clean dependency.
- **`getTaskRegex` is internal:** Only used inside `markdown-templates.ts`. Safe to delete entirely.

### Files to Reference

| File | Purpose | Changes |
| ---- | ------- | ------- |
| `src/features/sync/utils/markdown-templates.ts` | Core change | Delete `getTaskRegex`. Add `MANAGED_START`, `MANAGED_END`, `splitAtMarkers`. Rewrite `buildFileContent`. Update `getAIReadyHeader`. Change `formatTasksAsMarkdown` join. |
| `src/services/github/sync-service.ts` | Sync flow | `syncPendingTasks`: pass all repo tasks (sorted) to `commitTasks`, mark only pending as synced. Update commit message. |
| `src/features/sync/utils/markdown-templates.test.ts` | Tests | Rewrite `buildFileContent` tests for markers. Add `splitAtMarkers` tests. Keep `formatTaskAsMarkdown` tests. |
| `src/services/github/sync-service.test.ts` | Tests | Update content assertions for markers. Update `syncPendingTasks` tests for all-tasks-passed behavior. |

### Technical Decisions

- **Full rewrite between markers** — simpler than regex patching, handles ordering + deletion naturally.
- **HTML comments as markers** — invisible when rendered, standard pattern.
- **Always pull before writing** — Get-Modify-Set preserves external content.
- **Defensive marker validation** — exactly one start + one end, in order. Malformed → throw error.
- **`\n\n` between tasks** — scannable for humans and AI agents.
- **No auto-created Notes section** — only appears when someone adds content below `MANAGED_END` organically.
- **Legacy migration** — files without markers: wrap existing content after header `---` in markers on first sync.

## Implementation Plan

### Tasks

- [x] Task 1: Add marker constants and `splitAtMarkers` helper
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: Add exports `MANAGED_START = '<!-- code-tasks:managed-start -->'` and `MANAGED_END = '<!-- code-tasks:managed-end -->'`
  - Action: Add `splitAtMarkers(content: string): { before: string; managed: string; after: string }` function
  - Notes: Defensive validation — if only one marker found, or start comes after end, throw `Error('Malformed managed section markers')`. If neither marker found, return `{ before: content, managed: '', after: '' }` (legacy case).

- [x] Task 2: Update `getAIReadyHeader` to include managed-start marker and updated AI instructions
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: Update header text to explain the managed section boundaries to AI agents
  - Action: Append `MANAGED_START + '\n'` at the end of the header output (after the `---` separator)
  - Notes: The header now ends with `<!-- code-tasks:managed-start -->\n` so tasks are written directly after it.

- [x] Task 3: Change `formatTasksAsMarkdown` to join with `\n\n`
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: Change `.join('\n')` to `.join('\n\n')`
  - Notes: One-line change. Each task block (header + optional body) is separated by a blank line.

- [x] Task 4: Rewrite `buildFileContent` with split-rewrite-reassemble
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: Replace the for-loop regex-patch logic with:
    1. New file (null content): return `getAIReadyHeader(username) + '\n' + formatTasksAsMarkdown(tasks) + '\n\n' + MANAGED_END + '\n'`
    2. Existing file without header: prepend header
    3. Legacy file without markers: find `---` separator, insert `MANAGED_START` after it, append `MANAGED_END` after existing content
    4. File with markers: call `splitAtMarkers`, rewrite managed section with `formatTasksAsMarkdown(tasks)`, reassemble `before + MANAGED_START + '\n\n' + tasks + '\n\n' + MANAGED_END + after`
  - Notes: The `tasks` parameter now means "ALL repo tasks in order" not "pending tasks to patch."

- [x] Task 5: Delete `getTaskRegex`
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: Remove the entire `getTaskRegex` function (lines 69-81 approximately)
  - Notes: No longer needed — managed section rewrite replaces per-task regex matching.

- [x] Task 6: Update `syncPendingTasks` to pass all repo tasks
  - File: `src/services/github/sync-service.ts`
  - Action: Change task filtering:
    ```typescript
    // Get ALL tasks for this repo (for full file rewrite)
    const repoTasks = tasks.filter(
      (t) => t.username === user.login &&
             t.repoFullName.toLowerCase() === selectedLower
    )
    // Only sync if there are pending changes
    const pendingTasks = repoTasks.filter(t => t.syncStatus === 'pending')
    if (pendingTasks.length === 0) return { syncedCount: 0 }
    // Sort by createdAt descending (newest first)
    const sortedTasks = [...repoTasks].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    ```
  - Action: Pass `sortedTasks` (all repo tasks) to `commitTasks` instead of `pendingTasks`
  - Action: Keep marking only `pendingTasks` as synced afterward (unchanged)
  - Notes: `commitTasks` still receives the full list for the file rewrite, but only pending tasks trigger the sync and get marked.

- [x] Task 7: Update commit message
  - File: `src/services/github/sync-service.ts`
  - Action: Change `sync: add ${tasks.length} captured idea${...}` to `sync: update ${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} via code-tasks`
  - Notes: Pass `pendingTasks.length` as a separate param or compute in `commitTasks`. The message reflects what changed, not the total count.

- [x] Task 8: Rewrite `buildFileContent` tests
  - File: `src/features/sync/utils/markdown-templates.test.ts`
  - Action: Replace existing `buildFileContent` tests with:
    - Test: new file (null content) → creates header + markers + tasks
    - Test: existing file without header → prepends header with markers
    - Test: legacy file with header but no markers → wraps content in markers
    - Test: file with markers → rewrites between markers, preserves before/after
    - Test: content after `MANAGED_END` is preserved (Notes section)
    - Test: deleted task (was in file, not in task list) → absent after rewrite
    - Test: task order matches array order
    - Test: empty task list → empty managed section (markers still present)
    - Test: `\n\n` between tasks in output
  - Action: Add `splitAtMarkers` tests:
    - Test: valid markers → correct split
    - Test: no markers → `{ before: content, managed: '', after: '' }`
    - Test: only start marker → throws error
    - Test: only end marker → throws error
    - Test: start after end → throws error
  - Action: Update `formatTasksAsMarkdown` test to verify `\n\n` join
  - Action: Remove any tests that reference `getTaskRegex` behavior

- [x] Task 9: Update `sync-service` tests
  - File: `src/services/github/sync-service.test.ts`
  - Action: Update `syncPendingTasks` test "syncs pending tasks and marks them as synced" — verify all repo tasks are passed to `commitTasks` (not just pending)
  - Action: Add test: synced + pending tasks in store → all passed to `commitTasks`, only pending marked as synced afterward
  - Action: Update `commitTasks` content assertions to check for `MANAGED_START` and `MANAGED_END` markers
  - Action: Update commit message assertion

- [x] Task 10: Run tests and build
  - Action: `npm test` — fix any failures
  - Action: `npm run build` — clean build

### Acceptance Criteria

- [x] AC 1: Given a new repository with no existing file, when sync occurs, then the created file contains the AI-Ready header, `managed-start` marker, tasks separated by blank lines, and `managed-end` marker.

- [x] AC 2: Given an existing file with managed section markers, when sync occurs, then ONLY the content between markers is rewritten and content outside markers (header, notes) is preserved verbatim.

- [x] AC 3: Given a task was deleted locally, when the next sync occurs, then the task no longer appears in the markdown file between the markers.

- [x] AC 4: Given tasks are in a specific order in the store, when sync writes the file, then tasks appear in that same order between the markers.

- [x] AC 5: Given a legacy file without managed section markers, when the first sync occurs after this change, then the existing content is wrapped in markers and preserved.

- [x] AC 6: Given a file with content below `managed-end` (e.g., AI agent notes), when sync occurs, then that content is preserved unchanged.

- [x] AC 7: Given a file with malformed markers (missing one, or in wrong order), when sync is attempted, then the sync fails with a user-facing error rather than silently corrupting the file.

- [x] AC 8: Given multiple tasks in the file, when the file is viewed on GitHub, then each task is separated by a blank line for readability.

## Additional Context

### Dependencies

- **Story 7.5** adds `updatedAt` field — `formatTaskAsMarkdown` will include `[Updated: date]` (implemented in 7.5, this spec doesn't need to handle it)
- **Story 7.6** adds `order` field — when present, the sort in `syncPendingTasks` should prefer `order`; until then, sort by `createdAt` descending
- **Story 7.7** adds `removeTask` — deletion is already in the store; this spec ensures deleted tasks are removed from the markdown file on next sync

### Testing Strategy

**Unit tests (Vitest):**
- `splitAtMarkers`: 5 tests (valid split, no markers, missing start, missing end, wrong order)
- `buildFileContent`: 9 tests (new file, no header, legacy migration, marker rewrite, content preservation, deletion, ordering, empty list, blank line separation)
- `formatTasksAsMarkdown`: 1 updated test (`\n\n` join)
- `syncPendingTasks`: 2 updated tests (all tasks passed, only pending marked synced)
- `commitTasks`: 2 updated tests (content includes markers, updated commit message)

**Manual verification:**
- Create a task, sync, verify file on GitHub has markers
- Add a note below `managed-end` on GitHub, sync again, verify note preserved
- Delete a task locally, sync, verify it's gone from the file
- Complete a task, sync, verify `- [x]` appears in correct position

### Notes

- The AI-Ready header text should explicitly tell AI agents not to edit between markers and to add notes below `managed-end`
- This spec should be implemented AFTER Story 7.5 (which adds `updatedAt`) but can be implemented in parallel with Stories 7.6 and 7.7 since it provides the sync foundation they need
- The `getTaskRegex` function and all regex-matching logic is permanently removed — this is a deliberate simplification, not a temporary measure
- Commit message changes from "add N captured ideas" to "update N tasks" to reflect the full-rewrite nature
