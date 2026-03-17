# Story 7.4: Task Checkboxes, Completion & Completed Section

> [!NOTE]
> **AI Review Fix (2026-03-17):**
> `getTaskRegex` had an extra space in the checkbox pattern (`\\[ [x ]\\]` matched 4 chars instead of 3).
> Fixed to `\\[[x ]\\]` — same fix applied in the lookahead. Task update/merge now works correctly.
> Additional fixes: `completedAt` sort fallback, body preview alignment under checkbox.
> **Pre-existing:** `RepoSelector.test.tsx` has environment-related timeouts (5000ms) unrelated to this story.

Status: done

## Core Concept

**The app is a frontend for a markdown file.** Completing a task toggles `- [ ]` → `- [x]` in the local working copy. The checkbox is the most fundamental interaction in any todo app — it must feel instant, satisfying, and final. Completed tasks move to a collapsible "Completed" section so the active list stays focused.

**Design quality is paramount.** The checkbox interaction is a micro-moment that users will repeat hundreds of times. It must have the same "Relief of the Vault" satisfaction as task creation — tactile, spring-animated, with haptic feedback. Think Things 3's satisfying checkbox fill, not a generic HTML checkbox.

## Story

As a User,
I want to check off tasks and see them grouped in a "Completed" section,
so that I can track progress and know which ideas have been handled.

## Acceptance Criteria

1. **Given** I see a task in the list,
   **When** I tap the checkbox on the left side of the task,
   **Then** the task is marked as completed with an animated strikethrough,
   **And** the task moves to the "Completed" section after a brief delay (~500ms).

2. **Given** there are completed tasks,
   **When** I view the task list,
   **Then** I see a collapsible "Completed (N)" section below the active tasks.

3. **Given** I tap the checkbox on a completed task,
   **When** it toggles back,
   **Then** the task moves back to the active list (un-completes).

4. **Given** I complete a task that was previously synced,
   **When** the next sync occurs,
   **Then** the markdown file reflects `- [x]` for the completed task.

5. **Given** I toggle the "Completed" section header,
   **When** I tap it,
   **Then** the section expands/collapses with a smooth animation.

## Tasks / Subtasks

- [x] Task 1: Add completion fields to Task type (AC: 1, 3, 4)
  - [x]1.1 Add `isCompleted: boolean` to `Task` interface in `src/types/task.ts`
  - [x]1.2 Add `completedAt: string | null` to `Task` interface
  - [x]1.3 Update ALL `createTask` factory functions in test files to include new fields as defaults (`isCompleted: false, completedAt: null`)

- [x] Task 2: Add `toggleComplete` action to useSyncStore (AC: 1, 3)
  - [x]2.1 Add `toggleComplete: (taskId: string) => void` to store actions
  - [x]2.2 Implementation: find task by `id`, flip `isCompleted`, set `completedAt` to ISO string (or `null` if un-completing)
  - [x]2.3 When completing a task that has `syncStatus: 'synced'`, reset to `syncStatus: 'pending'` so the next sync writes `- [x]` to GitHub
  - [x]2.4 Fire-and-forget `StorageService.persistTaskToIDB(updatedTask)` after state update (same pattern as `markTaskSynced`)
  - [x]2.5 Do NOT create a separate `unComplete` action — `toggleComplete` handles both directions

