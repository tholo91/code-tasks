# Story 3.3: Priority Toggles ("Important" Pills)

Status: ready-for-dev

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

- [ ] Build the Pill Component (AC: 1, 2, 5)
  - [ ] Create `src/features/capture/components/PriorityPill.tsx`.
  - [ ] Implement the "Pill" style using Tailwind v4 or Vanilla CSS following GitHub Primer's `Label` anatomy.
- [ ] Implement Haptic Interaction (AC: 3)
  - [ ] Integrate `@capacitor/haptics` into the pill's click handler.
  - [ ] Call `Haptics.selectionChanged()` on every state flip.
- [ ] State Management (AC: 4)
  - [ ] Update `useSyncStore.ts` to include `isImportant` (boolean) in the `currentDraft` object.
  - [ ] Implement `toggleImportant()` action in the store.
- [ ] Layout & Positioning (AC: 6)
  - [ ] Position the pill within the `PulseInput.tsx` container, ensuring a minimum 44x44px touch target.
  - [ ] Add a subtle spring animation (Framer Motion) when transitioning between states.

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

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
