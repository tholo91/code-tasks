# Story 9.9: Undo Sync Changes (Hold-to-Cancel Sync)

Status: ready-for-dev

## Story

As a User,
I want to be able to cancel or undo a sync before it completes,
so that accidental no-op changes (e.g. toggling important twice) don't create unnecessary commits.

## Acceptance Criteria

1. **[No-Op Detection]** Given I have made changes that result in no net difference from the last synced state, when I tap the sync button, then the app detects a no-op and shows "Nothing changed" feedback via a brief toast, without making any network calls.

2. **[Long-Press Cancel]** Given a sync is in progress and still in the pre-push phase (`syncEngineStatus === 'syncing'` but before the network call begins), when I long-press (hold) the sync FAB for 500ms, then the sync is cancelled with a brief "Cancelled" toast.

3. **[Text-Selection Suppression]** Given I hold the sync button, when it cancels, then no text selection occurs (browser text-select behavior is suppressed on long-press via CSS `user-select: none` and `touch-action` on the FAB).

## Tasks / Subtasks

- [ ] **T1: Add `lastSyncedSnapshot` to sync store** (AC: 1)
  - [ ] T1.1: Add `lastSyncedSnapshot: Record<string, TaskSnapshot> | null` field to `SyncState` in `useSyncStore.ts` (keyed by task ID)
  - [ ] T1.2: Define `TaskSnapshot` type — a lightweight projection of sync-relevant fields: `{ title: string; body: string; isImportant: boolean; isCompleted: boolean; order: number }`. Place in `src/types/task.ts`
  - [ ] T1.3: Create `captureSnapshot(tasks: Task[]): Record<string, TaskSnapshot>` utility in `src/utils/sync-snapshot.ts` that builds the snapshot map from an array of tasks
  - [ ] T1.4: After successful sync in `SyncFAB.handleSync`, call a new store action `saveLastSyncedSnapshot()` that captures the current repo tasks into `lastSyncedSnapshot`
  - [ ] T1.5: Also populate `lastSyncedSnapshot` after remote import (`replaceTasksForRepo` / `mergeRemoteTasksForRepo`) — these represent a known-synced baseline
  - [ ] T1.6: Add `lastSyncedSnapshot` to `partialize` in the persist config so it survives page reloads
  - [ ] T1.7: Clear `lastSyncedSnapshot` when `selectedRepo` changes (set to `null` in `setSelectedRepo`)

- [ ] **T2: Implement no-op detection** (AC: 1)
  - [ ] T2.1: Create `isNoOpSync(currentTasks: Task[], snapshot: Record<string, TaskSnapshot> | null): boolean` in `src/utils/sync-snapshot.ts`
    - Returns `false` if snapshot is `null` (first sync, no baseline)
    - Returns `false` if task count differs (additions/deletions)
    - Compares each task's `{ title, body, isImportant, isCompleted, order }` against the snapshot entry
    - Returns `true` only when all tasks match and `hasPendingDeletions` is `false`
  - [ ] T2.2: In `SyncFAB.handleSync`, before calling `syncAllRepoTasks`, run no-op check:
    - Get current repo tasks from store: `useSyncStore.getState().tasks.filter(...)` (same filter as `syncAllRepoTasksOnce`)
    - Get `lastSyncedSnapshot` and `hasPendingDeletions` from store
    - If `isNoOpSync(repoTasks, snapshot)` and `!hasPendingDeletions`: skip sync, reset pending tasks to `synced`, show "Nothing changed" toast, return early
  - [ ] T2.3: When no-op is detected, reset all repo tasks from `syncStatus: 'pending'` back to `synced` via a new store action `resetPendingToSynced(repoFullName: string)` — this avoids leaving stale pending badges
  - [ ] T2.4: Show "Nothing changed" feedback — emit a callback or use a new local state in SyncFAB to signal App.tsx (follow the existing `syncResultMessage` pattern)