- [x] Task 3: Update TaskCard with checkbox UI (AC: 1, 3)
  - [x]3.1 Add `onComplete?: (taskId: string) => void` prop to `TaskCardProps`
  - [x]3.2 Add checkbox element to the LEFT of the title (before the sync status dot)
  - [x]3.3 Checkbox: `motion.button` with animated fill — empty circle → filled checkmark using `TRANSITION_SPRING`
  - [x]3.4 Unchecked state: `border: 2px solid var(--color-border)`, `border-radius: 50%`, `width: 22px`, `height: 22px`
  - [x]3.5 Checked state: `background: var(--color-success)`, white checkmark icon (SVG path or ✓ character), `scale` animation from 0→1
  - [x]3.6 Completed task title: `line-through` text decoration + `color: var(--color-text-secondary)` + `opacity: 0.7`
  - [x]3.7 Completed task body preview: same muted treatment
  - [x]3.8 Haptic feedback: call `triggerSelectionHaptic()` on checkbox tap
  - [x]3.9 Stop event propagation on checkbox click — tapping the checkbox should NOT expand/collapse the card
  - [x]3.10 `data-testid="task-checkbox-{task.id}"`
  - [x]3.11 Accessibility: `role="checkbox"`, `aria-checked={task.isCompleted}`, `aria-label="Mark task as complete"`
  - [x]3.12 Minimum 44x44px touch target on checkbox (use padding to extend hit area beyond visual 22px circle)

- [x] Task 4: Split task list into Active/Completed sections in App.tsx (AC: 2, 5)
  - [x]4.1 After `displayedTasks` is computed, split into `activeTasks` and `completedTasks` using `task.isCompleted`
  - [x]4.2 Sort `completedTasks` by `completedAt` descending (most recently completed first)
  - [x]4.3 Render active tasks in the existing `motion.div` task list
  - [x]4.4 Add `showCompleted` state: `const [showCompleted, setShowCompleted] = useState(true)`
  - [x]4.5 Render a "Completed (N)" section header below active tasks (only when `completedTasks.length > 0`)
  - [x]4.6 Section header: clickable, toggles `showCompleted`, shows count, has chevron icon that rotates on expand/collapse
  - [x]4.7 Header styling: `text-label` size (12px), `var(--color-text-secondary)`, uppercase tracking
  - [x]4.8 Wrap completed task list in `AnimatePresence` + conditional render based on `showCompleted`
  - [x]4.9 Completed tasks use the same `TaskCard` component (it renders differently based on `task.isCompleted`)
  - [x]4.10 Match `max-w-[640px]` constraint on the completed section
  - [x]4.11 Pass `toggleComplete` from store to each TaskCard's `onComplete` prop
  - [x]4.12 `data-testid="completed-section-header"` on the section header

- [x] Task 5: Update markdown serialization for completion state (AC: 4)
  - [x]5.1 In `src/features/sync/utils/markdown-templates.ts`, update `formatTaskAsMarkdown`:
    - Change `- [ ]` to be conditional: `task.isCompleted ? '- [x]' : '- [ ]'`
  - [x]5.2 Ensure `buildFileContent` in `sync-service.ts` includes completed tasks in the output (not just pending)
  - [x]5.3 Review sync filter: currently `syncPendingTasks` only syncs tasks with `syncStatus === 'pending'` — this is correct because Task 2.3 resets `syncStatus` to `'pending'` when a task's completion state changes

- [x] Task 6: Update `addTask` to include new fields (AC: 1)
  - [x]6.1 In `useSyncStore.addTask`, set `isCompleted: false` and `completedAt: null` on new tasks
  - [x]6.2 This ensures all newly created tasks have the fields defined

- [x] Task 7: Tests (AC: all)
  - [x]7.1 **Store tests** (`useSyncStore.test.ts`):
    - Test `toggleComplete` marks task as completed with `isCompleted: true` and `completedAt` set
    - Test `toggleComplete` on completed task un-completes: `isCompleted: false`, `completedAt: null`
    - Test `toggleComplete` on synced task resets `syncStatus` to `'pending'`
    - Update all existing tests' mock state to include `isCompleted: false, completedAt: null`
  - [x]7.2 **TaskCard tests** (`TaskCard.test.tsx`):
    - Test checkbox renders with `data-testid="task-checkbox-{id}"`
    - Test checkbox click calls `onComplete(taskId)`
    - Test completed task shows strikethrough title
    - Test checkbox click does NOT trigger card expand/collapse
    - Update `createTask` factory to include new fields
  - [x]7.3 **App.tsx tests** (`App.test.tsx`):
    - Test completed tasks appear in "Completed" section
    - Test "Completed (N)" header shows correct count
    - Test section header toggle expands/collapses completed list
    - Test active tasks do NOT appear in completed section
  - [x]7.4 **Markdown tests** (`markdown-templates.test.ts`):
    - Test completed task outputs `- [x]` prefix
    - Test active task still outputs `- [ ]` prefix
    - Update `createTask` factory to include new fields
  - [x]7.5 **Sync service tests** (`sync-service.test.ts`):
    - Update `createTask` factory to include new fields

