# Story 3.6: Priority Filter

Status: ready-for-dev

## Story

As a User,
I want to filter my captured task list by priority (All / Important / Not Important),
so that I can focus on high-priority sparks without scrolling through everything.

## Acceptance Criteria

1. **Given** I am on the capture screen, **When** the task list renders, **Then** a filter control is visible near the search bar with three states: `All` (default), `Important`, `Not Important`.

2. **Given** the filter is set to `All`, **When** the task list renders, **Then** all tasks are shown regardless of their `isImportant` value.

3. **Given** I select `Important`, **When** the filter is active, **Then** only tasks with `isImportant: true` are shown in the list.

4. **Given** I select `Not Important`, **When** the filter is active, **Then** only tasks with `isImportant: false` are shown in the list.

5. **Given** the priority filter is active AND the search bar has a query (Story 3.5), **When** both filters are in effect, **Then** the task list shows only tasks that satisfy BOTH conditions (priority filter AND fuzzy search).

6. **Given** I switch filter states, **When** the transition occurs, **Then** the list update is immediate (no loading state) and the active filter pill is visually distinct (filled/active Primer pill).

7. **Given** the filtered list is empty (no important tasks exist, for example), **When** the filter returns zero results, **Then** an inline empty state is shown: `"No {{filterLabel}} tasks"` — consistent with the search empty state pattern from Story 3.5.

## Tasks / Subtasks

- [ ] Build `PriorityFilterPills` component (AC: #1, #2, #3, #4, #6)
  - [ ] Create `src/features/capture/components/PriorityFilterPills.tsx`
  - [ ] Three pill options: `All` | `Important` | `Not Important`
  - [ ] Active pill: filled Primer `Label` with `#58a6ff` accent; inactive: ghost/outline style
  - [ ] `onChange: (filter: PriorityFilter) => void` callback prop
  - [ ] `currentFilter: PriorityFilter` prop for controlled state
  - [ ] 44×44px min touch targets on mobile
- [ ] Add `PriorityFilter` type to shared types (AC: #1)
  - [ ] Add to `src/types/index.ts`: `export type PriorityFilter = 'all' | 'important' | 'not-important'`
- [ ] Integrate filter state into capture screen (AC: #2, #3, #4, #5, #7)
  - [ ] Add local `priorityFilter` state (`useState<PriorityFilter>('all')`) in the capture screen parent — same level as `searchQuery` from Story 3.5
  - [ ] Apply priority filter to task list AFTER fuzzy search filter: `filteredTasks → priorityFilteredTasks`
  - [ ] Filter logic: `all` → pass through; `important` → `task.isImportant === true`; `not-important` → `task.isImportant === false`
  - [ ] Empty state: `"No important tasks"` / `"No non-important tasks"` as appropriate
- [ ] Position filter pills in the UI (AC: #1)
  - [ ] Place `PriorityFilterPills` directly below `TaskSearchBar` (Story 3.5), above the task list
  - [ ] Use a horizontal scroll container if pills overflow on small screens (320px breakpoint)
- [ ] Write unit tests (see Testing Requirements)

## Dev Notes

### Architecture Placement

- **Component:** `src/features/capture/components/PriorityFilterPills.tsx` — co-located with `TaskSearchBar.tsx` in the capture feature.
- **State:** Local `useState<PriorityFilter>('all')` in the capture screen parent. Filter state is ephemeral UI state — no Zustand, no LocalStorage.
- **Filtering pipeline:** The capture screen applies filters in sequence:
  1. Start with `useSyncStore` task array (source of truth)
  2. Apply fuzzy search filter (Story 3.5) → `searchFilteredTasks`
  3. Apply priority filter (this story) → `displayedTasks`
  4. Pass `displayedTasks` to the task list renderer

```ts
// Filtering pipeline in CaptureScreen (or equivalent parent)
const allTasks = useSyncStore(state => state.tasks);

const searchFilteredTasks = useMemo(() =>
  searchQuery.length >= 2
    ? createTaskFuse(allTasks).search(searchQuery).map(r => r.item)
    : allTasks,
  [allTasks, searchQuery]
);

const displayedTasks = useMemo(() => {
  if (priorityFilter === 'all') return searchFilteredTasks;
  if (priorityFilter === 'important') return searchFilteredTasks.filter(t => t.isImportant);
  return searchFilteredTasks.filter(t => !t.isImportant);
}, [searchFilteredTasks, priorityFilter]);
```

### Data Model Dependency

This story depends on the `isImportant: boolean` field established in Story 3.3 (Priority Toggles). No data model changes required.

### Visual Design

- **Pills layout:** Horizontal row, left-aligned, 8px gap between pills.
- **Active state:** Filled Primer `Label` — `background: #58a6ff`, `color: #0d1117` (inverted for contrast).
- **Inactive state:** Ghost `Label` — `border: 1px solid #30363d`, `color: #8b949e`.
- **Icon option:** Consider prepending `octicon-star` to the `Important` pill for visual clarity — but keep it optional/low-priority.
- **Horizontal scroll:** On 320px screens where pills overflow, wrap in `overflow-x: auto` with `-webkit-overflow-scrolling: touch`. Do NOT wrap pills to a second line.

### Composition with Story 3.5

Both `searchQuery` and `priorityFilter` are local state in the same parent. They compose through the `useMemo` pipeline above — no special integration work needed beyond sequencing the two filter operations correctly.

### Project Structure Notes

- No new service, store, or utility required — this is pure UI state and in-memory filtering.
- `PriorityFilter` type is small enough to inline in `src/types/index.ts` alongside `Task`.
- Alignment: all files continue the `src/features/capture/` feature-based pattern.

### References

- [Source: architecture.md#State Management Patterns] — ephemeral UI state stays local, not in Zustand
- [Source: architecture.md#Naming Patterns] — PascalCase components, camelCase types
- [Source: ux-design-specification.md#Feedback Patterns] — Primer `Label` pill component for status/filter states
- [Source: ux-design-specification.md#Accessibility Strategy] — 44×44px touch targets, WCAG AA contrast
- [Source: epics.md#Story 3.3] — `isImportant` flag on Task data model (dependency)
- [Source: implementation-artifacts/3-5-fuzzy-task-search.md] — filtering pipeline and `createTaskFuse` utility (upstream dependency)

## Testing Requirements

- **Unit:** `PriorityFilterPills.test.tsx`
  - Test: renders three pills — All, Important, Not Important
  - Test: `All` pill is active by default
  - Test: clicking a pill calls `onChange` with the correct filter value
  - Test: active pill has distinct styling from inactive pills
- **Unit:** Filtering pipeline logic (inline in `CaptureScreen.test.tsx` or extracted to `src/features/capture/utils/filter-tasks.test.ts`)
  - Test: `priorityFilter = 'all'` returns all tasks
  - Test: `priorityFilter = 'important'` returns only `isImportant: true` tasks
  - Test: `priorityFilter = 'not-important'` returns only `isImportant: false` tasks
  - Test: combined with search query — only tasks matching both conditions are returned
  - Test: empty result renders correct empty state message
- No E2E required for this story.

## Dev Agent Record

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

### Completion Notes List

### File List
