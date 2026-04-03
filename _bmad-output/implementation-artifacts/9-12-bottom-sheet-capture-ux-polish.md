# Story 9.12: Bottom Sheet Capture UX Polish

Status: ready-for-dev

## Story

As a mobile user capturing tasks,
I want the bottom sheet to close immediately after I tap "Capture" and to have proper padding and scroll behavior when typing in the description field,
so that task capture feels instant and I can always see what I'm typing without the keyboard obscuring my input.

## Acceptance Criteria

1. **[Instant Dismiss on Capture]** Given the CreateTaskSheet is open and I have entered a valid task title, when I tap the "Capture" button (normal capture flow), then the bottom sheet closes immediately after the task is created — it does NOT stay open waiting for a second task.

2. **[Success Feedback Before Dismiss]** Given I tap "Capture" and the sheet is closing, when the task is successfully created, then I still see a brief confirmation signal (e.g. the existing green flash on the task list behind the sheet via `onTaskCreated` / `newestTaskId`) so I know it worked — but no in-sheet "Captured!" indicator delays the dismissal.

3. **[Bottom Padding on CreateTaskSheet]** Given the CreateTaskSheet is open on a mobile device, when I view the sheet content, then there is adequate bottom padding (safe area + extra breathing room) below the action row so buttons and content are not cramped against the device's bottom edge or home indicator.

4. **[Bottom Padding on TaskDetailSheet]** Given the TaskDetailSheet is open on a mobile device, when I view the sheet content, then it also has adequate bottom padding consistent with the CreateTaskSheet, for visual consistency across all bottom sheets.

5. **[Description Input Scroll on Focus — CreateTaskSheet]** Given the CreateTaskSheet is open and I tap the notes/description textarea, when the on-screen keyboard appears, then the view scrolls up enough that the description textarea and its content are fully visible above the keyboard — I can see what I am typing at all times.

6. **[Description Input Scroll on Focus — TaskDetailSheet Parity]** Given the TaskDetailSheet already handles keyboard scroll correctly for its notes field, when we apply fixes for the CreateTaskSheet, then the TaskDetailSheet scroll behavior is not regressed and continues to work correctly.

7. **[Keyboard Shortcut Preserved]** Given the CreateTaskSheet is open, when I press Cmd/Ctrl+Enter, then the task is created and the sheet closes (same instant-dismiss behavior as the Capture button).

8. **[Swipe/Backdrop Dismiss Unchanged]** Given the CreateTaskSheet is open, when I swipe down on the sheet or tap the backdrop, then the sheet closes as before without creating a task — this behavior is unchanged.

## Tasks / Subtasks

- [ ] **T1: Change Capture button to close sheet after submit** (AC: 1, 2, 7)
  - [ ] T1.1: In `src/features/capture/components/CreateTaskSheet.tsx`, modify `handleSubmit` to call `onClose()` after creating the task — reverting the "add another" behavior from Story 8.4 to an instant-dismiss flow
  - [ ] T1.2: Remove the form reset logic that keeps the sheet open (lines 47-62: resetting `isImportant`, `title`, `notes`, `setCaptured(true)`, textarea height resets, and the re-focus `setTimeout`)
  - [ ] T1.3: Remove the `captured` state variable and associated `useEffect` timer (lines 16, 23-28), as the in-sheet "Captured!" indicator is no longer needed
  - [ ] T1.4: Remove the `AnimatePresence` block rendering the "Captured!" indicator (lines 147-163 approx, `data-testid="captured-indicator"`)
  - [ ] T1.5: Ensure `onTaskCreated(newTask.id)` is still called BEFORE `onClose()` so the parent `App.tsx` can set `newestTaskId` for the green flash animation on the task list behind the sheet
  - [ ] T1.6: Verify `handleClose` (backdrop/swipe dismiss) still resets state and calls `onClose()` without creating a task — no changes needed there

- [ ] **T2: Add bottom padding / safe area to BottomSheet** (AC: 3, 4)
  - [ ] T2.1: In `src/components/ui/BottomSheet.tsx`, increase the bottom padding on the sheet surface `motion.div` (currently `pb-6`) to account for mobile safe areas. Use `pb-10` or `env(safe-area-inset-bottom)` via inline style as a minimum, so the content has breathing room above the home indicator on notched devices
  - [ ] T2.2: Alternatively, add a safe-area-aware padding: combine a base padding (e.g. `pb-8`) with `env(safe-area-inset-bottom)` using CSS `calc()` or a `padding-bottom` inline style like `calc(2rem + env(safe-area-inset-bottom, 0px))` on the sheet surface
  - [ ] T2.3: Since `BottomSheet` is shared by both `CreateTaskSheet` and `TaskDetailSheet` (and other sheets like `SyncErrorSheet`, `SettingsSheet`), this change automatically applies to all bottom sheets — verify no sheet is adversely affected by the increased padding
  - [ ] T2.4: Check `<meta name="viewport">` in `index.html` includes `viewport-fit=cover` which is required for `env(safe-area-inset-bottom)` to work on iOS