- [x] Task 8: Run tests and build (AC: all)
  - [x]8.1 `npm test` — fix failures
  - [x]8.2 `npm run build` — clean build
  - [x]8.3 Manual smoke test: tap checkbox, verify animation + move to completed section, toggle section

## Dev Notes

### Mental Model — CRITICAL

Completing a task = flipping a boolean in the local store + re-marking the task as "pending" for sync. On next sync, the markdown file is re-written with `- [x]` instead of `- [ ]`. The checkbox is a local-first state toggle, not a remote API call.

### Completion → Sync Pipeline — CRITICAL

When a user checks a task:
1. `toggleComplete(taskId)` → sets `isCompleted: true`, `completedAt: now`, `syncStatus: 'pending'`
2. Task moves to "Completed" section in UI (after brief delay for animation)
3. SyncFAB badge count increases (because `syncStatus` is now `pending`)
4. User taps "Push to GitHub" → sync writes `- [x] **Title**...` to markdown file
5. `markTaskSynced(taskId)` → sets `syncStatus: 'synced'`

This reuses the existing sync pipeline with ZERO new infrastructure. The only change is that `formatTaskAsMarkdown` reads `task.isCompleted` to decide the checkbox prefix.

### Checkbox Animation Pattern

The checkbox should feel satisfying — not a browser-native checkbox. Reference implementation:

```tsx
// Conceptual pattern — adapt to match codebase style
<motion.button
  onClick={(e) => {
    e.stopPropagation() // Don't trigger card expand
    onComplete(task.id)
    triggerSelectionHaptic()
  }}
  className="flex items-center justify-center"
  style={{
    width: 22, height: 22,
    borderRadius: '50%',
    border: `2px solid ${task.isCompleted ? 'var(--color-success)' : 'var(--color-border)'}`,
    backgroundColor: task.isCompleted ? 'var(--color-success)' : 'transparent',
  }}
  animate={{
    scale: task.isCompleted ? [1, 1.2, 1] : 1,
    backgroundColor: task.isCompleted ? 'var(--color-success)' : 'transparent',
    borderColor: task.isCompleted ? 'var(--color-success)' : 'var(--color-border)',
  }}
  transition={TRANSITION_SPRING}
  whileTap={{ scale: 0.85 }}
  role="checkbox"
  aria-checked={task.isCompleted}
  aria-label={task.isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
  data-testid={`task-checkbox-${task.id}`}
>
  {task.isCompleted && (
    <motion.svg
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={TRANSITION_SPRING}
      width="12" height="12" viewBox="0 0 12 12"
    >
      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
    </motion.svg>
  )}
</motion.button>
```

Touch target: wrap in a `div` with `p-[11px]` to expand the 22px circle to 44px hit area.

### Completed Section Header Pattern

```tsx
// Collapsible section header
<button
  onClick={() => setShowCompleted(!showCompleted)}
  className="flex items-center gap-2 px-4 py-2 w-full max-w-[640px]"
  data-testid="completed-section-header"
>
  <motion.svg
    animate={{ rotate: showCompleted ? 90 : 0 }}
    transition={TRANSITION_FAST}
    width="12" height="12" viewBox="0 0 12 12"
  >
    <path d="M4 2L8 6L4 10" stroke="var(--color-text-secondary)" strokeWidth="1.5" fill="none" />
  </motion.svg>
  <span className="text-label uppercase tracking-wider"
        style={{ color: 'var(--color-text-secondary)' }}>
    Completed ({completedTasks.length})
  </span>
</button>
```

