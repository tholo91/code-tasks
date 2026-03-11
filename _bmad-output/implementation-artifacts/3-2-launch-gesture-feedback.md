# Story 3.2: Signature "Launch" Gesture & Visual Feedback

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to use a vertical swipe-up gesture to "launch" my idea into the vault,
so that I get a tactile and satisfying sense of closure after capturing an idea.

## Acceptance Criteria

1. [x] **Launch Trigger:** A vertical swipe-up gesture on the "Pulse" input area triggers the "Launch" sequence (FR5).
2. [x] **Animated Collapse:** Upon launch, the text area collapses and a "ghost" of the task follows the finger/gesture with a springy, upward flick (FR6).
3. [x] **Landing Animation:** The launched task "lands" in the list below with a springy bounce, reinforcing the "vault" metaphor (FR6).
4. [x] **Feedback Latency:** Visual feedback (initiation of the animation) occurs in < 100ms (FR6).
5. [x] **Haptic Confirmation:** A distinct haptic pattern (Light/Sharp) triggers upon successful launch initiation (UX Requirement).
6. [x] **State Clearance:** The Pulse input is cleared instantly upon launch, and the cursor returns to the start for the next spark.
7. [x] **Keyboard Shortcut:** `Cmd+Enter` (Mac) or `Ctrl+Enter` (Windows/Linux) triggers the same "Launch" animation for keyboard-centric users.

## Tasks / Subtasks

- [ ] Implement Gesture Recognition (AC: 1, 7)
  - [ ] Use `framer-motion` (or `motion`) to detect `drag` events on the Pulse input area.
  - [ ] Configure `dragConstraints` and `dragElastic` for a tactile, "springy" resistance.
  - [ ] Implement a `Cmd+Enter` key listener to trigger the launch action.
- [ ] Implement Animation Sequence (AC: 2, 3, 4)
  - [ ] Create the "Launch" animation sequence:
    - **Step 1:** Collapse text area (`scaleY: 0`, `opacity: 0`).
    - **Step 2:** Animate "ghost" task element upward (`translateY: -200px`).
    - **Step 3:** Trigger the "Task Card" landing in the list component.
  - [ ] Use spring physics: `stiffness: 400, damping: 30` for a snappy, responsive feel.
- [ ] Implement Feedback Mechanisms (AC: 5, 6)
  - [ ] Integrate Capacitor's Haptics API for the "Capture" vibration pattern.
  - [ ] Ensure the Pulse draft state in `useSyncStore.ts` is cleared as part of the launch action.
- [ ] Integration & Testing (AC: 4)
  - [ ] Verify animation latency using the Performance tab in Chrome DevTools.
  - [ ] Ensure the gesture works smoothly on both touch-first (Mobile) and mouse-first (Desktop) environments.

## Dev Notes

- **Framer Motion Performance:** Animate only `transform` and `opacity` to maintain 60 FPS. Never animate layout properties like `height` or `margin`.
- **Haptics:** Use Capacitor's `Haptics.impact({ style: ImpactStyle.Light })` for the launch confirmation.
- **Spring Curves:** Follow the "Snappy/Responsive" preset: `stiffness: 400, damping: 30`.

### Project Structure Notes

- **Capture Module:** `src/features/capture/`
- **Animation Components:** `src/features/capture/components/LaunchAnimation.tsx`
- **Haptics Service:** `src/services/native/haptic-service.ts`

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#2.5 Experience Mechanics - The Pulse Launch]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR6]
- [Source: Web Research - March 11, 2026: Framer Motion (Motion) 60 FPS Best Practices]

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
