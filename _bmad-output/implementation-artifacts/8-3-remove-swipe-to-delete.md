# Story 8.3: Remove Swipe-to-Delete from List View

Status: done

## Story

As a User,
I want task deletion to only be available in the task detail view,
so that I never accidentally delete a task by mis-swiping, and the list feels clean and safe.

## Acceptance Criteria

1. Given I am viewing the active task list, when I swipe left on a task card, then nothing happens — no delete tray, no action reveals.
2. Given I open a task in the detail view, when I scroll to the bottom, then a "Delete Task" button is visible with a confirmation step.
3. Given I tap "Delete Task" in the detail view, when I confirm, then the task is removed with the existing fade-out animation and UndoToast.

## Tasks / Subtasks

- [x] Task 1: Replace `SwipeableTaskCard` with `DraggableTaskCard` for active tasks in `App.tsx` (AC: 1)
  - [x] Subtask 1.1: In `src/App.tsx`, inside the `Reorder.Group` (around line 617), replace `<SwipeableTaskCard ... isDraggable={true} />` with `<DraggableTaskCard>` passing props: `task`, `onTap`, `onComplete`, `isNewest`, `isDimmed`, `onDragStart`, `onDragEnd`.
  - [x] Subtask 1.2: Confirm `DraggableTaskCard` already accepts all required props: `task`, `onTap` (maps to `setSelectedTaskId`), `onComplete` (maps to `handleToggleComplete`), `isNewest`, `isDimmed`, `onDragStart`, `onDragEnd`. No new props needed — the interface in `DraggableTaskCard.tsx` already covers these.

- [x] Task 2: Replace `SwipeableTaskCard` with plain `TaskCard` for completed tasks in `App.tsx` (AC: 1)
  - [x] Subtask 2.1: In `src/App.tsx`, inside the completed-tasks `AnimatePresence` block (around line 688), replace `<SwipeableTaskCard ... isDraggable={false} />` with `<TaskCard task={task} onComplete={handleToggleComplete} isNewest={newestTaskId === task.id} />`.
  - [x] Subtask 2.2: Wrap the plain `TaskCard` in an `onClick` handler that calls `setSelectedTaskId(task.id)` — `TaskCard` supports `onTap` prop natively, so used that directly (no wrapping div needed).

- [x] Task 3: Remove swipe-related state and handlers from `App.tsx` (AC: 1)
  - [x] Subtask 3.1: Remove the `openSwipeId` state variable: `const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)`.
  - [x] Subtask 3.2: Remove `handleSwipeMove` callback. Move action remains available via `TaskDetailSheet`'s `onMoveToRepo` prop.
  - [x] Subtask 3.3: `handleDeleteInitiated`, `pendingDelete`, `handleUndo`, and `UndoToast` all kept intact — still wired to `TaskDetailSheet.onDelete`.
  - [x] Subtask 3.4: Removed `SwipeableTaskCard` import from `App.tsx`.
  - [x] Subtask 3.5: Added `DraggableTaskCard` and `TaskCard` imports to `App.tsx`.

- [x] Task 4: Verify `TaskDetailSheet` delete button is properly wired and visible (AC: 2, 3)
  - [x] Subtask 4.1: Confirmed `onDelete={handleDeleteInitiated}` already passed to `TaskDetailSheet` — no change needed.
  - [x] Subtask 4.2: Confirmed delete button at lines 349–364 of `TaskDetailSheet.tsx` — conditional on `onDelete`, fires `onClose()` then `onDelete(task.id)` after 150ms.
  - [x] Subtask 4.3: UndoToast pipeline verified — `handleDeleteInitiated` → `pendingDelete` state → `<UndoToast>` rendering.

- [x] Task 5: Update tests (AC: 1, 2, 3)
  - [x] Subtask 5.1: Added `// LEGACY` comment to `SwipeableTaskCard.test.tsx` noting removal from main list in Story 8.3.
  - [x] Subtask 5.2: Added test: delete button present with `onDelete` prop; absent without it.
  - [x] Subtask 5.3: Added test: clicking delete calls `onClose` immediately and `onDelete(taskId)` after 150ms (fake timers).

## Dev Notes

### State Variables to Remove from `App.tsx`

The following state variable and related handler are safe to remove once `SwipeableTaskCard` is no longer used in the list:

- `const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)` — line ~231
- `const handleSwipeMove = useCallback(...)` — line ~341. Its only purpose was to close the swipe tray and open the move-repo sheet. The move action is already available via `TaskDetailSheet`'s existing `onMoveToRepo` prop.

The following MUST be kept — they are still used by `TaskDetailSheet.onDelete`:

- `const [pendingDelete, setPendingDelete] = useState<...>(null)` — line ~234
- `const handleDeleteInitiated = useCallback(...)` — line ~313
- `const handleUndo = useCallback(...)` — line ~334
- `<UndoToast>` rendering in JSX — lines ~786–797
- `visibleTasks` memo that filters out `pendingDelete.task.id` — line ~410

### Component Swap: Active Tasks

**Before (inside `Reorder.Group`, line ~617):**
```tsx
<SwipeableTaskCard
  key={task.id}
  task={task}
  onDelete={handleDeleteInitiated}
  onMove={handleSwipeMove}
  isSwipeOpen={openSwipeId === task.id}
  onSwipeOpen={setOpenSwipeId}
  onSwipeClose={() => setOpenSwipeId(null)}
  showMoveAction={showMoveAction}
  onTap={(taskId) => setSelectedTaskId(taskId)}
  onComplete={handleToggleComplete}
  isNewest={newestTaskId === task.id}
  isDimmed={draggingTaskId !== null && draggingTaskId !== task.id}
  onDragStart={() => handleDragStart(task.id)}
  onDragEnd={handleDragEnd}
  isDraggable={true}
/>
```

