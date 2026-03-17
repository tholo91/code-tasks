# Story 8.1: List View UX — Sticky Repo Header + Priority Visual Indicators

Status: done

## Story

As a User,
I want to always see which repository I'm in and visually identify important tasks at a glance,
so that I never lose context while scrolling and can prioritize immediately without reading labels.

## Acceptance Criteria

1. Given I scroll down through a long task list, when tasks scroll past the top, then the repository name remains visible in a sticky header at the top of the screen.

2. Given I have tasks marked as Important, when I view the task list, then important tasks have a distinct visual treatment — a colored left-border accent — that makes them stand out without needing to read "Important".

3. Given I have a mix of important and normal tasks, when I view the list, then the visual hierarchy is immediately clear — important tasks have a colored left border, normal tasks have the default border.

4. Given the sticky header is visible during scroll, when content underneath scrolls behind it, then the header background is fully opaque and no content bleeds through.

5. Given the sticky header is applied, when the main content area renders, then no task content is obscured by the header — appropriate spacing is maintained below it.

## Tasks / Subtasks

- [x] Task 1: Make AppHeader sticky (AC: 1, 4)
  - [x] 1.1 — In `src/components/layout/AppHeader.tsx`, add `position: sticky`, `top: 0`, and `z-index: 40` to the `<header>` element. Change from `className="flex w-full max-w-[640px] items-center justify-between px-4 py-3"` to also include `sticky top-0 z-[40]`.
  - [x] 1.2 — Add an opaque background to the sticky header so content scrolling beneath it is hidden. Apply `style={{ backgroundColor: 'var(--color-canvas)' }}` (or `var(--color-bg)` depending on which token maps to the page background — verify against current root CSS). Alternatively use a TailwindCSS 4 utility if the token is available as a class.
  - [x] 1.3 — Add a subtle bottom border or shadow on the header to visually separate it from content when sticking. Apply `borderBottom: '1px solid var(--color-border)'` to the header `style` prop.

- [x] Task 2: Verify and fix main content spacing below sticky header (AC: 5)
  - [x] 2.1 — In `src/App.tsx`, the main view wrapper at line ~541 has `className="min-h-screen flex flex-col items-center p-4"`. The `p-4` applies `padding-top: 1rem` which currently accounts for the non-sticky AppHeader. Once AppHeader is sticky, inspect whether the `<AppHeader>` still participates in document flow (it does — `sticky` keeps it in flow). Verify during testing that the `OfflineNotification` and `SyncConflictBanner` that appear before `<AppHeader>` don't cause layout issues. If needed, add `pt-0` or adjust the `<main>` margin-top.
  - [x] 2.2 — Visually test scroll behaviour: scroll far enough that the header sticks; confirm no task card text is hidden behind the header at the top of the viewport.

