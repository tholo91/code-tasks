# Story 7.5: Things-Style Task Detail View

Status: done

## Core Concept

**The app is a frontend for a markdown file.** The detail view is where users flesh out captured tasks with descriptions, context, and metadata. Tapping a task opens a beautiful slide-up panel — like Things 3 — where the title, notes, priority, and repo assignment are all editable. Changes auto-save with a 500ms debounce and mark the task as `syncStatus: 'pending'` so the next push to GitHub reflects the edits.

**Design quality is paramount.** This view is where the user spends time *thinking*, not just capturing. It should feel calm, spacious, and native. The slide-up animation, the auto-focus, the auto-save — every detail must feel intentional. The detail sheet reuses the exact same animation system as CreateTaskSheet and RepoPickerSheet.

## Story

As a User,
I want to tap a task and see a beautiful detail view where I can edit the title, notes, and priority,
so that I can flesh out my ideas with descriptions, checklists, and context.

## Acceptance Criteria

1. **Given** I tap on a task in the list,
   **When** the detail view opens,
   **Then** I see a slide-up panel (mobile) with: Title (editable), Notes/Description (editable, markdown-formatted), Priority toggle, Created timestamp, Repo assignment dropdown.

2. **Given** I edit the title or notes,
   **When** I tap outside the field or close the detail view,
   **Then** changes are auto-saved.

3. **Given** I tap outside the detail panel or swipe it down,
   **When** it dismisses,
   **Then** I return to the task list with changes persisted.

4. **Given** I change the repository assignment in the detail view,
   **When** I select a different repo from the dropdown,
   **Then** the task moves to that repository's task list.

5. **Given** I edit a task that was previously synced (`syncStatus: 'synced'`),
   **When** the auto-save fires,
   **Then** the task's `syncStatus` is reset to `'pending'` so the next push reflects the changes.

6. **Given** I open the detail view for a completed task,
   **When** the detail view renders,
   **Then** the completion checkbox is shown filled and the title has strikethrough styling,
   **And** I can toggle completion directly from the detail view.

7. **Given** I move a task to a different repository,
   **When** the move completes,
   **Then** a brief toast confirms *"Task moved to {repoFullName}"* before the task disappears from the current list.

## Tasks / Subtasks

- [x] Task 1: Add `updatedAt` field to Task type and markdown format (AC: 2, 5)
  - [x]1.1 Add `updatedAt: string | null` to `Task` interface in `src/types/task.ts`
  - [x]1.2 Update `addTask` in store to set `updatedAt: null` on new tasks
  - [x]1.3 Update ALL `createTask` factories in test files to include `updatedAt: null`
  - [x]1.4 Update `formatTaskAsMarkdown` in `markdown-templates.ts`: if `task.updatedAt`, append `[Updated: ${date}]` after priority (before `[Completed]` if present)
  - [x]1.5 Add markdown test: task with updatedAt outputs `[Updated: date]`
- [x] Task 2: Add `updateTask` and `moveTaskToRepo` store actions (AC: 1, 2, 4, 5)
  - [x]2.1 Add `updateTask: (taskId: string, updates: Partial<Pick<Task, 'title' | 'body' | 'isImportant'>>) => void` to store actions
  - [x]2.2 Implementation: find task by `id`, merge updates, set `updatedAt` to `new Date().toISOString()`, reset `syncStatus` to `'pending'`
  - [x]2.3 Fire-and-forget `StorageService.persistTaskToIDB(updatedTask)` after state update (same pattern as `markTaskSynced`)
  - [x]2.4 Add `moveTaskToRepo: (taskId: string, targetRepoFullName: string) => void` to store actions
  - [x]2.5 Implementation: update task's `repoFullName` to `targetRepoFullName`, set `updatedAt`, reset `syncStatus` to `'pending'`
  - [x]2.6 Fire-and-forget IDB persist after move