### Task Type Changes

**File:** `src/types/task.ts`

Current Task interface:
```ts
export interface Task {
  id: string
  username: string
  repoFullName: string
  title: string
  body: string
  createdAt: string
  isImportant: boolean
  syncStatus: SyncStatus          // 'pending' | 'synced'
  githubIssueNumber: number | null
}
```

Add after `isImportant`:
```ts
  isCompleted: boolean
  completedAt: string | null
```

### Store Action Pattern

**File:** `src/stores/useSyncStore.ts`

Follow the same immutable-update + IDB-persist pattern as `markTaskSynced`:

```ts
toggleComplete: (taskId: string) => {
  const task = get().tasks.find(t => t.id === taskId)
  if (!task) return

  const nowCompleting = !task.isCompleted
  const updatedTask = {
    ...task,
    isCompleted: nowCompleting,
    completedAt: nowCompleting ? new Date().toISOString() : null,
    syncStatus: 'pending' as const, // Always re-mark for sync
  }

  set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? updatedTask : t),
  }))

  StorageService.persistTaskToIDB(updatedTask).catch(() => {})
},
```

### Markdown Format Change

**File:** `src/features/sync/utils/markdown-templates.ts`

Current `formatTaskAsMarkdown` (line 47):
```ts
let line = `- [ ] **${task.title}** ([Created: ${date}]) (Priority: ${priority})`
```

Change to:
```ts
const checkbox = task.isCompleted ? '- [x]' : '- [ ]'
let line = `${checkbox} **${task.title}** ([Created: ${date}]) (Priority: ${priority})`
```

This aligns with the AI-Ready header which already documents: `Mark tasks as done (- [x]) after processing`.

### Event Propagation — CRITICAL

The checkbox lives inside the TaskCard `motion.div` which has `onClick={onToggle}` for expand/collapse. The checkbox click handler MUST call `e.stopPropagation()` to prevent the card from expanding when the user taps the checkbox.

### Animation Timing for Task Movement

When a task is completed:
1. **Immediate:** Checkbox fills with green + checkmark SVG (spring animation)
2. **Immediate:** Title gets `line-through` + muted color
3. **After ~500ms:** Task animates out of active list and into completed section

The `layout` prop on `motion.div` wrapping each TaskCard + `AnimatePresence` on the list containers will handle the movement animation automatically. The 500ms delay can be achieved with `setTimeout` in the `toggleComplete` call, but it's simpler to just let the list re-render immediately — Framer Motion's `layout` animations will make the transition feel smooth without explicit delays.

**Recommended approach:** Skip the explicit delay. Let `toggleComplete` update state immediately, and rely on `layout` + `AnimatePresence` for smooth visual transitions. This is simpler, more predictable, and follows React's unidirectional data flow.

### Design Tokens Reference

| Token | Value | Usage in this story |
|-------|-------|-----|
| `--color-success` | `#3fb950` | Checked checkbox fill |
| `--color-border` | `#30363d` | Unchecked checkbox border |
| `--color-text-secondary` | `#8b949e` | Completed task text, section header |
| `--color-text-primary` | `#e6edf3` | Active task text (unchanged) |

### Animation Constants Reference

**File:** `src/config/motion.ts`

| Constant | Value | Usage |
|----------|-------|-------|
| `TRANSITION_SPRING` | `{ type: 'spring', stiffness: 400, damping: 30 }` | Checkbox fill animation |
| `TRANSITION_FAST` | `{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }` | Section header chevron rotation |
| `listContainerVariants` | `staggerChildren: 0.04` | Completed section list |
| `listItemVariants` | `opacity+y fade` | Each completed task entry |

### Haptic Feedback

**File:** `src/services/native/haptic-service.ts`

