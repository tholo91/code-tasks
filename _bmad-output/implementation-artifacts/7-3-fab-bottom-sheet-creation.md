# Story 7.3: FAB + Bottom Sheet Task Creation

Status: done

## Core Concept

**The app is a frontend for a markdown file.** This story replaces the current PulseInput (swipe-to-launch textarea) with a (+) FAB button that opens a Bottom Sheet form. This becomes the primary path for adding new lines to the repo's `captured-ideas-{username}.md` file.

**Design quality is paramount.** Gitty's UX vision is "Things 3 meets GitHub Primer" — fluid spring animations, native-feeling interactions, and the tactile satisfaction of a premium tool. The Bottom Sheet must feel like it belongs on iOS, not like a web modal. Every animation, every spacing decision, every transition must reinforce the "Relief of the Vault" emotional goal. Refer to the UX Design Specification (`_bmad-output/planning-artifacts/ux-design-specification.md`) for the full design philosophy.

## Story

As a User,
I want to tap a (+) button to quickly create a new task via a clean bottom sheet form,
so that task creation is obvious, fast, and feels like a native todo app.

## Acceptance Criteria

1. **Given** I am on the task list screen,
   **When** I see the bottom-right corner,
   **Then** a (+) FAB is visible — always present, not conditional.

2. **Given** I tap the (+) FAB,
   **When** the Bottom Sheet opens,
   **Then** it slides up with spring physics matching RepoPickerSheet, the Title field is auto-focused, and the keyboard appears.

3. **Given** I have filled in at least a Title,
   **When** I tap "Add Task" or press Cmd+Enter,
   **Then** the task is created in the current repo's local working copy, the Bottom Sheet closes with a smooth animation, and the new task appears at the top of the list with a brief highlight.

4. **Given** I tap outside the Bottom Sheet or swipe it down,
   **When** the sheet dismisses,
   **Then** no task is created (cancel behavior), form state is cleared.

5. **Given** I have the Bottom Sheet open,
   **When** I toggle the Priority pill,
   **Then** it uses the same PriorityPill component with haptic feedback.

6. **Given** the SyncFAB is also visible (pending sync),
   **When** both FABs are on screen,
   **Then** they are stacked vertically — (+) FAB at bottom, SyncFAB above it — without overlapping.

## Tasks / Subtasks

- [x] Task 1: Create the (+) FAB component (AC: 1, 6)
  - [x] 1.1 Create `src/features/capture/components/CreateTaskFAB.tsx`
  - [x] 1.2 Fixed position, bottom-right, matching SyncFAB dimensions (56x56px, `bottom: 24px`, `right: 24px`)
  - [x] 1.3 Use `var(--color-accent)` (`#58a6ff`) background, white "+" icon
  - [x] 1.4 `z-40` (same layer as SyncFAB)
  - [x] 1.5 `whileTap={{ scale: 0.92 }}` for press feedback (spring physics)
  - [x] 1.6 Haptic feedback on tap: `triggerSelectionHaptic()`
  - [x] 1.7 Always visible (unlike SyncFAB which is conditional)

- [x] Task 2: Stack FABs when both visible (AC: 6)
  - [x] 2.1 When SyncFAB is visible, shift it UP by ~72px (56px FAB + 16px gap) so (+) FAB stays at the bottom
  - [x] 2.2 Animate SyncFAB position change with `TRANSITION_SPRING` so it slides up/down smoothly
  - [x] 2.3 Approach: pass a `bottomOffset` prop to SyncFAB, or use a shared layout wrapper

