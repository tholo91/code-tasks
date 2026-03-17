# Story 8.5: Sorting & Filtering

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to sort my tasks by created date, last edited date, or priority — and have my sort preference remembered per repository,
so that I can quickly find what I was just working on, or focus on what matters most.

## Acceptance Criteria

1. Given I am viewing a repository's task list, when I tap the sort control, then I can choose from four modes: **Manual** (drag order), **Newest First** (created desc), **Recently Edited** (updatedAt desc), **Priority First** (important → normal, then by created).
2. Given I select "Recently Edited", when the sort applies, then tasks with a non-null `updatedAt` float to the top sorted by `updatedAt` desc; tasks without `updatedAt` fall back to `createdAt` desc.
3. Given I select "Priority First", when the sort applies, then important tasks appear before normal tasks within the active section; within each priority group, manual order is preserved.
4. Given I switch sort mode for Repo A, when I switch to Repo B and back to Repo A, then Repo A's sort preference is remembered (persisted to localStorage).
5. Given "Manual" sort is active, when I drag and drop to reorder, then drag & drop is enabled normally via the existing `Reorder.Group` + `DraggableTaskCard`.
6. Given any non-"Manual" sort is active, when I view the task list, then drag & drop is disabled — drag handles are hidden/non-interactive and the list renders without `Reorder.Group`.
7. Given any non-"Manual" sort is active, when the drag handle area is visible, then a subtle tooltip or contextual hint communicates that reordering is only available in Manual mode.
8. Given I have an active priority filter (e.g., "Important") AND an active sort mode (e.g., "Recently Edited"), when the list renders, then both are applied simultaneously — filter first, then sort.

## Tasks / Subtasks

- [x] Task 1 — Add `SortMode` type to `src/types/task.ts` (AC: 1)
  - [x] 1.1 — Export `type SortMode = 'manual' | 'created-desc' | 'updated-desc' | 'priority-first'` from `src/types/task.ts`, below the existing `PriorityFilter` type.

- [x] Task 2 — Extend `SyncState` in `src/stores/useSyncStore.ts` with per-repo sort preference (AC: 4)
  - [x] 2.1 — Import `SortMode` from `../types/task` in `useSyncStore.ts`.
  - [x] 2.2 — Add `repoSortModes: Record<string, SortMode>` to the `SyncState` interface.
  - [x] 2.3 — Add `setRepoSortMode: (repoFullName: string, mode: SortMode) => void` action signature.
  - [x] 2.4 — Initialise `repoSortModes: {}` in the initial state.
  - [x] 2.5 — Implement `setRepoSortMode` action using `normalizeRepoKey`.
  - [x] 2.6 — Add `repoSortModes: state.repoSortModes` to `partialize`.

- [x] Task 3 — Extend `sortTasksForDisplay` in `src/utils/task-sorting.ts` (AC: 1, 2, 3, 5)
  - [x] 3.1 — Import `SortMode` from `../types/task`.
  - [x] 3.2 — Add `sortMode?: SortMode` to `SortOptions` interface (defaults to `'manual'`).
  - [x] 3.3 — Replace active.sort with switch covering all 4 modes.
  - [x] 3.4 — Completed sort unchanged.
  - [x] 3.5 — Created `src/utils/task-sorting.test.ts` with 11 tests covering all modes and backward compat.

- [x] Task 4 — Build `SortModeSelector` component (AC: 1, 6, 7)
  - [x] 4.1–4.8 — Created component with trigger button, AnimatePresence dropdown, 4 options, checkmark, Escape dismiss, reduced motion, 44px touch targets, testids.
  - [x] 4.9 — Created `SortModeSelector.test.tsx` with 6 tests (all pass).

