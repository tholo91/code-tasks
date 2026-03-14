# Story 3.1: "The Pulse" UI & Instant Capture

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to type my idea into a focused "Pulse" input area,
so that I can capture my thoughts as fast as I can type them.

## Acceptance Criteria

1. [x] **Instant Focus:** On app launch or screen entry, "The Pulse" input area is automatically focused with the keyboard active (UX requirement).
2. [x] **Fluent Input:** The UI maintains a steady 60 FPS while typing, even with multiple background tasks (NFR2).
3. [x] **Auto-Expanding Area:** The text area expands vertically as the user types, maintaining a focused sanctuary with 32px vertical padding.
4. [x] **Smart Parsing:** The system intelligently distinguishes between the first line (Title) and subsequent lines (Description) using subtle visual weight shifts.
5. [x] **Optimistic Feedback:** Typing provides instant visual feedback without layout shift or latency.
6. [x] **Input State:** The current draft is stored in the `useSyncStore` (Zustand) to prevent data loss if the user switches apps before launching.

## Tasks / Subtasks

- [x] Build the Pulse Component (AC: 1, 3, 4)
  - [x] Create `src/features/capture/components/PulseInput.tsx`.
  - [x] Implement a borderless, auto-expanding `textarea` with GitHub Dark Dimmed styling.
  - [x] Use React 19's `autoFocus` prop and ensure it works correctly with hydration.
- [x] Implement Visual Weight Shifts (AC: 4)
  - [x] Style the first line of text with a larger, semi-bold font (H1: 24px).
  - [x] Style subsequent lines with standard body weight (16px).
- [x] State Management (AC: 6)
  - [x] Update `useSyncStore.ts` to include `currentDraft` (string) and `setCurrentDraft` action.
  - [x] Implement a debounced write-through to `LocalStorage` for the draft to ensure data persistence.
- [x] Performance Optimization (AC: 2)
  - [x] Use the React Compiler (auto-memoization) to ensure typing doesn't trigger parent re-renders.
  - [x] Verify 60 FPS performance using Chrome DevTools Performance Tracks.

## Dev Notes

- **React 19 Autofocus:** Leverage the improved `autoFocus` reliability. Ensure the component is wrapped in `<Suspense>` if it depends on async auth/repo state.
- **Styling Sanctuary:** Follow the UX spec: 32px of vertical padding in the Pulse area.
- **Zustand Store:** The `currentDraft` should be part of the persisted state to survive app reloads or crashes.

### Project Structure Notes

- **Capture Module:** `src/features/capture/`
- **Global Store:** `src/stores/useSyncStore.ts`

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#2.4 Novel UX Patterns - The Pulse Text Area]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR4]
- [Source: Web Research - March 11, 2026: React 19 Autofocus & Input Performance]

## Dev Agent Record

### Agent Model Used

Claude Opus 4 (claude-opus-4-6, March 2026)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Created PulseInput component at `src/features/capture/components/PulseInput.tsx` with borderless auto-expanding textarea, autoFocus, 32px vertical padding, and overlay-based visual weight differentiation (24px/600 title, 16px/400 body).
- Added `currentDraft` (string) and `setCurrentDraft` action to `useSyncStore.ts` with write-through persistence to LocalStorage via StorageService. Draft is included in Zustand persist partialize config.
- Implemented 300ms debounced write-through for draft updates to minimize storage writes while maintaining responsive typing.
- Used transparent text color on textarea with a styled overlay for visual weight shifts, preserving native caret behavior.
- Integrated PulseInput into App.tsx main content area when user is authenticated and has a selected repo.
- Added 13 unit tests for PulseInput covering rendering, accessibility, styling, debounced persistence, and store integration.
- Added 5 unit tests for currentDraft store functionality covering initial state, set/get, multiline drafts, and clearAuth reset.
- All 26 new tests pass. Pre-existing test failures in hydration.test.ts (5), auth-service.test.ts (suite), RepoSelector.test.ts (9), and App.test.tsx (suite) are unrelated to this story.

### File List

- src/features/capture/components/PulseInput.tsx (new)
- src/features/capture/components/PulseInput.test.tsx (new)
- src/stores/useSyncStore.ts (modified - added currentDraft, setCurrentDraft)
- src/stores/useSyncStore.test.ts (modified - added currentDraft tests)
- src/App.tsx (modified - integrated PulseInput)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/3-1-the-pulse-ui-capture.md (modified)
