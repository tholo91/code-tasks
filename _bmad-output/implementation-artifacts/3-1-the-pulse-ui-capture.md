# Story 3.1: "The Pulse" UI & Instant Capture

Status: ready-for-dev

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

- [ ] Build the Pulse Component (AC: 1, 3, 4)
  - [ ] Create `src/features/capture/components/PulseInput.tsx`.
  - [ ] Implement a borderless, auto-expanding `textarea` with GitHub Dark Dimmed styling.
  - [ ] Use React 19's `autoFocus` prop and ensure it works correctly with hydration.
- [ ] Implement Visual Weight Shifts (AC: 4)
  - [ ] Style the first line of text with a larger, semi-bold font (H1: 24px).
  - [ ] Style subsequent lines with standard body weight (16px).
- [ ] State Management (AC: 6)
  - [ ] Update `useSyncStore.ts` to include `currentDraft` (string) and `setCurrentDraft` action.
  - [ ] Implement a debounced write-through to `LocalStorage` for the draft to ensure data persistence.
- [ ] Performance Optimization (AC: 2)
  - [ ] Use the React Compiler (auto-memoization) to ensure typing doesn't trigger parent re-renders.
  - [ ] Verify 60 FPS performance using Chrome DevTools Performance Tracks.

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

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
