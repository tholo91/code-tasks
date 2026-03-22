# Story 8.10: List View Card Redesign & Empty State

Status: done

## Story

As a User,
I want the task list to feel clean, scannable, and purposeful — with simplified cards, a clear visual hierarchy, and an inviting empty state,
so that I can see what matters at a glance and the app feels polished from the very first moment.

## Acceptance Criteria

1. Given I view a task card, when I look at the checkbox, then it is a slightly rounded square (not a circle), filled with `color-success` + white checkmark when complete, `color-border` outline when incomplete. Touch target is at least 44x44px.

2. Given I view a task card, when I look at the title, then it is a single line, truncated with ellipsis if too long. Font: `text-body font-medium`, `color-text-primary`. Completed tasks: `line-through`, `color-text-secondary`, `opacity: 0.7`.

3. Given a task has a body/description, when I view the card, then a single line of the description is shown below the title, truncated. Font: `text-caption`, `color-text-secondary`. No description -> no line shown (card is shorter).

4. Given a task is marked important, when I view the card, then a small filled flag icon is visible trailing the title (right side of the title row), colored `color-danger`. Non-important tasks show no icon.

5. Given a task is synced, when I view the card, then NO sync indicator is shown. Given a task has `syncStatus: 'pending'`, then a small amber dot is shown trailing, near the importance icon area.

6. Given the task list is empty (no tasks in the current repo), when I view the main screen, then I see a warm, inviting empty state: a clear "Capture your first thought" heading, a supportive subtitle, and a visual hint pointing toward the (+) FAB. No abstract geometric SVG.

7. Given the list loads for the first time, when tasks render, then cards stagger in from top to bottom with ~40ms delay between each card.

8. Given the completed section header is visible, when I look at the disclosure control, then the chevron is 16x16 (not 12x12) and the count badge is clearly readable.

## Tasks / Subtasks