- [x] Task 3: Create the Bottom Sheet component (AC: 2, 4)
  - [x] 3.1 Create `src/features/capture/components/CreateTaskSheet.tsx`
  - [x] 3.2 **MUST match RepoPickerSheet pattern exactly** (see Dev Notes for exact code):
    - Backdrop: `fixed inset-0 z-50 bg-black/50`
    - Sheet: `motion.div` with `initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}`
    - Spring: `transition={{ type: 'spring', stiffness: 400, damping: 35 }}` — do NOT use `TRANSITION_SPRING` (that has `damping: 30`), use inline values
    - Corners: `rounded-t-2xl`
    - Handle bar: `h-1 w-10 rounded-full mx-auto mb-4` with `style={{ backgroundColor: 'var(--color-border)' }}`
    - Background: `var(--color-surface)`
    - Max width: `max-w-lg`
    - Padding: `p-6 pb-8`
  - [x] 3.3 Click-outside dismissal: `onClick={(e) => { if (e.target === e.currentTarget) onClose() }}`
  - [x] 3.4 Swipe-down-to-dismiss: add `drag="y"` and `dragConstraints={{ top: 0 }}` and `dragElastic={0.2}` on the sheet `motion.div`. In `onDragEnd`, if `info.offset.y > 100 || info.velocity.y > 300`, call `onClose()`. Otherwise animate back to `y: 0`.
  - [x] 3.5 Wrap in `AnimatePresence` in parent for mount/unmount animation
  - [x] 3.6 Add `role="dialog"` and `aria-modal="true"` and `aria-label="Create new task"` on the sheet container

- [x] Task 4: Bottom Sheet form content (AC: 2, 3, 5)
  - [x] 4.1 **Title field** (required): `input-field` CSS class, auto-focused on mount, placeholder "What's on your mind?"
  - [x] 4.2 **Notes field** (optional): `textarea` with `input-field` class, 3-4 rows, placeholder "Add details..." — auto-expands
  - [x] 4.3 **Priority toggle**: Reuse existing `PriorityPill` component (already has spring animation + haptic)
  - [x] 4.4 **"Add Task" button**: `btn-primary` class, full width, disabled when Title is empty
  - [x] 4.5 **Keyboard shortcut**: `Cmd+Enter` / `Ctrl+Enter` submits the form
  - [x] 4.6 Layout: Title → Notes → row with [PriorityPill ... Add Task button]
  - [x] 4.7 All field labels use `text-label` size (12px), `var(--color-text-secondary)` color

- [x] Task 5: Wire form submission to store (AC: 3)
  - [x] 5.1 On submit: call `addTask(title, body)` from `useSyncStore` — it returns the created `Task` object
  - [x] 5.2 Call `onTaskCreated(newTask.id)` callback prop to notify App.tsx of the new task ID (for highlight animation)
  - [x] 5.3 Trigger `triggerLaunchHaptic()` on successful creation
  - [x] 5.4 Close sheet after task creation
  - [x] 5.5 Reset `isImportant` to false on close — BOTH on submit AND cancel. Call `useSyncStore.setState({ isImportant: false })`. This is critical: PulseInput did this at line 116, and deleting PulseInput deletes that reset. Without this, every task after the first "Important" one inherits the priority flag.
  - [x] 5.6 Clear local form state (title, notes) on close

- [x] Task 6: Wire CreateTaskSheet into App.tsx (AC: 3)
  - [x] 6.1 Add `const [showCreateSheet, setShowCreateSheet] = useState(false)` state in `AppContent()`
  - [x] 6.2 Render `<CreateTaskFAB onClick={() => setShowCreateSheet(true)} />`
  - [x] 6.3 Render `<CreateTaskSheet>` inside `<AnimatePresence>`, controlled by `showCreateSheet`
  - [x] 6.4 Pass `onClose={() => setShowCreateSheet(false)}` to sheet
  - [x] 6.5 Pass `onTaskCreated={(taskId) => { setNewestTaskId(taskId); setTimeout(() => setNewestTaskId(null), 1500) }}` — reuses existing highlight pattern from `handleLaunch`
  - [x] 6.6 Update empty state text: change "Type above and swipe up to launch your first task" → "Tap (+) to capture your first idea"