- [ ] **T3: Add long-press cancel to SyncFAB** (AC: 2, 3)
  - [ ] T3.1: Add `syncCancelled` ref (`useRef<boolean>(false)`) to `SyncFAB` — acts as a cooperative cancellation flag
  - [ ] T3.2: Implement long-press detection using `onPointerDown` / `onPointerUp` / `onPointerCancel`:
    - On pointer down: start a 500ms timer (`longPressTimerRef`)
    - On pointer up before 500ms: clear timer, let normal `onClick` fire
    - On timer fire (500ms elapsed): set `syncCancelled.current = true`, show "Cancelled" toast, call `setSyncStatus('idle')`, reset `fabState` to `'pending'`
    - On pointer cancel / pointer leave: clear timer
  - [ ] T3.3: Guard the sync flow in `handleSync`: check `syncCancelled.current` at key checkpoints:
    - After `setSyncStatus('syncing')` and before calling `syncAllRepoTasks` — if cancelled, bail out and reset status to `idle`
    - The `syncAllRepoTasks` call itself cannot be cancelled once it starts network I/O (Octokit does not support `AbortController`), so the cancel window is between the user tap and the `await syncAllRepoTasks(...)` call
  - [ ] T3.4: Reset `syncCancelled.current = false` at the start of each `handleSync` invocation
  - [ ] T3.5: Prevent `onClick` from firing when long-press has triggered cancel — use a `wasLongPress` ref set to `true` on timer fire, checked in `onClick`, and reset on next pointer-down
  - [ ] T3.6: Add CSS `user-select: none`, `touch-action: manipulation`, and `-webkit-touch-callout: none` to the FAB button styles to suppress text selection and context menus on long-press
  - [ ] T3.7: Add `aria-label` update: when sync is in progress, label should reflect cancelability: `"Syncing — hold to cancel"`

- [ ] **T4: "Nothing changed" and "Cancelled" toast feedback** (AC: 1, 2)
  - [ ] T4.1: Expose a callback mechanism from SyncFAB to App.tsx for custom sync feedback. Options:
    - **Option A (recommended):** Add a `syncFeedback: string | null` field to `useSyncStore` with a `setSyncFeedback(msg: string | null)` action. App.tsx subscribes and renders a `SyncResultToast` (reuse existing component). Auto-clear after 2s.
    - **Option B:** Use the existing `syncResultMessage` state in App.tsx (requires SyncFAB to call a passed-in callback — would break encapsulation)
  - [ ] T4.2: In the no-op path: call `setSyncFeedback('Nothing changed')` with an info icon variant
  - [ ] T4.3: In the cancel path: call `setSyncFeedback('Cancelled')` with a neutral icon variant
  - [ ] T4.4: Auto-dismiss the toast after 2 seconds (use `useEffect` with a timeout in App.tsx, following the existing `toastMessage` pattern)

- [ ] **T5: Unit tests** (AC: 1, 2, 3)
  - [ ] T5.1: `src/utils/sync-snapshot.test.ts` — test `captureSnapshot` and `isNoOpSync`:
    - Snapshot captures correct fields
    - No-op returns `true` when tasks match snapshot
    - No-op returns `false` when a field differs (title, body, isImportant, isCompleted, order)
    - No-op returns `false` when task count differs (addition or deletion)
    - No-op returns `false` when snapshot is `null`
    - No-op returns `false` when `hasPendingDeletions` is `true`
  - [ ] T5.2: `src/features/sync/components/SyncFAB.test.tsx` — add tests:
    - "skips sync and shows 'Nothing changed' when no-op detected"
    - "calls syncAllRepoTasks normally when changes exist"
    - "FAB has user-select: none style" (check the style attribute)
    - "long-press for 500ms cancels sync and shows 'Cancelled' toast" (use fake timers + `fireEvent.pointerDown` / advance timer)
    - "short press triggers normal sync, not cancel"
  - [ ] T5.3: Store test coverage: verify `saveLastSyncedSnapshot` and `resetPendingToSynced` actions work correctly

## Dev Notes

### Sync Lifecycle & Cancellation Window

The sync lifecycle in `SyncFAB.handleSync` has a clear two-phase structure:

```
User taps FAB
  |
  v
[Phase 1: Local setup] ← CANCELLABLE
  - fabState = 'syncing'
  - setSyncStatus('syncing')
  - *** CANCELLATION CHECK POINT ***
  |
  v
[Phase 2: Network I/O] ← NOT CANCELLABLE
  - await syncAllRepoTasks(options)
    - recoverOctokit()
    - getFileContent() — fetches remote SHA
    - buildFullFileContent() — rebuilds markdown
    - createOrUpdateFileContents() — pushes to GitHub
  |
  v
[Phase 3: Post-sync cleanup]
  - setSyncStatus('success' | 'error' | 'conflict')
  - markTaskSynced() for each repo task
  - hasPendingDeletions = false
  - setRepoSyncMeta()
```

Cancellation is ONLY possible in Phase 1, between the `setSyncStatus('syncing')` call and the `await syncAllRepoTasks(...)` call. Once `syncAllRepoTasks` begins, network requests cannot be aborted (Octokit REST API calls do not accept `AbortSignal`).

The long-press timer approach works because:
1. User taps → `onClick` fires → `handleSync` begins Phase 1
2. User holds → after 500ms, `syncCancelled` flag is set
3. `handleSync` checks the flag before entering Phase 2
4. If cancelled, reset `fabState` and `syncEngineStatus` to idle

