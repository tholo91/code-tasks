# Story 9.10: Status Pill Redesign (Auto-Compact Animation)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile user,
I want the sync status pill in the header to show the full timestamp ("just now" / "2h ago") for 5 seconds and then animate to a compact dot/checkmark,
so that I always get a quick status glance without the pill permanently occupying header space.

## Acceptance Criteria

1. **[Full-to-Compact Transition]** Given a successful sync or app load with a `lastSyncedAt` value, when the synced badge renders, then it shows the full label (e.g. "just now" or "2h ago") for 5 seconds, then slide-animates horizontally to a compact form showing only the green checkmark dot.

2. **[Tap-to-Expand]** Given the pill is in its compact (dot) state, when I tap it, then it slide-animates back to its full-width form showing the timestamp text for another 5 seconds before auto-compacting again.

3. **["Just now" Label]** Given the last sync completed less than 60 seconds ago, when the pill renders or expands, then it shows "just now" instead of "0m ago" or similar.

4. **[Reduced Motion Respect]** Given the user has `prefers-reduced-motion` enabled, when the pill transitions between full and compact states, then it uses instant opacity fade (no slide animation) with the same timing.

5. **[Non-Synced States Unaffected]** Given the sync status is syncing, error, conflict, or pending, when those states render, then they show the full badge as before with no auto-compact behavior (only the green "synced" state compacts).

6. **[Error State Tappable]** Given the sync status is error, when I tap the red pill, then the SyncErrorSheet opens (preserving the existing behavior from the current implementation).

## Tasks / Subtasks

- [ ] **T1: Add "just now" support to formatTimeAgo** (AC: 3)
  - [ ] T1.1: In `src/utils/format-time.ts`, update `formatTimeAgo` to return `"just now"` when the timestamp is less than 60 seconds ago (currently returns "0m ago" or "1m ago")
  - [ ] T1.2: Update any existing tests for `formatTimeAgo` to cover the "just now" case

- [ ] **T2: Refactor SyncHeaderStatus for compact/expanded state** (AC: 1, 2, 4, 5, 6)
  - [ ] T2.1: Add local state: `isExpanded: boolean` (default `true`) and `expandTimerRef: useRef<ReturnType<typeof setTimeout>>`
  - [ ] T2.2: Add `useEffect` that starts the 5-second auto-compact timer whenever `isExpanded` is `true` AND status is `synced`. On timer fire, set `isExpanded = false`. Clear timer on unmount or status change.
  - [ ] T2.3: Reset `isExpanded = true` whenever `syncEngineStatus` transitions to `success` (new sync completed) — use a `useEffect` watching `syncEngineStatus` or `lastSyncedAt`
  - [ ] T2.4: Add `onClick` handler to the synced badge: if compact, set `isExpanded = true` (which re-triggers the 5s timer via T2.2)
  - [ ] T2.5: Wrap the synced badge content in a Framer Motion `motion.button` (for tappability) with `AnimatePresence mode="wait"`:
    - **Expanded:** Renders `<SyncStatusIcon state="synced" />` + timestamp text. Animate with `initial={{ width: 'auto', opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0, width: 28 }}` using `TRANSITION_NORMAL`
    - **Compact:** Renders only `<SyncStatusIcon state="synced" />` inside a 28x28px rounded-full container. Animate with `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`
  - [ ] T2.6: Use `useReducedMotion()` from Framer Motion — if reduced motion preferred, skip the slide width animation and use only opacity transitions with `duration: 0.15`
  - [ ] T2.7: Preserve existing error, conflict, syncing, and pending badge renders unchanged (the `isExpanded` logic only applies inside the `synced` branch at the bottom of the component)
  - [ ] T2.8: Keep the `cursor-pointer` class and `role="button"` on the compact dot so it's clear it's tappable
  - [ ] T2.9: Ensure the compact dot meets the 44x44px minimum touch target (use `min-w-[44px] min-h-[44px]` with the visual dot centered inside, or use padding to achieve the target area)

- [ ] **T3: Animation tuning** (AC: 1, 2)
  - [ ] T3.1: Use `TRANSITION_NORMAL` (0.3s ease) from `src/config/motion.ts` for the expand/compact transitions — matches existing badge transition feel
  - [ ] T3.2: Add `overflow: hidden` to the badge container during transition to prevent text overflow during width change
  - [ ] T3.3: Use `layout` prop on the badge wrapper for smooth layout shifts when the pill changes width within the header flex container

