# Story 9.12: Bottom Sheet Capture UX Polish

Status: done

## Story

As a User,
I want the capture bottom sheet to dismiss instantly after tapping "Capture", have proper safe-area padding on notched devices, and scroll the notes field into view when focused,
so that the capture flow feels fast, native, and fully usable on modern mobile devices.

## Acceptance Criteria

1. **Instant dismiss on capture**: Given I have entered a task title and tapped "Capture", when the task is created, then the bottom sheet closes immediately — no delay, no "stay open for another task" behavior.

2. **Bottom safe-area padding**: Given I am using a device with a home indicator / notch (e.g., iPhone with Face ID), when the bottom sheet is open, then there is comfortable padding at the bottom that accounts for `env(safe-area-inset-bottom)`, so the action buttons are never obscured by the home indicator.

3. **Description scroll-into-view**: Given the bottom sheet is open and I tap the Notes/description textarea, when the keyboard opens, then the textarea scrolls into view so I can see what I am typing.

## Tasks / Subtasks

- [x] Task 1: Verify instant dismiss behavior (AC: #1)
  - [x] Confirm `handleSubmit` in `CreateTaskSheet.tsx` calls `onClose()` after task creation
  - [x] Fix stale tests that expected the sheet to stay open after submit (from Story 8.4 multi-capture era)
  - [x] Update test descriptions to reflect "instant dismiss" behavior

- [x] Task 2: Bottom safe-area padding (AC: #2)
  - [x] Update `BottomSheet.tsx` paddingBottom from `max(1.5rem, env(safe-area-inset-bottom, 1.5rem))` to `calc(1.5rem + env(safe-area-inset-bottom, 0px))`
  - [x] This ensures 1.5rem of padding PLUS the safe area inset, rather than choosing the larger of the two

- [x] Task 3: Verify description scroll-into-view (AC: #3)
  - [x] Confirm `onFocus` handler on notes textarea calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` with a 300ms delay
  - [x] Already implemented in CreateTaskSheet.tsx — no changes needed

- [x] Task 4: Run tests and build
  - [x] `npm test` — CreateTaskSheet tests all pass (17/17)
  - [x] `npm run build` — clean production build

## Dev Notes

### Instant Dismiss

Story 8.4 introduced a "multi-capture" flow where the sheet stayed open after submitting a task, with a brief "Captured!" flash and cursor return to the title field. This was later changed to close immediately on capture (better UX — users prefer to see their task in the list right away). The code already calls `onClose()` in `handleSubmit`, but two tests from the 8.4 era still expected `onClose` NOT to be called. These tests have been corrected.

### Safe Area Padding

The previous formula `max(1.5rem, env(safe-area-inset-bottom, 1.5rem))` meant that on notched devices the safe area inset REPLACED the base padding. The new formula `calc(1.5rem + env(safe-area-inset-bottom, 0px))` ADDS the base padding to the safe area, ensuring content is always comfortably above the home indicator. On non-notched devices, the fallback `0px` means just 1.5rem padding (same as before).

### Scroll-Into-View

The notes textarea's `onFocus` handler already calls `scrollIntoView` with a 300ms delay to wait for the keyboard to appear. No code changes needed — just verified it works correctly.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- Fixed 2 stale tests expecting sheet to stay open after submit (from Story 8.4 multi-capture era)
- Updated BottomSheet safe-area padding formula to add base padding ON TOP of safe area inset
- Verified scroll-into-view on notes focus already implemented correctly
- All 17 CreateTaskSheet tests passing, clean build

### File List

**Modified:**
- `src/components/ui/BottomSheet.tsx` — updated paddingBottom formula for better safe-area support
- `src/features/capture/components/CreateTaskSheet.test.tsx` — fixed 2 stale tests expecting sheet to stay open

### Change Log

- 2026-04-03: Implemented Story 9.12 — Bottom Sheet Capture UX Polish (instant dismiss, safe-area padding, scroll-into-view)
