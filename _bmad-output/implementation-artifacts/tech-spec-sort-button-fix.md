# Quick Spec: Sort Button Fix (Manual Mode z-Index)

Status: ready-for-dev

## Problem

When the sort button is clicked while the current sort mode is "Manual" (the default), the dropdown appears transparent/invisible and blocks interaction with the rest of the UI. The user sees an unclickable overlay but no visible dropdown. When a non-manual sort mode is active, the dropdown renders correctly.

The bug is in `src/features/capture/components/TaskToolbar.tsx`, specifically the `dropdownVariants` definition (lines 91-97) used by the sort dropdown's `AnimatePresence` animation.

## Root Cause Analysis

The sort dropdown (line 332-384) is nested inside a parent `motion.div` (key `"tabs"`, line 205) which itself is managed by an outer `AnimatePresence mode="wait"` (line 108). The parent `motion.div` uses `tabsVariants` (lines 36-39) that animate `opacity`:

```tsx
// lines 36-39 — parent animation includes opacity
const tabsVariants: Variants = {
  initial: { opacity: 0, scale: 0.92, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit:    { opacity: 0, scale: 0.92, filter: 'blur(4px)' },
}
```

However, the dropdown's own `dropdownVariants` (lines 91-97) are **missing the `opacity` property entirely**:

```tsx
// lines 91-97 — BUG: no opacity in variants
const dropdownVariants: Variants = prefersReducedMotion
  ? { initial: {}, animate: {}, exit: {} }
  : {
      initial: { scale: 0.95, y: -4 },     // missing opacity: 0
      animate: { scale: 1, y: 0 },          // missing opacity: 1
      exit:    { scale: 0.95, y: -4 },      // missing opacity: 0
    }
```

Compare with the original standalone `SortModeSelector.tsx` (lines 35-41), which correctly includes `opacity`:

```tsx
// SortModeSelector.tsx lines 37-41 — correct reference implementation
initial: { opacity: 0, scale: 0.95, y: -4 },
animate: { opacity: 1, scale: 1, y: 0 },
exit:    { opacity: 0, scale: 0.95, y: -4 },
```

When `TaskToolbar` was created (consolidating the search, filter, and sort controls), the `dropdownVariants` for the sort dropdown lost their `opacity` transitions. Without an explicit `opacity: 1` on the `animate` state, Framer Motion does not guarantee the dropdown becomes fully opaque — the element can remain at `opacity: 0` from its `initial` state or inherit a stale opacity context from the parent `AnimatePresence` tree.

The invisible backdrop (`z-40`, line 322-327) still renders and captures clicks, which is why the user cannot interact with anything else — the modal overlay is present but the dropdown panel is visually invisible.

The reason it "works" with non-manual sort modes is coincidental timing: when the user has previously interacted with the dropdown (switching away from manual), Framer Motion's internal style cache may retain the last animated opacity value, or the re-render cycle differs slightly. The bug is most reliably triggered on first open when the sort mode is still `'manual'`.

## Fix

**File:** `src/features/capture/components/TaskToolbar.tsx`

**Change:** Add `opacity` to the `dropdownVariants` definition (lines 91-97).

Replace lines 93-97:

```tsx
    : {
        initial: { scale: 0.95, y: -4 },
        animate: { scale: 1, y: 0 },
        exit: { scale: 0.95, y: -4 },
      }
```

With:

```tsx
    : {
        initial: { opacity: 0, scale: 0.95, y: -4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: -4 },
      }
```

This matches the working implementation in `SortModeSelector.tsx` (lines 37-41) and ensures the dropdown always transitions from invisible to fully opaque.

No other files need changes. The backdrop z-index (`z-40`) and dropdown z-index (`z-50`) are correct.

## Acceptance Criteria

1. Clicking the sort button when the current mode is "Manual" shows a fully opaque dropdown with all four sort options visible and clickable.
2. Clicking the sort button when the current mode is any non-manual setting continues to work as before.
3. The invisible backdrop dismisses the dropdown on outside click in all modes.
4. The dropdown entry/exit animation is smooth (scale + fade) and matches the behavior of the standalone `SortModeSelector` component.
5. Reduced-motion preference is respected (no animation variants applied).

## Testing

1. **Manual QA — primary scenario:** Open a repo with tasks. Ensure sort mode is "Manual" (default). Tap the sort button. Verify the dropdown is fully visible (opaque background, readable text). Select an option. Verify it applies.
2. **Manual QA — mode cycling:** Switch sort mode to "Newest First", close dropdown, reopen. Switch to "Manual", close, reopen. Verify dropdown is always opaque on every open.
3. **Manual QA — backdrop dismiss:** Open the dropdown, tap outside. Verify it closes and the UI is interactive again.
4. **Existing tests:** Run `npm test -- SortModeSelector` and `npm test -- TaskToolbar` (if toolbar tests exist) to verify no regressions.
5. **Visual check:** Inspect the dropdown in browser devtools. Confirm the `motion.div[role="listbox"]` has `opacity: 1` when in the `animate` state.
