# Story 9.3: Pull to Refresh

Status: done

## Story

As a mobile user,
I want to pull down on the task list to check for remote changes,
so that I can quickly see if an AI agent or VS Code session has updated my tasks without hunting for a button.

## Acceptance Criteria

1. Given I am on the main task list view, when I pull down from the top of the scrollable area by at least 80px and release, then a **read-only** remote change check is triggered — this fetches the latest file from main, it does NOT push anything.

2. Given I am pulling down and the pull distance is increasing, when I see the indicator, then it shows "Check for updates" text so I know what will happen — I can push back up to cancel without triggering anything.

3. Given I pull down and a remote change is detected, when the check completes, then the `SyncImportBanner` appears with the diff summary (existing additive import flow — no new UI needed).

4. Given I pull down and no remote changes are detected, when the check completes, then a brief "Up to date" indicator appears and dismisses after ~1.5 seconds.

5. Given I am offline (`!isOnline`), when I pull down, then the gesture is ignored or shows "Offline" feedback — no network call is made.

6. Given a sync push is in progress (`syncEngineStatus === 'syncing'`), when I pull down, then the gesture is ignored to prevent phantom banner issues (same guard as `useRemoteChangeDetection`).

7. Given I pulled to refresh within the last 15 seconds, when I pull down again, then the gesture is ignored (cooldown prevents spamming the GitHub API).

8. Given I pull down but release before reaching the 80px threshold, when I let go, then the pull indicator snaps back with no action triggered (no flicker, no network call).

9. Given the pull-to-refresh check is in progress, when I see the indicator, then a spinner or loading animation is visible at the top of the list until the check completes.

## Tasks / Subtasks

