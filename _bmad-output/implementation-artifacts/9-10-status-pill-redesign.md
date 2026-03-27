# Story 9.10: Status Pill Redesign (Auto-Compact Animation)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile user,
I want the sync status pill in the header to briefly show its label and then auto-compact to a colored dot,
so that I always get a quick status glance without the pill permanently occupying header space.

## Acceptance Criteria

1. **[Synced Auto-Compact]** Given a successful sync or app load with a `lastSyncedAt` value, when the synced badge renders, then it shows the full green label (e.g. "just now" or "2h ago") for 5 seconds, then slide-animates horizontally (text slides left into the dot, dot anchored right) to a compact green dot with checkmark.

2. **[Pending Auto-Compact]** Given there are pending unsynced tasks, when the pending badge renders, then it shows the full amber label (e.g. "3 items") for 5 seconds, then auto-compacts to a compact amber dot using the same animation as the synced state.

3. **[Tap-to-Expand]** Given any pill is in its compact dot state (green or amber), when I tap it, then it slide-animates back to its full-width form showing the label text for another 5 seconds before auto-compacting again.

4. **["Just now" Label]** Given the last sync completed less than 60 seconds ago, when the synced pill renders or expands, then it shows "just now" instead of "0m ago" or similar.

5. **[Reduced Motion Respect]** Given the user has `prefers-reduced-motion` enabled, when the pill transitions between full and compact states, then it uses instant opacity fade (no slide animation) with the same 5-second timing.

6. **[Error/Conflict Always Extended]** Given the sync status is error or conflict (red badge), when those states render, then they always stay fully extended — no auto-compact behavior. Error remains tappable and opens the SyncErrorSheet.

7. **[Syncing Always Extended]** Given a sync is actively in progress (blue badge with spinner), when the syncing state renders, then it stays fully extended for the duration of the sync — no auto-compact.

8. **[State Transition Resets Timer]** Given the pill is in any state, when the sync engine status changes (e.g. pending → syncing → synced), then the new state renders expanded and the 5-second auto-compact timer resets.

## Tasks / Subtasks

- [ ] **T1: Add "just now" support to formatTimeAgo** (AC: 4)
  - [ ] T1.1: In `src/utils/format-time.ts`, update `formatTimeAgo` to return `"just now"` when the timestamp is less than 60 seconds ago (currently returns "0m ago" or "1m ago")
  - [ ] T1.2: Update any existing tests for `formatTimeAgo` to cover the "just now" case

