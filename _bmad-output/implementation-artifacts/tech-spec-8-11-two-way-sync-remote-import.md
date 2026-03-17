---
title: 'Two-Way Sync: Remote Change Detection & Import'
slug: '8-11-two-way-sync-remote-import'
created: '2026-03-17'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [React 19, Zustand v5, Octokit, Framer Motion v12, TypeScript 5.8, Vitest, Testing Library]
files_to_modify:
  - src/types/task.ts
  - src/features/sync/utils/markdown-templates.ts
  - src/features/sync/utils/markdown-templates.test.ts
  - src/services/github/sync-service.ts
  - src/features/capture/components/TaskCard.tsx
  - src/features/capture/components/TaskCard.test.tsx
  - src/hooks/useRemoteChangeDetection.ts (NEW)
  - src/hooks/useRemoteChangeDetection.test.ts (NEW)
  - src/App.tsx
  - src/features/sync/components/SyncImportBanner.tsx
code_patterns:
  - Zustand store with persist middleware — all state mutations via store actions
  - Service boundary — all GitHub API calls through src/services/github/
  - IDB write-through — task mutations also persist to IndexedDB
  - Co-located tests — test files next to source files
  - Framer Motion AnimatePresence for enter/exit animations
  - useReducedMotion() fallback on all animated components
test_patterns:
  - Vitest + Testing Library
  - vi.mock for Octokit and service mocks
  - Co-located test files (*.test.ts next to *.ts)
  - render + screen.getByTestId pattern for component tests
---

# Tech-Spec: Two-Way Sync: Remote Change Detection & Import

**Created:** 2026-03-17

## Overview

### Problem Statement

Gitty is push-only. When an AI agent (or any collaborator) edits `captured-ideas-*.md` on the desktop and pushes to main, Gitty has no way to detect or import those changes. The app shows stale state, which erodes user trust. This breaks the core workflow: capture on mobile → AI processes on desktop → user sees results on mobile.

### Solution

Add a lightweight remote SHA check on app visibility/focus. When changes are detected and no local conflicts exist, show a confirmation banner ("Updates on main — want the latest?") and import on tap. Parse `[Processed by: AgentName]` metadata tags from the markdown so users can see what the AI agent did directly on their task cards.

### Scope

**In Scope:**
- `visibilitychange` listener to trigger remote SHA check when app regains focus
- Confirmation banner when remote changes detected (no local pending changes)
- Import flow: fetch remote → parse → replace local tasks → update SHA
- Conflict case defers to existing `SyncConflictSheet` (local pending + remote changes)
- `processedBy` field: parse from markdown, store on Task, format back to markdown
- Subtle "Processed by [Agent]" label on TaskCard
- Offline-safe: skip silently if network unavailable
- Update AI agent instructions to include `[Processed by: AgentName]` tag format

**Out of Scope:**
- Smart merge engine (deferred to Epic 9)
- Auto-sync / background polling intervals
- Changes to the existing conflict resolution UI
- Structural changes to SyncConflictSheet

## Context for Development

### Codebase Patterns

1. **Zustand store boundary:** All task state mutations go through `useSyncStore` actions — never direct `set()` calls from UI. The store uses `persist` middleware with `createJSONStorage(() => localStorage)` and `skipHydration: true`.

2. **Service boundary:** All GitHub API calls go through `src/services/github/`. `getFileContent()` (private) fetches file content + SHA. `fetchRemoteTasksForRepo()` (exported) wraps parse logic and returns structured `Task[]` + SHA.

3. **IDB write-through:** `replaceTasksForRepo()` already handles IDB cleanup (deletes old tasks, persists new ones) — no additional IDB work needed.

4. **Existing import infrastructure:** There is already a `SyncImportBanner` component and import flow in `App.tsx` (lines 221-284). Currently it only triggers **once per repo switch** via `importAttemptedRef` and only auto-imports when local task list is empty. The banner UI, import handler, and state management all exist — they just need to be triggered by visibility changes too.

5. **Existing conflict detection:** `syncAllRepoTasksOnce()` at `sync-service.ts:293-308` compares `lastSyncedSha` with remote SHA during push. The `SyncConflictSheet` handles the UI. This story reuses the same SHA comparison logic but triggers it on app focus instead of only on push.

6. **Current AI agent header (Story 8-9):** Agents are told to mark tasks as `- [x]` and append "Checked by [Agent Name]" to the task body. The `[Processed by: AgentName]` tag on the metadata line is a new, parseable tag this story introduces.