- [x]Task 1: Create `usePullToRefresh` hook (AC: #1, #5, #6, #7, #8)
  - [x]Create `src/hooks/usePullToRefresh.ts`
  - [x]Accept config: `{ onRefresh: () => Promise<void>, threshold?: number, disabled?: boolean, cooldownMs?: number }`
  - [x]Track touch events: `touchstart` (record startY when scrollTop === 0), `touchmove` (compute pull distance, update state), `touchend` (trigger if past threshold, else snap back)
  - [x]Return: `{ pullDistance: number, isRefreshing: boolean, handlers: { onTouchStart, onTouchMove, onTouchEnd } }`
  - [x]Guard: if `disabled` is true, all touch handlers are no-ops
  - [x]Guard: only activate when the scroll container is at scrollTop === 0 (do NOT hijack mid-scroll)
  - [x]Guard: 15-second cooldown (`cooldownMs` default 15000) — track `lastRefreshAtRef` timestamp, ignore pulls within cooldown window
  - [x]Set `isRefreshing = true` while the `onRefresh` promise is pending; reset to false on resolve/reject
  - [x]Use `useCallback` for handlers to prevent re-renders

- [x]Task 2: Create `PullToRefreshIndicator` component (AC: #2, #4, #9)
  - [x]Create `src/components/ui/PullToRefreshIndicator.tsx`
  - [x]Props: `{ pullDistance: number, isRefreshing: boolean, threshold: number, result?: 'up-to-date' | null }`
  - [x]Render a visual indicator above the task list with three states:
    - **While pulling:** show a down-arrow icon + "Check for updates" text. Arrow rotates to up-arrow as `pullDistance` approaches `threshold`. This tells the user clearly what will happen (read-only check, not a push) and lets them abort by pushing back up.
    - **While refreshing:** show a spinner + "Checking…" text (reuse the sync spinner SVG pattern from `SyncFAB`)
    - **On "up-to-date" result:** show a checkmark + "Up to date" text, auto-dismiss after 1.5s
  - [x]Use `motion.div` with `translateY` based on `pullDistance` (capped at ~120px)
  - [x]Honor `useReducedMotion()` — use instant transforms when reduced motion is preferred
  - [x]Style: subtle, translucent, centered above the list — not a full banner. Match `var(--color-text-secondary)` for the icon/text, `var(--color-success)` for the checkmark.

- [x]Task 3: Integrate pull-to-refresh in `App.tsx` (AC: #1–#9)
  - [x]Import `usePullToRefresh` and `PullToRefreshIndicator`
  - [x]Add `pullToRefreshResult` state: `useState<'up-to-date' | null>(null)`
  - [x]Create `handlePullRefresh` async callback in `AppContent`:
    1. Call `fetchRemoteTasksForRepo(selectedRepo.fullName, user.login)` (already imported) — this is a **GET only**, no push
    2. Compare remote SHA with local `repoSyncMeta[repoKey].lastSyncedSha`
    3. If different → call existing `handleImportPrompt` logic (same path as `useRemoteChangeDetection`)
    4. If same → set `pullToRefreshResult` to `'up-to-date'`, auto-clear after 1500ms
    5. If error → silently reset (no error toast for pull-to-refresh — it's a passive check)
  - [x]Call `usePullToRefresh({ onRefresh: handlePullRefresh, disabled: !isOnline || syncEngineStatus === 'syncing' })`
  - [x]Attach touch handlers to the `<main>` element (the scrollable task list container at line ~706)
  - [x]Render `<PullToRefreshIndicator>` between `<AppHeader>` and the task list `<main>` (or as the first child of `<main>`)

- [x]Task 4: Tests (AC: #1, #5, #7, #8)
  - [x]`src/hooks/usePullToRefresh.test.ts` — unit test the hook:
    - Fires `onRefresh` when pull exceeds threshold and touch ends
    - Does NOT fire when pull is below threshold
    - Does NOT fire when `disabled` is true
    - Does NOT fire within 15-second cooldown window
    - `isRefreshing` is true while promise is pending
    - `pullDistance` resets to 0 on touchend
  - [x]`src/components/ui/PullToRefreshIndicator.test.tsx` — render tests:
    - Shows "Check for updates" text when pulling (pullDistance > 0, not refreshing)
    - Shows spinner + "Checking…" when `isRefreshing` is true
    - Shows "Up to date" when `result === 'up-to-date'`
    - Has correct `data-testid="pull-to-refresh-indicator"`

## Dev Notes

### 1. Touch Gesture Implementation Strategy

The pull-to-refresh gesture MUST only activate when the scroll container is at the very top (scrollTop === 0). This prevents the gesture from interfering with normal scrolling. The pattern:

```typescript
// In touchstart handler:
const scrollContainer = containerRef.current
if (!scrollContainer || scrollContainer.scrollTop > 0) return
startYRef.current = e.touches[0].clientY

// In touchmove handler:
if (startYRef.current === null) return
const delta = e.touches[0].clientY - startYRef.current
if (delta < 0) return // Only downward pulls
setPullDistance(Math.min(delta * 0.5, 120)) // Rubber-band effect: 0.5 damping
```

Use a damping factor of 0.5 so the user has to physically pull ~160px to reach the 80px threshold — this matches iOS native pull-to-refresh feel.

**Critical:** Do NOT use `e.preventDefault()` on touchmove unless the pull gesture is actively engaged (delta > 10px AND scrollTop === 0). Calling preventDefault unconditionally will break normal scrolling. Use `{ passive: false }` only when needed.

### 2. Reusing Existing Remote Check Logic

The remote change detection logic already exists in `useRemoteChangeDetection.ts` (line 50). For pull-to-refresh, call the SAME function directly rather than duplicating:

```typescript
import { fetchRemoteTasksForRepo } from '../services/github/sync-service'

// In handlePullRefresh:
const result = await fetchRemoteTasksForRepo(selectedRepo.fullName, user.login)
```

The `fetchRemoteTasksForRepo` function is already exported and used in both `useRemoteChangeDetection` and `App.tsx` (line 38 import). After getting the result, compare SHAs and either trigger the import banner (existing `handleImportPrompt` flow) or show "Up to date".

Do NOT call `useRemoteChangeDetection` programmatically — it's a hook that listens to visibility events. The pull-to-refresh is a separate trigger that calls the same underlying service.

### 3. Cooldown and Debounce

Pull-to-refresh has its own 15-second cooldown (`PULL_REFRESH_COOLDOWN_MS = 15_000`) tracked via `lastRefreshAtRef` inside the hook. This is separate from `useRemoteChangeDetection`'s 30-second visibility-change debounce. Rationale: pull-to-refresh is an explicit user gesture, but users might impulsively pull multiple times — the cooldown prevents GitHub API spam without feeling unresponsive.

If a pull is attempted within cooldown, the hook simply doesn't activate (no visual feedback needed — the gesture just doesn't engage). The `useRemoteChangeDetection` visibility debounce is unaffected — a redundant check after a pull is harmless (just a SHA comparison, no writes).

### 4. Scroll Container Reference

The task list scrolls within the `<main>` element at App.tsx line ~706. This is the element that needs the touch event handlers. Currently it's:

```tsx
<main className="flex w-full flex-1 flex-col items-center">
```

Add a `ref` to this element and pass it to the `usePullToRefresh` hook, OR attach the touch handlers directly via the handlers object returned by the hook. The handlers approach is cleaner:

```tsx
<main
  className="flex w-full flex-1 flex-col items-center"
  {...pullHandlers}
>
```

**Important:** The `<main>` element contains the task list but may not be the actual scroll container — the page itself scrolls (no `overflow-y: auto` on `<main>`). Check whether `document.scrollingElement` or `window` is the actual scroll source. If the page scrolls at the window level, use `window.scrollY === 0` instead of `container.scrollTop === 0`.

### 5. Animation Patterns

Follow existing motion patterns from `src/config/motion.ts`:
- `TRANSITION_FAST` for the indicator appearance/disappearance
- `TRANSITION_SPRING` for the rubber-band snap-back
- `useReducedMotion()` from framer-motion for accessibility

The indicator should use `translateY` (not height animation) to avoid layout thrashing. Position it with `position: absolute` or `position: fixed` above the list, not as a sibling that pushes content down.

### 6. This is GET-Only — Not a Push

**Critical distinction:** Pull-to-refresh calls `fetchRemoteTasksForRepo()` which is a **read-only** GitHub API call (`octokit.rest.repos.getContent`). It does NOT push local changes to GitHub. The SyncFAB is the only push mechanism. The indicator text "Check for updates" reinforces this to the user — they're pulling to check what's new on main (e.g., tasks completed by an AI agent in VS Code), not pushing their local changes.

### 7. No New Store State Needed

Pull-to-refresh is entirely local UI state — `pullDistance`, `isRefreshing`, and `pullToRefreshResult` are component-level `useState`/hook state. No changes to `useSyncStore.ts` required.

### Project Structure Notes

- `src/hooks/usePullToRefresh.ts` — new custom hook, follows existing hook convention (`useRemoteChangeDetection.ts`, `useNetworkStatus.ts`)
- `src/components/ui/PullToRefreshIndicator.tsx` — new shared UI component, follows `BottomSheet.tsx` / `SheetHandle.tsx` convention
- `src/App.tsx` — modified to integrate the hook + indicator
- No new dependencies needed — uses framer-motion (already installed) for animations

### References

- Remote change detection hook: `src/hooks/useRemoteChangeDetection.ts` (entire file — 72 lines)
- `fetchRemoteTasksForRepo` export: `src/services/github/sync-service.ts` (used at App.tsx line 38)
- Task list scroll container: `src/App.tsx` line ~706 (`<main>` element)
- Existing import banner flow: `src/App.tsx` `handleImportPrompt` callback
- SyncFAB spinner SVG pattern: `src/features/sync/components/SyncFAB.tsx` lines 165–183
- Motion constants: `src/config/motion.ts` (`TRANSITION_FAST`, `TRANSITION_SPRING`)
- Network status hook: `src/hooks/useNetworkStatus.ts`
- Sync engine status guard: `useSyncStore` → `syncEngineStatus`
- Architecture constraint: useReducedMotion() on all animated components

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered.

### Completion Notes List

- Created `usePullToRefresh` hook with touch gesture tracking, 80px threshold with 0.5 damping factor, 15s cooldown, scrollTop === 0 guard, and disabled state support.
- Created `PullToRefreshIndicator` component with three visual states: pulling (arrow + "Check for updates"), refreshing (spinner + "Checking…"), and up-to-date (checkmark + "Up to date" auto-dismiss 1.5s). Uses framer-motion with reduced motion support.
- Integrated in `App.tsx`: `handlePullRefresh` callback reuses `fetchRemoteTasksForRepo` for GET-only check, compares SHA, triggers existing `SyncImportBanner` on changes or shows "Up to date". Touch handlers attached to `<main>` element. Disabled when offline or syncing.
- 11 new tests: 6 unit tests for the hook (threshold, disabled, cooldown, isRefreshing, pullDistance reset), 5 render tests for the indicator component.
- All new tests pass. 3 pre-existing test failures (UndoToast framer-motion mock, App "shows main interface" text match, AuthForm) are unrelated to this story.
- Build passes cleanly.

### File List

- `src/hooks/usePullToRefresh.ts` (new)
- `src/hooks/usePullToRefresh.test.ts` (new)
- `src/components/ui/PullToRefreshIndicator.tsx` (new)
- `src/components/ui/PullToRefreshIndicator.test.tsx` (new)
- `src/App.tsx` (modified)

### Change Log

- 2026-03-20: Implemented Story 9.3 Pull to Refresh — new hook, indicator component, App.tsx integration, and tests
