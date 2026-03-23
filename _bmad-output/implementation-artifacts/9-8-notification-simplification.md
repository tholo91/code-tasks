# Story 9.8: Notification Simplification & Clustering

Status: ready-for-dev

## Story

As a User,
I want sync and import notifications to be fewer, smarter, and non-repetitive,
so that I don't see redundant toasts or misleading import prompts when using the app.

## Acceptance Criteria

1. Given I sync to GitHub and then reopen the app, when the app checks for remote changes, then no toast or banner appears if nothing has changed since my last sync (no "stale re-prompt").

2. Given multiple sync-related events happen in quick succession (e.g., import + sync result within 2 seconds), when they would each trigger a toast, then they are clustered into a single summary notification.

3. Given a toast is shown, when I have seen an identical toast within the last 30 minutes, then it is suppressed (deduplication by type + content hash).

4. Given I switch to a repo where a remote file exists but an agent has only completed/checked-off tasks (no new unchecked tasks vs. local), when the app checks for import, then no misleading "Import available — your local list is empty" banner is shown. Instead, the SHA is silently updated and the user sees their current task list (or an empty-state if truly no active tasks exist).

5. Given I switch to a repo where I have local tasks AND a remote file has changes, when the import banner appears, then the banner copy clearly communicates whether the action will merge (preserving local ideas) or replace, so I can trust it won't overwrite my work.

## Tasks / Subtasks