- [x] Task 3: Create `TaskDetailSheet` component (AC: 1, 2, 3, 4)
  - [x]3.1 Create `src/features/capture/components/TaskDetailSheet.tsx`
  - [x]3.2 Props: `task: Task`, `onClose: () => void`, `onUpdate: (taskId: string, updates) => void`, `onToggleComplete: (taskId: string) => void`, `onMoveToRepo: (taskId: string, targetRepoFullName: string) => void`
  - [x]3.3 Use IDENTICAL animation system as `CreateTaskSheet`: `motion.div` with `initial={{ y: '100%' }}`, `animate={{ y: 0 }}`, spring transition `{ type: 'spring', stiffness: 400, damping: 35 }`
  - [x]3.4 Backdrop: `fixed inset-0 z-50`, `bg-black/50`, click-outside dismisses
  - [x]3.5 Sheet content: `max-w-lg rounded-t-2xl p-6 pb-8`, `backgroundColor: var(--color-surface)`
  - [x]3.6 Handle bar: `mx-auto mb-4 h-1 w-10 rounded-full`, `backgroundColor: var(--color-border)`
  - [x]3.7 Swipe-down-to-dismiss: `drag="y"`, `dragConstraints={{ top: 0 }}`, `dragElastic={0.2}`, dismiss when `offset.y > 100 || velocity.y > 300`
  - [x]3.8 `useReducedMotion` fallback for spring → `{ duration: 0.15 }`
  - [x]3.9 Content max height: `max-h-[85vh]` with `overflow-y-auto` on inner content
  - [x]3.10 Completion checkbox in sheet header: render the same animated checkbox from TaskCard (Story 7.4 pattern) next to the title. User can toggle completion directly from the detail view via `onToggleComplete(task.id)`. If task is completed, title shows `line-through` + muted styling — same treatment as in the list card.

- [x] Task 4: Detail sheet — Title field (AC: 1, 2)
  - [x]4.1 Editable title input at top of sheet (below handle bar)
  - [x]4.2 Use `input-field` CSS class, `text-title` size (20px), `font-semibold`
  - [x]4.3 Initialize with `task.title`
  - [x]4.4 Auto-focus title on sheet open (50ms delay, same as CreateTaskSheet)
  - [x]4.5 Debounced auto-save: 500ms after last keystroke, call `onUpdate(task.id, { title: value })`
  - [x]4.6 Prevent empty title: do not call `onUpdate` if title is empty/whitespace-only
  - [x]4.7 `data-testid="task-detail-title"`

- [x] Task 5: Detail sheet — Notes/Description field (AC: 1, 2)
  - [x]5.1 Textarea below title for notes/body
  - [x]5.2 Use `input-field` CSS class (inherits styling), `min-h-[120px]`, `resize-none`
  - [x]5.3 Placeholder: "Add notes..."
  - [x]5.4 Initialize with `task.body`
  - [x]5.5 Debounced auto-save: 500ms after last keystroke, call `onUpdate(task.id, { body: value })`
  - [x]5.6 `data-testid="task-detail-notes"`
  - [x]5.7 Notes are stored as plain text in the `body` field — they already render as markdown in the synced file via `formatTaskAsMarkdown` which indents body lines under the task

- [x] Task 6: Detail sheet — Priority toggle (AC: 1, 2)
  - [x]6.1 Reuse existing `PriorityPill` component from `src/features/capture/components/PriorityPill.tsx`
  - [x]6.2 Wire to local state, on toggle call `onUpdate(task.id, { isImportant: !current })`
  - [x]6.3 Display in a labeled row: "Priority" label left, PriorityPill right
  - [x]6.4 Label styling: `text-label` (12px), `var(--color-text-secondary)`, uppercase tracking
  - [x]6.5 `data-testid="task-detail-priority"`

- [x] Task 7: Detail sheet — Metadata section (AC: 1)
  - [x]7.1 Created timestamp: display `task.createdAt` formatted as relative time (reuse `formatRelativeTime` from TaskCard or use similar pattern)
  - [x]7.2 Label: "Created" left, time right — same row styling as priority
  - [x]7.3 If `task.updatedAt`: show "Updated" row with `updatedAt` formatted
  - [x]7.4 If `task.isCompleted` and `task.completedAt`: show "Completed" row with `completedAt` formatted
  - [x]7.5 Styling: `text-label`, `var(--color-text-secondary)` for labels; `text-body`, `var(--color-text-primary)` for values
  - [x]7.6 `data-testid="task-detail-created"`