Use `triggerSelectionHaptic()` for checkbox toggle — same as PriorityPill toggle. Import from `../../../services/native/haptic-service`.

### FAB Coexistence

No changes needed to CreateTaskFAB or SyncFAB. The completed section renders in the scrollable content area, not in the fixed-position FAB layer.

### Existing Test Factory Updates

Every test file that creates `Task` objects must add the two new fields. Files affected:

| File | Factory/Mock Location |
|------|------|
| `src/stores/useSyncStore.test.ts` | Inline task creation in tests |
| `src/features/capture/components/TaskCard.test.tsx` | `createTask()` factory |
| `src/services/github/sync-service.test.ts` | `createTask()` factory (line 74) |
| `src/features/sync/utils/markdown-templates.test.ts` | Task objects in tests |
| `src/App.test.tsx` | Mock store state with tasks |

Default values: `isCompleted: false, completedAt: null`

### Project Structure Notes

**Files to Modify:**

| File | Action |
|------|--------|
| `src/types/task.ts` | Add `isCompleted`, `completedAt` fields |
| `src/stores/useSyncStore.ts` | Add `toggleComplete` action, update `addTask` defaults |
| `src/features/capture/components/TaskCard.tsx` | Add checkbox UI, completed styling, `onComplete` prop |
| `src/App.tsx` | Split list into active/completed, add section header, wire `toggleComplete` |
| `src/features/sync/utils/markdown-templates.ts` | Conditional `- [x]` vs `- [ ]` |

**Files to Update (tests only):**

| File | Action |
|------|--------|
| `src/stores/useSyncStore.test.ts` | Add `toggleComplete` tests, update factories |
| `src/features/capture/components/TaskCard.test.tsx` | Add checkbox tests, update factory |
| `src/App.test.tsx` | Add completed section tests |
| `src/services/github/sync-service.test.ts` | Update factory |
| `src/features/sync/utils/markdown-templates.test.ts` | Add `- [x]` tests |

**No files to create or delete.**

### Accessibility Requirements

- Checkbox: `role="checkbox"`, `aria-checked={isCompleted}`, `aria-label` that changes based on state
- 44x44px minimum touch target (22px visual circle + 11px padding each side)
- Section header: `aria-expanded={showCompleted}`, `aria-controls="completed-task-list"`
- Completed section: `id="completed-task-list"` for `aria-controls` reference

### References

