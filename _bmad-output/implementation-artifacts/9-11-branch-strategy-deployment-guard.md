# Story 9.11: Branch Strategy & Deployment Guard

Status: done

## Story

As a developer using Gitty with CI/CD pipelines,
I want per-repo branch choice (main vs dedicated branch) and optional `[skip ci]` in sync commit messages,
so that I can control where tasks are synced and avoid triggering unnecessary CI runs.

## Acceptance Criteria

1. Given I open the repo settings sheet, when I view the branch strategy section, then I can choose between "Default branch" (main/master) and "Dedicated branch" (custom name like `gitty/tasks`).

2. Given I select "Dedicated branch" mode, when I enter a branch name and save, then subsequent syncs push to that branch instead of the default branch.

3. Given I enable the "Skip CI" toggle for a repo, when I sync tasks, then the commit message includes `[skip ci]` suffix to prevent CI pipeline triggers.

4. Given I have configured branch and skip-ci settings, when I close and reopen the app, then the settings persist across sessions (via Zustand persist).

5. Given I am on the main app screen with a repo selected, when I open Settings, then I see a "Repo Settings" menu item that opens the RepoSettingsSheet.

6. Given the repo settings sheet is open, when I tap Save, then both branch and skip-ci preferences are saved for that repo.

## Tasks / Subtasks

- [x] Task 1: Add `repoSkipCi: Record<string, boolean>` to sync store (AC: #3, #4)
  - [x] Add state field, action `setRepoSkipCi`, selector `selectRepoSkipCi`
  - [x] Add to `partialize` for persistence
  - (Already present in store from prior work — verified and wired up)

- [x] Task 2: Add `[skip ci]` support in commit messages (AC: #3)
  - [x] Update `syncAllRepoTasksOnce` to append `[skip ci]` when `options.skipCi` is true
  - [x] Update `commitTasks` to accept and use `skipCi` parameter
  - [x] Update `syncPendingTasksOnce` to pass `skipCi` to `commitTasks`

- [x] Task 3: Update SyncFAB to pass `skipCi` option (AC: #3)
  - [x] Read `selectRepoSkipCi` for current repo
  - [x] Include `skipCi: true` in sync options when enabled

- [x] Task 4: Create `RepoSettingsSheet` component (AC: #1, #2, #3, #5, #6)
  - [x] BottomSheet with branch strategy radio buttons (default vs custom)
  - [x] Branch name text input (shown when custom mode selected)
  - [x] Skip CI toggle switch
  - [x] Save button that persists both settings
  - [x] Framer Motion animations for branch input reveal and radio dots

- [x] Task 5: Add "Repo Settings" to SettingsSheet (AC: #5)
  - [x] Add gear icon menu item before Roadmap
  - [x] Only shown when a repo is selected (conditional `onOpenRepoSettings` prop)

- [x] Task 6: Wire up in App.tsx (AC: #5, #6)
  - [x] Add `showRepoSettings` state
  - [x] Pass `onOpenRepoSettings` to `SettingsSheet`
  - [x] Render `RepoSettingsSheet` in `AnimatePresence`
  - [x] Update `handleBranchConfirm` to respect `skipCi` setting

- [x] Task 7: Tests (AC: #1, #2, #3, #6)
  - [x] `RepoSettingsSheet.test.tsx` — 10 tests: rendering, branch mode toggle, skip-ci toggle, save behavior, accessibility
  - [x] `sync-service.test.ts` — 3 new tests: `[skip ci]` in commitTasks, absence when false, `[skip ci]` via syncPendingTasks

## Dev Notes

### Skip CI Convention

The `[skip ci]` tag is widely supported by CI providers (GitHub Actions, GitLab CI, CircleCI, Travis CI). It must appear in the commit message body or title. We append it as a suffix to the existing commit message format.

### RepoSettingsSheet Design

- Uses radio buttons for branch mode (not a toggle) — clearer UX for mutually exclusive options
- iOS-style toggle switch for skip-ci — consistent with native mobile patterns
- Spring-based animations for radio dots and branch input reveal
- 44px min touch targets on all interactive elements

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Task 1: Store already had `repoSkipCi` state, `setRepoSkipCi` action, `selectRepoSkipCi` selector, and persistence from prior groundwork. Verified all wiring is correct.
- Task 2: Added `skipCi` suffix logic to both `syncAllRepoTasksOnce` (full rebuild path) and `commitTasks` (pending tasks path). The `SyncOptions` interface already had `skipCi?: boolean`.
- Task 3: SyncFAB now reads `selectRepoSkipCi` for the current repo and passes `skipCi: true` in sync options.
- Task 4: Created `RepoSettingsSheet` with radio buttons for branch mode, animated branch name input, toggle switch for skip-ci, and a save button. Uses existing BottomSheet, motion config, and design tokens.
- Task 5: Added "Repo Settings" menu item to SettingsSheet with gear icon. Conditionally shown via `onOpenRepoSettings` prop.
- Task 6: Wired up in App.tsx with `showRepoSettings` state, passed prop to SettingsSheet, rendered RepoSettingsSheet. Updated `handleBranchConfirm` to respect skipCi.
- Task 7: 10 RepoSettingsSheet tests + 3 sync-service tests all pass. Full suite: 50/50 pass for affected files.

### Change Log

- 2026-04-03: Implemented Story 9.11 — Branch Strategy & Deployment Guard (all 7 tasks, all ACs)

### File List

- `src/services/github/sync-service.ts` — modified: `[skip ci]` in commit messages for both sync paths
- `src/features/sync/components/SyncFAB.tsx` — modified: reads skipCi setting, passes to sync options
- `src/features/sync/components/RepoSettingsSheet.tsx` — new: per-repo settings bottom sheet
- `src/features/sync/components/RepoSettingsSheet.test.tsx` — new: 10 tests
- `src/components/layout/SettingsSheet.tsx` — modified: added Repo Settings menu item
- `src/App.tsx` — modified: wired up RepoSettingsSheet state and rendering
- `src/services/github/sync-service.test.ts` — modified: 3 new skip-ci tests
- `_bmad-output/implementation-artifacts/9-11-branch-strategy-deployment-guard.md` — new: story file
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified: added 9-11 status