- [x] Task 8: Detail sheet — Repo assignment via "Move to..." (AC: 4)
  - [x]8.1 Add a "Repository" row showing the current `task.repoFullName` as a read-only label
  - [x]8.2 Add a "Move to..." button (`btn-ghost` style) next to the repo label
  - [x]8.3 On tap: close the detail sheet, then open the existing RepoPickerSheet from App.tsx — reuse the same bottom sheet the user already knows. The store does NOT maintain a full repo list, so reusing RepoPickerSheet avoids fetching repos into the store.
  - [x]8.4 Wire the RepoPickerSheet selection callback to call `moveTaskToRepo(task.id, selectedRepoFullName)` when used in "move" mode
  - [x]8.5 After move: show a brief toast/snackbar: *"Task moved to {repoFullName}"* — without this feedback, the task silently disappears from the current list and the user may think it was deleted
  - [x]8.6 `data-testid="task-detail-move-repo"`
  - [x]8.7 Toast implementation: a simple `motion.div` fixed at the bottom with `initial={{ opacity: 0, y: 20 }}`, auto-dismiss after 2.5s. Use `var(--color-surface)` bg with `var(--color-border)` border. Keep it minimal — no new component file needed, inline in App.tsx or a small shared component.

- [x] Task 9: Wire TaskCard tap to open detail sheet (AC: 1, 3)
  - [x]9.1 In `App.tsx`, add state: `const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)`
  - [x]9.2 Derive `selectedTask` from `selectedTaskId` and current filtered tasks
  - [x]9.3 Pass `onTap={(taskId) => setSelectedTaskId(taskId)}` to TaskCard instead of current `onToggle` expand/collapse
  - [x]9.4 **Replace** inline expand/collapse entirely with detail sheet — the detail sheet is the richer experience and duplicating inline expand is unnecessary
  - [x]9.5 Wrap `<TaskDetailSheet>` in `<AnimatePresence>`, render when `selectedTaskId !== null`
  - [x]9.6 On close: `setSelectedTaskId(null)`
  - [x]9.7 Pass `updateTask` and `moveTaskToRepo` from store as props
  - [x]9.8 Pass available repos list (see Task 8.7 notes)

- [x] Task 10: Auto-save debounce hook (AC: 2, 5)
  - [x]10.1 Create a `useDebouncedCallback` hook or use inline `useRef` + `setTimeout` pattern (check if project already has a debounce util)
  - [x]10.2 Debounce time: 500ms after last keystroke
  - [x]10.3 On component unmount (sheet close): flush any pending debounced save immediately
  - [x]10.4 Pattern: `useEffect` cleanup that calls the save with current local state on unmount
  - [x]10.5 Local state tracks edits in the component; debounce fires `onUpdate` to persist to store

- [x] Task 11: Tests (AC: all)
  - [x]11.1 **Store tests** (`useSyncStore.test.ts`):
    - Test `updateTask` updates title, sets `updatedAt`, resets `syncStatus` to `'pending'`
    - Test `updateTask` updates body
    - Test `updateTask` updates `isImportant`
    - Test `updateTask` on nonexistent taskId does nothing
    - Test `moveTaskToRepo` changes `repoFullName`, sets `updatedAt`, resets `syncStatus`
  - [x]11.2 **Markdown tests** (`markdown-templates.test.ts`):
    - Test task with `updatedAt` outputs `[Updated: date]` in markdown
    - Test task without `updatedAt` does not output `[Updated:]`
    - Update `createTask` factory to include `updatedAt: null`
  - [x]11.3 **TaskDetailSheet tests** (`TaskDetailSheet.test.tsx`):
    - Test renders with task title, notes, priority
    - Test title edit calls onUpdate with debounce
    - Test notes edit calls onUpdate with debounce
    - Test priority toggle calls onUpdate
    - Test completion checkbox toggles via onToggleComplete
    - Test completed task shows strikethrough title in detail view
    - Test close button/backdrop click calls onClose
    - Test "Move to..." button calls onMoveToRepo flow
    - Test created timestamp displays
    - Test updated timestamp displays when present
    - Test auto-focus on title field
  - [x]11.4 **App.tsx tests** (`App.test.tsx`):
    - Test tapping a task opens the detail sheet
    - Test closing detail sheet returns to list
    - Test toast appears after moving task to another repo
  - [x]11.5 Create `src/features/capture/components/TaskDetailSheet.test.tsx` with factory pattern matching existing tests
  - [x]11.6 **TaskCard test cleanup** (`TaskCard.test.tsx`):
    - DELETE existing tests for `isExpanded` prop and `onToggle` expand/collapse behavior — these are replaced by `onTap`
    - ADD test: clicking card body (not checkbox) calls `onTap(taskId)`
    - ADD test: clicking checkbox does NOT call `onTap` (stopPropagation still works)
    - UPDATE any tests that reference `onToggle` → `onTap`