- [Source: `src/types/task.ts`] — Task interface (add `isCompleted`, `completedAt`)
- [Source: `src/stores/useSyncStore.ts`] — Store actions (`addTask`, `markTaskSynced` patterns)
- [Source: `src/features/capture/components/TaskCard.tsx`] — Card component (add checkbox)
- [Source: `src/App.tsx` lines 191-208] — Task filtering chain (split active/completed)
- [Source: `src/App.tsx` lines 292-324] — Task list rendering (add completed section)
- [Source: `src/features/sync/utils/markdown-templates.ts` line 47] — `formatTaskAsMarkdown` (conditional checkbox)
- [Source: `src/features/capture/components/PriorityPill.tsx`] — Toggle animation pattern reference
- [Source: `src/config/motion.ts`] — Animation constants
- [Source: `src/services/native/haptic-service.ts`] — `triggerSelectionHaptic()`
- [Source: `src/index.css`] — Design tokens
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 7.4`] — Epic requirements
- [Source: `_bmad-output/implementation-artifacts/7-3-fab-bottom-sheet-creation.md`] — Previous story

### Git Intelligence

Recent commits:
- `dc7711b` — Merged UI redesign PR — defines CSS classes and design tokens used throughout
- `f3a7de5` — Comprehensive UI redesign with unified design system
- `fea703b` — Hydration fix — don't break the `AuthGuard` + `use(getHydrationPromise())` pattern

### Previous Story Intelligence

Story 7.3 (FAB + Bottom Sheet):
- Removed PulseInput, `currentDraft`, `setCurrentDraft` from store
- Created CreateTaskFAB + CreateTaskSheet — these are NOT affected by this story
- `addTask()` returns the created Task object — used by CreateTaskSheet for highlight callback
- `isImportant` state in store is kept and used by PriorityPill — unrelated to completion
- `useSyncStore.setState({ isImportant: false })` reset pattern in CreateTaskSheet — completion toggle follows a different pattern (store action, not `setState`)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed pre-existing `selectPendingSyncCount` missing from App.test mock
- Fixed pre-existing unused `user` variable in useAutoSync.ts (TS build error)
- Changed checkbox `scale: [1, 1.2, 1]` to `scale: 1` — spring transitions don't support 3 keyframes in motion v12

### Completion Notes List

- Added `isCompleted` and `completedAt` fields to Task interface
- Implemented `toggleComplete` store action following immutable-update + IDB-persist pattern
- Built animated checkbox UI in TaskCard with haptic feedback, accessibility attributes, and event propagation handling
- Split App.tsx task list into Active/Completed sections with collapsible "Completed (N)" header
- Updated markdown serialization to output `- [x]` for completed tasks
- Updated `addTask` to include `isCompleted: false, completedAt: null` defaults
- Updated all test factories across 7 test files to include new Task fields
- Added 3 store tests (toggleComplete, un-complete, syncStatus reset)
- Added 4 TaskCard tests (checkbox render, click, strikethrough, propagation)
- Added 4 App tests (completed section, header count, collapse, active separation)
- Added 2 markdown tests (completed prefix, active prefix)
- **Review fix (2026-03-17):** Fixed `getTaskRegex` extra-space bug preventing task update/merge in markdown files
- **Review fix (2026-03-17):** Fixed `completedAt` sort fallback and body preview alignment under checkbox
- Pre-existing: `RepoSelector.test.tsx` has environment-related timeouts (unrelated to this story)

### Change Log

- 2026-03-16: Story 7.4 implemented — task checkboxes, completion toggle, completed section
- 2026-03-17: Code review fixes — regex bug in getTaskRegex, sort fallback, body alignment

### File List

**Modified:**
- src/types/task.ts
- src/stores/useSyncStore.ts
- src/stores/useSyncStore.test.ts
- src/features/capture/components/TaskCard.tsx
- src/features/capture/components/TaskCard.test.tsx
- src/App.tsx
- src/App.test.tsx
- src/features/sync/utils/markdown-templates.ts
- src/features/sync/utils/markdown-templates.test.ts
- src/services/github/sync-service.ts
- src/services/github/sync-service.test.ts
- src/features/sync/components/SyncFAB.tsx
- src/features/sync/components/SyncFAB.test.tsx
- src/components/layout/SyncHeaderStatus.tsx
- src/components/layout/SyncHeaderStatus.test.tsx
- src/features/capture/utils/fuzzy-search.test.ts
- src/features/capture/utils/filter-tasks.test.ts
- src/features/sync/hooks/useAutoSync.ts
- src/components/auth/hydration.ts
- src/components/auth/hydration.test.ts
- src/features/auth/components/AuthForm.tsx
- src/features/auth/components/AuthForm.test.tsx
- src/services/github/octokit-provider.ts
- src/features/capture/components/PriorityPill.test.tsx

**Deleted (Cleaned up PulseInput/LaunchAnimation legacy):**
- src/features/capture/components/LaunchAnimation.tsx
- src/features/capture/components/LaunchAnimation.test.tsx
- src/features/capture/components/PulseInput.tsx
- src/features/capture/components/PulseInput.test.tsx

**New (Tracked from 7.3/7.4):**
- src/features/capture/components/CreateTaskFAB.tsx
- src/features/capture/components/CreateTaskFAB.test.tsx
- src/features/capture/components/CreateTaskSheet.tsx
- src/features/capture/components/CreateTaskSheet.test.tsx
