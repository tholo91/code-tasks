---
title: 'Additive Import with Diff Summary'
slug: '8-12-additive-import-with-diff-summary'
created: '2026-03-18'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [React 19, Zustand v5, Octokit, Framer Motion v12, TypeScript 5.8, Vitest, Testing Library]
files_to_modify:
  - src/utils/task-diff.ts (NEW)
  - src/utils/task-diff.test.ts (NEW)
  - src/stores/useSyncStore.ts
  - src/App.tsx
  - src/features/sync/components/SyncImportBanner.tsx
  - src/features/sync/components/SyncImportBanner.test.tsx
  - src/features/sync/utils/markdown-templates.ts
  - src/hooks/useRemoteChangeDetection.ts
  - src/hooks/useRemoteChangeDetection.test.ts
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

# Tech-Spec: Additive Import with Diff Summary

**Created:** 2026-03-18

## Overview

### Problem Statement

When Gitty detects remote changes on main (typically from an AI agent checking off tasks in VS Code), the current import flow does a **full replace** — it nukes all local tasks and drops in the remote set. This destroyed 3 user-created ideas that hadn't been pushed yet. The import banner says "Want the latest?" which implies something might be overwritten, creating anxiety instead of trust. The phone should be the safe haven for ideas — nothing should ever be lost.

### Solution

Replace the full-replace import with an **additive merge** that only pulls in completions and annotations from the remote, never deletes local tasks. Show a trust-building diff summary in the import banner ("Agent completed 2 tasks · Your 3 new ideas are safe"). If a task is missing from the remote (agent or user deleted it), archive it locally instead of removing it — and exclude archived tasks from being pushed back to the remote. Update AI agent instructions to explicitly forbid deletion.

### Scope

**In Scope:**
- Additive merge logic: match tasks by title, only import completion status + `processedBy` + body additions
- Preserve local-only tasks (created on mobile, not yet pushed) during import
- Archive handling: if a task disappears from remote, mark it completed with "[Archived]" in body — never delete. Archived tasks are excluded from push to prevent zombie loops.
- Diff summary in `SyncImportBanner`: show what changed and reassure about local safety
- Updated AI agent header instructions: explicit "do NOT delete or remove tasks"
- Simplify `useRemoteChangeDetection`: always show import banner (no conflict path for pending changes)

**Out of Scope:**
- UUID-based task matching (future improvement)
- Full conflict resolution UI (Epic 9)
- Pull-to-refresh gesture
- Smart field-level merge for simultaneous local+remote edits to the same task

## Context for Development

### Codebase Patterns

1. **Current import flow:** `importPrompt` state in `App.tsx` (line 248) holds `{ repoFullName, tasks, sha, source }`. When user taps "Update", `replaceTasksForRepo()` is called (line 596) which does a full replace of all tasks for that repo in the store + IDB.

2. **`replaceTasksForRepo` implementation** (`useSyncStore.ts` line 590): Filters out ALL tasks for the repo, deletes them from IDB, then inserts the imported tasks. This is the destructive action. It stays for `initial-import` (empty local list). A new `mergeRemoteTasksForRepo` action handles the `remote-update` case.

3. **Task interface** (`src/types/task.ts`): Has `id`, `title`, `body`, `isCompleted`, `completedAt`, `processedBy`, `syncStatus` (`'pending' | 'synced'`), `order`, `isImportant`, `createdAt`, `updatedAt`. No changes needed — all fields already exist.

4. **Title-based matching:** Tasks have local UUIDs (`id`) but no stable cross-local/remote identifier. The markdown uses `**title**` as the key. Match by `title.trim().toLowerCase()`. Known limitation: renamed tasks won't match; duplicate titles match first occurrence. Cross-user title collision is theoretically possible but the app is single-user (personal repos) — acceptable risk until UUIDs are added.