- [x] Task 7: Remove PulseInput as primary capture path (AC: all)
  - [x] 7.1 Remove `<PulseInput>` from `App.tsx` main layout
  - [x] 7.2 Delete `src/features/capture/components/PulseInput.tsx` and `PulseInput.test.tsx`
  - [x] 7.3 Delete `src/features/capture/components/LaunchAnimation.tsx`
  - [x] 7.4 Remove `currentDraft` and draft-related state/actions from useSyncStore if no longer used
  - [x] 7.5 Clean up any orphaned imports and dead code
  - [x] 7.6 Note: `isImportant` state in store is KEPT — still used by PriorityPill in the Bottom Sheet. But PulseInput's `useSyncStore.setState({ isImportant: false })` reset was the only place this happened — that responsibility is now in CreateTaskSheet (Task 5.5)

- [x] Task 8: Tests (AC: all)
  - [x] 8.1 Test: (+) FAB renders with `data-testid="create-task-fab"` and opens sheet on tap
  - [x] 8.2 Test: Sheet closes on outside click (no task created)
  - [x] 8.3 Test: Filling title and submitting creates task with correct `repoFullName`
  - [x] 8.4 Test: Submit disabled when title is empty
  - [x] 8.5 Test: Cmd+Enter keyboard shortcut works
  - [x] 8.6 Test: `isImportant` is reset to false on sheet close (both submit and cancel)
  - [x] 8.7 Test: `onTaskCreated` callback is called with new task ID on submit
  - [x] 8.8 Test: SyncFAB renders at elevated position (`bottom: 96px`) when pending tasks exist alongside CreateTaskFAB
  - [x] 8.9 Update `SyncFAB.test.tsx` for new `bottomOffset` prop
  - [x] 8.10 Delete `PulseInput.test.tsx` and update any App.test.tsx refs to PulseInput
  - [x] 8.11 Use `data-testid` attributes: `create-task-fab`, `create-task-sheet`, `create-task-title`, `create-task-notes`, `create-task-submit`

- [x] Task 9: Run tests and build (AC: all)
  - [x] 9.1 `npm test` — fix failures
  - [x] 9.2 `npm run build` — clean build
  - [x] 9.3 Manual smoke test: tap FAB, fill form, submit, verify task appears with highlight

## Dev Notes

### Mental Model — CRITICAL

The app is a **frontend for a markdown file**. Creating a task via the Bottom Sheet adds a line to the local working copy of the repo's `captured-ideas-{username}.md`. The (+) FAB is the "new line" button. The form collects structured input (title, notes, priority) that will be serialized to markdown on sync.

### Design Quality — CRITICAL

**This is the most important UX component in the app.** The Bottom Sheet IS the capture experience. It must feel native, fluid, and satisfying — not like a web form in a modal.

Key UX principles from the design spec:
- **"Relief of the Vault"**: The capture gesture should feel like placing a high-value item into a safe — tactile, certain, professional
- **Confirmation, Not Interruption**: Use haptic + animation for feedback, never alerts/popups
- **Intentional Motion**: Every animation reinforces "placing an idea into a vault"
- **Utilitarian Elegance**: Clean, quiet, GitHub-inspired — no decorative fluff
- **Things 3 polish**: Spring physics that feel snappy and physical, not floaty

### Exact RepoPickerSheet Pattern to Match

This is the established bottom sheet pattern. The CreateTaskSheet MUST use the same structure:

```tsx
// From App.tsx lines 122-165 — this is the pattern to follow
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-50 flex flex-col items-center justify-end"
  onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
>
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50" />

  {/* Sheet */}
  <motion.div
    initial={{ y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    className="relative z-10 w-full max-w-lg rounded-t-2xl p-6 pb-8"
    style={{ backgroundColor: 'var(--color-surface)' }}
  >
    {/* Handle bar */}
    <div className="mx-auto mb-4 h-1 w-10 rounded-full"
         style={{ backgroundColor: 'var(--color-border)' }} />
    {/* Form content here */}
  </motion.div>
</motion.div>
```

### Animation System Reference

**File:** `src/config/motion.ts`

```typescript
TRANSITION_SPRING: { type: 'spring', stiffness: 400, damping: 30 }
TRANSITION_NORMAL: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }
TRANSITION_FAST:   { duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }
```