- [ ] Task 1: Create `useNotificationDedup` hook (AC: #2, #3)
  - [ ] 1.1: Create `src/hooks/useNotificationDedup.ts` with the following API:
    - `showNotification(type: NotificationType, message: string): void` — enqueue a notification; dedup checks before showing
    - `activeNotification: { type: NotificationType, message: string } | null` — the currently visible notification (consumed by toast components)
    - `dismissNotification(): void` — manually dismiss the active notification
    - Types: `'sync-result' | 'import-feedback' | 'task-moved' | 'offline' | 'pull-refresh'`
  - [ ] 1.2: Implement dedup registry — store a `Map<string, number>` of `hash(type + message) → lastShownTimestamp`. Before showing a notification, check if the same hash was shown within `DEDUP_WINDOW_MS = 30 * 60 * 1000` (30 minutes). If so, suppress it silently.
  - [ ] 1.3: Implement clustering buffer — when `showNotification` is called, buffer the notification for `CLUSTER_DELAY_MS = 800` milliseconds. If another notification arrives within that window, merge them into a single summary message (e.g., "2 tasks completed, 1 new from remote" instead of two separate toasts). After the clustering window expires with no new notifications, show the final merged notification.
  - [ ] 1.4: Implement auto-dismiss timer — after showing a notification, auto-dismiss after `AUTO_DISMISS_MS = 3000` milliseconds (configurable per type). Clear the timer if `dismissNotification()` is called manually.
  - [ ] 1.5: Export `NotificationType` and `NotificationEntry` types from the hook file.

- [ ] Task 2: Fix the "reopen after sync" false-positive banner (AC: #1)
  - [ ] 2.1: In `src/hooks/useRemoteChangeDetection.ts`, the `handleVisibilityChange` callback (line 34) fires on every `visibilitychange` event when `document.visibilityState === 'visible'`. It compares `remoteSha !== localSha` (line 60). **The false-positive path:** after a successful sync push, `syncAllRepoTasks` returns and `updateLastSyncedAt()` is called, but `setRepoSyncMeta` with the new remote SHA may not be called synchronously for ALL SHA update paths. When the user backgrounds and reopens the app, `useRemoteChangeDetection` fetches the remote SHA (which now includes the just-pushed content), compares it against the stale `lastSyncedSha` in `repoSyncMeta`, and triggers the `onRemoteChanges` callback — resulting in a phantom `SyncImportBanner`.
  - [ ] 2.2: Fix in `useRemoteChangeDetection.ts`: After the `remoteSha === localSha` early-return (line 60), add a **content-level** diff check before calling `onRemoteChangesRef`. Compute `computeImportDiff(localTasks, remoteTasks)` and call `isAllZero(diff)` — if zero, silently update the local SHA to match remote (call `useSyncStore.getState().setRepoSyncMeta(repoKey, { lastSyncedSha: remoteSha })`) and skip the callback. **Note:** This logic partially exists in the `App.tsx` `useRemoteChangeDetection` callback (lines 370-377) but the detection hook itself does not perform this check — it delegates everything to the callback. Moving the `isAllZero` guard INTO the hook eliminates the false-positive at the source.
  - [ ] 2.3: Audit `SyncFAB.tsx` line 58-59: after a successful sync, `setSyncStatus('success')` and `updateLastSyncedAt()` are called, but the remote SHA returned by `syncAllRepoTasks` is NOT propagated back to `repoSyncMeta.lastSyncedSha`. Ensure `syncAllRepoTasks` returns the new SHA in its result, and call `setRepoSyncMeta(repoFullName, { lastSyncedSha: newSha })` in the SyncFAB success handler. This closes the SHA staleness gap that causes the phantom banner on reopen.
  - [ ] 2.4: Add a `lastPushCompletedAt` timestamp field to the detection hook (or track it via a ref). After a successful sync push, record the timestamp. In `handleVisibilityChange`, if the reopen happens within 5 seconds of a push completion, skip the remote check entirely (the data can't have changed yet).

- [ ] Task 2B: Fix the repo-switch false-positive "Import available" banner (AC: #4, #5)
  - [ ] 2B.1: In `App.tsx`, the repo-switch import check (lines 344-376) currently uses a simple `localRepoTasks.length === 0` to decide between auto-import and showing the import banner. **Problem:** When `localRepoTasks.length === 0` and the remote file only has completed/checked-off tasks, the app auto-imports them — but the task list still looks empty (all tasks are done). The user sees a brief "Import available: XY tasks found" flash or gets confused when the list remains empty after import. **Fix:** After fetching remote tasks, check if ALL remote tasks are completed (`every(t => t.isCompleted)`). If so AND local is empty, still import (for history), but do NOT show the "your local list is empty" banner. Instead, show the normal empty-state ("No active tasks") or a subtle toast ("Loaded N completed tasks from remote").
  - [ ] 2B.2: When `localRepoTasks.length > 0` and a remote file has changes, run `computeImportDiff(localTasks, remoteTasks)` BEFORE showing the banner. If `isAllZero(diff)`, silently update the SHA and skip the banner entirely — same pattern as Task 2.2 but for the repo-switch path.
  - [ ] 2B.3: Update `SyncImportBanner.tsx` copy for the `initial-import` variant: When there ARE meaningful remote tasks to import AND the user has local tasks, change copy from "Your local list is empty — this will load tasks from the remote file" to clearly state: "This will merge remote tasks with your local list. Your local ideas are preserved." For the `remote-update` variant, the existing copy already mentions safety ("Your N new ideas are safe") — verify this is always shown.
  - [ ] 2B.4: Add a `variant` or `safetyNote` prop to `SyncImportBanner` so it can display "Merge (your local ideas stay)" vs "Replace (fresh load from remote)" based on which import path will be used. The `onImport` handler in `App.tsx` already branches on `source === 'remote-update'` vs initial — surface this distinction in the UI.

- [ ] Task 3: Integrate `useNotificationDedup` into `App.tsx` (AC: #2, #3)
  - [ ] 3.1: Replace the three separate toast state variables in `AppContent`:
    - `syncResultMessage` / `setSyncResultMessage` (line 273) — sync result toast
    - `toastMessage` / `setToastMessage` (line 253) — task-moved toast
    - `pullToRefreshResult` / `setPullToRefreshResult` (line 275) — "Up to date" result
    Replace with a single `useNotificationDedup()` hook instance.
  - [ ] 3.2: Update the import feedback toast (lines 717-721): Instead of calling `setSyncResultMessage(feedbackMessage)` directly, call `showNotification('import-feedback', feedbackMessage)`.
  - [ ] 3.3: Update the task-moved toast (lines 497-498): Instead of `setToastMessage(...)` + `setTimeout`, call `showNotification('task-moved', message)`.
  - [ ] 3.4: Update the pull-to-refresh "Up to date" result (line 322): Instead of setting `pullToRefreshResult`, call `showNotification('pull-refresh', 'Up to date')`.
  - [ ] 3.5: Replace the three `<AnimatePresence>` toast blocks (SyncResultToast at lines 995-1003, inline toast at lines 1006-1024) with a single unified `<NotificationToast>` component that reads from `activeNotification`.
  - [ ] 3.6: Remove `syncToastTimerRef` (line 274) — auto-dismiss is now handled by the hook.

- [ ] Task 4: Create unified `NotificationToast` component (AC: #2)
  - [ ] 4.1: Create `src/components/ui/NotificationToast.tsx` that renders the active notification from `useNotificationDedup`. It replaces both `SyncResultToast` and the inline toast for task-moved. Props: `{ notification: { type, message } | null, onDismiss: () => void }`.
  - [ ] 4.2: Preserve existing styling: fixed at `bottom-24`, rounded-lg, `var(--color-surface)` background, border, shadow. Show a type-appropriate icon (checkmark for sync-result/import-feedback/pull-refresh, move icon for task-moved).
  - [ ] 4.3: Use `AnimatePresence` + `motion.div` with `TRANSITION_FAST` for enter/exit. Honor `useReducedMotion()`.
  - [ ] 4.4: Add `role="status"` and `aria-live="polite"` for accessibility.
  - [ ] 4.5: Add `data-testid="notification-toast"` for test targeting.

- [ ] Task 5: Tests (AC: #1, #2, #3)
  - [ ] 5.1: Create `src/hooks/useNotificationDedup.test.ts`:
    - Dedup: calling `showNotification` twice with the same type + message within 30 minutes only shows one notification
    - Clustering: calling `showNotification` twice within 800ms merges them into a single notification
    - Auto-dismiss: notification auto-clears after 3000ms
    - Different types within dedup window are NOT suppressed
    - After 30 minutes, the same notification can be shown again
  - [ ] 5.2: Create `src/components/ui/NotificationToast.test.tsx`:
    - Renders message text when notification is provided
    - Does not render when notification is null
    - Calls onDismiss when clicked
    - Has correct data-testid and ARIA attributes
  - [ ] 5.3: Update `src/hooks/useRemoteChangeDetection.test.ts`:
    - Add test: when SHA differs but `computeImportDiff` returns all-zero, `onRemoteChanges` is NOT called and local SHA is silently updated
    - Add test: when reopen happens within 5s of a sync push, remote check is skipped
  - [ ] 5.4: Verify existing `SyncImportBanner.test.tsx` and `SyncResultToast.test.tsx` still pass (SyncResultToast component may be deprecated; update or remove tests accordingly).
  - [ ] 5.5: Add tests for repo-switch import path (AC: #4):
    - When remote has only completed tasks and local is empty → auto-import silently, no misleading banner
    - When remote has changes but `computeImportDiff` is all-zero on repo-switch → silent SHA update, no banner
    - When local has tasks and remote has real changes → banner shows with correct merge/replace copy (AC: #5)

- [ ] Task 6: Cleanup deprecated notification code (AC: #1, #2, #3)
  - [ ] 6.1: If `SyncResultToast` is fully replaced by `NotificationToast`, remove `src/features/sync/components/SyncResultToast.tsx` and its test file. Update imports in `App.tsx`.
  - [ ] 6.2: Remove the inline toast `<motion.div>` block for task-moved feedback from `App.tsx` (lines 1006-1024).
  - [ ] 6.3: Remove unused state variables and refs (`syncResultMessage`, `syncToastTimerRef`, `toastMessage`) from `AppContent`.
  - [ ] 6.4: Verify no dead imports remain in `App.tsx` after cleanup.

## Dev Notes

### 1. Complete Notification Surface Inventory

The app currently has **7 distinct notification surfaces**, all managed as independent state in `App.tsx` `AppContent`:

| # | Surface | Component | Trigger | State Variable(s) | Location |
|---|---------|-----------|---------|-------------------|----------|
| 1 | **Offline banner** | `OfflineNotification` (inline in App.tsx, lines 110-146) | Browser `offline` event | `showOfflineNotification` from `useNetworkStatus` | Fixed top bar |
| 2 | **Sync conflict banner** | `SyncConflictBanner` (src/features/sync/components/SyncConflictBanner.tsx) | `syncEngineStatus === 'conflict'` or `repoSyncMeta[repo].conflict` | Internal to component (reads store directly) | Fixed top banner |
| 3 | **Import/update banner** | `SyncImportBanner` (src/features/sync/components/SyncImportBanner.tsx) | `useRemoteChangeDetection` callback, pull-to-refresh, or repo-switch import check | `importPrompt`, `diffSummary`, `isImporting` | Fixed top banner |
| 4 | **Branch protection banner** | `BranchProtectionBanner` (src/features/sync/components/BranchProtectionBanner.tsx) | `syncErrorType === 'branch-protection'` | `bannerDismissed`, `showBranchPrompt`, `fallbackBranch` | Inline in task list |
| 5 | **Sync result toast** | `SyncResultToast` (src/features/sync/components/SyncResultToast.tsx) | Post-import confirmation (lines 717-721) | `syncResultMessage`, `syncToastTimerRef` | Fixed bottom toast |
| 6 | **Undo delete toast** | `UndoToast` (src/features/capture/components/UndoToast.tsx) | Task soft-delete | `pendingDelete` | Fixed bottom toast |
| 7 | **Task-moved toast** | Inline `<motion.div>` (App.tsx lines 1006-1024) | `moveTaskToRepo` success | `toastMessage` | Fixed bottom toast |

Additionally, the **pull-to-refresh indicator** (`PullToRefreshIndicator`) shows an "Up to date" result inline, managed by `pullToRefreshResult` state.

**Surfaces NOT touched by this story:** #1 (Offline), #2 (Sync conflict), #4 (Branch protection), #6 (Undo delete). These are contextual/action-specific banners with unique interactions. This story focuses on #3, #5, #7 and the pull-refresh result — the "informational toast" surfaces that can be repetitive.

### 2. The "Reopen After Sync" False-Positive Path

The bug path is:

1. User presses SyncFAB → `syncAllRepoTasks()` pushes to GitHub → success
2. `SyncFAB.tsx` line 58-59: calls `setSyncStatus('success')` and `updateLastSyncedAt()`
3. **Missing:** The new remote SHA (created by the push) is NOT written back to `repoSyncMeta.lastSyncedSha`. The `syncAllRepoTasks` function creates a new commit with a new SHA, but this SHA is not returned or stored.
4. User backgrounds the app (tab hidden or app backgrounded)
5. User reopens the app → `document.visibilityState` becomes `'visible'`
6. `useRemoteChangeDetection` fires (30s debounce passes if enough time elapsed)
7. Fetches remote file → gets `remoteSha = "newShaFromPush"`
8. Compares with `repoSyncMeta.lastSyncedSha` which is still the OLD pre-push SHA
9. `remoteSha !== localSha` → triggers `onRemoteChanges` → `SyncImportBanner` appears
10. The banner says "Updates on main" even though nothing actually changed — it's the user's own push

**The fix has two parts:**
- **Immediate:** In the `useRemoteChangeDetection` hook, after detecting SHA mismatch, run `computeImportDiff` on the fetched tasks vs local tasks. If `isAllZero(diff)`, silently update the local SHA and skip the callback. This logic already partially exists in `App.tsx` (lines 370-377 in the `useRemoteChangeDetection` callback) but it's the caller's responsibility — moving it INTO the hook makes it universal.
- **Root cause:** Make `syncAllRepoTasks` return the new commit SHA, and store it in `repoSyncMeta.lastSyncedSha` after a successful push. This prevents the SHA mismatch from occurring at all.

### 3. Clustering Strategy

Toast clustering uses a simple buffer pattern:

```
showNotification("import-feedback", "2 tasks completed")
  → starts 800ms timer
  → 400ms later: showNotification("import-feedback", "1 new from remote")
    → resets 800ms timer, merges messages: "2 tasks completed, 1 new from remote"
  → 800ms later (no new messages): show the merged notification
```

For cross-type clustering (e.g., import-feedback + sync-result), merge into a single message with line breaks. For same-type clustering, concatenate with commas.

The 800ms window is chosen to be shorter than typical human reading speed (~250ms per word) but long enough to catch rapid-fire programmatic toast calls that happen within the same event loop cycle or microtask chain.

### 4. Dedup Hash Strategy

The dedup key is `type + '|' + message`. Use a simple hash (or even the raw string) since the message space is small and bounded. The dedup registry is a `Map<string, number>` mapping dedup key to the timestamp when it was last shown. Entries older than 30 minutes are lazily purged on access.

No persistence needed — the dedup registry is in-memory (component state / ref). On page reload, the registry resets, which is fine — a fresh page load should show relevant notifications.

### 5. Architecture Constraints

- **Zustand boundary:** The dedup hook is pure React state (no store changes needed). The fix for SHA staleness in Task 2.3 requires changes to `syncAllRepoTasks` return type and `SyncFAB.tsx`.
- **Framer Motion v12:** All animated toasts use `AnimatePresence` + `motion.div`. The unified `NotificationToast` follows the same pattern as existing `SyncResultToast`.
- **`useReducedMotion()`:** Required on `NotificationToast` — fall back to `{ duration: 0 }` transition.
- **Touch targets:** Toast dismiss area should be the full toast surface (existing pattern — `SyncResultToast` uses `onClick={onDismiss}` on the entire div).
- **44x44px:** Not directly applicable to toasts (they're larger), but the dismiss hitbox should be generous.

### 6. Files Touched

**New files:**
- `src/hooks/useNotificationDedup.ts`
- `src/hooks/useNotificationDedup.test.ts`
- `src/components/ui/NotificationToast.tsx`
- `src/components/ui/NotificationToast.test.tsx`

**Modified files:**
- `src/hooks/useRemoteChangeDetection.ts` — add content-diff guard, post-push skip window
- `src/hooks/useRemoteChangeDetection.test.ts` — new test cases
- `src/App.tsx` — integrate `useNotificationDedup`, replace three toast states with unified hook, replace three toast render blocks with single `NotificationToast`, add `computeImportDiff` to repo-switch path
- `src/features/sync/components/SyncFAB.tsx` — propagate new SHA after successful sync push
- `src/features/sync/components/SyncImportBanner.tsx` — updated copy for merge vs. replace clarity, handle all-completed-tasks case
- `src/features/sync/components/SyncImportBanner.test.tsx` — new test cases for updated copy and variants
- `src/services/github/sync-service.ts` — return new commit SHA from `syncAllRepoTasks`

**Potentially removed files:**
- `src/features/sync/components/SyncResultToast.tsx` — replaced by `NotificationToast`
- `src/features/sync/components/SyncResultToast.test.tsx` — replaced by `NotificationToast.test.tsx`

### 7. Testing Standards

- Co-located test files (`.test.ts` / `.test.tsx` next to source)
- Vitest + Testing Library
- Mock `framer-motion` in component tests (see existing pattern in `SyncResultToast.test.tsx`)
- Mock `useSyncStore` in hook tests (see existing pattern in `useRemoteChangeDetection.test.ts`)
- Use `vi.useFakeTimers()` for testing clustering window and auto-dismiss timing

### References

- Notification state management: `src/App.tsx` lines 253, 273-275 (toast states), lines 995-1024 (toast render blocks), lines 497-498 (task-moved toast trigger), lines 717-721 (import feedback toast trigger)
- Remote change detection: `src/hooks/useRemoteChangeDetection.ts` (entire file — 72 lines)
- SHA staleness gap: `src/features/sync/components/SyncFAB.tsx` lines 57-66 (success handler)
- Content-diff guard (partial): `src/App.tsx` lines 364-386 (useRemoteChangeDetection callback)
- Diff utilities: `src/utils/task-diff.ts` — `computeImportDiff`, `isAllZero`, `buildImportFeedbackMessage`
- Sync service: `src/services/github/sync-service.ts` — `syncAllRepoTasks`, `fetchRemoteTasksForRepo`
- Toast components: `src/features/sync/components/SyncResultToast.tsx`, `src/features/capture/components/UndoToast.tsx`
- Banner components: `src/features/sync/components/SyncImportBanner.tsx`, `src/features/sync/components/SyncConflictBanner.tsx`, `src/features/sync/components/BranchProtectionBanner.tsx`
- Motion config: `src/config/motion.ts` — `TRANSITION_FAST`, `TRANSITION_NORMAL`, `TRANSITION_SPRING`
- Store: `src/stores/useSyncStore.ts` — `repoSyncMeta`, `setSyncStatus`, `setRepoSyncMeta`, `updateLastSyncedAt`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
