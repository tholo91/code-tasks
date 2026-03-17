# Story 8.4: Task Creation Flow Polish

Status: done

## Story

As a User,
I want the task creation sheet to feel perfectly native on mobile and optimized for rapid capture,
so that the keyboard, input focus, and flow are frictionless — and I can fire off multiple tasks without ever leaving the sheet.

## Acceptance Criteria

1. Given I tap the FAB (+) button, when the CreateTaskSheet opens on iOS, then the sheet animates into view AND the keyboard opens, with the sheet visible above the keyboard (not behind it).

2. Given the sheet is open with the keyboard visible, when I scroll the sheet content, then the sheet stays anchored correctly — the input and buttons are always reachable.

3. Given I type a long task title, when the title exceeds one line, then the title input auto-expands to show the full text (no horizontal scroll, no truncation).

4. Given I am in the title field, when I press Enter (without Cmd/Ctrl), then focus moves to the Notes field.

5. Given I tap anywhere outside the sheet backdrop, when the backdrop is tapped, then the sheet closes.

6. Given I submit a task via the "Capture" button, when the task is created, then the form fields reset, a brief "Captured!" indicator flashes at the top of the sheet (~800ms), and the cursor returns to the title field — the sheet stays open for the next task.

7. Given the sheet is open after capturing one or more tasks, when I swipe down or tap the backdrop, then the sheet closes normally.

8. Given I open the CreateTaskSheet, when I view the form, then there are no "Title" / "Notes" labels — only placeholder text inside the fields ("What's on your mind?", "Add details...").

9. Given I view the title input row, when I look to the right of the title field, then I see a small flag icon that toggles importance on tap. When active, the icon glows in `color-danger`. When inactive, it is `color-text-secondary` at reduced opacity.

10. Given the sheet backdrop is visible, when I look behind the sheet, then the backdrop has a subtle blur effect (not just a dark overlay).

## Tasks / Subtasks