### How Pending Changes Are Currently Tracked

- Each mutation (`updateTask`, `toggleComplete`, `removeTask`, `reorderTasks`, `addTask`, `moveTaskToRepo`) sets `syncStatus: 'pending'` on affected tasks and increments `repoSyncMeta.localRevision`
- `hasPendingDeletions` is set to `true` by `removeTask` and cleared on successful sync
- `selectHasUnsyncedChanges` checks both `syncStatus === 'pending'` tasks and `hasPendingDeletions`
- `selectPendingSyncCount` counts pending tasks for the current user+repo, with `hasPendingDeletions` contributing at least 1

### No-Op Detection Strategy

Compare the **sync-relevant projection** of each task (title, body, isImportant, isCompleted, order) against a snapshot saved after the last successful sync. This avoids comparing timestamps (`createdAt`, `updatedAt`, `completedAt`) which change even when the user reverts a change.

The snapshot must be saved:
- After every successful `syncAllRepoTasks` call
- After remote import (these establish a known-synced baseline)
- Cleared on repo switch (different repo = different task set)

Edge case: if the user adds a task then deletes it before syncing, the task count will match the snapshot but the task IDs won't. The comparison handles this because the snapshot is keyed by task ID — a missing or extra key causes `isNoOpSync` to return `false`.

### Architecture Constraints

- **Zustand boundary:** All state mutations go through `useSyncStore` actions. The snapshot, feedback message, and `resetPendingToSynced` must be store actions.
- **Animation patterns:** SyncFAB uses Framer Motion v12 with `AnimatePresence`. The cancel state should transition the FAB icon back to the sync arrow (no new icon needed — just reset `fabState` to `'pending'`).
- **Touch targets:** The FAB is already 56x56px (exceeds the 44px minimum). No change needed.
- **Reduced motion:** The existing `TRANSITION_FAST` / `TRANSITION_SPRING` patterns handle `useReducedMotion` at the toast level. No additional work needed.
- **Persist middleware:** `lastSyncedSnapshot` must be added to `partialize` to survive page reloads. Be mindful of storage size — the snapshot only stores 5 fields per task, so even 100 tasks would be ~5KB.

### Files to Touch

| File | Changes |
|------|---------|
| `src/types/task.ts` | Add `TaskSnapshot` interface |
| `src/utils/sync-snapshot.ts` | New file: `captureSnapshot()`, `isNoOpSync()` |
| `src/utils/sync-snapshot.test.ts` | New file: unit tests for snapshot utils |
| `src/stores/useSyncStore.ts` | Add `lastSyncedSnapshot`, `syncFeedback`, `saveLastSyncedSnapshot()`, `setSyncFeedback()`, `resetPendingToSynced()` actions; update `partialize` |
| `src/features/sync/components/SyncFAB.tsx` | No-op check before sync, long-press handler, cancel logic, CSS touch suppression, aria-label updates |
| `src/features/sync/components/SyncFAB.test.tsx` | New test cases for no-op, long-press cancel, CSS styles |
| `src/App.tsx` | Subscribe to `syncFeedback` from store, render toast (reuse `SyncResultToast`) |

### Testing Approach

- **Unit tests** for `sync-snapshot.ts` utilities — pure functions, easy to test in isolation
- **Component tests** for `SyncFAB` — mock `syncAllRepoTasks`, use `vi.useFakeTimers()` for long-press timing, use `fireEvent.pointerDown` / `fireEvent.pointerUp` for pointer event simulation
- **Store tests** — verify `saveLastSyncedSnapshot` correctly captures current tasks, `resetPendingToSynced` resets the right tasks
- Follow existing test patterns: mock `framer-motion`, mock `sync-service`, mock `haptic-service`, mock `localStorage`/`sessionStorage`

### References

- `src/features/sync/components/SyncFAB.tsx` — primary component to modify
- `src/features/sync/components/SyncFAB.test.tsx` — existing test suite to extend
- `src/services/github/sync-service.ts` — `syncAllRepoTasks` / `syncAllRepoTasksOnce` sync flow
- `src/stores/useSyncStore.ts` — sync state, selectors, actions
- `src/features/sync/utils/markdown-templates.ts` — `buildFullFileContent` (markdown serialization)
- `src/features/sync/components/SyncResultToast.tsx` — reusable toast component
- `src/features/capture/components/UndoToast.tsx` — alternative toast pattern reference
- `src/types/task.ts` — `Task` interface
- `src/config/motion.ts` — motion constants
- `src/services/native/haptic-service.ts` — haptic feedback patterns

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