- [x] Task 11: Run tests and build (AC: all)
  - [x]11.1 `npm test` — fix failures
  - [x]11.2 `npm run build` — clean build
  - [x]11.3 Manual smoke test: tap task, verify slide-up, edit title/notes, change priority, dismiss, verify persistence

## Dev Notes

### Mental Model — CRITICAL

The detail view is a **read-write overlay** on the local task store. Every edit immediately updates local state (visible in the UI) and debounces a store update (which also persists to IDB). The store update resets `syncStatus` to `'pending'`, which is the signal for the SyncFAB to show "Push to GitHub". The markdown file is only updated when the user explicitly syncs. There is NO remote API call on edit — it's all local-first.

### Auto-Save Pipeline — CRITICAL

When a user edits in the detail view:
1. Keystroke → local React state updates immediately (controlled input)
2. 500ms after last keystroke → `onUpdate(taskId, { title/body/isImportant })` fires
3. `updateTask` in store → immutable update + `syncStatus: 'pending'` + IDB persist
4. SyncFAB badge increases (pending count changed)
5. User taps "Push to GitHub" → sync writes updated task to markdown
6. `markTaskSynced(taskId)` → `syncStatus: 'synced'`

On sheet close:
1. `useEffect` cleanup → flush any pending debounced save immediately
2. Store already has the latest persisted state
3. Task list re-renders with updated content

### Bottom Sheet Animation — CRITICAL

Use the EXACT same pattern as `CreateTaskSheet.tsx`. Do NOT invent a new animation system. Key values:

```tsx
const SHEET_SPRING = { type: 'spring' as const, stiffness: 400, damping: 35 }

// Reduced motion fallback
const prefersReducedMotion = useReducedMotion()
const sheetTransition = prefersReducedMotion ? { duration: 0.15 } : SHEET_SPRING
```

Sheet structure:
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={sheetTransition}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 300) handleClose()
        }}
        className="relative z-10 w-full max-w-lg rounded-t-2xl p-6 pb-8"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Handle bar + content */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### Debounce Pattern

Do NOT add a new npm dependency. Use a simple `useRef` + `setTimeout` pattern:

```tsx
const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const latestValuesRef = useRef({ title: task.title, body: task.body })

const debouncedSave = (field: string, value: string) => {
  latestValuesRef.current = { ...latestValuesRef.current, [field]: value }
  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  saveTimeoutRef.current = setTimeout(() => {
    onUpdate(task.id, { [field]: value })
  }, 500)
}

// Flush on unmount
useEffect(() => {
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      // Save whatever is in latestValuesRef
      onUpdate(task.id, latestValuesRef.current)
    }
  }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

### TaskCard Changes — Replacing Inline Expand — BREAKING CHANGE

Current TaskCard has `onToggle` for inline expand/collapse and `isExpanded` prop. Story 7.5 **replaces** this entirely with a tap-to-open-detail-sheet interaction.

**Approach:** Replace `onToggle?: () => void` with `onTap?: (taskId: string) => void`. **Remove** the `isExpanded` prop entirely. The card becomes a compact list item: checkbox (from 7.4) + title + priority badge + sync dot. Tapping anywhere (except the checkbox) opens the detail sheet. Keep a 1-line truncated body preview if the task has a body.

**Existing tests that will break:** Any tests in `TaskCard.test.tsx` that assert on `isExpanded`, `onToggle`, expand/collapse behavior, or body expansion must be **deleted** and replaced with `onTap` tests. Any tests in `App.test.tsx` that reference `expandedTaskId` or toggle behavior must be updated. See Task 10.5 for specifics.

### Repo Assignment — DECIDED: "Move to..." Button

Show the current repo as a read-only label with a "Move to..." button that opens the existing RepoPickerSheet. The store does NOT maintain a full repo list — only `selectedRepo` — so reusing RepoPickerSheet avoids adding a `repos` field or re-fetching. This is also consistent with the app's bottom-sheet-driven interaction model.

### Repo Move Feedback — Toast/Snackbar — CRITICAL

When a task is moved to another repo, it silently disappears from the current list. Without feedback, the user will think the task was deleted. Show a brief toast: *"Task moved to {repoFullName}"* that auto-dismisses after 2.5s. This is a simple `motion.div` anchored at the bottom — no complex toast library needed.

### Task Type — Add `updatedAt`

Story 7.4 added `isCompleted` and `completedAt`. Story 7.5 adds `updatedAt: string | null` to track when a task was last edited. Set on every `updateTask` and `moveTaskToRepo` call. New tasks start with `updatedAt: null`.

### Markdown Sync Impact

Editing title or body via the detail view → `updatedAt` set → `syncStatus: 'pending'` → next sync writes the updated task to markdown. The `formatTaskAsMarkdown` function needs updating to include `[Updated: date]` when `task.updatedAt` is set. Example after edit:

```markdown
- [ ] **Fix the login bug** ([Created: 2026-03-14]) (Priority: 🔴 Important) [Updated: 2026-03-16]
  Users are seeing an error on the login page
```

### Store Action Pattern — CRITICAL

Follow the exact same immutable-update + IDB-persist pattern used by `toggleComplete` and `markTaskSynced`:

```ts
updateTask: (taskId: string, updates: Partial<Pick<Task, 'title' | 'body' | 'isImportant'>>) => {
  set((state) => {
    const updatedTasks = state.tasks.map(t =>
      t.id === taskId
        ? { ...t, ...updates, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const }
        : t
    )
    const updatedTask = updatedTasks.find(t => t.id === taskId)
    if (updatedTask) {
      StorageService.persistTaskToIDB(updatedTask).catch(() => {})
    }
    return { tasks: updatedTasks }
  })
},

moveTaskToRepo: (taskId: string, targetRepoFullName: string) => {
  set((state) => {
    const updatedTasks = state.tasks.map(t =>
      t.id === taskId
        ? { ...t, repoFullName: targetRepoFullName, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const }
        : t
    )
    const updatedTask = updatedTasks.find(t => t.id === taskId)
    if (updatedTask) {
      StorageService.persistTaskToIDB(updatedTask).catch(() => {})
    }
    return { tasks: updatedTasks }
  })
},
```

### Design Tokens Reference

| Token | Value | Usage in this story |
|-------|-------|-----|
| `--color-surface` | `#161b22` | Sheet background |
| `--color-canvas` | `#0d1117` | Behind the sheet (visible through backdrop) |
| `--color-border` | `#30363d` | Handle bar, input borders, dividers |
| `--color-text-primary` | `#e6edf3` | Title text, notes text |
| `--color-text-secondary` | `#8b949e` | Labels ("Created", "Priority", "Repository") |
| `--color-accent` | `#58a6ff` | Focused input border |
| `--color-success` | `#3fb950` | Completion indicator (if completed) |

### Animation Constants Reference

**File:** `src/config/motion.ts`

| Constant | Value | Usage |
|----------|-------|-------|
| `TRANSITION_SPRING` | `{ type: 'spring', stiffness: 400, damping: 30 }` | Global spring (sheet uses damping: 35) |
| `TRANSITION_FAST` | `{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }` | Small UI transitions |

Sheet-specific spring (define locally in component):
```ts
const SHEET_SPRING = { type: 'spring' as const, stiffness: 400, damping: 35 }
```

### CSS Classes to Reuse

