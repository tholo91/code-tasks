# Story 3.3: Priority Toggles ("Important" Pills)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to toggle an "Important" flag on my idea before launching it,
so that I can prioritize high-value sparks for immediate action.

## Acceptance Criteria

1. [x] **Pill UI:** A subtle "Important" toggle (pill component) is located within the "Pulse" input area.
2. [x] **Interactive States:** The pill supports two visual states: "Standard" (ghost button/outline) and "Important" (filled accent color).
3. [x] **Haptic Feedback:** Tapping the toggle triggers the `Haptics.selectionChanged()` pattern for a tactile, "native" feel (UX Requirement).
4. [x] **Data Integrity:** Toggling the flag updates the `isImportant` property in the `currentDraft` state within the `useSyncStore`.
5. [x] **Visual Consistency:** Follows the GitHub Primer palette: Border `#30363d`, Active Accent `#58a6ff` (GitHub Blue).
6. [x] **One-Handed Utility:** The toggle is positioned within the "Capture Zone" (bottom-right of the input area) for easy thumb access on mobile devices.

## Tasks / Subtasks

- [x] Build the Pill Component (AC: 1, 2, 5)
  - [x] Create `src/features/capture/components/PriorityPill.tsx`.
  - [x] Implement the "Pill" style using Tailwind v4 or Vanilla CSS following GitHub Primer's `Label` anatomy.
- [x] Implement Haptic Interaction (AC: 3)
  - [x] Integrate `@capacitor/haptics` into the pill's click handler.
  - [x] Call `Haptics.selectionChanged()` on every state flip.
- [x] State Management (AC: 4)
  - [x] Update `useSyncStore.ts` to include `isImportant` (boolean) in the `currentDraft` object.
  - [x] Implement `toggleImportant()` action in the store.
- [x] Layout & Positioning (AC: 6)
  - [x] Position the pill within the `PulseInput.tsx` container, ensuring a minimum 44x44px touch target.
  - [x] Add a subtle spring animation (Framer Motion) when transitioning between states.

## Dev Notes

- **Haptics:** Use Capacitor 8's `selectionChanged()` for the most natural feel on both iOS and Android.
- **Styling:** Adhere to the "Utilitarian Elegance" principle: the toggle should be quiet until activated.
- **Accessibility:** Ensure the pill has an `aria-pressed` attribute and is keyboard-accessible (Space/Enter).

### Project Structure Notes

- **Capture Module:** `src/features/capture/`
- **Native Services:** `src/services/native/haptic-service.ts`

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Micro-Emotions - Trust & Precision]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR5]
- [Source: Web Research - March 11, 2026: Capacitor 8 Haptics Best Practices for Toggles]

## Dev Agent Record

### Agent Model Used

Claude Opus 4 (claude-opus-4-6), March 2026

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Created PriorityPill component with two visual states: ghost/outline (Standard) and filled accent (Important)
- Added `triggerSelectionHaptic()` to haptic-service using Capacitor's `Haptics.selectionChanged()`
- Added `isImportant` boolean and `toggleImportant()` action to useSyncStore
- Integrated PriorityPill into PulseInput capture zone (bottom-right, flex layout with launch hint)
- PriorityPill uses Framer Motion spring animation for state transitions (`whileTap` + spring config)
- Minimum 44x44px touch target for mobile accessibility
- `aria-pressed` attribute and keyboard accessibility (Space/Enter) implemented
- `isImportant` resets to `false` after launch and on clearAuth
- Added `framer-motion` and `@capacitor/haptics` as dependencies
- 11 new PriorityPill tests, 4 new isImportant store tests, 2 new haptic service tests, 3 new PulseInput integration tests

### Change Log

- 2026-03-14: Implemented Story 3-3 Priority Toggles ("Important" Pills)

### File List

- src/features/capture/components/PriorityPill.tsx (new)
- src/features/capture/components/PriorityPill.test.tsx (new)
- src/features/capture/components/PulseInput.tsx (modified)
- src/features/capture/components/PulseInput.test.tsx (modified)
- src/stores/useSyncStore.ts (modified)
- src/stores/useSyncStore.test.ts (modified)
- src/services/native/haptic-service.ts (modified)
- src/services/native/haptic-service.test.ts (modified)
- package.json (modified - added framer-motion, @capacitor/haptics)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