- [ ] **T2: Create `useAutoCompact` hook** (AC: 1, 2, 3, 5, 8)
  - [ ] T2.1: Create `src/hooks/useAutoCompact.ts` with signature: `useAutoCompact(active: boolean, delay?: number): { isExpanded: boolean; expand: () => void }`
  - [ ] T2.2: Default `delay = 5000`. When `active` is `true`, start auto-compact timer on mount and after every `expand()` call. When `active` is `false`, always return `isExpanded: true` (states that don't compact).
  - [ ] T2.3: Use `useRef` for timer ID, clean up on unmount and when `active` changes. Reset `isExpanded = true` and restart timer whenever `active` transitions from `false` → `true` (state change resets — AC: 8).
  - [ ] T2.4: Use `useReducedMotion()` from Framer Motion — expose via returned object or let the component handle it (hook only manages timing, not animation)

- [ ] **T3: Refactor SyncHeaderStatus for compact/expanded states** (AC: 1, 2, 3, 6, 7)
  - [ ] T3.1: Determine which states auto-compact: `synced` and `pending` get `useAutoCompact(true)`. States `syncing`, `error`, `conflict` get `useAutoCompact(false)` (always extended).
  - [ ] T3.2: Call `useAutoCompact` once at the top of the component. Derive `active` from: `syncEngineStatus !== 'error' && syncEngineStatus !== 'conflict' && syncEngineStatus !== 'syncing'`. This covers both synced and pending.
  - [ ] T3.3: For **synced** and **pending** branches: wrap in `motion.button` with `onClick={() => expand()}` when compact
  - [ ] T3.4: **Expanded state:** Render full badge as today — icon + label text. Use `AnimatePresence mode="wait"` with `overflow: hidden` on the wrapper. Animate width from full → compact via `animate={{ width: 'auto' }}`.
  - [ ] T3.5: **Compact state:** Render only the colored dot (badge background circle + `SyncStatusIcon`). Visual size ~24-28px. Animate with `animate={{ width: 28 }}`. Dot anchored right — text slides left into the dot on compact.
  - [ ] T3.6: Add `cursor-pointer` and `role="button"` + `aria-label="Expand sync status"` on compact dot. Ensure 44x44px touch target via `min-w-[44px] min-h-[44px]` with visual dot centered.
  - [ ] T3.7: Preserve error branch: `<button>` opening `SyncErrorSheet` — no compact, always full badge (existing implementation unchanged)
  - [ ] T3.8: Preserve syncing branch: always full badge with spinning icon, no interactivity changes
  - [ ] T3.9: Use `useReducedMotion()` — if true, replace width slide with instant opacity fade (`duration: 0.15`)

- [ ] **T4: Animation tuning** (AC: 1, 2)
  - [ ] T4.1: Use `TRANSITION_NORMAL` (0.3s ease) from `src/config/motion.ts` for expand/compact transitions
  - [ ] T4.2: Add `overflow: hidden` + `white-space: nowrap` on badge wrapper during width transition to prevent text wrapping/overflow
  - [ ] T4.3: Use `layout` prop on the badge wrapper for smooth flex container reflows when pill width changes in the header
  - [ ] T4.4: Dot anchored right: use `style={{ originX: 1 }}` or right-aligned overflow hidden so the text appears to slide out from/into the dot

- [ ] **T5: Tests** (AC: 1, 2, 3, 4, 6, 7, 8)
  - [ ] T5.1: Unit test for `formatTimeAgo` — returns "just now" for timestamps < 60s ago
  - [ ] T5.2: Unit test for `useAutoCompact` hook — returns expanded initially, compacts after 5s (fake timers), re-expands on `expand()`, resets when `active` changes
  - [ ] T5.3: Component test for `SyncHeaderStatus` — synced state renders full label initially, compacts after 5s
  - [ ] T5.4: Component test — pending state renders full count initially, compacts after 5s
  - [ ] T5.5: Component test — tapping compact dot (green or amber) re-expands to full label
  - [ ] T5.6: Component test — error and conflict states never compact (always show full badge)
  - [ ] T5.7: Component test — syncing state stays extended (no compact)

## Dev Notes

### Compact Behavior Matrix (Party Mode Consensus)

| State | Color | Extended Content | Compact Form | Auto-Compact? | Tap Action |
|-------|-------|-----------------|--------------|---------------|------------|
| **Synced** | Green | "just now" / "2h ago" + ✓ | Green dot ✓ | Yes (5s) | Expand |
| **Pending** | Amber | "3 items" + sync icon | Amber dot | Yes (5s) | Expand |
| **Syncing** | Blue | "Syncing..." + spinner | — | No (stays extended) | None |
| **Error** | Red | "Sync failed" / "Sync blocked" | — | No (stays extended) | Opens SyncErrorSheet |
| **Conflict** | Red | "Conflict" | — | No (stays extended) | None |

### Current SyncHeaderStatus Architecture

The component (`src/components/layout/SyncHeaderStatus.tsx`) is a stateful component that reads from `useSyncStore` and renders different badge variants based on `syncEngineStatus`. It was recently modified to make the error state tappable (opens `SyncErrorSheet`).

The component uses early returns for each state:
1. `syncing` → blue badge with spinning icon (always extended)
2. `conflict` → red badge (always extended)
3. `error` → red badge button → opens SyncErrorSheet (always extended)
4. `pending` → amber badge with count → **NEW: auto-compacts to amber dot**
5. `synced` → green badge with timestamp → **NEW: auto-compacts to green dot**

### `useAutoCompact` Hook Design (Architect Recommendation)

Single shared hook used by both synced and pending states. Avoids duplicating timer logic.

```ts
// src/hooks/useAutoCompact.ts
function useAutoCompact(active: boolean, delay = 5000): {
  isExpanded: boolean
  expand: () => void
}
```

- `active = true`: starts 5s timer → `isExpanded = false` on fire
- `active = false`: always returns `isExpanded = true` (error/conflict/syncing)
- `expand()`: resets `isExpanded = true` + restarts timer
- When `active` changes (state transition): resets to expanded + restarts timer
- Timer cleaned up on unmount

### Animation Strategy — Horizontal Slide

The dot is the **visual anchor on the right**. The text slides out to the left when expanding, and collapses back into the dot when compacting. Implementation:

- Use Framer Motion `AnimatePresence mode="wait"` on the badge wrapper
- `overflow: hidden` + `white-space: nowrap` on the wrapper during transition
- Expanded: `animate={{ width: 'auto', opacity: 1 }}`
- Compact: `animate={{ width: 28, opacity: 1 }}`
- `style={{ originX: 1 }}` to anchor the animation on the right edge
- Use `TRANSITION_NORMAL` (0.3s ease) from `src/config/motion.ts`

Do NOT use CSS `transition` for the width — Framer Motion handles this more consistently and integrates with `useReducedMotion()`.

### Touch Target Compliance

Compact dot visual size: ~24-28px. Touch target: 44x44px via transparent padding wrapper:
```tsx
<motion.button
  className="flex items-center justify-center"
  style={{ minWidth: 44, minHeight: 44 }}
>
  <SyncStatusIcon state="synced" size={12} />
</motion.button>
```

### Timer & State Transition Flow

```
App opens with lastSyncedAt → pill shows "2h ago" (green, expanded)
  |-- 5s --→ slide-compact to green dot
  |
User taps green dot → slide-expand to "2h ago"
  |-- 5s --→ slide-compact again
  |
User creates task → pending "1 item" (amber, expanded, timer resets)
  |-- 5s --→ slide-compact to amber dot
  |
User taps amber dot → slide-expand to "1 item"
  |-- 5s --→ slide-compact again
  |
User taps SyncFAB → "Syncing..." (blue, always extended)
  |
Sync succeeds → "just now" (green, expanded, timer resets)
  |-- 5s --→ slide-compact to green dot
  |
Sync fails → "Sync failed" (red, always extended, tappable → SyncErrorSheet)
```

### Project Structure Notes

- Component: `src/components/layout/SyncHeaderStatus.tsx` — primary file to modify
- New hook: `src/hooks/useAutoCompact.ts` — shared auto-compact timer logic
- Time util: `src/utils/format-time.ts` — add "just now" support
- Motion config: `src/config/motion.ts` — reuse `TRANSITION_NORMAL`
- Badge CSS: `src/index.css` (lines 183-215) — `.badge`, `.badge-green`, `.badge-amber` classes. May need a `.badge-compact` variant or inline styles for the dot state
- Icon: `src/components/ui/SyncStatusIcon.tsx` — no changes needed

### Architecture Compliance

- **Zustand:** No new store fields needed. `lastSyncedAt`, `syncEngineStatus`, and `pendingSyncCount` already exist.
- **Framer Motion v12+:** Use `motion.button`, `AnimatePresence`, `useReducedMotion()` — all already imported/available in the project.
- **TailwindCSS 4:** Use utility classes for sizing (`min-w-[44px]`, `rounded-full`) — follows existing patterns.
- **Testing:** Follow existing patterns in `src/features/sync/components/SyncFAB.test.tsx` — mock framer-motion, use fake timers.

### References

- [Source: `src/components/layout/SyncHeaderStatus.tsx`] — component to modify
- [Source: `src/components/ui/SyncStatusIcon.tsx`] — icon component (no changes)
- [Source: `src/utils/format-time.ts`] — time formatting utility
- [Source: `src/config/motion.ts`] — animation constants (`TRANSITION_NORMAL`)
- [Source: `src/index.css#L183-L215`] — badge CSS classes
- [Source: `src/features/sync/components/SyncErrorSheet.tsx`] — error sheet (preserve integration)
- [Source: `src/components/ui/BottomSheet.tsx`] — sheet pattern reference
- [Source: architecture.md#Frontend Architecture] — Framer Motion v12+, useReducedMotion, spring physics
- [Source: captured-ideas-tholo91.md, line 33-34] — original captured idea
- [Source: Party Mode discussion 2026-03-27] — Sally (UX), Winston (Architect), Amelia (Dev) consensus on compact behavior matrix

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