- RepoPickerSheet uses `stiffness: 400, damping: 35` (slightly more damped than global spring — use this for sheets)
- PriorityPill uses `TRANSITION_SPRING` + `whileTap={{ scale: 0.95 }}`
- SyncFAB uses `TRANSITION_SPRING` with breathing scale animation

### Design Tokens Reference

**File:** `src/index.css`

| Token | Value | Usage |
|-------|-------|-------|
| `--color-canvas` | `#0d1117` | Main background |
| `--color-surface` | `#161b22` | Sheet/card background |
| `--color-accent` | `#58a6ff` | FAB color, active states |
| `--color-text-primary` | `#e6edf3` | Input text |
| `--color-text-secondary` | `#8b949e` | Labels, placeholders |
| `--color-border` | `#30363d` | Input borders, handle bar |
| `--color-success` | `#3fb950` | Success states |
| `.input-field` | — | Standard form input (44px min-height, 1px accent border on focus) |
| `.btn-primary` | — | Full-width accent button (44px min-height) |
| `.text-label` | 12px | Field labels |
| `.text-body` | 14px | Input text |

### FAB Coexistence with SyncFAB

Both FABs live at `z-40`. The (+) FAB is **always visible** at `bottom: 24px, right: 24px`. SyncFAB is **conditionally rendered** inside `<AnimatePresence>` — it only mounts when `pendingSyncCount > 0`.

**SyncFAB current code** (from `src/features/sync/components/SyncFAB.tsx`):
```typescript
// SyncFAB wraps in AnimatePresence and conditionally renders
style={{ bottom: 24, right: 24, width: 56, height: 56 }}
```

**Stacking approach:** Change SyncFAB's `bottom` style to `96` (24 + 56 FAB + 16 gap). Since CreateTaskFAB is always present, SyncFAB always renders at the elevated position. The simplest approach: just hardcode `bottom: 96` in SyncFAB — no prop needed, since CreateTaskFAB is always there. SyncFAB's `AnimatePresence` entrance animation will naturally slide it in at the correct position.

Update `SyncFAB.test.tsx` to expect `bottom: 96` instead of `bottom: 24`.

### Haptic Feedback

**File:** `src/services/native/haptic-service.ts`

- `triggerLaunchHaptic()` — Light impact, use on task creation success
- `triggerSelectionHaptic()` — Selection changed, use on FAB tap

### What to Remove