7. **Bracket value extraction:** `extractBracketValue()` at `markdown-templates.ts:133-136` already parses `[Label: value]` patterns for `Created`, `Updated`, and `Completed`. Adding `Processed by` follows the identical pattern.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/types/task.ts` | Task interface — add optional `processedBy` field |
| `src/features/sync/utils/markdown-templates.ts` | `parseTasksFromMarkdown()` — parse `[Processed by: ...]`; `formatTaskAsMarkdown()` — output it; `getAIReadyHeader()` — update instructions |
| `src/features/sync/utils/markdown-templates.test.ts` | Existing test suite (47 tests) — add parsing/formatting tests |
| `src/services/github/sync-service.ts` | `fetchRemoteTasksForRepo()` — wire up `processedBy` from parsed data; export new `checkRemoteSha()` function |
| `src/features/sync/components/SyncImportBanner.tsx` | Existing import banner UI — update messaging for remote change context |
| `src/features/capture/components/TaskCard.tsx` | Task card display — add `processedBy` label |
| `src/features/capture/components/TaskCard.test.tsx` | Add test for processedBy rendering |
| `src/App.tsx` | Lines 221-284: existing `importPrompt` state and `SyncImportBanner` rendering — wire up new hook |
| `src/stores/useSyncStore.ts` | `repoSyncMeta` (stores `lastSyncedSha`), `replaceTasksForRepo()`, `setRepoSyncMeta()` — no changes needed, just consumed |
| `src/hooks/useNetworkStatus.ts` | `useNetworkStatus()` — provides `isOnline`, consumed by new hook |
| `src/features/sync/hooks/useAutoSync.ts` | Existing hook pattern for sync-related side effects — reference for style |

### Technical Decisions

1. **SHA check approach:** Reuse existing `getFileContent()` which returns `{ content, sha }`. A single markdown file is small enough that fetching content alongside SHA is acceptable. If SHA matches stored `lastSyncedSha`, discard the response. If SHA differs, the content is already available for parsing — single round-trip.

2. **Confirmation over auto-import:** Show the existing `SyncImportBanner` with updated messaging ("Updates on main — want the latest?") rather than silently importing. This builds user trust and lets the user decide.

3. **`processedBy` as metadata tag:** Use `[Processed by: AgentName]` on the markdown metadata line (same line as `[Created: ...]`, `[Updated: ...]`). The `extractBracketValue()` helper already handles this pattern — just add `'Processed by'` as a label. This is separate from the "Checked by [Agent Name]" text that agents append to the body per Story 8-9.

4. **No smart merge:** When local pending changes AND remote changes coexist, set `conflict` on `repoSyncMeta` which triggers the existing `SyncConflictSheet`. No attempt at field-level merge.

5. **Debounce:** Minimum 30-second interval between remote checks to avoid API rate limiting on rapid tab switches. Use a `lastCheckRef` timestamp comparison.

6. **Reuse existing infrastructure:** The `importPrompt` state, `SyncImportBanner`, and `replaceTasksForRepo` flow in `App.tsx` already work. The new `useRemoteChangeDetection` hook calls the same `setImportPrompt()` setter.

## Implementation Plan

### Tasks

- [x] Task 1: Add `processedBy` field to Task type
  - File: `src/types/task.ts`
  - Action: Add `processedBy?: string | null` to the `Task` interface, after `completedAt`
  - Notes: Optional field, null by default. No store changes needed — `replaceTasksForRepo` already accepts full Task objects.

- [x] Task 2: Parse and format `[Processed by: AgentName]` in markdown templates
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action 2a: In `ParsedMarkdownTask` interface (line 111), add `processedBy: string | null`
  - Action 2b: In `parseTasksFromMarkdown()` (line 142), add `extractBracketValue(meta, 'Processed by')` call — identical pattern to existing `Created`/`Updated`/`Completed` extraction. Assign to `processedBy` field on the parsed task object.
  - Action 2c: In `formatTaskAsMarkdown()` (line 81), after the `completedAt` block (line 96), add: if `task.processedBy`, append ` [Processed by: ${task.processedBy}]` to the metadata line.
  - Notes: `extractBracketValue` at line 133 already supports arbitrary labels — the regex `\[${label}:\s*([^\]]+)\]` works for `Processed by` with no changes to the helper itself.

- [x] Task 3: Wire `processedBy` through `fetchRemoteTasksForRepo`
  - File: `src/services/github/sync-service.ts`
  - Action: In `fetchRemoteTasksForRepo()` (line 444), add `processedBy: parsedTask.processedBy ?? null` to the task object returned by the `.map()`.
  - Notes: This is the only place where parsed markdown tasks are converted to `Task` objects for import.

- [x] Task 4: Update AI agent instructions to mention `[Processed by: AgentName]` tag
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: In `getAIReadyHeader()` (line 18), update the instruction bullet from:
    `> - Mark tasks as done (\`- [x]\`) after processing and append "Checked by [Agent Name]" to the task body`
    to:
    `> - Mark tasks as done (\`- [x]\`) after processing, add \`[Processed by: YourAgentName]\` to the task line, and optionally append notes to the task body`
  - Notes: This tells agents to use the parseable metadata tag format. Existing "Checked by" body text from agents running the old instructions will still work (just won't populate `processedBy`).

- [x] Task 5: Display `processedBy` on TaskCard
  - File: `src/features/capture/components/TaskCard.tsx`
  - Action: After the body preview block (line 122, before the closing `</motion.div>`), add a conditional render: if `task.processedBy` is truthy, render a small label:
    ```tsx
    {task.processedBy && (
      <p
        className="mt-1 truncate text-label pl-[46px]"
        style={{ color: 'var(--color-text-secondary)', opacity: 0.6, fontSize: '0.7rem' }}
        data-testid={`task-processed-by-${task.id}`}
      >
        Processed by {task.processedBy}
      </p>
    )}
    ```
  - Notes: Uses the same `pl-[46px]` left padding as the body preview for alignment. Smaller font size and lower opacity to keep it subtle.

- [x] Task 6: Create `useRemoteChangeDetection` hook
  - File: `src/hooks/useRemoteChangeDetection.ts` (NEW)
  - Action: Create a custom hook that:
    1. Subscribes to `document.visibilitychange` events
    2. When `document.visibilityState === 'visible'`:
       - Check `isOnline` (from `useNetworkStatus`) — skip if offline
       - Check debounce: compare `Date.now()` against `lastCheckRef.current` — skip if < 30 seconds
       - Get `selectedRepo`, `user`, `repoSyncMeta` from `useSyncStore`
       - Call `fetchRemoteTasksForRepo(selectedRepo.fullName, user.login)`
       - Compare returned `sha` with `repoSyncMeta[repoKey].lastSyncedSha`
       - If SHA matches → no-op
       - If SHA differs AND no local pending changes (`selectPendingSyncCount` === 0 from store) → call `onRemoteChanges(result)` callback with tasks + SHA
       - If SHA differs AND local pending changes exist → set conflict on `repoSyncMeta` via `setRepoSyncMeta()` (triggers existing SyncConflictSheet)
    3. Cleanup: remove event listener on unmount
  - Hook signature: `useRemoteChangeDetection(onRemoteChanges: (data: { tasks: Task[], sha: string | null }) => void)`
  - Notes: The callback pattern lets `App.tsx` control what happens with the data (set `importPrompt` state). The hook only handles detection logic.

- [x] Task 7: Wire `useRemoteChangeDetection` into App.tsx
  - File: `src/App.tsx`
  - Action 7a: Import `useRemoteChangeDetection` from `src/hooks/useRemoteChangeDetection`
  - Action 7b: In `AppContent`, after the `useAutoSync()` call (line 250), add:
    ```tsx
    useRemoteChangeDetection((data) => {
      if (!selectedRepo) return
      setImportPrompt({
        repoFullName: selectedRepo.fullName,
        tasks: data.tasks,
        sha: data.sha,
      })
    })
    ```
  - Notes: This reuses the existing `importPrompt` state and `SyncImportBanner` rendering — no new UI state needed.

- [x] Task 8: Update SyncImportBanner messaging for remote change context
  - File: `src/features/sync/components/SyncImportBanner.tsx`
  - Action: Add an optional `variant` prop: `'initial-import' | 'remote-update'` (default `'initial-import'`).
    - When `variant === 'remote-update'`:
      - Title: "Updates on main" (instead of "Import Available")
      - Body: "Want the latest status?" (instead of "X tasks found in repo. Importing will overwrite...")
      - Button: "Update" (instead of "Import")
    - When `variant === 'initial-import'`: keep current behavior unchanged.
  - Action: In `App.tsx`, pass `variant="remote-update"` when `importPrompt` is set by the visibility hook, `variant="initial-import"` when set by the existing repo-switch logic.
  - Notes: To distinguish the source, add an optional `source` field to the `importPrompt` state: `source?: 'repo-switch' | 'remote-update'`. Default to `'repo-switch'` for the existing flow.

- [x] Task 9: Tests
  - File: `src/features/sync/utils/markdown-templates.test.ts`
    - Test: `parseTasksFromMarkdown` extracts `processedBy` from `[Processed by: Claude]` tag
    - Test: `parseTasksFromMarkdown` returns `null` for `processedBy` when tag is absent
    - Test: `formatTaskAsMarkdown` outputs `[Processed by: Claude]` when field is set
    - Test: `formatTaskAsMarkdown` omits tag when `processedBy` is null/undefined
    - Test: Round-trip: format → parse → verify `processedBy` preserved
  - File: `src/features/capture/components/TaskCard.test.tsx`
    - Test: Renders "Processed by Claude" label when `task.processedBy` is set
    - Test: Does NOT render processedBy label when field is null
  - File: `src/hooks/useRemoteChangeDetection.test.ts` (NEW)
    - Test: Calls `fetchRemoteTasksForRepo` when visibility changes to visible
    - Test: Skips check when offline
    - Test: Skips check when debounce interval not elapsed
    - Test: Calls `onRemoteChanges` callback when SHA differs and no pending changes
    - Test: Sets conflict when SHA differs and pending changes exist
    - Test: No-ops when SHA matches

### Acceptance Criteria

- [x] AC 1: Given the user has synced tasks to GitHub and an AI agent has checked off 2 tasks and pushed to main, when the user switches back to the Gitty app (tab/app becomes visible), then a banner appears showing "Updates on main — want the latest?" with an "Update" button.

- [x] AC 2: Given the remote change banner is showing, when the user taps "Update", then the remote tasks are imported, local tasks are replaced, the `lastSyncedSha` is updated, and the banner disappears.

- [x] AC 3: Given the remote change banner is showing, when the user taps "Dismiss", then the banner disappears and no import occurs.

- [x] AC 4: Given the user has local pending (unsynced) changes AND the remote file has changed, when the app becomes visible, then the existing `SyncConflictSheet` is triggered (not the import banner).

- [x] AC 5: Given the user is offline, when the app becomes visible, then no remote check is performed and no banner appears.

- [x] AC 6: Given the user rapidly switches tabs (multiple visibility changes within 30 seconds), when the app becomes visible again, then only one remote check is made (debounce).

- [x] AC 7: Given the remote file has NOT changed since last sync (SHA matches), when the app becomes visible, then no banner appears.

- [x] AC 8: Given an AI agent has marked a task with `[Processed by: Claude]` in the markdown metadata, when those tasks are imported into Gitty, then the TaskCard shows a subtle "Processed by Claude" label below the body preview.

- [x] AC 9: Given a task does NOT have a `processedBy` tag, when it is displayed, then no "Processed by" label is shown.

- [x] AC 10: Given a task has `processedBy` set, when it is synced back to GitHub via push, then the `[Processed by: AgentName]` tag is preserved in the markdown output.

## Additional Context

### Dependencies

- Story 8-9 (AI Agent Header Update) — done, provides base instruction text
- No new npm dependencies required
- GitHub Contents API (already used) — `octokit.rest.repos.getContent()`

### Testing Strategy

**Unit Tests:**
- `markdown-templates.test.ts`: 5 new tests for `processedBy` parsing/formatting/round-trip
- `TaskCard.test.tsx`: 2 new tests for processedBy label render/absence
- `useRemoteChangeDetection.test.ts`: 6 new tests covering all hook branches

**Manual Testing:**
1. Create tasks in Gitty, sync to GitHub
2. On desktop, manually edit `captured-ideas-*.md`: check off a task, add `[Processed by: Claude]` tag, commit and push
3. Switch back to Gitty tab → verify banner appears
4. Tap "Update" → verify tasks update, checked-off task shows as completed with "Processed by Claude" label
5. Test offline: disconnect, switch tabs → verify no error, no banner
6. Test conflict: create a local pending task, then edit remote file → verify conflict sheet appears instead of import banner

### Notes

- **Rate limiting:** The 30-second debounce prevents API spam. GitHub's rate limit is 5,000 requests/hour for authenticated users — even without debounce this would be fine, but debounce is good practice for mobile battery/bandwidth.
- **Future consideration (Epic 9):** Smart merge when both local and remote have changes. This story explicitly defers to the conflict sheet for that case.
- **Backwards compatibility:** Tasks without `processedBy` work exactly as before. The field is optional and defaults to null. Old markdown files without the tag parse correctly (extractBracketValue returns null for missing tags).
- **Agent instruction update:** The instruction change in Task 4 is additive — agents running with old cached instructions that only do "Checked by [Agent Name]" in the body will still work, their tasks just won't populate the `processedBy` field until they pick up the new instructions on next sync.