- [x] Task 1: Redesign TaskCard checkbox — circle to rounded square (AC: #1)
  - [x] SKIPPED — Already done via TaskCheckbox component (22px, 4px radius). Pre-existing and better than story spec (20px/3px).

- [x] Task 2: Simplify TaskCard title row (AC: #2, #4, #5)
  - [x] Remove the sync status dot from between checkbox and title
  - [x] Title: `truncate text-body font-medium`, single line, `color-text-primary`
  - [x] Add trailing container (right side of title row) for status icons:
    - [x] Importance flag: small filled flag SVG (14x14), `color-danger`, only rendered when `task.isImportant`
    - [x] Pending sync dot: small amber circle (6x6), only rendered when `task.syncStatus === 'pending'`
    - [x] Both icons share a `flex items-center gap-1.5` trailing container
  - [x] Completed state: title gets `line-through`, `color-text-secondary`, `opacity: 0.7`

- [x] Task 3: Redesign body preview line (AC: #3)
  - [x] Change body preview from `text-label` to `text-caption` (0.6875rem)
  - [x] Keep `truncate` (single line), `color-text-secondary`
  - [x] Adjust left padding to align with title text — `pl-[30px]` (22px checkbox + 8px gap)
  - [x] If `task.body` is empty/falsy, render nothing (no empty space)
  - [x] Completed body: `opacity: 0.5` (more faded than title)

- [x] Task 4: Clean up TaskCard — remove unused elements (AC: #5)
  - [x] Remove the sync status dot element entirely
  - [x] Remove `isPending` const (no longer used)
  - [x] Kept `isNewest` green background flash for 8.4's "Add Another" flow
  - [x] Removed importance left border + box shadow (replaced by trailing flag icon)

- [x] Task 5: Redesign empty state (AC: #6)
  - [x] Replace the abstract stacked-layers SVG in `App.tsx`
  - [x] New empty state layout:
    - [x] Heading: "Capture your first thought" — `text-title font-semibold`, `color-text-primary`
    - [x] Subtitle: "Tap + to get started" — `text-body`, `color-text-secondary`, `opacity: 0.7`
  - [x] Use `pageVariants` for entrance animation
  - [x] Typography-driven — no illustrations, no heavy graphics

- [x] Task 6: Add list entrance stagger animation (AC: #7)
  - [x] Applied `listContainerVariants` + `listItemVariants` to non-manual sort `<motion.ul>` path
  - [x] Fixed broken stagger on completed section (added missing `variants={listItemVariants}` to children)
  - [x] Skipped stagger on manual sort `Reorder.Group` path to avoid drag-and-drop conflicts
  - [x] `AnimatePresence initial={false}` already prevents re-triggering

- [x] Task 7: Improve completed section header (AC: #8)
  - [x] Increase chevron SVG from 12x12 to 16x16
  - [x] Keep same `viewBox="0 0 12 12"` — SVG scales up
  - [x] `motion.svg` rotation animation unaffected

- [x] Task 8: Update DraggableTaskCard if needed
  - [x] Verified — no changes needed, wrapper passes `isNewest` through correctly

- [x] Task 9: Tests (AC: #1, #2, #3, #4, #5)
  - [x] Update `TaskCard.test.tsx`:
    - [x] Assert no sync indicator when `syncStatus: 'synced'`
    - [x] Assert pending amber dot visible when `syncStatus: 'pending'`
    - [x] Assert flag icon visible when `isImportant: true`
    - [x] Assert no flag icon when `isImportant: false`
    - [x] Assert flag icon shows even when `isNewest: true`
    - [x] Assert body preview uses `text-caption` class
    - [x] Assert body preview opacity 0.5 when completed
  - [x] Update `App.test.tsx`:
    - [x] Assert empty state renders "Capture your first thought" and "Tap + to get started"

## Dev Notes

### TaskCard New Structure

The card layout changes from:

```
[circle-checkbox] [sync-dot] [title ........................]
                              [body preview ................]
```

To:

```
[square-checkbox] [title ......................] [flag?] [dot?]
                  [body preview ................]
```

Key structural changes in JSX:

```tsx
<motion.div layout onClick={...} whileTap={{ scale: 0.98 }} ...>
  {/* Title row */}
  <div className="flex items-center gap-2">
    {/* Checkbox — rounded square */}
    <div className="flex-shrink-0 p-[11px] -m-[11px]">
      <motion.button
        onClick={(e) => { e.stopPropagation(); onComplete?.(task.id); triggerSelectionHaptic() }}
        className="flex items-center justify-center"
        style={{
          width: 20,
          height: 20,
          borderRadius: 3,
          border: `2px solid ${task.isCompleted ? 'var(--color-success)' : 'var(--color-border)'}`,
          backgroundColor: task.isCompleted ? 'var(--color-success)' : 'transparent',
        }}
        animate={{ ... }}
        transition={TRANSITION_SPRING}
        whileTap={{ scale: 0.85 }}
        role="checkbox"
        aria-checked={task.isCompleted}
        ...
      >
        {task.isCompleted && (
          <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} ...>
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          </motion.svg>
        )}
      </motion.button>
    </div>

    {/* Title — single line truncated */}
    <p className="min-w-0 flex-1 truncate text-body font-medium" style={{
      color: task.isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
      textDecoration: task.isCompleted ? 'line-through' : 'none',
      opacity: task.isCompleted ? 0.7 : 1,
    }}>
      {task.title}
    </p>

    {/* Trailing icons */}
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {task.isImportant && (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--color-danger)">
          <path d="M3.5 1a.5.5 0 01.5.5v1h8.5a.5.5 0 01.4.8L10.5 6l2.4 2.7a.5.5 0 01-.4.8H4v5a.5.5 0 01-1 0V1.5a.5.5 0 01.5-.5z" />
        </svg>
      )}
      {task.syncStatus === 'pending' && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'var(--color-warning)' }}
          title="Sync pending"
        />
      )}
    </div>
  </div>

  {/* Body preview — single line, smaller text */}
  {task.body && (
    <p
      className="mt-0.5 truncate text-caption pl-[38px]"
      style={{
        color: 'var(--color-text-secondary)',
        opacity: task.isCompleted ? 0.5 : 1,
        textDecoration: task.isCompleted ? 'line-through' : 'none',
      }}
    >
      {task.body}
    </p>
  )}
</motion.div>
```

Note on `pl-[38px]`: The body preview indentation should align with the title text. Checkbox is 20px + gap of 8px (gap-2) + the padding wrapper offset. Measure visually and adjust — the goal is that the body text starts directly below the first character of the title.

### Empty State Design

Replace the current SVG-heavy empty state with a clean, typography-driven design:

```tsx
<motion.div
  className="mt-16 flex flex-col items-center gap-2 px-8 text-center"
  variants={pageVariants}
  initial="initial"
  animate="animate"
>
  <p className="text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
    Capture your first thought
  </p>
  <p className="text-body" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}>
    Tap + to get started
  </p>
</motion.div>
```

Clean, warm, inviting. No abstract icons that don't mean anything. The text does the work.

### Stagger Animation

The `listContainerVariants` and `listItemVariants` are already defined in `src/config/motion.ts`:

```typescript
export const listContainerVariants: Variants = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
}

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: TRANSITION_NORMAL },
}
```

To apply: the `Reorder.Group` doesn't natively support Framer Motion variants in the same way. The simplest approach is to wrap each card item in a `motion.div` with `listItemVariants` and apply `listContainerVariants` to a parent wrapper. The stagger should only fire on initial mount — `AnimatePresence initial={false}` is already set, which prevents re-triggering on item additions/removals.

Important: test that the stagger doesn't conflict with the `Reorder` drag system. If it does, apply stagger only to the initial render and remove the variant wrapper once the list has mounted (via a `useEffect` flag).

### Completed Section Chevron

Simple size increase:

```diff
- width="12"
- height="12"
- viewBox="0 0 12 12"
+ width="16"
+ height="16"
+ viewBox="0 0 12 12"
```

Keep the same `viewBox` (path stays the same) — the SVG scales up. The `motion.svg` rotation animation is unaffected.

### Files to Touch

- `src/features/capture/components/TaskCard.tsx` — main card redesign (checkbox, layout, icons, body preview)
- `src/App.tsx` — empty state, stagger animation, completed section chevron
- `src/features/capture/components/TaskCard.test.tsx` — updated assertions
- `src/App.test.tsx` — empty state text assertion

### Files NOT to Touch

- `DraggableTaskCard.tsx` — wrapper only, no structural change
- `TaskDetailSheet.tsx` — separate surface, not in scope
- `CreateTaskSheet.tsx` — covered by Story 8.4
- `useSyncStore.ts` — no store changes
- `motion.ts` — variants already exist

### Dependency

Story 8.10 has no hard dependency on Story 8.4, but they complement each other. The `isNewest` green border flash from 8.4's "Add Another" flow should still work with the new card design. The `isNewest` prop and its `border` style treatment remain unchanged.

Story 8.1 (Sticky Header + Priority Visual) is already done. Story 8.10 replaces the 8.1 priority visual treatment (left border accent) with the trailing flag icon. The left border on important cards added by 8.1 should be removed in favor of the new flag icon — this is the intentional design evolution.

### References

- Current `TaskCard.tsx`: `src/features/capture/components/TaskCard.tsx`
- Current empty state: `src/App.tsx` lines 698-725
- Motion variants: `src/config/motion.ts` lines 31-40
- Completed section header: `src/App.tsx` lines 646-694
- Epic 8 Planning Doc: `_bmad-output/planning-artifacts/epic-8-planning.md`
- Architecture Constraints: AC6 (reduced motion), AC7 (44px touch targets)

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Task 1 (checkbox) was already implemented via `TaskCheckbox` component — skipped to avoid regression
- Removed importance left border (8.1 design) in favor of trailing flag icon — intentional design evolution
- Removed sync dot from between checkbox and title; only pending state now shows a small trailing amber dot
- Body preview changed from `text-label` to `text-caption`, padding recalculated to `pl-[30px]` (22px checkbox + 8px gap)
- Preserved `processedBy` label (not in original story spec but exists in current codebase)
- Empty state redesigned: typography-driven with "Capture your first thought" heading
- Stagger animation applied to non-manual sort path only; skipped Reorder.Group to avoid drag-and-drop conflicts
- Fixed pre-existing broken stagger on completed section (missing `variants={listItemVariants}` on children)
- Completed section chevron increased from 12x12 to 16x16
- All 33 tests pass (17 TaskCard + 16 App). 2 pre-existing failures in unrelated files (sync-service, AuthForm)

### Change Log

- 2026-03-20: Full implementation of story 8-10 — card redesign, empty state, stagger animation, chevron size

### File List

- `src/features/capture/components/TaskCard.tsx` — card layout restructure (sync dot removal, trailing icons, body preview, padding)
- `src/App.tsx` — empty state redesign, stagger animation, completed section stagger fix, chevron size
- `src/features/capture/components/TaskCard.test.tsx` — updated 5 tests, added 3 new tests
- `src/App.test.tsx` — added empty state test