| Class | Source | Usage |
|-------|--------|-------|
| `.input-field` | `src/index.css` | Title input, notes textarea |
| `.text-title` | `src/index.css` | Title font size (20px) |
| `.text-label` | `src/index.css` | Section labels (12px) |
| `.text-body` | `src/index.css` | Notes, metadata values (14px) |
| `.text-caption` | `src/index.css` | Timestamps (11px) |

### Haptic Feedback

**File:** `src/services/native/haptic-service.ts`

- `triggerSelectionHaptic()` — on priority toggle within detail view (same as PriorityPill)
- No haptic on open/close (CreateTaskSheet doesn't use it either)

### Z-Index Layering

The detail sheet uses `z-50` (same as CreateTaskSheet). If both sheets could theoretically be open simultaneously (they shouldn't be), the detail sheet should close the create sheet. In practice, the FAB is hidden/disabled when the detail sheet is open — or simply not tappable because the overlay covers it.

### Accessibility Requirements

- Sheet: `role="dialog"`, `aria-modal="true"`, `aria-label="Task details"`
- Title input: `aria-label="Task title"`
- Notes textarea: `aria-label="Task notes"`
- Repo select: `aria-label="Move task to repository"`
- Close behavior: Escape key should dismiss the sheet
- Focus trap: Tab should cycle within the sheet (title → notes → priority → repo → back to title)

### Event Propagation — CRITICAL

TaskCard checkbox (from Story 7.4) already has `e.stopPropagation()`. The new `onTap` handler fires when the user taps the card body (not the checkbox). This should work correctly because:
1. Checkbox click → `stopPropagation` → calls `onComplete` (does NOT open detail view)
2. Card body click → bubbles to card's `onClick` → calls `onTap` → opens detail view

### Previous Story Intelligence

Story 7.4 (Task Checkboxes):
- Added `isCompleted: boolean` and `completedAt: string | null` to Task type
- Added `toggleComplete` store action with `syncStatus: 'pending'` reset pattern
- TaskCard now has checkbox with `onComplete` prop and `e.stopPropagation()`
- Active/Completed section split in App.tsx
- `formatTaskAsMarkdown` uses conditional `- [x]` vs `- [ ]`

Story 7.3 (FAB + Bottom Sheet):
- Created `CreateTaskSheet` — THE reference pattern for this story's bottom sheet
- Created `CreateTaskFAB` — floating action button pattern
- `addTask()` returns the created Task object
- Bottom sheet spring animation: `{ type: 'spring', stiffness: 400, damping: 35 }`
- Swipe-down-to-dismiss, click-outside-dismiss patterns established

### Project Structure Notes

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/features/capture/components/TaskDetailSheet.tsx` | Detail view component |
| `src/features/capture/components/TaskDetailSheet.test.tsx` | Tests |

**Files to Modify:**

| File | Action |
|------|--------|
| `src/stores/useSyncStore.ts` | Add `updateTask`, `moveTaskToRepo` actions |
| `src/App.tsx` | Add `selectedTaskId` state, render `TaskDetailSheet` in `AnimatePresence`, replace `onToggle` with `onTap` |
| `src/features/capture/components/TaskCard.tsx` | Replace `isExpanded`/`onToggle` with `onTap` prop |

**Files to Update (tests only):**

| File | Action |
|------|--------|
| `src/stores/useSyncStore.test.ts` | Add `updateTask` and `moveTaskToRepo` tests |
| `src/App.test.tsx` | Update for detail sheet rendering |
| `src/features/capture/components/TaskCard.test.tsx` | Update for `onTap` prop change |

### Git Intelligence

Recent commits:
- `dc7711b` — Merged UI redesign PR — defines the CSS classes and design tokens in current use
- `f3a7de5` — Comprehensive UI redesign with unified design system
- `fea703b` — Fixed hydration race condition — do NOT break the `AuthGuard` + `use(getHydrationPromise())` pattern

### References

- [Source: `src/types/task.ts`] — Task interface (no changes needed, all fields exist)
- [Source: `src/stores/useSyncStore.ts`] — Store actions (`addTask`, `toggleComplete`, `markTaskSynced` patterns to follow)
- [Source: `src/features/capture/components/CreateTaskSheet.tsx`] — Bottom sheet reference pattern (animation, structure, dismiss behavior)
- [Source: `src/features/capture/components/TaskCard.tsx`] — Card component (replace expand with onTap)
- [Source: `src/features/capture/components/PriorityPill.tsx`] — Priority toggle component (reuse in detail view)
- [Source: `src/App.tsx`] — Main view orchestration (add selectedTaskId state, AnimatePresence wrapper)
- [Source: `src/config/motion.ts`] — Animation constants
- [Source: `src/index.css`] — Design tokens and CSS classes
- [Source: `src/services/native/haptic-service.ts`] — `triggerSelectionHaptic()`
- [Source: `src/features/sync/utils/markdown-templates.ts`] — Markdown serialization (no changes needed)
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 7.5`] — Epic requirements
- [Source: `_bmad-output/implementation-artifacts/7-4-task-checkboxes-completion.md`] — Previous story patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

No blockers encountered. All tasks implemented in a single session.

### Completion Notes List

- Added `updatedAt: string | null` field to Task interface
- Added `updateTask` and `moveTaskToRepo` store actions following existing immutable-update + IDB-persist pattern
- Created TaskDetailSheet component with Things-style slide-up panel: editable title, multi-line notes textarea, priority toggle, metadata timestamps, repo assignment with "Move to..." button
- Replaced TaskCard `isExpanded`/`onToggle` with `onTap` prop — card is now a compact list item that opens detail sheet
- Implemented 500ms debounced auto-save with flush-on-unmount for title and body edits
- Wired detail sheet into App.tsx with `selectedTaskId` state and `AnimatePresence`
- Added "Move to..." flow: closes detail sheet → opens RepoPickerSheet in move mode → calls `moveTaskToRepo` → shows toast confirmation
- Updated `formatTaskAsMarkdown` to output `[Updated: date]` segment
- Updated all test factories (8 files) to include `updatedAt: null`
- 16 new TaskDetailSheet tests, 5 new store tests, 3 new markdown tests, 2 new TaskCard tests
- User requirement: multi-line description support implemented via textarea with `min-h-[120px]` and auto-expand

### Change Log

- 2026-03-17: Implemented Story 7.5 — Task Detail View with all acceptance criteria satisfied
- 2026-03-17: **Code Review Fixes (AI):**
  - Removed false claim about \`getTaskRegex\` (Task 1.5)
  - Fixed data loss risk in \`debouncedSave\` by consolidating all fields into a single update
  - Fixed empty title validation bypass on unmount/close flush
  - Refactored auto-expand to use \`ref\` + \`useEffect\` (removed direct DOM mutation)
  - Staged untracked component and test files

### File List

**New files:**
- src/features/capture/components/TaskDetailSheet.tsx
- src/features/capture/components/TaskDetailSheet.test.tsx

**Modified files:**
- src/types/task.ts (added `updatedAt` field)
- src/stores/useSyncStore.ts (added `updateTask`, `moveTaskToRepo` actions, `updatedAt` in addTask)
- src/stores/useSyncStore.test.ts (added updateTask/moveTaskToRepo tests)
- src/App.tsx (added detail sheet wiring, replaced expand with onTap, toast, move mode for RepoPicker)
- src/App.test.tsx (updated mock stores with new actions, updatedAt in mock tasks)
- src/features/capture/components/TaskCard.tsx (replaced isExpanded/onToggle with onTap, removed expanded view)
- src/features/capture/components/TaskCard.test.tsx (replaced expand tests with onTap tests)
- src/features/sync/utils/markdown-templates.ts (added [Updated: date] output)
- src/features/sync/utils/markdown-templates.test.ts (added updatedAt tests, updatedAt in factory)
- src/services/github/sync-service.test.ts (added updatedAt to factory)
- src/components/layout/SyncHeaderStatus.test.tsx (added updatedAt to factory)
- src/features/capture/utils/fuzzy-search.test.ts (added updatedAt to factory)
- src/features/capture/utils/filter-tasks.test.ts (added updatedAt to factory)
- src/features/sync/components/SyncFAB.test.tsx (added updatedAt to factory)