- [x] Task 5 — Integrate `SortModeSelector` into `App.tsx` (AC: 1, 4, 5, 6, 7, 8)
  - [x] 5.1 — Imported `SortMode` and `SortModeSelector`.
  - [x] 5.2 — Derived `currentSortMode` from `repoSortModes` store selector.
  - [x] 5.3 — Passed `sortMode: currentSortMode` to `sortTasksForDisplay`.
  - [x] 5.4 — Placed `SortModeSelector` in toolbar row trailing edge alongside `PriorityFilterPills`.
  - [x] 5.5 — Drag & drop gated: manual → Reorder.Group/DraggableTaskCard; non-manual → plain ul/TaskCard.
  - [x] 5.6 — reorderTasks not called when non-manual (drag handles not accessible).
  - [x] 5.7 — Filter applies before sort; both compose correctly.

- [x] Task 6 — Store unit tests (AC: 4)
  - [x] 6.1 — Added 4 tests to `useSyncStore.test.ts` for `setRepoSortMode` (all pass).

## Dev Notes

### Architecture Patterns

- **Zustand boundary:** All state mutations go through `useSyncStore` actions. The `currentSortMode` derivation in `App.tsx` uses a selector — do not call `set()` directly from the component.
- **`normalizeRepoKey`:** The store's existing helper lowercases repo names before using them as keys (see line 30 of `useSyncStore.ts`). Use the same key when writing (`setRepoSortMode`) and reading (`repoSortModes[selectedRepo.fullName.toLowerCase()]`).
- **Backward compat for `sortTasksForDisplay`:** The function is called in at least `App.tsx`. Adding `sortMode` as an optional property of `SortOptions` (defaulting to `'manual'` inside the function) means no other callers break.
- **Framer Motion Reorder constraint:** `Reorder.Group` manages its own internal drag state. When sort mode is non-manual, do NOT wrap the list in `Reorder.Group` — render a standard list instead. Mixing Reorder with a fixed sort order causes visual glitches.
- **`useReducedMotion()`:** Import from `framer-motion`. Check in `SortModeSelector` and skip all motion when true (render the dropdown immediately without spring animation).
- **Touch targets:** All interactive elements (trigger button, option rows) must have `min-width: 44px; min-height: 44px` per Epic 8 architecture constraint.

### Project Structure Notes

- New file follows existing naming convention: PascalCase component at `src/features/capture/components/SortModeSelector.tsx`, co-located test at `src/features/capture/components/SortModeSelector.test.tsx`.
- `SortMode` type belongs in `src/types/task.ts` alongside the existing `PriorityFilter` and `SyncStatus` types — same pattern, same file.
- `repoSortModes` is parallel to `repoSyncMeta` in `SyncState` but must NOT be mixed into `repoSyncMeta` (which is sync infrastructure). Keep them as separate top-level keys.
- `task-sorting.ts` has no test file yet (`src/utils/task-sorting.test.ts` does not currently exist). Create it in this story.

### References

- Story 8.5 definition: [Source: `_bmad-output/planning-artifacts/epic-8-planning.md#Story 8.5`]
- `SortOptions` interface and `sortTasksForDisplay` signature: [Source: `src/utils/task-sorting.ts` lines 9-27]
- `SyncState` interface and `partialize`: [Source: `src/stores/useSyncStore.ts` lines 40-74, 611-619]
- `normalizeRepoKey` helper: [Source: `src/stores/useSyncStore.ts` line 30]
- `PriorityFilter` type (pattern for `SortMode`): [Source: `src/types/task.ts` line 8]
- `PriorityFilterPills` component (pattern for `SortModeSelector` styling): [Source: `src/features/capture/components/PriorityFilterPills.tsx`]
- `TRANSITION_SPRING` motion config: [Source: `src/config/motion` — referenced in `PriorityFilterPills.tsx` line 2]
- Architecture constraints (Zustand boundary, IDB write-through, touch targets, motion): [Source: `_bmad-output/planning-artifacts/epic-8-planning.md#Architecture Constraints`]
- Current App.tsx state variables: [Source: `_bmad-output/planning-artifacts/epic-8-planning.md#Current App.tsx State Variables`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