5. **Remote change detection** (`src/hooks/useRemoteChangeDetection.ts`): On visibility change, fetches remote via `fetchRemoteTasksForRepo()`. Currently: `pendingCount > 0` → conflict sheet; `pendingCount === 0` → import banner. With additive merge, both paths show the import banner.

6. **AI agent header** (`markdown-templates.ts` line 18, `getAIReadyHeader()`): Current instructions allow agents to mark done and add `[Processed by: AgentName]`. Needs explicit guardrail: "Do NOT delete or remove tasks from this file."

7. **SyncImportBanner** (`src/features/sync/components/SyncImportBanner.tsx`): Has `variant: 'initial-import' | 'remote-update'`. The `remote-update` variant shows "Updates on main / Want the latest?". Needs new `diffSummary` prop. Currently missing `useReducedMotion()` — add it while touching this component (F12).

8. **`localRevision` pattern:** Every store action that mutates tasks (`addTask`, `updateTask`, `toggleComplete`, `removeTask`, `reorderTasks`, `moveTaskToRepo`) increments `localRevision` on `repoSyncMeta`. The new `mergeRemoteTasksForRepo` action MUST also bump `localRevision` so the next push includes the merge results.

9. **Remote tasks from `fetchRemoteTasksForRepo`:** The sync service constructs full `Task` objects (with `username`, `repoFullName`, `id`, and all required fields) at `sync-service.ts` lines 452-467. The `buildMergedTaskList` function can rely on remote tasks being complete `Task` objects.

