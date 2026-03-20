# Story 8.6: Sync Result Feedback

Status: done

## Story

As a User,
I want to see a brief, informative popup after syncing to GitHub instead of a persistent pending count in the header,
so that I get satisfying confirmation of what happened without cluttered UI chrome.

## Acceptance Criteria

1. Given I tap "Push to GitHub" (SyncFAB), when the sync completes successfully, then a toast popup appears showing what was synced (e.g., "Pushed 3 tasks to owner/repo") for ~2.5 seconds then auto-dismisses.

2. Given the sync fails, when the error occurs, then the existing error state (SyncFAB red state + BranchProtectionBanner if applicable) continues to work without regression.

3. Given the sync is in progress, when `syncEngineStatus === 'syncing'`, then the existing spinner/animation on SyncFAB still shows (no change to SyncFAB behavior).

4. Given I am not syncing and have no pending changes, when I view the header, then the "X items pending" counter badge in `SyncHeaderStatus` is NOT shown — it has been removed.

## Tasks / Subtasks

- [ ] Task 1: Remove pending count badge from SyncHeaderStatus (AC: #4)
  - [ ] Delete the `pendingSyncCount > 0` branch (lines 69–83) from `SyncHeaderStatus.tsx`
  - [ ] Remove the `selectPendingSyncCount` import if no longer needed after the branch is removed
  - [ ] Verify remaining states (syncing, conflict, error, all-caught-up) still render correctly
  - [ ] Update `src/components/layout/SyncHeaderStatus.test.tsx` to remove any assertions about the pending counter badge

- [ ] Task 2: Add `syncResultMessage` state to App.tsx and wire up transition detection (AC: #1)
  - [ ] Add `const [syncResultMessage, setSyncResultMessage] = useState<string | null>(null)` to `AppContent` state block (~line 209 area)
  - [ ] Subscribe to `syncEngineStatus` from `useSyncStore` in `AppContent` (already present via the `syncErrorType` subscription pattern)
  - [ ] Add a `useRef<SyncEngineStatus>` to track the previous value of `syncEngineStatus`
  - [ ] Add a `useEffect` that compares previous and current `syncEngineStatus`; when transition is `'syncing' → 'success'`, call `setSyncResultMessage(...)` with a friendly string
  - [ ] Derive the message using `selectedRepo.fullName` from existing store state (already available in `AppContent`)
  - [ ] Auto-clear the message after 2500ms using `setTimeout`; store the timer ID in a ref and clear it in the effect's cleanup to avoid stale timers

- [ ] Task 3: Create `SyncResultToast` component (AC: #1)
  - [ ] Create `src/features/sync/components/SyncResultToast.tsx`
  - [ ] Component receives `message: string` and `onDismiss: () => void` props
  - [ ] Use `motion.div` with `initial={{ opacity: 0, y: 20 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: 20 }}`, `transition={TRANSITION_FAST}` — same pattern as the existing `toastMessage` inline toast in App.tsx (~line 806)
  - [ ] Style to match the existing repo-move toast: `backgroundColor: 'var(--color-surface)'`, `border: '1px solid var(--color-border)'`, success accent color or a checkmark icon prefix to signal success
  - [ ] Position: `fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-lg` (same zone as UndoToast, but use `z-50` to sit above FABs)
  - [ ] Include `role="status"` and `aria-live="polite"` for accessibility
  - [ ] Add `data-testid="sync-result-toast"`
  - [ ] Honor `useReducedMotion()` — use instant transitions when motion is reduced

- [ ] Task 4: Render SyncResultToast in App.tsx (AC: #1)
  - [ ] Import `SyncResultToast` in `App.tsx`
  - [ ] Add an `<AnimatePresence>` block in the sheet/toast rendering section (after the UndoToast block, ~line 801) that renders `<SyncResultToast>` when `syncResultMessage` is non-null
  - [ ] Pass `message={syncResultMessage}` and `onDismiss={() => setSyncResultMessage(null)}`

- [ ] Task 5: Tests (AC: #1, #4)
  - [ ] `src/components/layout/SyncHeaderStatus.test.tsx` — update to assert NO pending counter badge is rendered regardless of `pendingSyncCount`
  - [ ] `src/App.test.tsx` — add test: mock `syncEngineStatus` transition from `'syncing'` to `'success'`, assert `sync-result-toast` appears in the DOM and contains the repo name
  - [ ] `src/features/sync/components/SyncResultToast.test.tsx` — render test: given `message` prop, assert message text is rendered; assert `data-testid="sync-result-toast"` is present

## Dev Notes

### 1. Watching syncEngineStatus Transitions (useEffect with prev/current comparison)

The standard Zustand store in this project does not expose a `subscribe` selector with previous-value diffing. The correct approach is to track previous state via a `useRef` inside a React `useEffect`:

```typescript
// In AppContent, alongside other useSyncStore subscriptions:
const syncEngineStatus = useSyncStore((s) => s.syncEngineStatus)
const prevSyncStatusRef = useRef<SyncEngineStatus>(syncEngineStatus)

useEffect(() => {
  const prev = prevSyncStatusRef.current
  prevSyncStatusRef.current = syncEngineStatus

  if (prev === 'syncing' && syncEngineStatus === 'success') {
    const repoName = selectedRepo?.fullName ?? 'your repo'
    setSyncResultMessage(`Synced to ${repoName}`)
    const timerId = setTimeout(() => setSyncResultMessage(null), 2500)
    return () => clearTimeout(timerId)
  }
}, [syncEngineStatus, selectedRepo])
```

Key points:
- `prevSyncStatusRef` is initialized to the current value at component mount, preventing a spurious trigger on first render.
- The cleanup function cancels the timer if `syncEngineStatus` changes again before 2500ms (e.g., user triggers another sync immediately).
- `SyncEngineStatus` type is `'idle' | 'syncing' | 'success' | 'error' | 'conflict'` — imported from `src/stores/useSyncStore.ts` line 17.
- The `syncEngineStatus` selector is already subscribed in `SyncFAB.tsx`; in `AppContent` it can be added alongside the existing `syncErrorType` subscription at ~line 199.

### 2. What to Remove from SyncHeaderStatus

`SyncHeaderStatus` at `src/components/layout/SyncHeaderStatus.tsx` currently has five render branches:
1. `isSyncing` → blue "Syncing..." badge
2. `isConflict` → red "Conflict" badge
3. `isError` → red "Sync failed" / "Sync blocked" badge
4. **`pendingSyncCount > 0` → amber "X items pending" badge ← REMOVE THIS**
5. Default → green "All caught up · time ago" badge

Remove branch 4 entirely (lines 69–83 in the current file). After removal:
- `selectPendingSyncCount` import on line 1 is no longer used — remove it.
- The `pendingSyncCount` const on line 8 is no longer used — remove it.
- All other branches remain unchanged.

The rationale: the pending count is already shown as a red badge on the SyncFAB itself (`data-testid="sync-badge"` in `SyncFAB.tsx` lines 132–146). Showing it in both places is redundant and was flagged as clutter in field testing.

### 3. The SyncResultToast Component

Do NOT reuse `UndoToast` directly — its interface includes `onUndo` and `onExpire` which are undo-specific semantics. Instead, create a new `SyncResultToast` component at `src/features/sync/components/SyncResultToast.tsx`.

Model it after the existing inline `toastMessage` toast in `App.tsx` (~lines 803–822), but extract it into a proper component. Key differences from UndoToast:
- No Undo button — purely informational
- Shorter duration (2500ms, managed by the parent via `setTimeout` not inside the component)
- Success-tinted styling: add a small checkmark icon or use `var(--color-success)` as text accent
- Auto-dismiss is handled by the parent `useEffect` in `App.tsx`; the component itself can optionally call `onDismiss` if tapped (nice to have)

Animation system: reuse `TRANSITION_FAST` from `src/config/motion.ts` (already imported throughout the codebase). Use `AnimatePresence` in `App.tsx` around the render, consistent with UndoToast and the other toast patterns at lines 787–822.

`useReducedMotion()` pattern (per architecture constraint 6): wrap the transition in a conditional:
```typescript
const shouldReduceMotion = useReducedMotion()
const transition = shouldReduceMotion ? { duration: 0 } : TRANSITION_FAST
```

### 4. Sync Result Message Content

`SyncResult` (from `sync-service.ts` line 29) exposes `syncedCount: number`. However, `syncAllRepoTasks` is called inside `SyncFAB` and the result is not propagated to `App.tsx`. The cleanest approach for this story is to derive the message from store state at the moment of the `'syncing' → 'success'` transition, rather than threading the result through:

```typescript
// Simple, no refactor needed:
setSyncResultMessage(`Synced to ${selectedRepo?.fullName ?? 'GitHub'}`)
```

If a richer message like "Pushed 3 tasks to owner/repo" is desired, the dev will need to either:
- (a) Read `pendingSyncCount` from the store snapshot _before_ the sync transition clears it (risky — state may already be updated), or
- (b) Store the last synced count in `useSyncStore` as `lastSyncedCount: number` and read it after success

Recommendation: keep it simple for this story — just use `selectedRepo.fullName`. A follow-up can enrich the message if Thomas requests it.

### Project Structure Notes

- New component path `src/features/sync/components/SyncResultToast.tsx` aligns with the existing feature module convention — `SyncFAB.tsx` already lives at this path.
- Test files co-located with source: `SyncResultToast.test.tsx` next to `SyncResultToast.tsx`.
- `SyncHeaderStatus.test.tsx` already exists at `src/components/layout/` — update in place, do not create a new file.
- No new store actions, no new store state, no IDB writes — this story is purely UI/presentation.
- `toastMessage` state in `App.tsx` (line 209) is already used for repo-move feedback. Do NOT reuse it for sync result — add a separate `syncResultMessage` state to keep concerns separate and avoid race conditions when both toasts could appear simultaneously.

### References

- Story definition: `_bmad-output/planning-artifacts/epic-8-planning.md` § Story 8.6
- `SyncHeaderStatus` current implementation: `src/components/layout/SyncHeaderStatus.tsx` (all 100 lines — especially the `pendingSyncCount > 0` branch at lines 69–83)
- `SyncFAB` — sync orchestration and `fabState` lifecycle: `src/features/sync/components/SyncFAB.tsx`
- `UndoToast` — animation pattern to model: `src/features/capture/components/UndoToast.tsx`
- Existing inline toast pattern in App.tsx: `src/App.tsx` lines 803–822
- App.tsx state variables block: `src/App.tsx` lines 184–214
- App.tsx sheet/toast rendering block: `src/App.tsx` lines 787–822
- `SyncEngineStatus` type: `src/stores/useSyncStore.ts` line 17
- `SyncResult` interface: `src/services/github/sync-service.ts` lines 29–35
- Motion config: `src/config/motion.ts` (`TRANSITION_FAST`, `TRANSITION_SPRING`)
- Architecture constraints: `_bmad-output/planning-artifacts/epic-8-planning.md` § Architecture Constraints

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
