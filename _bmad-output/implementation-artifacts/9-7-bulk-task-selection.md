# Story 9.7: Bulk Task Selection

Status: deferred-post-mvp
<!-- Deferred 2026-03-20: Individual task management works fine for MVP. Bulk selection is a v1.1 productivity feature. -->

## Story

As a User,
I want to select multiple tasks at once and perform batch actions on them,
so that I can quickly complete, delete, or move a group of tasks without tapping each one individually.

## Acceptance Criteria

1. **[More Sheet Entry]** Given the filter/sort toolbar is visible, when I tap the "More" button (↕ icon, replacing current SortModeSelector trigger), then a bottom sheet opens containing:
   - Sort options section (identical to current SortModeSelector dropdown behavior)
   - A visual divider
   - A "Select Multiple" row below the divider

2. **[Sort Options in Sheet]** Given the More sheet is open, when I tap a sort option, then the sort mode changes (same behavior as current SortModeSelector) and the sheet closes. The More button shows an active indicator (accent color border) when a non-manual sort is active.

3. **[Entering Selection Mode]** Given the More sheet is open, when I tap "Select Multiple", then:
   - The sheet closes
   - The app enters selection mode
   - Each task card shows a circular selection indicator on its left side (replaces the sync-status dot area)
   - The FAB (+ button) is hidden
   - A sticky bulk action bar appears at the bottom of the screen (above the FAB position)
   - A "Cancel" affordance is available (e.g., "Cancel" button in the header area or action bar)

4. **[Selecting Tasks]** Given selection mode is active, when I tap a task card (anywhere on the card), then:
   - The task is added to the selection set (circular indicator fills to show selected state)
   - Tapping again deselects it
   - The action bar shows "N selected" where N is the count of selected tasks

5. **[No Drag in Selection Mode]** Given selection mode is active, when I long-press a task, then no drag is initiated. Drag & drop is fully disabled during selection mode.

6. **[Bulk Complete]** Given 1+ tasks are selected, when I tap "Complete" in the action bar, then:
   - All selected active tasks are toggled to completed (using existing `handleToggleComplete` pipeline with 500ms delay)
   - Already-completed tasks in the selection are ignored
   - Selection mode exits
   - A toast confirms: "N tasks completed"

7. **[Bulk Delete]** Given 1+ tasks are selected, when I tap "Delete" in the action bar, then:
   - All selected tasks are removed immediately from the store via `removeTask`
   - Selection mode exits
   - An undo toast appears: "N tasks deleted" with "Undo" button
   - Tapping Undo restores all deleted tasks atomically
   - Undo window: 5 seconds (same as single-task delete)

8. **[Bulk Move to Repo]** Given 1+ tasks are selected, when I tap "Move to…" in the action bar, then:
   - Selection mode exits
   - The existing RepoPickerSheet opens
   - On repo selection, `moveTaskToRepo` is called for each selected task
   - A toast confirms: "N tasks moved to [repo-name]"

9. **[Archive Placeholder]** The bulk action bar includes an "Archive" button that is visually disabled (greyed out) until story 9-2 (Archive Tab and Data Model) is implemented. The button shows a tooltip or sub-label "Coming soon". When 9-2 ships, this button becomes active and calls the archive action for each selected task.

10. **[Exiting Selection Mode]** Given selection mode is active, when I tap "Cancel" or navigate away, then selection mode exits, all selections are cleared, and the UI returns to normal.

11. **[Empty Selection Guard]** Given selection mode is active with 0 tasks selected, all action bar buttons (Complete, Delete, Move, Archive) are disabled/greyed out.

## Tasks / Subtasks

- [ ] **T1: Replace SortModeSelector with More button + MoreActionsSheet** (AC: 1, 2)
  - [ ] Create `MoreActionsSheet.tsx` in `src/features/capture/components/` using `BottomSheet` component
  - [ ] Sheet sections: Sort options (same 4 options as current dropdown) + divider + "Select Multiple" row
  - [ ] Update `App.tsx` toolbar (`App.tsx:728-751`) to replace `<SortModeSelector>` with a "More" button that opens `MoreActionsSheet`
  - [ ] Preserve active-sort indicator (accent border on More button when `currentSortMode !== 'manual'`)
  - [ ] Pass sort mode state and `onSelectMultiple` callback into `MoreActionsSheet`
  - [ ] Update/replace `SortModeSelector.test.tsx` → `MoreActionsSheet.test.tsx`

- [ ] **T2: Selection mode state in App.tsx** (AC: 3, 4, 5, 10, 11)
  - [ ] Add `isSelectMode: boolean` state to `AppContent`
  - [ ] Add `selectedTaskIds: Set<string>` state to `AppContent`
  - [ ] Wire `onSelectMultiple` from `MoreActionsSheet` to enter select mode
  - [ ] Add `handleToggleSelection(taskId: string)` handler
  - [ ] Disable drag entry in `DraggableTaskCard` when `isSelectMode` is true (pass `isSelectMode` prop, skip `longPressTimerRef` start)
  - [ ] Change card `onClick` behavior in select mode: call `handleToggleSelection` instead of `setSelectedTaskId`
  - [ ] Hide `CreateTaskFAB` when `isSelectMode` is true

