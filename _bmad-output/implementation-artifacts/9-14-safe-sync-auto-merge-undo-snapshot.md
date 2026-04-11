# Story 9.14: Safe Sync — Auto-merge + Review Receipt + Undo Snapshot

Status: ready-for-dev

> **Core promise:** Nothing from the user's phone can ever be lost, and the user should never have to make a decision in a popup to make that true.

> **Ship target:** 2026-04-19 (one-week time box). If snapshot/undo (Tasks T7–T9) cannot ship by then, cut them to a follow-up quick-spec and ship T1–T6 alone. The trust narrative still lands because the biggest win — "no popup can ever destroy your ideas" — is already in.

## Story

As a mobile user of Gitty,
I want every sync to be silently additive and every sync action to be undoable,
so that my local ideas are guaranteed safe forever, no matter what happens on main or what I accidentally tap.

## Acceptance Criteria

1. **[Auto-merge on SHA divergence]** Given my local repo has diverged from main (SHA mismatch), when I trigger a sync (push), then Gitty silently pulls the remote file, runs additive merge via `buildMergedTaskList` from `task-diff.ts`, and re-pushes. No popup or blocking UI appears. The existing `SyncConflictSheet` is never shown.

2. **[SyncConflictSheet deleted]** `src/features/sync/components/SyncConflictSheet.tsx` is removed from the codebase. No code path reaches the old side-by-side raw markdown view. `src/features/sync/components/SyncConflictBanner.tsx` is removed or gutted of destructive paths (only `SyncImportBanner` remains for voluntary import flows).

3. **[Post-sync receipt toast with Undo + View]** After any sync that resulted in non-zero changes (either pushed or pulled), a result toast appears at the bottom of the screen for 5 seconds with:
   - Primary status text: e.g. `Synced — 3 changes from main`, `Synced — your 2 ideas pushed`, or `Synced — nothing changed` (dismisses immediately if zero)
   - `View` action → opens read-only `SyncReviewSheet` showing the task-level diff
   - `Undo` action → restores the pre-sync snapshot (only shown when snapshot exists and sync modified existing tasks)
   - Toast disappears after 5s with fade-out animation

