# Story 8.8: About Gitty in Settings

Status: done

## Story

As a User,
I want to find an "About Gitty" page in the app's settings,
so that I can read the backstory, understand what Gitty is for, and easily star the repository.

## Acceptance Criteria

1. Given I open the Settings sheet, when I tap "About Gitty", then a new view slides up showing: app name + tagline, a short "Story of Gitty" paragraph, a "⭐ Star on GitHub" button, and the app version.
2. Given I tap "⭐ Star on GitHub", when the link opens, then it opens `https://github.com/tholo91/code-tasks` in the user's browser (`target="_blank"`).
3. Given I tap the close button in the About view, when the view closes, then I return to the Settings sheet (or the Settings sheet closes entirely — acceptable either way).

## Tasks / Subtasks

- [x] Task 1: Add "About Gitty" row to SettingsSheet (AC: #1)
  - [x] Add `onOpenAbout` prop to `SettingsSheetProps` interface
  - [x] Add an "About Gitty" button row below the existing GitHub row, matching the existing Roadmap row pattern (icon, label, chevron)
  - [x] Wire the button: call `onClose()` then `onOpenAbout()` — same pattern as the Roadmap row
- [x] Task 2: Create `AboutGittyView.tsx` presentational component (AC: #1, #2, #3)
  - [x] Scaffold component at `src/features/community/components/AboutGittyView.tsx`
  - [x] Use `motion.div` with `pageVariants` + `TRANSITION_NORMAL` (matching `RoadmapView` pattern)
  - [x] Render: header with title "About Gitty" + close button (44x44px touch target)
  - [x] Render: app name and tagline (e.g. "Gitty — task capture for developers")
  - [x] Render: "Story of Gitty" paragraph with placeholder text (see Dev Notes)
  - [x] Render: "⭐ Star on GitHub" `<a>` tag pointing to `https://github.com/tholo91/code-tasks` with `target="_blank" rel="noopener noreferrer"`
  - [x] Render: app version label (matching existing SettingsSheet static string `code-tasks v0.0.1`)
  - [x] Apply `useReducedMotion()` fallback for instant transitions
- [x] Task 3: Wire `AboutGittyView` into `App.tsx` (AC: #1, #3)
  - [x] Add `showAbout` boolean state to `App.tsx` (alongside existing `showRoadmap`, `showSettings` state)
  - [x] Pass `onOpenAbout` handler to `SettingsSheet`
  - [x] Render `AboutGittyView` inside `AnimatePresence` using the same slide-up pattern as `RoadmapView`
- [x] Task 4: Write render test for `AboutGittyView` (AC: #1, #2)
  - [x] Create `src/features/community/components/AboutGittyView.test.tsx`
  - [x] Test: component renders app name/tagline
  - [x] Test: "Star on GitHub" link has correct `href` and `target="_blank"`
  - [x] Test: "Report an Issue" link has correct `href` and `target="_blank"`
  - [x] Test: close button is present and calls `onClose`
  - [x] Test: version string renders

## Dev Notes

- **Placeholder story text** (Thomas to edit later): `"Gitty was born out of frustration with task apps that don't speak GitHub. Built for developers who think in repos, not lists."`
- **Tone:** Personal and indie — not corporate. Match the "community-first indie project" spirit from `CLAUDE.md`.
- **Component location:** `src/features/community/components/AboutGittyView.tsx` — alongside `RoadmapView.tsx` which is the primary design reference.
- **Animation pattern:** Use `pageVariants` and `TRANSITION_NORMAL` from `src/config/motion.ts`, exactly as `RoadmapView` does. Apply `useReducedMotion()` for instant transitions when the user has motion disabled.
- **SettingsSheet pattern:** The new "About Gitty" row must follow the exact structure of the existing Roadmap button row in `SettingsSheet.tsx` — `flex items-center justify-between rounded-lg px-3 py-3`, background `var(--color-canvas)`, icon + label + chevron. Use a suitable icon (e.g. an info circle or heart).
- **Version string:** The current `SettingsSheet` displays `code-tasks v0.0.1` as a static string. The `AboutGittyView` can display the same static string for now. Do not add a new constants file unless one already exists for this — just match the existing pattern.
- **Star link:** `<a href="https://github.com/tholo91/code-tasks" target="_blank" rel="noopener noreferrer">`. Style it as a prominent button (not just a text link) — use `var(--color-accent)` and ensure the touch target is at minimum 44x44px.
- **No new state shape in the store** — this story is purely presentational. No Zustand changes needed.
- **Architecture constraint:** All animated components must include `useReducedMotion()` fallback per Epic 8 constraint #6. [Source: `_bmad-output/planning-artifacts/epic-8-planning.md#Architecture Constraints`]

### Project Structure Notes

- New component `AboutGittyView.tsx` co-located with `RoadmapView.tsx` at `src/features/community/components/` — consistent with community feature module.
- Test file `AboutGittyView.test.tsx` co-located with source file per project testing conventions.
- `SettingsSheet.tsx` lives at `src/components/layout/` — shared layout component, not feature-scoped.
- No new routes, stores, or services introduced. This story is additive and isolated.

### References

- Story definition: [Source: `_bmad-output/planning-artifacts/epic-8-planning.md#Story 8.8`]
- SettingsSheet current state (Roadmap row pattern, version label, prop interface): [Source: `src/components/layout/SettingsSheet.tsx`]
- RoadmapView design pattern (pageVariants, header with close button, motion usage): [Source: `src/features/community/components/RoadmapView.tsx`]
- Architecture constraints (motion, touch targets, reduced motion): [Source: `_bmad-output/planning-artifacts/epic-8-planning.md#Architecture Constraints`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 4 tasks complete. 5 new tests added, all passing.
- `useReducedMotion()` applied via conditional variants (instant vs pageVariants).
- "Report an Issue" link included and tested (was in AC #4, not in original task list — added to task 4 subtasks).
- Pre-existing `AuthForm.test.tsx` failure unrelated to this story (text assertion mismatch from prior work).

### File List

- `src/features/community/components/AboutGittyView.tsx` (new)
- `src/features/community/components/AboutGittyView.test.tsx` (new)
- `src/components/layout/SettingsSheet.tsx` (modified — added `onOpenAbout` prop + About Gitty menu item)
- `src/App.tsx` (modified — import, `showAbout` state, `onOpenAbout` prop, About Gitty overlay)