10. **Push exclusion for archived tasks:** `buildFullFileContent()` in `markdown-templates.ts` (line 205) takes a `Task[]` and formats all of them. Archived tasks (body starts with `[Archived]`) must be filtered out before being passed to this function, otherwise they reappear on the remote as zombies.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/types/task.ts` | Task interface — no changes needed |
| `src/stores/useSyncStore.ts` | `replaceTasksForRepo()` at line 590 — add `mergeRemoteTasksForRepo()` alongside; must bump `localRevision` |
| `src/App.tsx` | Import handler at line 593 — compute diff, route to merge or replace based on variant; call `clearRepoConflict` after merge |
| `src/features/sync/components/SyncImportBanner.tsx` | Banner UI — add diff summary, add `useReducedMotion()` |
| `src/features/sync/utils/markdown-templates.ts` | `getAIReadyHeader()` at line 18 — update agent instructions; `buildFullFileContent()` at line 205 — filter archived tasks from push |
| `src/hooks/useRemoteChangeDetection.ts` | Remote detection — remove conflict path, always notify |
| `src/hooks/useRemoteChangeDetection.test.ts` | 6 existing tests — update conflict test |

### Technical Decisions

1. **Title-based matching.** `title.trim().toLowerCase()` as the match key. First-occurrence wins on duplicates. UUIDs deferred to a future spec.

2. **Additive merge rules:**
   - Remote task matches local → update `isCompleted`, `completedAt`, `processedBy`. For body: only take remote body if remote is longer AND local `syncStatus` is `'synced'` (not pending). If local is `'pending'`, always keep local body — the user edited it locally and hasn't pushed yet. Keep local `isImportant`, `createdAt`, `order`, `id`, `syncStatus`.
   - Local-only task (no remote match, `syncStatus: 'pending'`) → **keep as-is**. Unpushed ideas are sacred.
   - Local synced task missing from remote → **archive**: set `isCompleted: true`, `completedAt: now`, prepend "[Archived] " to body if not already there.
   - Remote-only task (no local match) → **add it** with `syncStatus: 'synced'`. Remote tasks from `fetchRemoteTasksForRepo` are already complete `Task` objects with all required fields.

3. **Archive exclusion from push.** Archived tasks (body starts with `[Archived] `) are excluded from the task array passed to `buildFullFileContent()` during sync. They live locally as a record but never push back to the remote. This prevents zombie loops.

4. **No more conflict for pending changes.** Additive merge preserves local pending tasks, so remote changes + local pending changes coexist safely. The hook always calls `onRemoteChanges`. After merge, call `clearRepoConflict` to prevent stale conflict banner from showing alongside the import banner.

5. **`initial-import` keeps full replace.** When switching to a repo with zero local tasks, `replaceTasksForRepo` is still correct. Only the `remote-update` flow uses `mergeRemoteTasksForRepo`.

6. **Diff is a pure function.** `computeImportDiff(localTasks, remoteTasks)` returns a typed summary object. No side effects, easy to test.

7. **Banner messaging is warm.** Not "3 tasks will be overwritten" but "Agent completed 2 tasks · Your 3 new ideas are safe."

8. **Silent SHA update when no meaningful changes.** If `computeImportDiff` returns all counts at zero, skip showing the banner and silently update `lastSyncedSha`. This avoids a confusing "nothing changed" popup.

9. **Set `lastSyncedRevision` after merge.** After `mergeRemoteTasksForRepo` bumps `localRevision`, the `onImport` handler must also set `lastSyncedRevision` to the new `localRevision` value. Without this, the next push cycle sees `localRevision > lastSyncedRevision` and echo-pushes the just-imported state back to remote.

10. **Guard visibility check during active push.** The `useRemoteChangeDetection` hook must skip remote checks when `syncEngineStatus === 'syncing'`. Otherwise, a visibility change during push could fetch a stale remote SHA and show a phantom banner.

11. **Banner messaging: 2-line cap.** Mobile screens can't fit 5 summary lines. Cap the banner at 2 lines: (1) the most significant change ("Agent completed 2 tasks"), (2) the safety reassurance ("Your 3 new ideas are safe"). Additional detail (notes updated, archived) is secondary and omitted from the banner.

12. **Avoid "archived" as user-facing label.** Users didn't archive anything — the system protected their data. If archived tasks need mention, phrase it as "kept locally" rather than "archived."

## Implementation Plan

### Types

```typescript
/** Exported from src/utils/task-diff.ts */
export interface ImportDiffSummary {
  completedByAgent: number
  updatedWithNotes: number
  processedByAdded: number
  archived: number
  newFromRemote: number
  localSafeCount: number
}
```

### Tasks

- [x] Task 1: Create `computeImportDiff` and `buildMergedTaskList` pure functions
  - File: `src/utils/task-diff.ts` (NEW)
  - Action: Export the `ImportDiffSummary` interface and two functions:

    **`computeImportDiff(localTasks: Task[], remoteTasks: Task[]): ImportDiffSummary`**
    - Build a Map of remote tasks keyed by `titleKey(task)` where `titleKey = (t: Task) => t.title.trim().toLowerCase()`
    - Build a Map of local tasks keyed by the same
    - Walk local tasks:
      - If matching remote exists AND remote is completed but local is not → count as `completedByAgent`
      - If matching remote exists AND remote body is longer AND local `syncStatus === 'synced'` → count as `updatedWithNotes`
      - If matching remote exists AND remote `processedBy` is set but local is not → count as `processedByAdded`
      - If no matching remote AND `syncStatus === 'synced'` → count as `archived`
    - Walk remote tasks:
      - If no matching local → count as `newFromRemote`
    - Count local tasks with `syncStatus === 'pending'` → `localSafeCount`
    - Return `{ completedByAgent, updatedWithNotes, processedByAdded, archived, newFromRemote, localSafeCount }`
    - Helper: `isAllZero(diff: ImportDiffSummary): boolean` — returns true if all counts are 0

    **`buildMergedTaskList(localTasks: Task[], remoteTasks: Task[]): Task[]`**
    - Build remote Map keyed by `titleKey(task)`
    - For each local task:
      - Find matching remote by title key
      - If match found:
        - If remote `isCompleted` and local is not → set `isCompleted: true`, `completedAt: remote.completedAt ?? new Date().toISOString()`
        - If remote `processedBy` is set → set `processedBy: remote.processedBy`
        - If remote `body.length > local.body.length` AND local `syncStatus === 'synced'` → take remote body. Otherwise keep local body.
        - Keep all other local fields (`id`, `order`, `isImportant`, `createdAt`, `syncStatus`)
        - Mark remote as "consumed" in the Map
      - If no match AND `syncStatus === 'synced'` → archive: set `isCompleted: true`, `completedAt: new Date().toISOString()`, prepend `[Archived] ` to body (if not already prefixed)
      - If no match AND `syncStatus === 'pending'` → keep as-is (unpushed idea)
    - For each unconsumed remote task → add to result with `syncStatus: 'synced'`, assign `order` at end of list. Remote tasks from `fetchRemoteTasksForRepo` are already full `Task` objects with valid `id`, `username`, `repoFullName`, etc.
    - Return the merged task array
  - Notes: Both functions are pure — no store access, no side effects. Extract `titleKey` as a shared helper.

- [x] Task 2: Add `mergeRemoteTasksForRepo` store action
  - File: `src/stores/useSyncStore.ts`
  - Action 2a: Add to the store interface (after `replaceTasksForRepo` at line 74):
    ```typescript
    mergeRemoteTasksForRepo: (repoFullName: string, remoteTasks: Task[]) => void
    ```
  - Action 2b: Implementation (after `replaceTasksForRepo` at line 609):
    - `const repoKey = normalizeRepoKey(repoFullName)`
    - Get local tasks for the repo: `state.tasks.filter(t => t.repoFullName.toLowerCase() === repoKey)`
    - Call `buildMergedTaskList(localTasks, remoteTasks)` (import from `src/utils/task-diff`)
    - Filter out old repo tasks from `state.tasks`, add merged tasks
    - Persist each merged task to IDB via `StorageService.persistTaskToIDB(task)`
    - Delete IDB entries for any local tasks whose `id` is not in the merged result (guard against orphans)
    - **Bump `localRevision`**: `const existingMeta = state.repoSyncMeta[repoKey]` → set `localRevision: (existingMeta?.localRevision ?? 0) + 1` — this ensures the next push includes merge results
  - Notes: Follows the same pattern as `replaceTasksForRepo`. Import `buildMergedTaskList` from `src/utils/task-diff`.

- [x] Task 3: Exclude archived tasks from push
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: In `buildFullFileContent()` (line 205), filter out archived tasks before formatting:
    ```typescript
    const nonArchived = tasks.filter(t => !t.body.startsWith('[Archived] '))
    ```
    Use `nonArchived` instead of `tasks` for the rest of the function (active/completed splits).
  - Notes: This prevents archived tasks from being pushed back to the remote markdown, avoiding the zombie loop (F1).

- [x] Task 4: Compute diff and route import in App.tsx
  - File: `src/App.tsx`
  - Action 4a: Add `diffSummary` state alongside `importPrompt` (~line 254):
    ```typescript
    const [diffSummary, setDiffSummary] = useState<ImportDiffSummary | null>(null)
    ```
  - Action 4b: Import `computeImportDiff`, `isAllZero`, `ImportDiffSummary` from `src/utils/task-diff`.
  - Action 4c: In the `useRemoteChangeDetection` callback (line 280), compute diff and skip banner if no meaningful changes:
    ```typescript
    useRemoteChangeDetection((data) => {
      if (!selectedRepo) return
      const repoKey = selectedRepo.fullName.toLowerCase()
      const localTasks = tasks.filter(t => t.repoFullName.toLowerCase() === repoKey)
      const diff = computeImportDiff(localTasks, data.tasks)

      if (isAllZero(diff)) {
        // SHA changed but no meaningful task differences — silently update SHA
        setRepoSyncMeta(selectedRepo.fullName, {
          lastSyncedSha: data.sha ?? null,
          lastSyncAt: new Date().toISOString(),
        })
        return
      }

      setDiffSummary(diff)
      setImportPrompt({
        repoFullName: selectedRepo.fullName,
        tasks: data.tasks,
        sha: data.sha,
        source: 'remote-update',
      })
    })
    ```
  - Action 4d: In the `onImport` handler (line 593), route based on `importPrompt.source`, clear conflict, and sync revision:
    ```typescript
    onImport={() => {
      if (isImporting || !importPrompt) return
      setIsImporting(true)
      if (importPrompt.source === 'remote-update') {
        mergeRemoteTasksForRepo(importPrompt.repoFullName, importPrompt.tasks)
      } else {
        replaceTasksForRepo(importPrompt.repoFullName, importPrompt.tasks)
      }
      // Read the current localRevision AFTER merge (which bumped it)
      const repoKey = importPrompt.repoFullName.toLowerCase()
      const currentRevision = useSyncStore.getState().repoSyncMeta[repoKey]?.localRevision ?? 0
      setRepoSyncMeta(importPrompt.repoFullName, {
        lastSyncedSha: importPrompt.sha ?? null,
        lastSyncedRevision: currentRevision,
        lastSyncAt: new Date().toISOString(),
        conflict: null,
      })
      clearRepoConflict(importPrompt.repoFullName)
      setImportPrompt(null)
      setDiffSummary(null)
      setIsImporting(false)
    }}
    ```
  - Action 4e: Pass `diffSummary` to `SyncImportBanner`:
    ```tsx
    <SyncImportBanner
      ...existing props...
      diffSummary={diffSummary}
    />
    ```

- [x] Task 5: Update SyncImportBanner to display diff summary
  - File: `src/features/sync/components/SyncImportBanner.tsx`
  - Action 5a: Add `diffSummary` to props interface and import type:
    ```typescript
    import type { ImportDiffSummary } from '../../../utils/task-diff'

    interface SyncImportBannerProps {
      ...existing...
      diffSummary?: ImportDiffSummary | null
    }
    ```
  - Action 5b: Add `useReducedMotion()` from framer-motion. Apply to the `transition` prop: `transition={shouldReduceMotion ? { duration: 0 } : TRANSITION_NORMAL}` (F12 fix).
  - Action 5c: Replace the `remote-update` body text. Build a **2-line max** summary from `diffSummary`:
    - **Line 1 (primary change):** Pick the most significant change in priority order:
      - `completedByAgent > 0` → "Agent completed {n} task(s)"
      - `updatedWithNotes > 0` → "{n} task(s) updated with notes"
      - `newFromRemote > 0` → "{n} new task(s) from remote"
      - Else → "Remote changes detected"
    - **Line 2 (safety reassurance, only if `localSafeCount > 0`):** "Your {n} new idea(s) are safe" in `var(--color-success)`
    - Fallback (no `diffSummary`): "Want the latest status?"
  - Action 5d: Render as two compact lines below the title, `text-caption` size. Do NOT show archived count in the banner — "archived" is system jargon. Mobile screens need minimal text.
  - Notes: The `variant='initial-import'` path is unchanged — no diff summary shown.

- [x] Task 6: Simplify useRemoteChangeDetection — remove conflict path, add syncing guard
  - File: `src/hooks/useRemoteChangeDetection.ts`
  - Action 6a: Add a syncing guard at the top of `handleVisibilityChange` (after the debounce check):
    ```typescript
    if (state.syncEngineStatus === 'syncing') return // Don't check during active push
    ```
  - Action 6b: Replace the `pendingCount` branching (lines 57-68) with a single path:
    ```typescript
    // Always notify — additive merge preserves local pending tasks
    onRemoteChangesRef.current({ tasks: result.tasks, sha: remoteSha })
    ```
  - Remove: `import { selectPendingSyncCount }` (line 2) and the `pendingCount` const.
  - Notes: The syncing guard (P3) prevents phantom banners when the user alt-tabs during a push. The `SyncConflictSheet` is still triggered during push operations (in `sync-service.ts`) — this change only affects the visibility-change detection path.

- [x] Task 7: Update AI agent instructions
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: In `getAIReadyHeader()` (line 18), add a new instruction bullet after the "Mark tasks as done" line:
    ```
    > - Do NOT delete or remove tasks from this file — only the mobile app manages task lifecycle
    ```

- [x] Task 8: Tests
  - File: `src/utils/task-diff.test.ts` (NEW) — 14 tests:
    - Test: `computeImportDiff` counts completions correctly (2 remote completed, local not)
    - Test: `computeImportDiff` counts updates (remote body longer than local synced task)
    - Test: `computeImportDiff` does NOT count body update if local is pending (F3 guard)
    - Test: `computeImportDiff` counts processedBy additions (F6)
    - Test: `computeImportDiff` counts archived (local synced task missing from remote)
    - Test: `computeImportDiff` counts new from remote (remote task with no local match)
    - Test: `computeImportDiff` counts local safe (local pending tasks)
    - Test: `computeImportDiff` returns all zeros when local and remote are identical
    - Test: `isAllZero` returns true for all-zero summary, false otherwise
    - Test: `buildMergedTaskList` preserves local pending tasks (including their body)
    - Test: `buildMergedTaskList` updates completion from remote
    - Test: `buildMergedTaskList` takes remote body when longer AND local is synced
    - Test: `buildMergedTaskList` keeps local body when local is pending (even if remote is longer)
    - Test: `buildMergedTaskList` archives local synced tasks missing from remote with "[Archived] " prefix
    - Test: `buildMergedTaskList` adds remote-only tasks with synced status
    - Test: `buildMergedTaskList` title matching is case-insensitive and trimmed
    - Test: `buildMergedTaskList` first-occurrence wins when duplicate titles exist
    - Test: `isAllZero` returns true for all-zero summary, false otherwise
  - File: `src/hooks/useRemoteChangeDetection.test.ts` — 2 tests updated:
    - Update: "Sets conflict when SHA differs and pending changes exist" → "Calls onRemoteChanges when SHA differs even with pending changes"
    - Add: "Skips remote check when syncEngineStatus is 'syncing'"
  - File: `src/features/sync/components/SyncImportBanner.test.tsx` — 4 new tests:
    - Test: Renders diff summary lines when `diffSummary` is provided with `variant='remote-update'`
    - Test: Shows "Your N new ideas are safe" when `localSafeCount > 0`
    - Test: Falls back to static text when `diffSummary` is null
    - Test: Does not render diff summary for `variant='initial-import'`

### Acceptance Criteria

- [x] AC 1: Given an AI agent has checked off 2 tasks on main and the user has 3 unpushed local ideas, when the user opens the app and the import banner appears, then the banner shows "Agent completed 2 tasks" and "Your 3 new ideas are safe."

- [x] AC 2: Given the user taps "Update" on the import banner, when the additive merge runs, then the 2 agent-completed tasks are marked completed locally AND the 3 unpushed local ideas remain untouched with `syncStatus: 'pending'`.

- [x] AC 3: Given a task exists locally with `syncStatus: 'synced'` but is missing from the remote markdown, when the additive merge runs, then the task is marked completed with "[Archived] " prepended to its body — it is NOT deleted.

- [x] AC 4: Given a remote task has a longer body than the local match (agent appended notes) and the local task has `syncStatus: 'synced'`, when the additive merge runs, then the remote body replaces the local body (preserving agent annotations).

- [x] AC 5: Given a remote task has a longer body but the local task has `syncStatus: 'pending'` (user edited locally), when the additive merge runs, then the local body is preserved — the remote body is NOT applied.

- [x] AC 6: Given a remote task exists with no local match, when the additive merge runs, then the task is added locally with `syncStatus: 'synced'`.

- [x] AC 7: Given the user has local pending changes (unpushed tasks) AND the remote SHA has changed, when the app becomes visible, then the import banner is shown (NOT the conflict sheet).

- [x] AC 8: Given all diff counts are zero (SHA changed but task content is equivalent), when the app processes the remote check, then no banner is displayed and the SHA is silently updated.

- [x] AC 9: Given the AI agent instructions in the markdown header, when an agent reads the file, then the instructions explicitly state "Do NOT delete or remove tasks from this file."

- [x] AC 10: Given a first-time import (empty local list, `variant: 'initial-import'`), when the user taps "Import", then the full replace logic is used (not additive merge) — backwards compatible.

- [x] AC 11: Given an archived task exists locally (body starts with "[Archived] "), when the user pushes to GitHub, then the archived task is NOT included in the markdown file.

- [x] AC 12: Given the additive merge runs, when `mergeRemoteTasksForRepo` completes, then `localRevision` in `repoSyncMeta` is incremented AND `lastSyncedRevision` is set to match, so the merge results are acknowledged and the next push does not echo-push imported data.

- [x] AC 13: Given a push is in progress (`syncEngineStatus === 'syncing'`), when the user switches back to the app (visibility change), then no remote check is performed and no banner appears.

## Additional Context

### Dependencies

- Story 8-11 (Two-Way Sync) — implementation-complete, provides the detection hook and import flow this story modifies
- Story 8-9 (AI Agent Header) — done, provides base instruction text this story updates
- No new npm dependencies required

### Testing Strategy

**Unit Tests (18 new):**
- `src/utils/task-diff.test.ts`: 18 tests covering diff computation, merge logic, duplicate titles, and edge cases (all pure functions, fast)

**Integration Tests (6 updated/new):**
- `src/hooks/useRemoteChangeDetection.test.ts`: 2 tests updated (conflict → always notify, syncing guard)
- `src/features/sync/components/SyncImportBanner.test.tsx`: 4 new tests for diff summary rendering

**Manual Testing:**
1. Create 3 tasks on mobile, do NOT sync
2. On desktop, check off 1 existing task in markdown, add `[Processed by: Claude]`, push to main
3. Switch back to Gitty → banner should show "Agent completed 1 task · Your 3 new ideas are safe"
4. Tap "Update" → the 1 task is checked off with "Processed by Claude", 3 local ideas untouched
5. Test archive: delete a task from markdown on desktop, push → Gitty shows it as archived, not deleted
6. Push from Gitty again → verify archived task does NOT reappear in the remote markdown
7. Test first-time import: switch to a new repo → full replace still works as before

### Notes

- **Title collision:** If two tasks share the same title, first-occurrence match wins. UUIDs will fix this — separate future spec.
- **Body merge guard (F3 fix):** Remote body is only taken if longer AND local task is `syncStatus: 'synced'`. If local is `'pending'` (user edited), local body always wins. This prevents data loss when user shortens a body locally.
- **Zombie prevention (F1 fix):** Archived tasks are filtered out in `buildFullFileContent()` before push. They persist locally as a record/backup but never reappear on the remote.
- **`localRevision` (F2 fix):** `mergeRemoteTasksForRepo` bumps `localRevision` like all other store mutations, ensuring the next push includes merge results.
- **Conflict cleanup (F7 fix):** After merge, `clearRepoConflict` is called to prevent stale `SyncConflictBanner` from lingering alongside the import banner.
- **Stale diff (F4):** The diff is computed when the banner appears but the merge runs when the user taps "Update" — if the user creates tasks in between, the displayed summary may be slightly stale. This is a known limitation; recomputing at merge time is deferred as the window is typically seconds, not minutes.
- **Backwards compatibility:** `replaceTasksForRepo` stays in the store for `initial-import`. `mergeRemoteTasksForRepo` is additive — does not modify the existing action.