- [ ] **T4: Tests** (AC: 1, 2, 3, 5)
  - [ ] T4.1: Unit test for `formatTimeAgo` — returns "just now" for timestamps < 60s ago
  - [ ] T4.2: Component test for `SyncHeaderStatus` — renders full label initially, then after 5s (fake timers) renders compact dot
  - [ ] T4.3: Component test — tapping compact dot re-expands to full label
  - [ ] T4.4: Component test — error/conflict/pending/syncing states render unchanged (no compact behavior)

## Dev Notes

### Current SyncHeaderStatus Architecture

The component (`src/components/layout/SyncHeaderStatus.tsx`) is a stateful component that reads from `useSyncStore` and renders different badge variants based on `syncEngineStatus`. It was recently modified to make the error state tappable (opens `SyncErrorSheet`).

The component uses early returns for each state:
1. `syncing` → blue badge with spinning icon
2. `conflict` → red badge
3. `error` → red badge (tappable button → opens SyncErrorSheet)
4. `pending` → amber badge with count
5. `synced` → green badge with `formatTimeAgo(lastSyncedAt)` ← **this is the state to redesign**

### Animation Strategy

Use Framer Motion's `AnimatePresence` with `mode="wait"` to smoothly transition between expanded and compact pill states. The width change is the key visual — use `animate={{ width: 'auto' }}` for expanded and `animate={{ width: 28 }}` for compact, with `overflow: hidden` on the container to clip during transition.

Do NOT use CSS `transition` for the width — Framer Motion's spring/ease engine handles this more consistently and integrates with `useReducedMotion()`.

### Touch Target Compliance

The compact dot will visually be ~12-16px but must have a 44x44px touch area. Use transparent padding or a larger hit area wrapper:
```tsx
<motion.button
  className="flex items-center justify-center"
  style={{ minWidth: 44, minHeight: 44 }}
>
  <SyncStatusIcon state="synced" size={12} />
</motion.button>
```

### Timer Management

Use a `useRef` for the timer ID and clean it up in the effect cleanup. Reset the timer on every expansion (clear old timer, start new 5s timer). This prevents stale timers from collapsing the pill mid-interaction.

```
User opens app → pill shows "2h ago" (expanded)
  |-- 5 seconds pass --→ pill animates to compact dot
  |
User taps dot → pill expands to "2h ago"
  |-- 5 seconds pass --→ pill compacts again
  |
New sync completes → pill shows "just now" (expanded, timer resets)
  |-- 5 seconds pass --→ pill compacts
```

### Project Structure Notes

- Component: `src/components/layout/SyncHeaderStatus.tsx` — primary file to modify
- Time util: `src/utils/format-time.ts` — add "just now" support
- Motion config: `src/config/motion.ts` — reuse `TRANSITION_NORMAL`
- Badge CSS: `src/index.css` (lines 183-215) — `.badge`, `.badge-green` classes. May need a `.badge-compact` variant or inline styles for the dot state
- No new files needed — all changes are to existing files

### Architecture Compliance

- **Zustand:** No new store fields needed. `lastSyncedAt` and `syncEngineStatus` already exist.
- **Framer Motion v12+:** Use `motion.button`, `AnimatePresence`, `useReducedMotion()` — all already imported/available in the project.
- **TailwindCSS 4:** Use utility classes for sizing (`min-w-[44px]`, `rounded-full`) — follows existing patterns.
- **Testing:** Follow existing patterns in `src/features/sync/components/SyncFAB.test.tsx` — mock framer-motion, use fake timers.

### References

- [Source: `src/components/layout/SyncHeaderStatus.tsx`] — component to modify
- [Source: `src/components/ui/SyncStatusIcon.tsx`] — icon component (no changes needed)
- [Source: `src/utils/format-time.ts`] — time formatting utility
- [Source: `src/config/motion.ts`] — animation constants
- [Source: `src/index.css#L183-L215`] — badge CSS classes
- [Source: `src/features/sync/components/SyncErrorSheet.tsx`] — error sheet (preserve existing integration)
- [Source: `src/components/ui/BottomSheet.tsx`] — sheet pattern reference
- [Source: architecture.md#Frontend Architecture] — Framer Motion v12+, useReducedMotion, spring physics
- [Source: captured-ideas-tholo91.md, line 33-34] — original captured idea

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
