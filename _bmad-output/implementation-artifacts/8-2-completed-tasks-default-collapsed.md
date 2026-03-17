# Story 8.2: Completed Tasks: Default Collapsed

Status: done

## Story

As a User,
I want the "Completed" section to be collapsed by default when I open the app,
so that my active task list is clean and focused — I only see done work when I explicitly choose to.

## Acceptance Criteria

1. Given I open the app (fresh load or navigation), when the task list renders, then the "Completed (N)" section is collapsed by default — only the disclosure header is visible.

2. Given I tap "Completed (N)", when the section expands, then completed tasks animate in normally.

3. Given I search for a term that matches a completed task, when the filter runs, then the completed section auto-expands to show the matching completed task (search overrides the default-collapsed state).

4. Given I clear the search, when the query is empty, then the completed section returns to collapsed state.

## Tasks / Subtasks

- [x] Task 1 — Change `showCompleted` default to `false` (AC: 1, 2)
  - [x] In `src/App.tsx` at **line 213**, change `useState(true)` to `useState(false)` for the `showCompleted` state variable.
  - [x] Verify the disclosure chevron animation (`rotate: showCompleted ? 90 : 0` at line 663) still works correctly in both collapsed and expanded states.
  - [x] Verify `aria-expanded={showCompleted}` at line 658 reflects the new default state properly.

- [x] Task 2 — Implement search-driven auto-expand/collapse (AC: 3, 4)
  - [x] Add a `useEffect` in `src/App.tsx` (after the existing `completedTasks` derivation at line ~420) that watches `searchQuery` and `completedTasks`.
  - [x] When `searchQuery.length > 0` AND `completedTasks.length > 0`, call `setShowCompleted(true)`.
  - [x] When `searchQuery.length === 0`, call `setShowCompleted(false)`.
  - [x] Ensure the effect dependency array includes `[searchQuery, completedTasks]`.

- [x] Task 3 — Verify `showCompleted` is NOT persisted (AC: 1)
  - [x] Confirm `showCompleted` is local React state only (not in the Zustand store or `partialize`) — no change needed, just verify and document.

- [x] Task 4 — Tests (AC: 1, 3, 4)
  - [x] In `src/App.test.tsx`, add a test verifying the "Completed" section header is rendered but completed tasks are NOT visible on initial render (collapsed by default).
  - [x] Add a test verifying that when `searchQuery` is set to a term matching a completed task, `showCompleted` becomes `true` and completed tasks are visible.
  - [x] Add a test verifying that when `searchQuery` is cleared back to empty, `showCompleted` returns to `false`.

## Dev Notes

### Core Fix

The primary change is a single character edit in `src/App.tsx`:

- **File:** `src/App.tsx`
- **Line:** 213
- **Before:** `const [showCompleted, setShowCompleted] = useState(true)`
- **After:** `const [showCompleted, setShowCompleted] = useState(false)`

This state variable controls the `AnimatePresence` gate at line 679 (`{showCompleted && (...)}`), the `aria-expanded` attribute at line 658, and the chevron rotation animation at line 663.

### Search Override useEffect

Add the following `useEffect` after the existing `useEffect` at line ~427 (which syncs `dragOrderedTasks`). Place it before `handleReorder`:

```typescript
// Auto-expand completed section when search matches completed tasks; collapse when search clears
useEffect(() => {
  if (searchQuery.length > 0 && completedTasks.length > 0) {
    setShowCompleted(true)
  } else if (searchQuery.length === 0) {
    setShowCompleted(false)
  }
}, [searchQuery, completedTasks])
```

**Why `completedTasks.length > 0`:** Only auto-expand if there are actually completed tasks matching the search. `completedTasks` is already the filtered result from `sortTasksForDisplay(visibleTasks)`, and `visibleTasks` is derived from `searchFilteredTasks` → `displayedTasks`. So `completedTasks` already reflects the search-filtered set — no additional filtering needed.

**Data flow (for reference):**
- `searchQuery` → `searchFilteredTasks` (line 398–401, Fuse.js search)
- `searchFilteredTasks` → `displayedTasks` (line 403–407, priority filter)
- `displayedTasks` → `visibleTasks` (line 410–413, excludes soft-deleted)
- `visibleTasks` → `{ activeTasks, completedTasks }` (line 417–420, `sortTasksForDisplay`)

### Persistence

`showCompleted` MUST NOT be persisted to localStorage or the Zustand store. It is intentional transient UI state — always collapses on app open. No changes to `useSyncStore.ts` or `partialize` are needed.

### Completed Section Rendering Context

The completed section is rendered in `src/App.tsx` at lines 652–708:
- The toggle button is at lines 655–677 (calls `setShowCompleted(!showCompleted)`)
- `AnimatePresence` wraps the task list at line 678
- The conditional render gate is at line 679: `{showCompleted && (...)}`
- Tasks render as `SwipeableTaskCard` components at lines 688–703

No changes are needed to the rendering logic — only the initial state value and the new `useEffect`.

### Technical Notes (from Epic 8 Planning)

- `App.tsx` line 213: Change `useState(true)` to `useState(false)` for `showCompleted`. That's the core fix.
- The search override behavior (AC 3-4): watch `searchQuery` in a `useEffect`. When `searchQuery.length > 0` AND `completedTasks.some(t => visibleTasks.includes(t))` — auto-set `showCompleted(true)`. When query clears, set back to `false`.
- Do NOT persist `showCompleted` to localStorage — it should always reset to `false` on app open.

### Project Structure Notes

- All changes are confined to `src/App.tsx` (state init + new `useEffect`) and `src/App.test.tsx` (new test cases).
- No store changes, no new components, no new files.
- The existing `data-testid="completed-section-header"` attribute at line 660 is available for test selectors.
- The `AnimatePresence` at line 678 uses `initial={false}` — this means no entry animation on first render, which is correct for the collapsed default (nothing to animate on load).

### References

- [Source: `_bmad-output/planning-artifacts/epic-8-planning.md` — Story 8.2 Technical Notes]
- [Source: `src/App.tsx` line 213 — `showCompleted` state declaration]
- [Source: `src/App.tsx` lines 398–420 — search filter chain and `completedTasks` derivation]
- [Source: `src/App.tsx` lines 652–708 — Completed section rendering and toggle button]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation was straightforward.

### Completion Notes List

- `showCompleted` default changed from `true` → `false` at `App.tsx` line 213.
- Added `useEffect` after the drag-order sync effect watching `[searchQuery, completedTasks]`: auto-expands when search produces completed results, auto-collapses when search clears.
- `showCompleted` confirmed as local React state only — not in Zustand store or `partialize`.
- Existing test "section header toggle collapses" was updated to match new default-collapsed behavior (now tests expand then collapse cycle).
- 3 new tests added to `App.test.tsx`; all 363 tests pass (15 App tests).

### File List

- `src/App.tsx`
- `src/App.test.tsx`

## Change Log

- 2026-03-17: Changed `showCompleted` default to `false` (collapsed on load) and added search-driven auto-expand/collapse `useEffect`. Updated 1 existing App test; added 3 new tests covering AC 1, 3, 4. All 363 tests pass.