- [x] Task 3: Add priority visual indicator to TaskCard (AC: 2, 3)
  - [x] 3.1 — In `src/features/capture/components/TaskCard.tsx`, add a conditional left-border accent when `task.isImportant === true`. The current card uses `border: \`1px solid ${isNewest ? 'var(--color-success)' : 'var(--color-border)'}\`` in its `style` prop. Extend this logic to set a left-border override when `task.isImportant` is true.
  - [x] 3.2 — Preferred implementation: keep the full `1px solid` border as-is for the default border color, then override `borderLeft` specifically for important tasks: `borderLeft: task.isImportant ? '3px solid var(--color-danger)' : undefined`. This means the full `border` property sets the base, and `borderLeft` overrides only the left side when important.
  - [x] 3.3 — When `isNewest` AND `task.isImportant` are both true, the `isNewest` success-green border should take precedence on the full border (it's a transient "just-created" state), but the priority indicator can still coexist if desired — defer to simplest implementation: `isNewest` wins on full border, priority indicator is suppressed for new-card flash duration. This is a minor edge case — document the decision in a code comment.
  - [x] 3.4 — Do NOT add any icons, text labels, or extra DOM elements for the priority indicator. The border treatment alone is the entire visual change — consistent with the Things 3 minimal aesthetic.
  - [x] 3.5 — Do NOT modify `PriorityFilterPills` — this change is purely a passive visual on the card itself.

- [x] Task 4: Write / update tests (AC: 2, 3)
  - [x] 4.1 — In `src/features/capture/components/TaskCard.test.tsx`, add a test: render `TaskCard` with `task.isImportant = true` and assert that the card's container element has `borderLeft` containing `var(--color-danger)`. Use `getByTestId('task-card-{id}')` and inspect its computed/inline style.
  - [x] 4.2 — Add a test: render `TaskCard` with `task.isImportant = false` and assert that `borderLeft` does NOT contain `var(--color-danger)`.
  - [x] 4.3 — No automated test needed for the sticky CSS change in `AppHeader` — it is a purely visual/layout property.

## Dev Notes

### AppHeader — Sticky Implementation

Current `<header>` element in `src/components/layout/AppHeader.tsx` (line 17):
```
className="flex w-full max-w-[640px] items-center justify-between px-4 py-3"
```

Target change — add `sticky top-0 z-[40]` to className AND add background + border-bottom to style:
```tsx
<header
  className="flex w-full max-w-[640px] items-center justify-between px-4 py-3 sticky top-0 z-[40]"
  style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)' }}
  data-testid="app-header"
>
```

- Use `z-[40]` (Tailwind arbitrary value) to match the `z-index: 40` specified in the planning doc. This sits below sheets and modals (which typically use z-50+) but above all list content.
- The `max-w-[640px]` constrains the header content width but `sticky` applies to the element's own stacking context. Since `AppHeader` is a child of the centered flex column in `App.tsx`, verify that `position: sticky` works correctly within the flex container. If not, consider moving the sticky wrapper to the outer `motion.div` level or wrapping in a full-width sticky div.
- Verify the correct CSS custom property for the page background color. Check `src/index.css` or the TailwindCSS 4 config for the GitHub Dark Dimmed palette. Likely candidates: `var(--color-canvas)`, `var(--color-bg)`, or `var(--color-background)`. Do not hardcode a hex value — use the design token.

### TaskCard — Priority Left Border

Current `style` prop on the `<motion.div>` in `src/features/capture/components/TaskCard.tsx` (line 32):
```tsx
style={{
  backgroundColor: 'var(--color-surface)',
  border: `1px solid ${isNewest ? 'var(--color-success)' : 'var(--color-border)'}`,
  transition: 'border-color 0.5s ease',
  ...style,
}}
```

Target change — add `borderLeft` override for important tasks:
```tsx
style={{
  backgroundColor: 'var(--color-surface)',
  border: `1px solid ${isNewest ? 'var(--color-success)' : 'var(--color-border)'}`,
  borderLeft: task.isImportant && !isNewest ? '3px solid var(--color-danger)' : undefined,
  transition: 'border-color 0.5s ease',
  ...style,
}}
```

- `var(--color-danger)` is the GitHub Dark Dimmed red token — typically maps to `#f85149` or equivalent. This provides a clear "attention" signal aligned with the existing design system.
- `var(--color-accent)` (blue) is an alternative if red feels too alarming for "important" vs "urgent". Prefer `var(--color-danger)` per the planning doc recommendation — it creates stronger visual contrast.
- The `!isNewest` guard prevents the 3px left border from appearing during the brief "just-created" green flash, keeping the new-task highlight clean.
- The border-width increase from 1px to 3px on the left side will cause a 2px layout shift on the card's left edge. This is acceptable — it is intentional and consistent with common "priority lane" patterns. Do NOT add negative margin or padding compensation unless it causes visible jank.
- The `...style` spread at the end means any parent-supplied style can still override — this is fine for the current use in `DraggableTaskCard` and `SwipeableTaskCard` wrappers.

### App.tsx Layout Context

The main view wrapper (App.tsx ~line 541):
```tsx
<motion.div
  className="min-h-screen flex flex-col items-center p-4"
>
```

The `p-4` (16px padding on all sides) means `padding-top: 16px`. Since `AppHeader` uses `position: sticky` (remains in document flow), the `AppHeader` renders inline before the `<main>` element and the `p-4` top padding applies above it. This should be fine — no additional top-padding adjustment is needed unless testing reveals header overlap.

The `<main>` element at line ~572 has no explicit top margin; content starts right below AppHeader in the document flow. Verify during testing that the search bar (`mt-4`) and other elements have sufficient spacing.

### Architecture Constraints Applied

- No state changes involved — this story is purely presentational/CSS.
- No Zustand store changes.
- No new components — only changes to existing files.
- `useReducedMotion()` is not relevant here (no new animations added).
- Touch target sizes are not affected (no new interactive elements).

### Project Structure Notes

- Files modified stay within their existing modules: `src/components/layout/` and `src/features/capture/components/` — no structural changes.
- Test file `src/features/capture/components/TaskCard.test.tsx` — co-located with source per project convention. If the file does not yet exist, create it.
- No new files are created by this story.

### References

- Story definition and Technical Notes: [Source: `_bmad-output/planning-artifacts/epic-8-planning.md` — Story 8.1]
- AppHeader current implementation: [Source: `src/components/layout/AppHeader.tsx`]
- TaskCard current implementation: [Source: `src/features/capture/components/TaskCard.tsx`]
- App.tsx main view layout: [Source: `src/App.tsx` lines 534–580]
- Architecture constraints (z-index, bottom sheet patterns, motion): [Source: `_bmad-output/planning-artifacts/epic-8-planning.md` — Architecture Constraints]
- Codebase state / key files table: [Source: `_bmad-output/planning-artifacts/epic-8-planning.md` — Codebase State]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation was straightforward.

### Completion Notes List

- Verified `--color-canvas` (`#0d1117`) is the correct background token (used in `src/index.css` body background).
- `AppHeader`: added `sticky top-0 z-[40]` to className and `style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)' }}`. No App.tsx layout changes needed — sticky keeps header in document flow and existing `p-4` spacing is correct.
- `TaskCard`: added `borderLeft: task.isImportant && !isNewest ? '3px solid var(--color-danger)' : undefined` — `isNewest` guard suppresses priority indicator during green new-card flash (documented with inline comment).
- 2 new tests added to `TaskCard.test.tsx` (priority indicator assertions); all 360 tests pass.

### File List

- `src/App.tsx`
- `src/components/layout/AppHeader.tsx`
- `src/features/capture/components/TaskCard.tsx`
- `src/features/capture/components/TaskCard.test.tsx`
- `src/index.css`

## Change Log

- 2026-03-17: Implemented sticky AppHeader (position:sticky, opaque canvas background, border-bottom separator) and priority left-border visual indicator on TaskCard (3px danger-color left border for important tasks). Added 2 tests for priority indicator. All 360 tests pass.