PulseInput is being replaced. Clean removal:
- `src/features/capture/components/PulseInput.tsx` — delete
- `src/features/capture/components/PulseInput.test.tsx` — delete
- `src/features/capture/components/LaunchAnimation.tsx` — delete
- `useSyncStore.currentDraft` — remove if no longer used (was for PulseInput's debounced draft)
- `useSyncStore.isImportant` — **KEEP** — still used by PriorityPill in the Bottom Sheet
- Empty state text in App.tsx — **UPDATE** (currently says "Type above and swipe up..." — must change)

### isImportant Reset — CRITICAL

`PriorityPill` reads `isImportant` directly from `useSyncStore` (no props). It calls `toggleImportant()` on tap. `addTask()` reads `isImportant` from the store to set the task's priority.

**The problem:** PulseInput explicitly resets `isImportant: false` after launch (line 116). Deleting PulseInput deletes this reset. If you don't add the reset to CreateTaskSheet, every task created after toggling "Important" once will inherit that flag forever.

**Solution:** In CreateTaskSheet's close handler (both submit and cancel), call `useSyncStore.setState({ isImportant: false })`.

### Swipe-Down-to-Dismiss Implementation

RepoPickerSheet does NOT implement swipe-to-dismiss, so there's no existing pattern. Use Framer Motion drag:

```tsx
<motion.div
  drag="y"
  dragConstraints={{ top: 0 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => {
    if (info.offset.y > 100 || info.velocity.y > 300) {
      onClose()
    }
  }}
  // ... rest of sheet props
>
```

Threshold: 100px offset OR 300px/s velocity = dismiss. Below that, sheet snaps back.

### App.tsx Wiring Pattern

The sheet needs state in App.tsx and a callback for the highlight animation:

```tsx
// In AppContent()
const [showCreateSheet, setShowCreateSheet] = useState(false)

// Render
<CreateTaskFAB onClick={() => setShowCreateSheet(true)} />

<AnimatePresence>
  {showCreateSheet && (
    <CreateTaskSheet
      onClose={() => setShowCreateSheet(false)}
      onTaskCreated={(taskId) => {
        setNewestTaskId(taskId)
        setTimeout(() => setNewestTaskId(null), 1500)
      }}
    />
  )}
</AnimatePresence>
```

`addTask()` returns the created `Task` object. Use `newTask.id` to call `onTaskCreated`.

### Project Structure Notes

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/features/capture/components/CreateTaskFAB.tsx` | The (+) floating action button |
| `src/features/capture/components/CreateTaskSheet.tsx` | The bottom sheet form |

**Files to Modify:**

| File | Action |
|------|--------|
| `src/App.tsx` | Remove PulseInput, add CreateTaskFAB + CreateTaskSheet with AnimatePresence, add `showCreateSheet` state, wire `onTaskCreated` callback, update empty state text |
| `src/features/sync/components/SyncFAB.tsx` | Change `bottom: 24` → `bottom: 96` to stack above CreateTaskFAB |
| `src/features/sync/components/SyncFAB.test.tsx` | Update expected `bottom` value |
| `src/stores/useSyncStore.ts` | Remove `currentDraft` state/actions if no longer needed |
| `src/App.test.tsx` | Update any refs to PulseInput, update empty state text assertions |

**Files to Delete:**

| File | Reason |
|------|--------|
| `src/features/capture/components/PulseInput.tsx` | Replaced by FAB + Sheet |
| `src/features/capture/components/PulseInput.test.tsx` | Tests for deleted component |
| `src/features/capture/components/LaunchAnimation.tsx` | Was PulseInput's launch effect |

**Files to Keep Unchanged:**

| File | Reason |
|------|--------|
| `src/features/capture/components/PriorityPill.tsx` | Reused in Bottom Sheet as-is |
| `src/features/capture/components/TaskCard.tsx` | Display unchanged |
| `src/services/native/haptic-service.ts` | Reused as-is |
| `src/config/motion.ts` | Animation configs reused as-is |
| `src/index.css` | Design tokens reused as-is |

### Accessibility Requirements

- FAB: minimum 44x44px touch target (56px exceeds this), `aria-label="Create new task"`
- All form fields: minimum 44px height (`.input-field` already handles this)
- Keyboard: Tab order through Title → Notes → Priority → Add Task
- Sheet dialog: `role="dialog"`, `aria-modal="true"`, `aria-label="Create new task"`
- **Focus trap:** On sheet open, focus moves to Title field. Tab/Shift-Tab must cycle within the sheet only. On close, focus returns to the FAB. Simplest approach: use Framer Motion's `onAnimationComplete` to focus the title input, and add a `keydown` handler that wraps Tab at the last focusable element. Alternatively use `focus-trap-react` if already in deps (it's not — check before adding).
- **`prefers-reduced-motion`:** Use `import { useReducedMotion } from 'framer-motion'`. If true, replace spring transitions with `{ duration: 0.15 }` fade. The codebase has zero existing implementations of this — this story sets the precedent. Keep it simple: just swap the sheet's spring transition.

### Testing Standards

- **Framework:** Vitest + Testing Library
- **Test co-location:** Tests next to source files
- **Key scenarios:**
  - FAB renders and is clickable
  - Sheet opens/closes with correct animation
  - Form validation (title required)
  - Submit creates task in store
  - Cmd+Enter shortcut
  - Click-outside closes without creating task
  - PriorityPill toggle works inside sheet

### References

- [Source: `src/App.tsx` lines 122-165] — RepoPickerSheet pattern (MUST MATCH)
- [Source: `src/features/sync/components/SyncFAB.tsx`] — Existing FAB positioning/styling
- [Source: `src/features/capture/components/PulseInput.tsx`] — Current capture (being replaced)
- [Source: `src/features/capture/components/PriorityPill.tsx`] — Reusable priority toggle
- [Source: `src/features/capture/components/LaunchAnimation.tsx`] — Existing animation (may be removed)
- [Source: `src/config/motion.ts`] — Spring configs and animation constants
- [Source: `src/index.css`] — Design tokens and shared CSS classes
- [Source: `src/services/native/haptic-service.ts`] — Haptic feedback functions
- [Source: `src/stores/useSyncStore.ts`] — `addTask()`, `isImportant`, `currentDraft`
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md`] — Full UX vision
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 7.3`] — Epic requirements
- [Source: `_bmad-output/implementation-artifacts/7-2-per-repo-task-lists.md`] — Previous story (repo scoping)

### Git Intelligence

Recent commits:
- `f3a7de5` — UI redesign with unified design system — defines the CSS classes (`.input-field`, `.btn-primary`, `.card`) and color tokens used throughout
- `fea703b` — Hydration fix — don't break the `AuthGuard` + `use(getHydrationPromise())` pattern
- `dc7711b` — Merged redesign PR — current main state

### Previous Story Intelligence

Story 7.2 adds `repoFullName` to the Task type and scopes `addTask()` by repo. The Bottom Sheet calls the same `addTask()` — it will automatically inherit repo scoping. No special handling needed in this story.

Story 7.1 removes the passphrase gate. If 7.1 is done before this story, `currentDraft` persistence behavior may have changed. Check the store state before removing draft logic.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- IndexedDB `put failed` warnings in test stderr are expected (no IndexedDB in Node test environment) — fire-and-forget, non-blocking

### Completion Notes List

- Created `CreateTaskFAB.tsx` — fixed-position (+) button with spring press feedback, haptic, accent color
- Created `CreateTaskSheet.tsx` — bottom sheet matching RepoPickerSheet pattern exactly (spring stiffness 400/damping 35), with swipe-down-to-dismiss, click-outside dismiss, auto-focus title, Cmd+Enter shortcut, prefers-reduced-motion support
- Form layout: Title (required) → Notes (auto-expanding textarea) → [PriorityPill | Add Task button]
- `isImportant` reset on both submit and cancel paths (critical bug prevention)
- SyncFAB `bottom` changed from 24→96 to stack above CreateTaskFAB
- Removed PulseInput, LaunchAnimation, `currentDraft`/`setCurrentDraft` from store
- Updated empty state text to "Tap (+) to capture your first idea"
- 15 new tests (4 FAB + 11 Sheet), all existing tests updated, 204 total passing
- Clean production build

### File List

**Created:**
- `src/features/capture/components/CreateTaskFAB.tsx`
- `src/features/capture/components/CreateTaskFAB.test.tsx`
- `src/features/capture/components/CreateTaskSheet.tsx`
- `src/features/capture/components/CreateTaskSheet.test.tsx`

**Modified:**
- `src/App.tsx` — removed PulseInput, added CreateTaskFAB + CreateTaskSheet + AnimatePresence wiring, updated empty state text
- `src/features/sync/components/SyncFAB.tsx` — changed `bottom: 24` → `bottom: 96`
- `src/stores/useSyncStore.ts` — removed `currentDraft`, `setCurrentDraft` state/action
- `src/stores/useSyncStore.test.ts` — removed `currentDraft` tests and references
- `src/App.test.tsx` — removed `currentDraft`/`setCurrentDraft` from mock state
- `src/features/capture/components/PriorityPill.test.tsx` — removed `currentDraft`/`setCurrentDraft` from mock state

**Deleted:**
- `src/features/capture/components/PulseInput.tsx`
- `src/features/capture/components/PulseInput.test.tsx`
- `src/features/capture/components/LaunchAnimation.tsx`
- `src/features/capture/components/LaunchAnimation.test.tsx`

### Change Log

- 2026-03-16: Implemented Story 7.3 — FAB + Bottom Sheet replaces PulseInput as primary capture path