- [ ] **T3: Fix description textarea scroll-into-view on keyboard focus** (AC: 5, 6)
  - [ ] T3.1: In `src/features/capture/components/CreateTaskSheet.tsx`, add an `onFocus` handler to the notes textarea that scrolls the textarea into view when the keyboard opens. Use `scrollIntoView({ behavior: 'smooth', block: 'center' })` or `block: 'nearest'` on the textarea element
  - [ ] T3.2: Add a small delay (100-200ms) before `scrollIntoView` to let the keyboard animation start and the `visualViewport` resize to take effect — the existing `visualViewport` resize listener (lines 99-112) adjusts `paddingBottom` but does not scroll the content
  - [ ] T3.3: Consider wrapping the form content in a scrollable container (`overflow-y: auto` with `max-height`) if the sheet content can exceed the visible area when the keyboard is open. The `TaskDetailSheet` already uses `max-h-[85vh] overflow-y-auto` (line 156) which is why it works — `CreateTaskSheet` currently has no such scroll container
  - [ ] T3.4: Add `max-h-[70vh] overflow-y-auto` (or similar) to the form container `div` in `CreateTaskSheet` so the content becomes scrollable when the keyboard reduces available space
  - [ ] T3.5: Test that the title textarea still gets auto-focused on sheet open without scroll interference (the `preventScroll: true` option on lines 71, 76 should handle this)

- [ ] **T4: Update tests** (AC: 1, 2, 8)
  - [ ] T4.1: In `src/features/capture/components/CreateTaskSheet.test.tsx`, update the test that asserts "after submit, sheet remains open and title field is empty" — it should now assert `onClose` is called after submit
  - [ ] T4.2: Remove or update any test asserting the "Captured!" indicator appears (`data-testid="captured-indicator"`)
  - [ ] T4.3: Add test: submitting calls `onTaskCreated` then `onClose` in order
  - [ ] T4.4: Verify existing tests for backdrop close, Cmd+Enter submit, and swipe-dismiss still pass

## Dev Notes

### Architecture Context

The current `CreateTaskSheet` was designed in Story 8.4 to support rapid multi-capture: after tapping "Capture", the sheet stays open, resets the form, shows a "Captured!" flash, and re-focuses the title field. The user feedback says this feels wrong for normal (non-power-user) capture -- they expect the sheet to close immediately. This story reverts to instant-dismiss.

If a "multi-capture" or "rapid fire" mode is desired in the future, it could be re-introduced as an opt-in (e.g. long-press FAB for multi-capture mode). That is out of scope for this story.

### Key Files

- **`src/features/capture/components/CreateTaskSheet.tsx`** — Primary file. Remove multi-capture flow, add scroll fix, add bottom padding awareness
- **`src/features/capture/components/CreateTaskSheet.test.tsx`** — Update tests for new dismiss behavior
- **`src/components/ui/BottomSheet.tsx`** — Shared bottom sheet. Increase bottom padding for safe area
- **`src/features/capture/components/TaskDetailSheet.tsx`** — Reference for scroll container pattern (`max-h-[85vh] overflow-y-auto` on line 156). This sheet already works correctly for keyboard scroll — replicate the pattern in CreateTaskSheet
- **`src/App.tsx`** — Parent component. `onClose={() => setShowCreateSheet(false)}` and `onTaskCreated` callback wiring. No changes needed here.
- **`src/features/capture/components/CreateTaskFAB.tsx`** — FAB that opens the sheet. No changes needed.

### Bottom Padding Strategy

The `BottomSheet` component currently has `pb-6` (1.5rem) on the sheet surface. On devices with a home indicator (iPhone X+), this is insufficient. The fix should use `env(safe-area-inset-bottom)` to add device-specific padding:

```css
padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
```

This requires `viewport-fit=cover` in the viewport meta tag. Verify it exists in `index.html`.

### Scroll-into-View Pattern

The `TaskDetailSheet` works because it wraps content in a scroll container:
```tsx
<div className="max-h-[85vh] overflow-y-auto flex flex-col gap-1">
```

The `CreateTaskSheet` lacks this. When the keyboard opens and the `visualViewport` resize handler adds `paddingBottom` to the sheet, the notes field can be pushed below the visible area with no way to scroll to it.

Fix: Add a similar scroll container to `CreateTaskSheet` and add `onFocus` scroll-into-view on the notes textarea:

```tsx
<textarea
  onFocus={() => {
    setTimeout(() => {
      notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 150)
  }}
  ...
/>
```

### What NOT to Change

- The `onTaskCreated` callback must still fire (it triggers the green flash on the task card in the list behind the sheet)
- The `handleClose` function (backdrop/swipe) should remain as-is
- The `visualViewport` resize handler for iOS keyboard positioning stays
- The auto-focus behavior on sheet open stays
- The Enter-to-notes-focus keyboard shortcut stays
- The Cmd/Ctrl+Enter submit shortcut stays (but should now also dismiss)

### References

- [Source: `src/features/capture/components/CreateTaskSheet.tsx`] — current implementation with multi-capture flow
- [Source: `src/components/ui/BottomSheet.tsx`] — shared sheet with `pb-6` padding
- [Source: `src/features/capture/components/TaskDetailSheet.tsx`, line 156] — scroll container reference pattern
- [Source: `_bmad-output/implementation-artifacts/8-4-task-creation-flow-polish.md`] — Story 8.4 that introduced the multi-capture flow (being partially reverted)
- [Source: captured-ideas-tholo91.md] — original user feedback about dismiss behavior and padding/scroll issues