- [ ] **T3: Task card selection UI** (AC: 3, 4)
  - [ ] Add `isSelectMode?: boolean` and `isSelected?: boolean` props to `TaskCard`
  - [ ] When `isSelectMode` is true: replace sync-status dot with circular selection indicator
    - Unselected: empty circle outline (border: `var(--color-border)`)
    - Selected: filled circle with checkmark (bg: `var(--color-accent)`)
  - [ ] Ensure 44×44px minimum touch target on the selection indicator
  - [ ] Pass `isSelectMode` and `isSelected` from `App.tsx` to all `TaskCard` and `DraggableTaskCard` renders

- [ ] **T4: BulkActionBar component** (AC: 3, 4, 6, 7, 8, 9, 11)
  - [ ] Create `BulkActionBar.tsx` in `src/features/capture/components/`
  - [ ] Sticky positioning: `fixed bottom-0 left-0 right-0` above safe-area-inset, `z-40`
  - [ ] Shows count: "N selected" (or "Select tasks" when 0 selected)
  - [ ] Buttons: Complete, Delete, Move to…, Archive (disabled), Cancel
  - [ ] All action buttons disabled when `selectedCount === 0`
  - [ ] Archive button always disabled with sub-label "Coming soon" — wired to no-op until 9-2
  - [ ] Calls `onComplete`, `onDelete`, `onMoveTo`, `onCancel` callbacks

- [ ] **T5: Bulk action handlers in App.tsx** (AC: 6, 7, 8)
  - [ ] `handleBulkComplete`: iterate `selectedTaskIds`, call `handleToggleComplete` for each active task, exit select mode, show toast "N tasks completed"
  - [ ] `handleBulkDelete`: collect Task objects for selected ids, call `removeTask` for each, exit select mode, show undo toast with full restore capability (store deleted tasks array in state, restore all on undo)
  - [ ] `handleBulkMoveToRepo`: store `bulkMoveTaskIds` in state, open `showRepoPicker`, on repo select call `moveTaskToRepo` for each id, show toast "N tasks moved to [repo]"

- [ ] **T6: Tests** (AC: all)
  - [ ] `MoreActionsSheet.test.tsx`: renders sort options, renders Select Multiple row, calls onSelectMultiple
  - [ ] `BulkActionBar.test.tsx`: shows count, disables buttons at 0 selected, calls correct callbacks
  - [ ] `TaskCard.test.tsx`: renders selection indicator in select mode, correct selected state
  - [ ] Integration smoke test in `App` tests: entering/exiting select mode

## Dev Notes

### Architecture Pattern — "More" Sheet replacing SortModeSelector

The current `SortModeSelector` is a self-contained dropdown component at `App.tsx:743`. Replace the JSX render site with:

```tsx
<MoreActionsSheet
  isOpen={showMoreSheet}
  onClose={() => setShowMoreSheet(false)}
  currentSortMode={currentSortMode}
  onSortChange={(mode) => { if (selectedRepo) setRepoSortMode(selectedRepo.fullName, mode) }}
  onSelectMultiple={() => { setShowMoreSheet(false); setIsSelectMode(true) }}
/>
```

The trigger button in the toolbar remains visually identical to the current SortModeSelector button (same icon, same active-state styling). Only the popup changes from a dropdown to a BottomSheet.

`MoreActionsSheet` uses the existing `BottomSheet` component (`src/components/ui/BottomSheet.tsx`) — do NOT reinvent the sheet pattern.

### Selection Mode State

All selection state lives in `AppContent` (no store changes needed — this is ephemeral UI state):

```tsx
const [isSelectMode, setIsSelectMode] = useState(false)
const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

const handleToggleSelection = (taskId: string) => {
  setSelectedTaskIds(prev => {
    const next = new Set(prev)
    if (next.has(taskId)) next.delete(taskId)
    else next.add(taskId)
    return next
  })
}

const exitSelectMode = () => {
  setIsSelectMode(false)
  setSelectedTaskIds(new Set())
}
```

### Disabling Drag in Selection Mode

In `DraggableTaskCard`, add `isSelectMode?: boolean` prop. In `handlePointerDown`, add early return:

```tsx
if (isSelectMode) return  // disable drag during selection
```

Also, in `App.tsx`, when rendering `DraggableTaskCard` in select mode, the `onClick` (via `onTap` prop) should call `handleToggleSelection` instead of `setSelectedTaskId`.

### TaskCard Selection Indicator