**After:**
```tsx
<DraggableTaskCard
  key={task.id}
  task={task}
  onTap={(taskId) => setSelectedTaskId(taskId)}
  onComplete={handleToggleComplete}
  isNewest={newestTaskId === task.id}
  isDimmed={draggingTaskId !== null && draggingTaskId !== task.id}
  onDragStart={() => handleDragStart(task.id)}
  onDragEnd={handleDragEnd}
/>
```

Note: `DraggableTaskCard` wraps itself in `Reorder.Item` internally — this is compatible with `Reorder.Group`.

### Component Swap: Completed Tasks

**Before (inside completed `AnimatePresence`, line ~688):**
```tsx
<SwipeableTaskCard
  key={task.id}
  task={task}
  onDelete={handleDeleteInitiated}
  onMove={handleSwipeMove}
  isSwipeOpen={openSwipeId === task.id}
  onSwipeOpen={setOpenSwipeId}
  onSwipeClose={() => setOpenSwipeId(null)}
  showMoveAction={showMoveAction}
  onTap={(taskId) => setSelectedTaskId(taskId)}
  onComplete={handleToggleComplete}
  isNewest={newestTaskId === task.id}
  isDraggable={false}
/>
```

**After:**
Completed tasks are not inside a `Reorder.Group`, so they use plain `TaskCard`. They need an `onClick` to open the detail sheet. Check how `TaskCard` exposes click handling — if it does not accept an `onClick` prop natively, wrap in a `div`:
```tsx
<motion.div key={task.id} layout>
  <TaskCard
    task={task}
    onComplete={handleToggleComplete}
    isNewest={newestTaskId === task.id}
    onClick={() => setSelectedTaskId(task.id)}
  />
</motion.div>
```
Verify `TaskCard` props interface before choosing the exact approach — use whichever pattern maintains the `AnimatePresence` exit animation.

### `TaskDetailSheet` Delete Flow (Already Implemented)

The delete button at the bottom of `TaskDetailSheet` already exists (lines 349–364 of `TaskDetailSheet.tsx`):
- Conditional on `onDelete` prop being defined
- Fires `onClose()` then calls `onDelete(task.id)` after 150ms delay (to let sheet dismiss first)
- `data-testid="detail-delete-button"` is already set

The `onDelete` prop is `onDelete?: (taskId: string) => void` (optional). It is already wired in `App.tsx` at line ~771: `onDelete={handleDeleteInitiated}`.

No changes needed to `TaskDetailSheet` for the core delete flow. The delete button is already visible and functional when `onDelete` is passed.

### `DraggableTaskCard` Props Interface (Current)

```typescript
interface DraggableTaskCardProps {
  task: Task
  onTap: (taskId: string) => void
  onComplete: (taskId: string) => void
  isNewest: boolean
  isDimmed?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
}
```

No changes to `DraggableTaskCard.tsx` are needed — all required props are already present.

### `SwipeableTaskCard.tsx` — Do Not Delete

Per planning doc decision: keep the file in the codebase. It may be referenced by existing tests. Simply remove the import from `App.tsx`. Update the test file to mark it as legacy.

### Architecture Constraints

- All state mutations go through `useSyncStore` actions (already satisfied — no store changes in this story).
- The UndoToast 5-second soft-delete pipeline must continue working from the detail view path (already wired via `handleDeleteInitiated`).
- Touch targets: the existing delete button in `TaskDetailSheet` uses `py-3 w-full` — this meets the 44px minimum touch target requirement.
- Use `useReducedMotion()` fallback — no new animated components introduced in this story.

### Project Structure Notes

- All changed files are in the existing structure — no new files or directories needed.
- `DraggableTaskCard` and `TaskCard` are co-located with `SwipeableTaskCard` in `src/features/capture/components/`.
- Test files are co-located with their source components.

### References

- Story 8.3 full definition: [Source: `_bmad-output/planning-artifacts/epic-8-planning.md`#Story 8.3]
- Codebase state / key files table: [Source: `_bmad-output/planning-artifacts/epic-8-planning.md`#Key Files]
- App.tsx state variables: [Source: `_bmad-output/planning-artifacts/epic-8-planning.md`#Current App.tsx State Variables]
- Exact SwipeableTaskCard usages confirmed in `src/App.tsx` lines 617–635 (active) and 688–703 (completed)
- `handleDeleteInitiated` already wired to `TaskDetailSheet.onDelete` at `src/App.tsx` line ~771
- Delete button in `TaskDetailSheet` confirmed at `src/features/capture/components/TaskDetailSheet.tsx` lines 349–364
- `DraggableTaskCard` props interface confirmed at `src/features/capture/components/DraggableTaskCard.tsx` lines 11–19

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — straightforward component swap with no new patterns.

### Completion Notes List

- `TaskCard` already had `onTap` prop — no wrapping div needed for completed tasks tap-to-open.
- `showMoveAction` state kept (used by `TaskDetailSheet` via `onMoveToRepo`) — only `handleSwipeMove` removed.
- All 367 tests pass; +4 new (3 in TaskDetailSheet.test.tsx, 1 legacy comment in SwipeableTaskCard.test.tsx unchanged count).

### File List

- `src/App.tsx`
- `src/features/capture/components/SwipeableTaskCard.test.tsx`
- `src/features/capture/components/TaskDetailSheet.test.tsx`

## Change Log

- 2026-03-17: Replaced SwipeableTaskCard with DraggableTaskCard (active) and TaskCard (completed) in App.tsx. Removed `openSwipeId` state and `handleSwipeMove` callback. Delete now exclusively via TaskDetailSheet. Added 3 tests for delete button behavior. All 367 tests pass.