- [x] Task 1: Fix iOS keyboard/viewport issue with visualViewport event listener (AC: #1, #2)
  - [x] Add `useEffect` that attaches a `resize` listener to `window.visualViewport`
  - [x] On resize, compute `paddingBottom` or `bottom` offset from `window.visualViewport.height` vs `window.innerHeight`
  - [x] Apply the offset to the sheet container so it stays anchored above the keyboard
  - [x] Clean up the event listener on unmount

- [x] Task 2: Convert title `<input>` to auto-expanding `<textarea>` (AC: #3)
  - [x] Change `titleRef` type from `useRef<HTMLInputElement>` to `useRef<HTMLTextAreaElement>`
  - [x] Replace `<input type="text">` with `<textarea rows={1}>` keeping `overflow-hidden`, `resize-none`
  - [x] Add `handleTitleChange` handler that mirrors `handleNotesChange` — sets state and adjusts `e.target.style.height` using `scrollHeight`
  - [x] Verify `onKeyDown` Enter->notes focus still works (ref type change requires no logic change)
  - [x] Verify `data-testid="create-task-title"` is preserved

- [x] Task 3: Improve auto-focus timing for iOS (AC: #1)
  - [x] Increase the `setTimeout` delay from 50ms to 150ms in the auto-focus `useEffect`
  - [x] Alternatively, trigger focus from the `visualViewport` resize event once the keyboard is confirmed open

- [x] Task 4: Remove form labels — placeholders only (AC: #8)
  - [x] Remove the `<label>` elements for both Title and Notes fields
  - [x] Remove the wrapping `<div>` around each label+field pair (flatten the form structure)
  - [x] Ensure placeholders "What's on your mind?" and "Add details..." are descriptive enough
  - [x] Verify a11y: add `aria-label` attributes to both fields to compensate for removed visible labels

- [x] Task 5: "Add Another" flow — keep sheet open after submit (AC: #6, #7)
  - [x] After successful submit: do NOT call `onClose()`
  - [x] Reset `title` and `notes` state to empty strings
  - [x] Reset importance toggle to false
  - [x] Show a brief "Captured!" indicator at the top of the sheet (small `motion.div` with fade-in/fade-out, ~800ms total)
  - [x] Return focus to the title field after reset
  - [x] Reset the textarea height back to its initial single-row size
  - [x] Keep swipe-down and backdrop-tap as the way to close the sheet
  - [x] The `onTaskCreated` callback still fires per task (for the green flash on the list behind)

- [x] Task 6: Inline priority flag icon in title row (AC: #9)
  - [x] Remove the `PriorityPill` component from the submit row
  - [x] Add a small flag SVG icon button to the right of the title textarea
  - [x] Use local state `isImportant` (default false), pass to `addTask` on submit
  - [x] When active: icon color `var(--color-danger)`, subtle scale pulse via `whileTap`
  - [x] When inactive: icon color `var(--color-text-secondary)` at `opacity: 0.4`
  - [x] Ensure 44x44px touch target around the icon
  - [x] Fire haptic on toggle (`triggerSelectionHaptic`)
  - [x] Reset to false after each capture (along with form reset in Task 5)

- [x] Task 7: Backdrop blur (AC: #10)
  - [x] Change backdrop div class from `bg-black/50` to `bg-black/50 backdrop-blur-sm`
  - [x] Verify performance on mobile — `backdrop-blur` can be expensive; `backdrop-blur-sm` (4px) is safe
  - [x] Apply same change to TaskDetailSheet for consistency

- [x] Task 8: Success micro-animation (AC: #6)
  - [x] Add a `captured` boolean state, set to `true` on submit, auto-reset after 800ms
  - [x] When `captured` is true, render a small animated indicator above the form: a checkmark icon + "Captured!" text
  - [x] Use `AnimatePresence` with fade + slight y-translate for entrance/exit
  - [x] Color: `var(--color-success)` for the checkmark, `var(--color-text-secondary)` for the text

- [x] Task 9: Update submit button (AC: #6)
  - [x] Change button label from "Add Task" to "Capture"
  - [x] The button now occupies the full width of the row (PriorityPill removed from this row)

- [x] Task 10: Verify existing behaviours still pass (AC: #4, #5)
  - [x] Confirm Enter in title -> notes focus works end-to-end after textarea conversion
  - [x] Confirm tap-outside-to-close still works (no change to backdrop `onClick` logic needed)
  - [x] Confirm `Cmd/Ctrl+Enter` submit shortcut still works
  - [x] Confirm swipe-down-to-dismiss still works

- [x] Task 11: Tests (AC: #3, #4, #6, #8, #9)
  - [x] Update `CreateTaskSheet.test.tsx` — assert title field renders as a `textarea` element
  - [x] Add/update test for Enter keydown in title field -> notes field receives focus
  - [x] Add test: after submit, sheet remains open and title field is empty
  - [x] Add test: no `<label>` elements rendered inside the sheet form
  - [x] Add test: flag icon toggles importance state on click

## Dev Notes

### iOS visualViewport Fix

iOS Safari raises the visual viewport (shrinks it) when the keyboard appears, but `window.innerHeight` is NOT updated. This means a `position: fixed; bottom: 0` sheet slides behind the keyboard.

The fix is to listen to `window.visualViewport?.resize` and compute the offset:

```typescript
useEffect(() => {
  const viewport = window.visualViewport
  if (!viewport) return

  const handleViewportResize = () => {
    const offsetFromBottom = window.innerHeight - viewport.height - viewport.offsetTop
    if (sheetRef.current) {
      sheetRef.current.style.paddingBottom = `${Math.max(0, offsetFromBottom)}px`
    }
  }

  viewport.addEventListener('resize', handleViewportResize)
  return () => viewport.removeEventListener('resize', handleViewportResize)
}, [])
```

`sheetRef` already exists in the current implementation (line 20: `const sheetRef = useRef<HTMLDivElement>(null)`). Attach the padding to the sheet `motion.div` (the inner container, not the outer backdrop). The outer `motion.div` uses `justify-end` and `inset-0` — the inner sheet `motion.div` (class `relative z-10 w-full max-w-lg rounded-t-2xl p-6 pb-8`) is the correct target.

Note: on non-iOS platforms `window.visualViewport` exists but the resize event may not fire for keyboard — the guard `if (!viewport) return` and `Math.max(0, ...)` ensure no regression.

### Title Input -> Textarea Conversion

Currently (line 17): `const titleRef = useRef<HTMLInputElement>(null)`
Currently (lines 124-139): `<input type="text" ref={titleRef} ... />`

Change to match the notes field pattern:

1. Update ref type: `const titleRef = useRef<HTMLTextAreaElement>(null)`
2. Replace the `<input>` element with:

```tsx
<textarea
  ref={titleRef}
  id="create-task-title"
  value={title}
  onChange={handleTitleChange}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      notesRef.current?.focus()
    }
  }}
  placeholder="What's on your mind?"
  rows={1}
  className="input-field w-full resize-none overflow-hidden"
  style={{ minHeight: '2.5rem' }}
  aria-label="Task title"
  data-testid="create-task-title"
/>
```

3. Add the handler (mirroring `handleNotesChange` at line 69):

```typescript
const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setTitle(e.target.value)
  e.target.style.height = 'auto'
  e.target.style.height = `${e.target.scrollHeight}px`
}
```

### "Add Another" Flow — Key Implementation Details

The current `handleSubmit` calls `onClose()` at the end. Replace that with a form reset:

```typescript
const handleSubmit = useCallback(() => {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return

  const newTask = addTask(trimmedTitle, notes.trim())
  triggerLaunchHaptic()
  onTaskCreated(newTask.id)

  // Reset form for next capture — do NOT close
  useSyncStore.setState({ isImportant: false })
  setTitle('')
  setNotes('')
  setIsImportant(false)
  setCaptured(true)

  // Reset textarea heights
  if (titleRef.current) {
    titleRef.current.style.height = 'auto'
  }
  if (notesRef.current) {
    notesRef.current.style.height = 'auto'
  }

  // Re-focus title after brief delay for animation
  setTimeout(() => titleRef.current?.focus(), 100)
}, [title, notes, addTask, onTaskCreated])
```

The "Captured!" indicator is a simple state-driven element:

```tsx
const [captured, setCaptured] = useState(false)

useEffect(() => {
  if (!captured) return
  const timer = setTimeout(() => setCaptured(false), 800)
  return () => clearTimeout(timer)
}, [captured])
```

### Inline Priority Flag Icon

Replace the `PriorityPill` in the submit row with a flag icon next to the title:

```tsx
<div className="flex items-center gap-2">
  <textarea ... className="input-field flex-1 ..." />
  <motion.button
    type="button"
    onClick={() => {
      setIsImportant(!isImportant)
      triggerSelectionHaptic()
    }}
    whileTap={{ scale: 0.85 }}
    className="flex-shrink-0 flex items-center justify-center"
    style={{
      width: 44,
      height: 44,
      color: isImportant ? 'var(--color-danger)' : 'var(--color-text-secondary)',
      opacity: isImportant ? 1 : 0.4,
    }}
    aria-label="Toggle important"
    aria-pressed={isImportant}
    data-testid="create-task-priority-flag"
  >
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.5 1a.5.5 0 01.5.5v1h8.5a.5.5 0 01.4.8L10.5 6l2.4 2.7a.5.5 0 01-.4.8H4v5a.5.5 0 01-1 0V1.5a.5.5 0 01.5-.5z" />
    </svg>
  </motion.button>
</div>
```

The `addTask` store action currently reads `isImportant` from the store's global state (`useSyncStore.getState().isImportant`). With the inline flag, pass `isImportant` explicitly: either update `addTask` to accept it as a parameter, or continue setting `useSyncStore.setState({ isImportant })` before calling `addTask`. The latter requires no store API change.

### Auto-Focus Timing Adjustment

Current implementation (lines 48-54):

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    titleRef.current?.focus()
  }, 50)
  return () => clearTimeout(timer)
}, [])
```

iOS keyboard animation takes approximately 300ms. The 50ms timer fires before the keyboard is fully raised, resulting in scroll jitter. Increase to **150ms** as the minimum safe value that still feels immediate to the user while giving the keyboard time to trigger the `visualViewport` resize.

### Backdrop Blur

Simple CSS change on the backdrop div:

```diff
- <div className="absolute inset-0 bg-black/50" />
+ <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
```

Apply to both `CreateTaskSheet.tsx` and `TaskDetailSheet.tsx` for visual consistency. The `backdrop-blur-sm` value is 4px — lightweight enough for mobile GPUs, noticeable enough to feel premium.

### Notes Field — No Changes

The notes `<textarea>` (lines 151-160) already has correct auto-expand behavior via `handleNotesChange`. Do NOT modify it.

### Cmd/Ctrl+Enter Shortcut — No Changes

The keyboard shortcut handler (lines 57-66) uses `document.addEventListener('keydown', ...)` and is not affected by the `<input>` -> `<textarea>` conversion.

### Project Structure Notes

- Primary file changed: `src/features/capture/components/CreateTaskSheet.tsx`
- Secondary file changed: `src/features/capture/components/TaskDetailSheet.tsx` (backdrop blur only)
- `titleRef` type change from `HTMLInputElement` to `HTMLTextAreaElement` is the only type-level change
- The `PriorityPill` import can be removed from CreateTaskSheet (it moves to inline flag)
- No store action signature changes required (use `useSyncStore.setState({ isImportant })` before `addTask`)
- No routing changes
- The `window.visualViewport` API is available in all modern browsers (iOS Safari 13+, Chrome 61+); the `if (!viewport) return` guard provides safe fallback

### References

- Epic 8 Planning Doc, Story 8.4 Technical Notes: `_bmad-output/planning-artifacts/epic-8-planning.md#Story-8.4`
- Current `CreateTaskSheet.tsx` implementation: `src/features/capture/components/CreateTaskSheet.tsx`
  - `titleRef` declared line 17
  - `sheetRef` declared line 20
  - Auto-focus `useEffect` lines 48-54
  - `handleNotesChange` auto-expand pattern lines 69-73
  - `<input type="text">` (to replace) lines 124-139
  - `<textarea>` notes field (reference pattern) lines 151-160
- Architecture Constraints: `_bmad-output/planning-artifacts/epic-8-planning.md#Architecture-Constraints`
  - AC4: Bottom sheet pattern — reference `CreateTaskSheet.tsx` as canonical example (no structural changes needed)
  - AC6: `useReducedMotion()` already applied in this component (no new animated elements added — but the "Captured!" indicator should respect reduced motion)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blockers._

### Completion Notes List

- Tasks 1-9: Rewrote `CreateTaskSheet.tsx` with all polish changes in one pass.
- Task 1: `visualViewport` resize listener attached to `sheetRef` for iOS keyboard anchoring.
- Task 2: Title `<input>` → `<textarea rows={1}>` with `handleTitleChange` auto-expand.
- Task 3: Auto-focus delay increased 50ms → 150ms.
- Task 4: Both `<label>` elements removed; `aria-label` added to both fields.
- Task 5: `onClose()` removed from `handleSubmit`; form resets in-place with focus return.
- Task 6: `PriorityPill` replaced with inline flag SVG button (`create-task-priority-flag`); local `isImportant` state; haptic on toggle.
- Task 7: `backdrop-blur-sm` applied to `CreateTaskSheet` and `TaskDetailSheet`.
- Task 8: `captured` state + `AnimatePresence` checkmark/Captured! indicator (~800ms).
- Task 9: Button label "Add Task" → "Capture", full width.
- Task 10: All existing behaviors verified via passing tests (Enter focus, backdrop close, Cmd+Enter, swipe-dismiss).
- Task 11: 6 new/updated tests; all 17 tests pass. 374/375 suite passes (1 pre-existing AuthForm failure unrelated to this story).

### File List

- `src/features/capture/components/CreateTaskSheet.tsx`
- `src/features/capture/components/CreateTaskSheet.test.tsx`
- `src/features/capture/components/TaskDetailSheet.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/8-4-task-creation-flow-polish.md`