Replace the sync-status dot (`App.tsx:57-63` in `TaskCard.tsx`) with a conditional:

```tsx
{isSelectMode ? (
  <span
    className="inline-flex items-center justify-center h-5 w-5 flex-shrink-0 rounded-full"
    style={{
      border: isSelected ? 'none' : '1.5px solid var(--color-border)',
      backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
    }}
  >
    {isSelected && <svg ...checkmark />}
  </span>
) : (
  <span /* existing sync dot */ />
)}
```

### Bulk Delete Undo Pipeline

The existing single-task soft-delete (`pendingDelete` state) handles one task at a time. For bulk delete, introduce a separate `pendingBulkDelete` state:

```tsx
const [pendingBulkDelete, setPendingBulkDelete] = useState<{
  tasks: Task[]
  timeoutId: ReturnType<typeof setTimeout>
} | null>(null)
```

On bulk delete: remove all tasks immediately, store in `pendingBulkDelete`, start 5s timer. On undo: re-add all tasks via `addTask`-equivalent or by re-inserting into the store. **Important:** Use `useSyncStore.getState().tasks` pattern or a `bulkRestoreTasks` store action — discuss with dev whether to add `bulkRestoreTasks(tasks: Task[])` to the store or handle restoration via repeated `addTask` calls (re-adding preserves IDs).

Recommended: add `bulkRestoreTasks(tasks: Task[])` to `useSyncStore` that inserts the tasks back with original IDs/fields intact (so sync status is preserved).

### BulkActionBar Positioning

```tsx
// Fixed to bottom, above iOS safe area, z-index below sheets (z-50) but above content
className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]"
style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}
```

The FAB is at `bottom-6` with `z-30`. BulkActionBar at `z-40` overlaps it. Hide FAB entirely during selection mode by conditionally rendering `{!isSelectMode && <CreateTaskFAB ... />}`.

### Archive Action — 9-2 Dependency

Story 9-2 (`archive-tab-and-data-model`) adds `isArchived: boolean` to the `Task` type and the `archiveTask(taskId)` store action. Until that story ships, the Archive button in `BulkActionBar` is:

```tsx
<button disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
  Archive
  <span className="text-caption block" style={{ color: 'var(--color-text-secondary)' }}>Coming soon</span>
</button>
```

When 9-2 ships, replace with: `selectedTaskIds.forEach(id => archiveTask(id))`.

### Project Structure Notes

- New files:
  - `src/features/capture/components/MoreActionsSheet.tsx`
  - `src/features/capture/components/BulkActionBar.tsx`
  - `src/features/capture/components/MoreActionsSheet.test.tsx`
  - `src/features/capture/components/BulkActionBar.test.tsx`
- Modified files:
  - `src/App.tsx` — selection state, bulk handlers, toolbar refactor, FAB gating
  - `src/features/capture/components/TaskCard.tsx` — selection indicator props
  - `src/features/capture/components/DraggableTaskCard.tsx` — disable drag in select mode
  - `src/stores/useSyncStore.ts` — add `bulkRestoreTasks(tasks: Task[])` action
  - `src/features/capture/components/SortModeSelector.test.tsx` — update or retire (sort is now in MoreActionsSheet)

### Testing Standards

- Vitest + Testing Library — match patterns from `TaskCard.test.tsx`, `DraggableTaskCard.test.tsx`
- Use `data-testid` for all new interactive elements (`more-actions-button`, `more-actions-sheet`, `bulk-action-bar`, `bulk-complete-btn`, `bulk-delete-btn`, `bulk-move-btn`, `bulk-archive-btn`, `bulk-cancel-btn`)
- Run `npm test` before committing

### References

- BottomSheet component: [src/components/ui/BottomSheet.tsx](src/components/ui/BottomSheet.tsx)
- SortModeSelector (to be replaced): [src/features/capture/components/SortModeSelector.tsx](src/features/capture/components/SortModeSelector.tsx)
- App.tsx toolbar section: [src/App.tsx#L728](src/App.tsx#L728) (lines 728–751)
- TaskCard: [src/features/capture/components/TaskCard.tsx](src/features/capture/components/TaskCard.tsx)
- DraggableTaskCard long-press: [src/features/capture/components/DraggableTaskCard.tsx#L54](src/features/capture/components/DraggableTaskCard.tsx#L54)
- Store types + actions: [src/stores/useSyncStore.ts](src/stores/useSyncStore.ts)
- Task type: [src/types/task.ts](src/types/task.ts)
- handleDeleteInitiated (single-delete pattern): [src/App.tsx#L426](src/App.tsx#L426)
- handleMoveToRepo (single-move pattern): [src/App.tsx#L459](src/App.tsx#L459)
- Story 9-2 (archive dependency): `_bmad-output/implementation-artifacts/9-2-archive-tab-and-data-model.md` (backlog)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