4. **[SyncReviewSheet — read-only receipt view]** A new `SyncReviewSheet.tsx` renders the diff of the last sync as a single unified scrollable list. Each row shows:
   - `[checkbox] task title` layout (checkbox reflects the task's resulting state)
   - 3px left-edge colored bar accent per change state
   - Small icon glyph left of the checkbox (semantic, not decorative)
   - Short text label next to the title (e.g. `checked by agent`)
   - Change states:
     - **Green + check icon + `checked by agent`** — task was checked off on main, now applied locally
     - **Blue + plus icon + `new on main`** — task was added on main, now imported locally
     - **Amber + speech-bubble icon + `note added`** — task had notes extended on main, merged into local (or three-way note-merged per AC11)
     - **No accent / gray + no decoration** — task unchanged
   - Sheet opens via the toast `View` button and via Settings → Repos → [repo] → "Last merge review". The sheet is NEVER forced/blocking.

5. **[Local-only tasks surfaced and protected]** In `SyncReviewSheet`, tasks that exist locally but NOT on main (i.e. not yet pushed, or pushed-then-remotely-deleted) appear at the top of the list under a section header `Only on your phone` with a shield icon. These tasks are NEVER deleted, archived, or modified by any sync flow. The merge logic must preserve them verbatim.

6. **[Keep Remote removed from primary UI]** A codebase search for `keepRemote`, `handleKeepRemote`, `Keep Remote` returns only references in Settings → Repos → [repo] → Danger Zone → "Reset from remote" (story Task T10). No button that can destroy local tasks is reachable from the main task list, sync FAB, or any banner/toast.

7. **[Reset from remote — typed confirmation]** The Danger Zone "Reset from remote" action requires the user to type the exact repo name (case-sensitive) into a confirmation input before the destructive button enables. Below the input, warning copy reads: `This will delete N local ideas that are not on main. This cannot be undone unless you restore from a snapshot.` Button is disabled until input exactly matches `{owner}/{repo}`.

8. **[Auto-snapshot before mutating sync]** Before any sync action that could modify existing local tasks (auto-merge after SHA divergence, remote import via SyncImportBanner, or Reset from remote), Gitty captures a snapshot of the repo's current task list into `syncHistory`. Snapshots are:
   - Content-hash deduped (if the new snapshot's hash equals the most recent snapshot's hash, skip)
   - Max 5 snapshots per repo (FIFO eviction when full)
   - 7-day expiry (snapshots older than 7 days pruned on app launch and on every new snapshot write)
   - Encrypted via existing `crypto-utils.ts` AES-GCM layer using the user's session key (NOT a static passphrase — see Dev Notes for key derivation)
   - Keyed by repo full name (lowercase), stored under `syncHistory` in the persist layer

9. **[Settings → Restore from snapshot]** Settings → Repos → [repo] view shows a "Restore from snapshot" section listing up to 5 historical snapshots, each row showing:
   - Localized timestamp (e.g. `2 hours ago` / `Yesterday, 16:42`)
   - Task count at time of snapshot (e.g. `12 tasks`)
   - Label indicating trigger (`Before sync` / `Before remote import`)
   - Tap → opens confirmation dialog, then restores on confirm
   - Empty state if no snapshots: `No snapshots yet. Gitty saves one automatically before each sync.`

10. **[Restore data-loss warning]** When the user taps a snapshot to restore, if the restore would discard tasks created since the snapshot was taken (i.e. current `tasks.length > snapshot.tasks.length` OR there exist tasks with `createdAt > snapshot.createdAt`), show a confirmation dialog:
    - Title: `Keep your newer ideas?`
    - Body: `This snapshot is from {N time ago}. You have {M} task{s} created since then.`
    - Primary action: `Merge newer ideas in` (default — merges post-snapshot tasks into the restored list)
    - Secondary action: `Discard newer ideas`
    - Tertiary action: `Cancel`
    - Default focus on primary ("Merge"). Destructive option requires a second tap.

11. **[Three-way note merge]** When both local and remote have modified the `body` field of the same task since the last sync (`local.syncStatus === 'pending'` AND remote body differs from the body in the most recent `syncHistory` snapshot for that task), the merge logic:
    - Keeps the local body as the primary content
    - Appends the remote body below, prefixed with `\n\n---\n[from main, YYYY-MM-DD]: {remote body}`
    - Marks the task as `updatedWithNotes` in the diff summary
    - Never loses either version, never asks the user to choose
    - This extends the `buildMergedTaskList` logic in `task-diff.ts`.

12. **[Copy reframe audit]** All user-facing sync-related strings across the app avoid the words `conflict`, `overwrite`, `discard`, `fail`, `destroy`. They use instead: `review`, `apply`, `merge`, `safe`, `synced`, `restored`. This story includes a complete copy audit table (see Dev Notes → Copy Audit).

13. **[task-diff.ts reused, not duplicated]** The new SyncReviewSheet uses the existing `computeImportDiff` and `buildMergedTaskList` from `src/utils/task-diff.ts`. If new fields are needed on the diff summary (e.g. the actual list of local-only tasks, not just the count), extend the existing `ImportDiffSummary` type and update callers. Do NOT create a parallel diff utility.

14. **[Haptic feedback]** On successful sync with non-zero changes, `triggerLaunchHaptic()` fires (light impact). On successful Undo, a new `triggerSuccessHaptic()` wrapper fires a notification-success pattern (`Haptics.notification({ type: NotificationType.Success })`). All haptics wrapped in try/catch and degrade to no-op on web.

15. **[Edge — Remote file does not exist]** When the remote markdown file does not exist on main (404), the auto-merge path is not invoked. Behavior falls through to the existing empty-state / initial-import flow (`SyncImportBanner` or empty state). No snapshot is taken, no toast fires. Existing Story 8-11 / 8-12 behavior preserved.

16. **[Edge — Network failure during auto-merge]** When the auto-merge flow fails mid-sequence (pull succeeds, re-push fails, OR pull fails entirely), no snapshot is promoted to `syncHistory` (snapshot is captured BEFORE the merge but rolled back if the sync ultimately errors). Sync status shows error via existing `SyncErrorSheet` with retry. Local state is unchanged.

17. **[Edge — User taps Undo immediately]** When the user taps Undo within the 5s toast window, the snapshot restores instantly, toast dismisses, repo is marked dirty (`hasPendingDeletions = true` is NOT used — instead we mark all restored tasks as `syncStatus: 'pending'` so the next sync re-pushes local state). Next sync cleanly re-pushes the restored state.

18. **[Edge — Offline snapshot restore]** When the user taps a snapshot restore in Settings while offline, the restore proceeds (localStorage is local — works offline), repo is marked dirty, will sync when back online. Sync status pill shows `Pending` until connectivity returns.

19. **[Edge — Agent renamed a task (normalization mismatch)]** When an agent pushed a task to main with a modified title (the existing `titleKey` normalization fails to match), the diff will show as "1 local-only + 1 new on main" — a transient duplicate. Local is not deleted. This is accepted as a documented limitation in `SyncReviewSheet`'s "known limitations" footer: `Renamed tasks may show as duplicates until next capture — your local copy is always kept.` No fuzzy matching in this story; tracked as backlog item for a future quick-spec.

20. **[Edge — captured-ideas.md deleted on main upstream]** When Gitty detects that the remote file has been deleted between syncs (was present at last sync, returns 404 now), treat as "no updates". Do NOT destroy local tasks. Show an info toast: `Remote file missing — your local ideas are safe.` Next push will re-create the file on main. No SyncReviewSheet opens.

21. **[Accessibility]** All change-state indicators in `SyncReviewSheet` are perceivable without color:
    - Icon + text label + color (color is flavor, not information)
    - Each row has a semantic `aria-label` that includes the change state (e.g. `aria-label="Fix sync bug — checked by agent"`)
    - WCAG AA contrast minimum for all text (4.5:1 for body, 3:1 for large/bold text)
    - Sheet navigable via keyboard (Tab/Arrow); Escape closes
    - Screen reader announces the section header when focus enters "Only on your phone" section
    - Tested with VoiceOver on iOS and TalkBack on Android before merge

22. **[Tests]** The following test coverage is added:
    - `src/utils/task-diff.test.ts` — existing test file extended: new cases for three-way note merge, local-only tasks in diff result, rename edge case documented as known behavior
    - `src/services/storage/sync-history-service.test.ts` — NEW file: snapshot ring buffer, content-hash dedupe, 7-day expiry, max-5 FIFO, encryption round-trip
    - `src/stores/useSyncStore.test.ts` (if exists) or inline in store file test — `captureSyncSnapshot`, `restoreSyncSnapshot`, `pruneExpiredSnapshots` actions
    - `src/features/sync/components/SyncReviewSheet.test.tsx` — NEW file: renders change states correctly, handles empty diff, local-only section appears, accessibility labels, keyboard navigation
    - `src/features/sync/components/SyncResultToast.test.tsx` — NEW or extended: Undo button appears when snapshot exists, View button opens sheet, auto-dismiss after 5s
    - `src/services/github/sync-service.test.ts` (if exists) — auto-merge path on SHA divergence: pull → merge → re-push without user interaction
    - All existing sync + import tests MUST continue to pass.

## Tasks / Subtasks

- [ ] **T1: Kill SyncConflictSheet — auto-merge on SHA divergence** (AC: 1, 2, 15, 16, 20)
  - [ ] T1.1: In `src/services/github/sync-service.ts`, locate the conflict-return branch (search for `status: 'conflict'` — there are two at lines ~389 and ~638). Change the behavior: instead of returning `{ status: 'conflict', conflict: {...} }`, auto-pull the remote file, run `buildMergedTaskList(localTasks, parseTasksFromMarkdown(remoteContent))`, write the merged tasks back to the store via a new action `applyMergedTasks(repoFullName, mergedTasks)`, then re-push with `allowConflict: true` (since we just reconciled). Remove the `allowConflict` option from the external `SyncOptions` interface once it's no longer needed, or keep it as an internal flag.
  - [ ] T1.2: The auto-merge must happen BEFORE the final push. Fetch the remote file, parse it, call `buildMergedTaskList`, update the store, then call `buildFileContent` with the merged list and push. Result object returns `{ error: null, conflict: null, mergeSummary: ImportDiffSummary }` so the UI layer can show the receipt toast.
  - [ ] T1.3: Extend the `SyncResult` type in `sync-service.ts` with an optional `mergeSummary: ImportDiffSummary | null` field so the caller knows what happened. Populate it from the auto-merge path; leave `null` for clean pushes (nothing pulled).
  - [ ] T1.4: Handle AC16 (mid-flight failure): wrap the auto-merge in a try/catch. If the pull succeeds but the re-push fails, roll back any store mutation by calling the new `restoreSyncSnapshot(repoFullName, preMergeSnapshotId)` action (snapshot must be captured BEFORE mutation for this to work — see T7).
  - [ ] T1.5: Handle AC15 (remote file missing on merge): if the pull returns 404, fall through to clean push (same as first-time upload). No merge, no snapshot, no toast-receipt.
  - [ ] T1.6: Handle AC20 (remote file deleted since last sync): if `syncMeta.lastSyncedSha` existed but current pull returns 404, show info toast `Remote file missing — your local ideas are safe.` via `setSyncFeedback`. Do NOT delete local tasks. Proceed with a clean push that re-creates the file.
  - [ ] T1.7: Delete `src/features/sync/components/SyncConflictSheet.tsx` and remove its import/usage from `App.tsx`. Remove all references to `repoSyncMeta.conflict` in components (the field can stay in the store type for now for backward compat but no UI reads it).
  - [ ] T1.8: Audit `src/features/sync/components/SyncConflictBanner.tsx` — if it only rendered based on the destructive conflict state, delete it. If it serves another purpose, gut the destructive branches.
  - [ ] T1.9: Remove `clearRepoConflict` from any UI call sites. Either remove the action entirely or leave it as a no-op shim to avoid breaking the store type (delete if safely possible).

- [ ] **T2: Extend task-diff.ts — three-way note merge + local-only task list** (AC: 11, 13)
  - [ ] T2.1: Extend `ImportDiffSummary` interface with a new optional field: `localOnlyTasks: Task[]` (the actual tasks, not just a count). Update `computeImportDiff` to populate this list by collecting tasks whose `titleKey` does not appear in the remote map.
  - [ ] T2.2: Extend `buildMergedTaskList` to implement three-way note merge: when a task's `local.syncStatus === 'pending'` AND `remote.body !== local.body` AND both bodies are non-empty AND the local body is NOT a prefix/superset of the remote body, build the merged body as:
    ```
    ${local.body}
    
    ---
    [from main, ${YYYY-MM-DD}]: ${remote.body}
    ```
    Use the current date from `new Date().toISOString().split('T')[0]`. The task's `syncStatus` stays `pending` (since local has unpushed changes). Increment a new `noteMergedCount` in the diff summary.
  - [ ] T2.3: Add `noteMergedCount: number` to `ImportDiffSummary`. Update `buildImportFeedbackMessage` to include it in the user-facing string: `${noteMergedCount} merged notes` if > 0.
  - [ ] T2.4: Update tests in `src/utils/task-diff.test.ts`:
    - Three-way note merge produces the expected prefix format
    - `localOnlyTasks` array contains the right tasks and excludes matched ones
    - Existing tests still pass (backwards compat)

- [ ] **T3: New SyncReviewSheet component** (AC: 3, 4, 5, 19, 21)
  - [ ] T3.1: Create `src/features/sync/components/SyncReviewSheet.tsx`. Props:
    ```tsx
    interface SyncReviewSheetProps {
      isOpen: boolean
      repoFullName: string
      diffSummary: ImportDiffSummary | null
      mergedTasks: Task[] // the resulting task list after merge
      previousTasks: Task[] // the task list BEFORE the merge (for diff computation)
      onClose: () => void
    }
    ```
  - [ ] T3.2: Compute per-task change state by comparing `mergedTasks[i]` against the matching task in `previousTasks` (by ID):
    - If previous had `!isCompleted` and merged has `isCompleted` → `checked-by-agent` (green)
    - If previous had no match (task is new) → `new-on-main` (blue)
    - If previous body differs from merged body → `note-added` (amber)
    - If task exists in `previousTasks` but NOT in `mergedTasks` → this should never happen (local-never-deleted guarantee). If it does, render under "Only on your phone" as a recovery.
    - Otherwise → unchanged (gray)
  - [ ] T3.3: Local-only tasks section at top:
    - Section header: `Only on your phone` with `ShieldIcon` (lucide-react or inline SVG)
    - Subtitle: `{N} idea{s} safe on this device`
    - List the tasks from `diffSummary.localOnlyTasks`
    - Rendered with a subtle blue accent and the shield icon at the row start
  - [ ] T3.4: Changed/unchanged tasks section:
    - Section header: `From main` (no icon, muted text)
    - One row per task in `mergedTasks` (excluding local-only)
    - Row layout: `[3px left bar][icon][checkbox][title + label]`
      - Checkbox reflects `task.isCompleted`
      - Title: `task.title` with `line-through` if completed
      - Label: small caption below title (`checked by agent` / `new on main` / `note added`)
    - Unchanged rows: no icon, no label, no bar (minimal visual noise)
  - [ ] T3.5: Footer with "known limitations" info link: `? Renamed tasks may show as duplicates — your local copy is always kept.` (tap to expand more details, no interaction required)
  - [ ] T3.6: Sticky footer with single CTA: `Close` (ghost button, bottom-right). Add optional secondary: `Open repo settings` (ghost, left-aligned) that routes to Settings → Repos → [repo] → Restore from snapshot if the user wants to undo from beyond the 5s toast window.
  - [ ] T3.7: Motion: reuse the existing bottom-sheet pattern from `SyncConflictSheet` (which is being deleted) — spring-up from bottom, backdrop fade, backdrop tap closes. Use `TRANSITION_NORMAL` from `src/config/motion.ts`. Respect `useReducedMotion`.
  - [ ] T3.8: Accessibility:
    - Root has `role="dialog"` and `aria-modal="true"` and `aria-label="Sync review"`
    - Focus trapped inside sheet while open; Escape closes
    - Each row has `aria-label` combining title + change state
    - Section headers are `<h3>` (or `role="heading" aria-level={3}`)
  - [ ] T3.9: Use lucide-react icons if already in the project, otherwise inline SVG (check `package.json`). Icons needed: `Check`, `Plus`, `MessageSquare`, `Shield`.
  - [ ] T3.10: Styling uses existing CSS variables from theme: `var(--color-success)`, `var(--color-info)`, `var(--color-warning)`, `var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-surface)`, `var(--color-border)`. No new palette additions.

- [ ] **T4: Extend SyncResultToast with View + Undo actions** (AC: 3, 14, 17)
  - [ ] T4.1: Update `SyncResultToastProps` to accept optional `onView?: () => void` and `onUndo?: () => void` callbacks and a `canUndo: boolean` flag. When `canUndo` is true, show the Undo button; when `onView` is provided, show the View button.
  - [ ] T4.2: Layout: `[status icon] [message] [spacer] [View btn] [Undo btn]`. Both buttons are text-style (ghost), accent color, 44x44 minimum touch target. On narrow screens (< 360px), stack the buttons below the message.
  - [ ] T4.3: Auto-dismiss after 5000ms (use `useEffect` with `setTimeout`, clear on unmount or on action click). Pause the timer while user finger is touching the toast (listen for `pointerdown`/`pointerup`) so the user has time to read.
  - [ ] T4.4: Tapping the toast body (but not the buttons) also dismisses it (preserve existing behavior).
  - [ ] T4.5: When Undo is clicked, call `onUndo()` then dismiss. Show a brief `Restoring…` state (200ms shimmer) before the restore completes.
  - [ ] T4.6: When View is clicked, call `onView()` (which opens `SyncReviewSheet`) and keep the toast visible until auto-dismiss (user can still undo after viewing).
  - [ ] T4.7: Fire `triggerLaunchHaptic()` (light impact) on successful sync when the toast appears (AC 14 — sync success haptic). Fire `triggerSuccessHaptic()` (new wrapper, see T9) on Undo success.
  - [ ] T4.8: Update `src/services/native/haptic-service.ts` — add `triggerSuccessHaptic()` using `Haptics.notification({ type: NotificationType.Success })` from `@capacitor/haptics`. Graceful no-op in try/catch.

- [ ] **T5: Wire App.tsx to show the receipt toast after sync** (AC: 3, 17)
  - [ ] T5.1: In `App.tsx`, after a sync completes successfully with `mergeSummary !== null`, set local state `lastMergeReceipt: { repoFullName, diffSummary, mergedTasks, previousTasks, snapshotId } | null`.
  - [ ] T5.2: When `lastMergeReceipt` is set, render `SyncResultToast` with:
    - `message` derived from `buildImportFeedbackMessage(diffSummary)` (e.g. `"3 tasks completed. Your 2 ideas are safe."`)
    - `canUndo = true` if `snapshotId !== null`
    - `onView` opens a new local state `reviewSheetOpen: true`
    - `onUndo` calls `restoreSyncSnapshot(repoFullName, snapshotId)` then clears `lastMergeReceipt`
  - [ ] T5.3: When `reviewSheetOpen` is true, render `SyncReviewSheet` with the data from `lastMergeReceipt`.
  - [ ] T5.4: If diff summary is empty (nothing actually changed), show a simpler `SyncResultToast` with just `"Nothing changed — your ideas are safe"` and no View/Undo buttons. Auto-dismiss after 2s.
  - [ ] T5.5: For clean pushes (local-only, no pull), show toast `"Synced — your {N} idea{s} pushed"` with no View/Undo. Auto-dismiss after 2s.

- [ ] **T6: Remove "Keep Remote" destructive paths from primary UI** (AC: 6)
  - [ ] T6.1: Grep the codebase for `Keep Remote`, `keepRemote`, `handleKeepRemote`. All references in components should be deleted (they live in SyncConflictSheet which is being removed in T1.7).
  - [ ] T6.2: Verify that no other component (e.g. `SyncImportBanner`) exposes a destructive "replace local with remote" path. If it does, guard it behind a confirmation requiring typed repo name (match AC7 pattern) OR remove entirely if it duplicates T10.
  - [ ] T6.3: Add a grep smoke test to `scripts/` (or inline in a test file) that asserts no file outside of `SettingsDangerZone.tsx` contains the string `Keep Remote` or `handleKeepRemote`.

- [ ] **T7: Sync history snapshot service (encrypted, ring buffer)** (AC: 8, 16, 18)
  - [ ] T7.1: Create `src/services/storage/sync-history-service.ts`. Exports:
    ```ts
    export interface SyncHistoryEntry {
      id: string           // uuid v4
      repoFullName: string
      createdAt: string    // ISO
      trigger: 'before-sync' | 'before-import' | 'before-reset'
      taskCount: number
      contentHash: string  // sha-256 of serialized tasks
      tasks: Task[]        // decrypted in memory; encrypted when persisted
    }
    
    export async function captureSnapshot(repoFullName: string, tasks: Task[], trigger: SyncHistoryEntry['trigger']): Promise<SyncHistoryEntry | null>
    export async function listSnapshots(repoFullName: string): Promise<SyncHistoryEntry[]>
    export async function restoreSnapshot(id: string): Promise<Task[]>
    export async function pruneExpired(): Promise<number> // returns count pruned
    export async function deleteSnapshot(id: string): Promise<void>
    ```
  - [ ] T7.2: Storage layer: write to a dedicated localStorage key `gitty:sync-history:v1`. Contents is a JSON-serialized object: `Record<repoFullName, SyncHistoryEntry[]>`. Each entry's `tasks` field is AES-GCM encrypted (via `encryptData` from `crypto-utils.ts`) and stored as base64 string. The plaintext version is only held in memory during active use.
  - [ ] T7.3: Encryption key derivation: the existing `crypto-utils.ts` uses a passphrase. For snapshots, derive a passphrase from the user's GitHub PAT (already stored encrypted in `auth-service`). Specifically: `snapshotPassphrase = sha256(pat + ':sync-history-v1')` using the Web Crypto `crypto.subtle.digest`. Rotate the key if the PAT changes (clear all snapshots). **If the PAT is not available (user logged out), `captureSnapshot` returns `null` and sync proceeds without snapshotting.** This is acceptable — the user can't be logged out and syncing simultaneously.
  - [ ] T7.4: Content-hash dedupe: compute `sha256(JSON.stringify(tasks.map(t => ({id, title, body, isCompleted, isImportant, order}))))` sorted by ID. Compare against the most recent snapshot for this repo. If equal, do not write a new snapshot — return the existing entry.
  - [ ] T7.5: Max-5 FIFO eviction: after write, if a repo has more than 5 snapshots, delete the oldest (by `createdAt`).
  - [ ] T7.6: 7-day expiry: `pruneExpired()` iterates all snapshots across all repos and deletes those with `createdAt < (Date.now() - 7*24*60*60*1000)`. Call `pruneExpired()` on app launch (from `App.tsx` `useEffect`) and on every `captureSnapshot` call.
  - [ ] T7.7: Storage size guard: before writing a new snapshot, check total localStorage usage (`new Blob([localStorage.getItem('gitty:sync-history:v1')]).size`). If > 1MB, trigger aggressive FIFO eviction (reduce to 3 snapshots per repo until under 1MB). Log a warning if even that fails.
  - [ ] T7.8: Error handling: all snapshot operations wrap localStorage writes in try/catch. If storage quota is exceeded, log warning, return `null`, and let the sync proceed unsnapshotted. Better to sync without a safety net than to block the user.

- [ ] **T8: Hook snapshots into sync + import paths** (AC: 8, 17)
  - [ ] T8.1: In `useSyncStore.ts`, add a new store action `captureSyncSnapshot(repoFullName: string, trigger: SyncHistoryEntry['trigger']): Promise<string | null>` that calls `captureSnapshot` from the sync-history-service with the current repo's tasks. Returns the snapshot ID or `null` on failure.
  - [ ] T8.2: Add `restoreSyncSnapshot(repoFullName: string, snapshotId: string, mergeStrategy: 'merge' | 'discard'): Promise<void>`:
    - Load snapshot via `restoreSnapshot(snapshotId)`
    - If `mergeStrategy === 'merge'`: find all current tasks with `createdAt > snapshot.createdAt` and append them to the restored task list (preserving their local state)
    - If `mergeStrategy === 'discard'`: use only the snapshot tasks
    - Call `replaceTasksForRepo(repoFullName, restoredTasks)`
    - Mark all restored tasks as `syncStatus: 'pending'` so the next sync re-pushes them
    - Set `hasPendingDeletions = false` (restore is a full replace, not a delete)
    - Fire `setSyncFeedback('Restored from snapshot')`
  - [ ] T8.3: In `SyncFAB.handleSync` (or wherever the sync trigger lives), call `captureSyncSnapshot(repoFullName, 'before-sync')` BEFORE `syncPendingTasks`. Store the returned snapshot ID locally so T5.1 can use it in the receipt.
  - [ ] T8.4: In `SyncImportBanner.onImport` or the import handler, call `captureSyncSnapshot(repoFullName, 'before-import')` BEFORE the import merge.
  - [ ] T8.5: Add `captureSyncSnapshot` call to `resetFromRemote` action (created in T10) with trigger `'before-reset'`.

- [ ] **T9: Settings UI — Restore from snapshot + Danger Zone** (AC: 9, 10, 7)
  - [ ] T9.1: Locate the current repo settings screen/sheet. Search for where repo settings are rendered — may be in `src/features/repos/` or a sub-component of an existing settings sheet. Check if `RepoSettingsSheet` exists; if not, confirm where per-repo settings live (possibly via `RepoSelector` long-press or a repo detail view — verify before creating a new component).
  - [ ] T9.2: Add a new section `Sync history` in the repo settings. Render a list of `SyncHistoryEntry` for the current repo, loaded via `listSnapshots(repoFullName)`. Show:
    - Timestamp formatted as relative time (`N hours ago`) using `Intl.RelativeTimeFormat` or a small util
    - Task count (`N tasks`)
    - Trigger label (`Before sync` / `Before remote import` / `Before reset`)
    - Tap row → opens confirmation dialog (see T9.3)
    - Empty state: `No snapshots yet. Gitty saves one automatically before each sync.`
  - [ ] T9.3: Restore confirmation dialog:
    - Compute `tasksCreatedSince = currentTasks.filter(t => new Date(t.createdAt) > new Date(snapshot.createdAt))`
    - If `tasksCreatedSince.length === 0`: simple confirmation (`Restore to {time}? Current state will be replaced.` → `Restore` / `Cancel`)
    - If > 0: show the AC10 dialog with `Keep your newer ideas?` title, three actions (`Merge newer ideas in`, `Discard newer ideas`, `Cancel`). Default focus on Merge.
    - On confirm, call `restoreSyncSnapshot(repoFullName, snapshot.id, strategy)`
    - Show toast `Restored from {timestamp}. Will re-push on next sync.` for 3s
  - [ ] T9.4: Add `Danger Zone` section below `Sync history`. Single action: `Reset from remote`.
  - [ ] T9.5: `Reset from remote` action opens a typed-confirmation dialog (AC7):
    - Title: `Reset {repo} from main?`
    - Warning body: `This will delete {N} local ideas that are not on main. {M} ideas will be overwritten. A snapshot will be saved first, so you can undo from Sync history.`
    - Input field with placeholder `Type "{owner/repo}" to confirm`
    - Destructive button `Reset from remote` disabled until input exactly matches (case-sensitive)
    - On confirm: capture snapshot with trigger `'before-reset'`, call `fetchRemoteTasksForRepo`, call `replaceTasksForRepo`, show toast `Reset to main. Undo available in Sync history for 7 days.`
  - [ ] T9.6: Add the `resetFromRemote(repoFullName)` action to `useSyncStore` (consolidate the logic so UI only calls one function).

- [ ] **T10: Copy reframe audit across sync components** (AC: 12)
  - [ ] T10.1: For each file below, execute the find/replace from the copy audit table in Dev Notes. Do NOT miss any string. Run a grep after edits to assert the forbidden words are gone.
    - `src/features/sync/components/SyncImportBanner.tsx`
    - `src/features/sync/components/SyncResultToast.tsx`
    - `src/features/sync/components/SyncErrorSheet.tsx`
    - `src/components/layout/SyncHeaderStatus.tsx`
    - `src/stores/useSyncStore.ts` (error strings and state labels)
    - `src/services/github/sync-service.ts` (error message strings)
    - `src/App.tsx` (toast messages, error labels)
  - [ ] T10.2: Add a CI guard test: `src/__tests__/copy-audit.test.ts` (or similar) that greps the sync component directory for `'conflict'`, `'overwrite'`, `'discard'` as substrings in .tsx files and fails if any are found OUTSIDE of comments and test files. Acceptable allowlist: `.test.tsx`, `/* */` comments, type names (e.g. `RepoSyncMeta` can keep internal `conflict` field for legacy). Focus the test on user-facing JSX strings.

- [ ] **T11: Accessibility audit** (AC: 21)
  - [ ] T11.1: Run `SyncReviewSheet` through VoiceOver on iOS Simulator (or real device) and verify announcements match expectations for each change state.
  - [ ] T11.2: Same for TalkBack on Android emulator (or real device).
  - [ ] T11.3: Keyboard-only navigation test: Tab through sheet → every interactive element reachable, Enter activates, Escape closes.
  - [ ] T11.4: Color contrast audit using browser dev tools: every text/background combination meets WCAG AA.

- [ ] **T12: Update captured-ideas-tholo91.md** (after merge)
  - [ ] T12.1: Mark `UI feedback zu Sync Disclaimer` as processed: `- [x] **UI feedback zu Sync Disclaimer** ... [Processed by: Claude] → Planned: Story 9-14 (Safe Sync — Auto-merge + Review Receipt + Undo Snapshot)`.

## Dev Notes

### Coordination with Story 9-9 (Undo Sync Changes — already ready-for-dev, not yet implemented)

Story 9-9 introduces `lastSyncedSnapshot: Record<string, TaskSnapshot> | null` in `useSyncStore` as a **single baseline snapshot** keyed by task ID, used for no-op detection before a sync fires. It is NOT a history ring buffer.

This story (9-14) introduces `syncHistory: Record<repoFullName, SyncHistoryEntry[]>` as a **ring buffer of historical snapshots**, used for undo and restore. The two are NOT the same data structure and serve different purposes.

**Implementation order:** Story 9-9 should be implemented first (it's simpler and already contexted), then 9-14 builds on top. If 9-14 is implemented first, 9-9 can still be done after with no conflicts — the two stores are independent.

**Naming to avoid confusion:**
- Story 9-9: `lastSyncedSnapshot` (singular, baseline, no history)
- Story 9-14: `syncHistory` (plural, ring buffer, for undo)

Both live in `useSyncStore` but in different state fields.

### Auto-merge flow sequence (AC1)

```
User taps Sync FAB
  ↓
SyncFAB.handleSync
  ↓
Check no-op (from Story 9-9) → if no-op, show "Nothing changed" toast, return
  ↓
captureSyncSnapshot(repo, 'before-sync') → store snapshot ID in local ref
  ↓
syncPendingTasks(options)
  ↓
sync-service.ts:
  ├── Build local content
  ├── Fetch remote file + SHA
  ├── if remote file does not exist (AC15): clean push, return { mergeSummary: null }
  ├── if lastSyncedSha === null OR lastSyncedSha === remoteSha: clean push, return { mergeSummary: null }
  ├── ELSE (SHA divergence — the old conflict path):
  │     ├── Parse remote markdown into tasks
  │     ├── Call buildMergedTaskList(localTasks, remoteTasks) → mergedTasks
  │     ├── Store mutation: applyMergedTasks(repoFullName, mergedTasks)
  │     ├── Compute ImportDiffSummary via computeImportDiff
  │     ├── Rebuild file content from merged tasks
  │     ├── Push with conflict retry (existing MAX_CONFLICT_RETRIES loop)
  │     └── Return { mergeSummary: diffSummary }
  └── On error at any step: roll back snapshot (or leave it — snapshot is read-only until explicitly applied), return error
  ↓
App.tsx sees mergeSummary !== null, shows SyncResultToast with View + Undo
```

### Copy Audit Table (AC12)

Run this as a find/replace pass. Check each file; some strings may not exist in every file.

| File | Old string | New string |
|---|---|---|
| SyncConflictSheet.tsx (being deleted, skip) | — | — |
| SyncImportBanner.tsx | `Updates on main` | `Updates from main` |
| SyncImportBanner.tsx | `Updates will be merged with your local list.` | `Gitty will merge these safely with your local list.` |
| SyncImportBanner.tsx | `Apply updates` | `Apply from main` |
| SyncResultToast.tsx | (add) | `Synced — your ideas are safe` |
| SyncErrorSheet.tsx | `Sync failed` (if present) | `Sync didn't complete` |
| SyncErrorSheet.tsx | `Copy debug info` | (keep — technical label is fine) |
| SyncHeaderStatus.tsx | `conflict` (if used as user-facing label) | `needs review` |
| SyncHeaderStatus.tsx | `Sync error` | `Sync pending` |
| useSyncStore.ts | error string `Sync conflict detected` | `Main has newer content — merging` |
| useSyncStore.ts | state value `'conflict'` (status) | Keep in type for backward compat, map to `'syncing'` in UI reads |
| sync-service.ts | error message `Failed to commit after maximum conflict retries` | `Could not sync after multiple attempts — your local ideas are safe` |
| sync-service.ts | error message `Sync conflict` | `Merge in progress` |
| App.tsx | any toast containing `conflict`, `overwrite`, `discard`, `fail` | reframe per patterns above |

**Run after all edits:** grep `-r 'conflict\|overwrite\|discard'` in `src/features/sync/`, `src/components/layout/`, `src/App.tsx` — should return only type names, comments, tests, and the `repoSyncMeta.conflict` field (internal state, not rendered).

### Files to Touch

| File | Status | Changes |
|---|---|---|
| `src/features/sync/components/SyncConflictSheet.tsx` | DELETE | Removed entirely (T1.7) |
| `src/features/sync/components/SyncConflictBanner.tsx` | DELETE or gut | Remove if only used for destructive paths (T1.8) |
| `src/features/sync/components/SyncReviewSheet.tsx` | NEW | Read-only receipt view (T3) |
| `src/features/sync/components/SyncReviewSheet.test.tsx` | NEW | Component tests (AC22) |
| `src/features/sync/components/SyncResultToast.tsx` | MODIFY | Add View + Undo + haptic (T4) |
| `src/features/sync/components/SyncResultToast.test.tsx` | NEW or MODIFY | Test new actions (AC22) |
| `src/features/sync/components/SyncImportBanner.tsx` | MODIFY | Copy reframe only (T10) |
| `src/features/sync/components/SyncErrorSheet.tsx` | MODIFY | Copy reframe only (T10) |
| `src/components/layout/SyncHeaderStatus.tsx` | MODIFY | Copy reframe only (T10) |
| `src/stores/useSyncStore.ts` | MODIFY | Add `syncHistory` state, `captureSyncSnapshot`, `restoreSyncSnapshot`, `applyMergedTasks`, `resetFromRemote` actions (T1.1, T8) |
| `src/services/github/sync-service.ts` | MODIFY | Auto-merge on SHA divergence, extend `SyncResult` with `mergeSummary` (T1) |
| `src/services/github/sync-service.test.ts` | NEW or MODIFY | Test auto-merge flow (AC22) |
| `src/utils/task-diff.ts` | MODIFY | Three-way note merge, `localOnlyTasks` in summary, `noteMergedCount` (T2) |
| `src/utils/task-diff.test.ts` | MODIFY | New test cases (T2.4) |
| `src/services/storage/sync-history-service.ts` | NEW | Encrypted ring buffer service (T7) |
| `src/services/storage/sync-history-service.test.ts` | NEW | Service tests (AC22) |
| `src/services/native/haptic-service.ts` | MODIFY | Add `triggerSuccessHaptic()` (T4.8) |
| `src/features/repos/components/` (settings sheet location TBD) | MODIFY | Add `Sync history` + `Danger Zone` sections (T9) |
| `src/App.tsx` | MODIFY | Wire receipt toast + review sheet (T5), prune expired snapshots on launch (T7.6) |
| `captured-ideas-tholo91.md` | MODIFY | Mark idea as processed (T12) |

### Assumptions Dev Must Verify First

1. **Repo settings location (T9.1):** The story assumes a per-repo settings UI exists. If it doesn't, the `Sync history` + `Danger Zone` sections need a new entry point. Check if any component imports or renders repo-level settings. If not, consult Thomas before creating a new screen — might be a scope increase.
2. **`lucide-react` icons (T3.9):** Check `package.json`. If not present, use inline SVG (project currently uses inline SVG for the check icon in `SyncResultToast.tsx`).
3. **Story 9-9 implementation status:** Verify whether 9-9 has been merged by the time 9-14 starts. If yes, reuse `lastSyncedSnapshot` for the no-op check. If no, implement a minimal no-op check inline (skip sync if task state unchanged since last sync).
4. **PAT access for snapshot encryption (T7.3):** Verify `auth-service` exposes a way to read the PAT synchronously or asynchronously at snapshot time. If the PAT is not accessible from the sync-history-service layer, use a different derivation (e.g. a stable per-install random key stored separately — less secure but unblocks implementation).

### Architecture Constraints

- **Zustand boundary:** All state mutations must go through `useSyncStore` actions. The sync-history-service is called from store actions, not directly from components.
- **Persist middleware:** The `syncHistory` state is NOT persisted via Zustand's `persist` middleware — it's managed entirely by `sync-history-service` which writes to a separate localStorage key. This keeps the main store lean and avoids serialization issues with encrypted binary data.
- **Animation patterns:** Reuse `TRANSITION_NORMAL` and `TRANSITION_FAST` from `src/config/motion.ts`. Use framer-motion `AnimatePresence` for enter/exit. Respect `useReducedMotion()`.
- **Touch targets:** All interactive elements in `SyncReviewSheet` and the updated `SyncResultToast` must meet 44x44 minimum. Verify with spot measurements.
- **Theme variables:** Use existing CSS custom properties — do NOT hardcode color hex values. Current palette: `--color-success`, `--color-info`, `--color-warning`, `--color-text-primary`, `--color-text-secondary`, `--color-surface`, `--color-border`, `--color-accent`.
- **Design skills invocation:** During implementation, the dev agent is encouraged to invoke `taste-skill` and `frontend-design` skills for the new `SyncReviewSheet` component to ensure world-class visual craft. Specifically:
  - Invoke `taste-skill` for the row layout, spacing, and type hierarchy
  - Invoke `frontend-design` for motion choreography (enter/exit, row appearance, status transitions)
  - These are optional but strongly recommended given the trust-critical nature of this UI

### Testing Strategy

- **Unit tests** for pure utilities (`task-diff.ts` extensions, `sync-history-service.ts` ring buffer logic, content hashing). Follow existing test patterns in the repo.
- **Component tests** for `SyncReviewSheet`, `SyncResultToast` (updated), Danger Zone confirmation. Use `@testing-library/react` + `vitest`. Mock framer-motion, mock `sync-history-service`, mock `haptic-service` (existing pattern).
- **Integration tests** for the auto-merge flow: mock Octokit, simulate SHA divergence, assert that `buildMergedTaskList` is called and the merged state is pushed without user interaction.
- **Manual accessibility testing**: VoiceOver + TalkBack + keyboard-only nav before merge.
- **Manual trust test** (most important): Thomas should be able to write these scenarios and experience them live:
  1. Create 3 ideas on phone, push to main, have agent check 2 off, pull back → receipt toast shows "2 checked by agent", no popup, View shows the diff, Undo restores the pre-merge state
  2. Create 1 idea on phone, don't push, then simulate SHA divergence (e.g. edit main from desktop) → phone syncs, pulls, merges additively, re-pushes, local idea preserved
  3. Click through Danger Zone → typed confirmation prevents accidental reset
  4. Tap Undo within 5s of sync → state restored, next sync re-pushes
  5. Tap a 2-day-old snapshot in settings with 3 new post-snapshot tasks → "Merge newer ideas in" dialog, default path preserves everything

### Out of Scope (tracked as backlog items)

- **Sync telemetry / logging** so we know how often the merge path is hit. Add to backlog for a future quick-spec.
- **Fuzzy title matching** for rename detection. Today's `titleKey` normalization is strict lowercase+trim. Renames produce transient duplicates (documented in AC19). Future: Levenshtein > 0.8 could auto-match.
- **Reverse-patch storage** for snapshots (instead of full task-list copies). Current design is full-copy — acceptable for max 5 snapshots × ~50 tasks. Backlog item if bloat becomes real.
- **Cross-device snapshot sync** — snapshots are local to the device. If the user reinstalls the PWA, snapshots are gone. Future: sync snapshots via the GitHub repo itself as a hidden metadata file? Probably overkill.
- **Snapshot preview** — today, tapping a snapshot in settings opens the confirmation dialog directly. Future: tap to preview the task list before confirming.

### References

- [src/utils/task-diff.ts](src/utils/task-diff.ts) — existing additive merge logic (reuse, extend)
- [src/services/github/sync-service.ts](src/services/github/sync-service.ts) — sync flow, SHA conflict detection (lines ~378, ~627)
- [src/services/storage/crypto-utils.ts](src/services/storage/crypto-utils.ts) — AES-GCM encryption for snapshot storage
- [src/features/sync/components/SyncConflictSheet.tsx](src/features/sync/components/SyncConflictSheet.tsx) — to be deleted
- [src/features/sync/components/SyncImportBanner.tsx](src/features/sync/components/SyncImportBanner.tsx) — already follows the "ideas are safe" framing, use as style reference
- [src/features/sync/components/SyncResultToast.tsx](src/features/sync/components/SyncResultToast.tsx) — existing toast pattern to extend
- [src/features/capture/components/UndoToast.tsx](src/features/capture/components/UndoToast.tsx) — existing Undo pattern to reference
- [src/services/native/haptic-service.ts](src/services/native/haptic-service.ts) — existing haptic wrapper, extend with `triggerSuccessHaptic`
- [src/stores/useSyncStore.ts](src/stores/useSyncStore.ts) — state, persist config, existing sync actions
- [src/config/motion.ts](src/config/motion.ts) — motion tokens (`TRANSITION_NORMAL`, `TRANSITION_FAST`)
- [_bmad-output/implementation-artifacts/9-9-undo-sync-changes.md](_bmad-output/implementation-artifacts/9-9-undo-sync-changes.md) — sibling story, coordinate `lastSyncedSnapshot` vs `syncHistory`
- [_bmad-output/implementation-artifacts/8-12-additive-import-with-diff-summary.md](_bmad-output/implementation-artifacts/tech-spec-8-12-additive-import-with-diff-summary.md) — previous story that established the `task-diff.ts` foundation
- [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md#L914) — Epic 9 context
- [captured-ideas-tholo91.md](captured-ideas-tholo91.md) — source idea: "UI feedback zu Sync Disclaimer" (2026-04-11)

### Party Mode Review Notes (2026-04-12)

This story went through a full party mode review before creation. Summary of concerns surfaced and resolutions:

- **Sally (UX):** Color-accent-only was rejected as inaccessible. Resolved via icon + text label + color triad in AC21.
- **Sally (UX):** Three-way note merge ambiguity. Resolved via AC11 — local wins, remote appended with date prefix.
- **Winston (Architect):** Snapshot bloat math. Resolved via 5-snapshot cap + content-hash dedupe + 1MB storage guard (T7.7).
- **Winston (Architect):** Suggested eliminating forced conflict detection entirely. Adopted — auto-merge is silent, SyncReviewSheet is a read-only receipt, never blocking.
- **Amelia (Dev):** Flag on duplication vs. reusing `task-diff.ts`. Resolved via AC13 — must extend, not duplicate.
- **Quinn (QA):** 8 edge cases added as AC15–AC20 and handled in T1.4–T1.6, T8.2.
- **John (PM):** Pushback on story size. Resolved via time-box to 2026-04-19 and explicit cut-line: ship T1–T6 alone if T7–T9 can't make the date.
- **Bob (SM):** AC ambiguity on "typed confirmation" and copy audit. Resolved via AC7 (case-sensitive, disabled button) and explicit audit table in Dev Notes.

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### Change Log

### File List
