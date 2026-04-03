# Story 9.11: Branch Strategy & Deployment Guard

Status: ready-for-dev

## Story

As a user who syncs tasks from Gitty to a GitHub repository connected to CI/CD (GitHub Actions, Pages, Vercel, etc.),
I want to choose per-repo whether Gitty syncs to the default branch or a dedicated `gitty/tasks` branch, and optionally suppress CI/CD triggers on sync commits,
so that my quick task captures from mobile do not cause unwanted deployments or interfere with my development workflow.

## Background

Story 9-4 introduced "push to branch fallback" — when a repo has branch protection, Gitty detects the error and prompts the user to push to a fallback branch like `gitty/{username}`. That flow is reactive (error-driven) and only surfaces for protected repos.

This story goes further: it gives ALL users a proactive, per-repo choice of sync target branch regardless of branch protection, and adds an optional `[skip ci]` flag to sync commit messages. This addresses two captured ideas:

1. **Branching** — users deploying to main want to avoid accidental deployments from task syncs; a dedicated branch like `gitty/tasks` keeps task data separate from production.
2. **Option to not trigger a deployment** — even when syncing to main, adding `[skip ci]` to commit messages prevents most CI/CD systems (GitHub Actions, Vercel, Netlify, etc.) from triggering builds.

## Acceptance Criteria

1. **[Repo Settings Sheet]** Given I have a selected repo, when I tap the new "Repo settings" option (gear icon) accessible from either the repo chip in the header or from the SettingsSheet, then a `RepoSettingsSheet` bottom sheet opens showing branch strategy and deployment guard options for the current repo.

2. **[Branch Target Selector]** Given the RepoSettingsSheet is open, when I view the "Sync target" section, then I see a segmented control or radio group with two options:
   - **"Default branch"** (e.g., `main`) — sync directly to the repo's default branch (current behavior)
   - **"Dedicated branch"** — sync to a configurable branch name (defaults to `gitty/tasks`)
   And the current selection is highlighted based on the persisted per-repo preference.

3. **[Dedicated Branch Name Editable]** Given I select "Dedicated branch" in the branch target selector, when I view the input field below, then it shows a pre-filled branch name `gitty/tasks` (editable), and I can change it to any valid branch name.

4. **[Skip CI Toggle]** Given the RepoSettingsSheet is open, when I view the "Deployment guard" section, then I see a toggle labeled "Add [skip ci] to sync commits" with a subtitle explaining "Prevents CI/CD pipelines (GitHub Actions, Vercel, etc.) from triggering on task syncs." The toggle reflects the persisted per-repo preference (default: off).

5. **[Persistence]** Given I change the branch target or skip-ci toggle, when I close the sheet and reopen it later (or restart the app), then my choices are preserved per-repo via the Zustand persisted store.

6. **[Sync Respects Branch Setting]** Given I have set a dedicated branch for a repo, when I tap the SyncFAB, then Gitty syncs to that branch (using the existing `branch` parameter in `SyncOptions`) instead of the default branch — reusing the branch creation and push logic from Story 9-4.

7. **[Sync Respects Skip CI]** Given I have enabled "skip ci" for a repo, when Gitty creates a sync commit (in both `syncAllRepoTasksOnce` and `commitTasks`), then the commit message includes `[skip ci]` at the end (e.g., `sync: 3 tasks (2 active, 1 completed) via code-tasks [skip ci]`).

8. **[Branch + Skip CI Combined]** Given I have both a dedicated branch AND skip-ci enabled, when I sync, then Gitty pushes to the dedicated branch with `[skip ci]` in the commit message. Both settings work independently and together.

9. **[Migration from 9-4 Fallback]** Given I previously had a branch-protection fallback branch set (from Story 9-4), when I open the RepoSettingsSheet, then the "Dedicated branch" option is pre-selected with the previously saved fallback branch name — seamless migration, no data loss.

10. **[Default Behavior Unchanged]** Given I have not changed any repo settings (fresh install or repo without customization), when I sync, then Gitty pushes to the default branch without `[skip ci]` — exactly as it does today. No behavioral change for users who do not interact with repo settings.

11. **[Branch Indicator in Header]** Given I have a dedicated branch configured for the current repo, when I view the header, then the existing `BranchProtectionBanner` (or a new subtle indicator near the repo chip) shows the active sync branch name so the user always knows where tasks are going.

12. **[Empty Branch Name Validation]** Given I select "Dedicated branch" and clear the branch name input, when I try to save or close, then the setting falls back to "Default branch" mode — an empty dedicated branch name is not allowed.

## Tasks / Subtasks

- [ ] **Task 1: Add per-repo settings to store** (AC: 5, 9, 10)
  - [ ] T1.1: Add `repoSkipCi: Record<string, boolean>` to `SyncState` interface in `src/stores/useSyncStore.ts`
  - [ ] T1.2: Initialize `repoSkipCi` to `{}` in the store defaults
  - [ ] T1.3: Add `setRepoSkipCi(repoFullName: string, enabled: boolean)` action — sets or clears skip-ci preference for a repo. Pattern: follow `setRepoSortMode` / `setRepoSyncBranch` exactly.
  - [ ] T1.4: Add `selectRepoSkipCi(repoFullName: string)` selector — returns `boolean` (default `false`)
  - [ ] T1.5: Add `repoSkipCi` to `partialize` for persistence (line ~783 in `useSyncStore.ts`)
  - [ ] T1.6: Verify `repoSyncBranches` (from Story 9-4) is already persisted and working — this story reuses it as the "dedicated branch" setting. No new branch state needed; the existing `setRepoSyncBranch` and `selectSyncBranch` cover it.

- [ ] **Task 2: Add `[skip ci]` support to sync-service** (AC: 7, 8, 10)
  - [ ] T2.1: Add `skipCi?: boolean` to the `SyncOptions` interface in `src/services/github/sync-service.ts` (line ~69)
  - [ ] T2.2: In `syncAllRepoTasksOnce` (line ~341), after building `commitMessage` (line ~400), append ` [skip ci]` if `options.skipCi` is true:
    ```typescript
    const finalMessage = options.skipCi ? `${commitMessage} [skip ci]` : commitMessage
    ```
    Use `finalMessage` in the `commitParams.message` field (line ~424).
  - [ ] T2.3: In `commitTasks` (line ~114), accept a new optional `skipCi?: boolean` parameter. If true, append ` [skip ci]` to the commit message (line ~148). Update all call sites of `commitTasks` (currently only `syncPendingTasksOnce` at line ~643).
  - [ ] T2.4: In `syncPendingTasksOnce` (line ~583), pass `options.skipCi` through to `commitTasks`.

- [ ] **Task 3: Update SyncFAB to pass repo settings** (AC: 6, 7, 8)
  - [ ] T3.1: In `src/features/sync/components/SyncFAB.tsx`, read `repoSkipCi` from the store for the current repo (same pattern as `repoSyncBranches` on line ~19–20).
  - [ ] T3.2: Read the dedicated branch from `repoSyncBranches` (already done on line ~20 as `fallbackBranch`). Rename internal variable from `fallbackBranch` to `syncBranch` for clarity (the concept is now proactive, not just a fallback).
  - [ ] T3.3: Pass both `branch` and `skipCi` to `syncAllRepoTasks` in `handleSync` (line ~52–53):
    ```typescript
    const syncOptions: SyncOptions = { maxRetries: 2 }
    if (syncBranch) syncOptions.branch = syncBranch
    if (skipCi) syncOptions.skipCi = true
    ```

- [ ] **Task 4: Create `RepoSettingsSheet` component** (AC: 1, 2, 3, 4, 5, 9, 12)
  - [ ] T4.1: Create `src/features/repos/components/RepoSettingsSheet.tsx`
  - [ ] T4.2: Use `BottomSheet` from `src/components/ui/BottomSheet.tsx` (same pattern as `SettingsSheet`)
  - [ ] T4.3: Props: `{ repoFullName: string; onClose: () => void }`
  - [ ] T4.4: **Sync Target section:** Two-option segmented control (or styled radio):
    - "Default branch" — clears `repoSyncBranches[repo]` via `setRepoSyncBranch(repo, null)`
    - "Dedicated branch" — sets `repoSyncBranches[repo]` via `setRepoSyncBranch(repo, branchName)`
    - When "Dedicated branch" is selected, show an editable text input pre-filled with the stored branch name or `gitty/tasks` as default
    - Read initial state from `selectSyncBranch(repoFullName)` — if it returns a value, pre-select "Dedicated branch" with that name (handles migration from Story 9-4 fallback branches)
  - [ ] T4.5: **Deployment Guard section:** Toggle switch for `[skip ci]`:
    - Label: "Add [skip ci] to sync commits"
    - Subtitle: "Prevents CI/CD pipelines from triggering on task syncs"
    - Read/write via `selectRepoSkipCi` / `setRepoSkipCi`
  - [ ] T4.6: On close or on "Default branch" selection, if dedicated branch input is empty, clear the branch preference (AC: 12).
  - [ ] T4.7: Style: match existing sheet patterns — `var(--color-surface)` background, `var(--color-border)` borders, `var(--color-text-primary)` / `var(--color-text-secondary)` text. Use `text-body`, `text-label`, `text-title` classes.
  - [ ] T4.8: `data-testid="repo-settings-sheet"`, `data-testid="branch-target-default"`, `data-testid="branch-target-dedicated"`, `data-testid="dedicated-branch-input"`, `data-testid="skip-ci-toggle"`

- [ ] **Task 5: Add entry point to open RepoSettingsSheet** (AC: 1)
  - [ ] T5.1: In `src/App.tsx`, add `showRepoSettings` state and render `RepoSettingsSheet` when true, passing `selectedRepo.fullName`.
  - [ ] T5.2: Add a gear icon button to the repo chip area in the header (near the existing repo name display). When tapped, open the RepoSettingsSheet. Only show when a repo is selected.
  - [ ] T5.3: Alternatively or additionally, add a "Repo settings" menu item to `src/components/layout/SettingsSheet.tsx` that opens the RepoSettingsSheet (only enabled when a repo is selected). Use the `SettingsMenuItem` component pattern.

- [ ] **Task 6: Update branch indicator** (AC: 11)
  - [ ] T6.1: In `src/App.tsx`, update the logic that controls `BranchProtectionBanner` visibility. Currently it only shows for branch-protection errors. Extend it: also show the banner in its "info" mode (blue, branch icon, "Syncing to branch X") when the user has a proactive dedicated branch set — even without a branch-protection error.
  - [ ] T6.2: The `BranchProtectionBanner` component already supports this via the `fallbackBranch` prop (shows blue info mode when set). Wire up: if `selectSyncBranch(repo)` returns a branch name, pass it as `fallbackBranch` regardless of error state.

- [ ] **Task 7: Tests** (AC: 1–12)
  - [ ] T7.1: `src/stores/useSyncStore.test.ts` (update): Test `setRepoSkipCi` action — sets true, sets false, persists across stores. Test `selectRepoSkipCi` — returns false for unknown repo, returns true after setting.
  - [ ] T7.2: `src/services/github/sync-service.test.ts` (update): Test that `syncAllRepoTasks({ skipCi: true })` produces a commit message ending in `[skip ci]`. Test that `syncAllRepoTasks({ skipCi: false })` does NOT include `[skip ci]`. Test combined `{ branch: 'gitty/tasks', skipCi: true }`.
  - [ ] T7.3: `src/features/repos/components/RepoSettingsSheet.test.tsx` (new):
    - Renders with "Default branch" selected when no branch is stored
    - Renders with "Dedicated branch" selected and branch name when branch is stored
    - Switching to "Dedicated branch" shows input field
    - Switching to "Default branch" clears stored branch
    - Toggle skip-ci calls `setRepoSkipCi`
    - Empty branch name falls back to default branch mode on close
  - [ ] T7.4: `src/features/sync/components/SyncFAB.test.tsx` (update): Verify that when `repoSkipCi[repo]` is true, `syncAllRepoTasks` is called with `skipCi: true`.

## Dev Notes

### 1. Reuse of Story 9-4 Infrastructure

This story builds on top of Story 9-4's branch infrastructure. Key reusable pieces:

- **`repoSyncBranches`** in `useSyncStore.ts` (line ~64) — already stores per-repo branch preferences, already persisted. This IS the "dedicated branch" setting; no new state needed for the branch choice.
- **`setRepoSyncBranch`** action (line ~767) — already handles set/clear.
- **`selectSyncBranch`** selector (line ~158) — already returns branch or null.
- **`SyncOptions.branch`** in `sync-service.ts` (line ~72) — already accepted and used throughout.
- **`ensureBranchExists`** helper (line ~236) — already creates the branch from default branch HEAD if missing.
- **`getFileContent` with `ref` param** (line ~79) — already fetches from the correct branch.
- **SyncFAB** (line ~19–20) — already reads and passes the branch.

The only new state is `repoSkipCi: Record<string, boolean>`. The rest is wiring + UI.

### 2. Commit Message Modification for `[skip ci]`

The `[skip ci]` tag is recognized by virtually all CI/CD systems:
- GitHub Actions: `[skip ci]`, `[ci skip]`, `[no ci]`, `[skip actions]`
- Vercel: `[skip ci]`
- Netlify: `[skip ci]`
- GitLab CI: `[skip ci]`, `[ci skip]`

Place it at the END of the commit message to avoid breaking the human-readable prefix:
```
sync: 3 tasks (2 active, 1 completed) via code-tasks [skip ci]
```

There are two commit message construction sites:
1. `syncAllRepoTasksOnce` — line ~400: `const commitMessage = total > 0 ? ...`
2. `commitTasks` — line ~148: `message: \`sync: update ${pendingCount ?? tasks.length} task...\``

Both need the `[skip ci]` append.

### 3. Default Branch Name Change

Story 9-4 used `gitty/{username}` as the default fallback branch. This story introduces `gitty/tasks` as the default proactive branch name. Rationale:
- `gitty/tasks` is purpose-descriptive and repo-scoped (not user-scoped)
- In shared repos, multiple users each get their own `captured-ideas-{username}.md` file, so branch-level isolation per user is not strictly needed
- Users can still change it to `gitty/{username}` or anything else in the input field
- The Story 9-4 branch-protection fallback should still suggest `gitty/{username}` (that flow is error-driven and user-specific)

### 4. RepoSettingsSheet — UI Layout

```
┌─────────────────────────────────┐
│  ⚙ Repo Settings               │
│  owner/repo-name                │
│                                 │
│  ── Sync target ──────────────  │
│  ┌──────────┐┌────────────────┐ │
│  │ Default  ││  Dedicated     │ │
│  │ branch   ││  branch     ● │ │
│  └──────────┘└────────────────┘ │
│                                 │
│  Branch name                    │
│  ┌─────────────────────────────┐│
│  │ gitty/tasks                 ││
│  └─────────────────────────────┘│
│                                 │
│  ── Deployment guard ─────────  │
│  ┌─────────────────────────┐    │
│  │ Add [skip ci] to sync   │ ○  │
│  │ commits                 │    │
│  │ Prevents CI/CD from     │    │
│  │ triggering on task syncs│    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### 5. Migration Path from Story 9-4

When a user has a `repoSyncBranches` entry from Story 9-4's fallback flow:
- The RepoSettingsSheet reads it via `selectSyncBranch` and pre-selects "Dedicated branch" with the stored name
- The user sees their existing choice reflected — no migration code needed
- If they switch to "Default branch", `setRepoSyncBranch(repo, null)` clears it
- The BranchFallbackPrompt from Story 9-4 continues to work for NEW branch-protection errors on repos without a proactive branch setting

### 6. SyncFAB Variable Naming

The SyncFAB currently calls the stored branch `fallbackBranch`. With this story, the concept expands from "fallback on error" to "proactive user choice." Consider renaming internally to `syncBranch` for clarity, but this is optional — the store field name `repoSyncBranches` stays the same.

### Project Structure Notes

- `src/stores/useSyncStore.ts` — modified: add `repoSkipCi` state, action, selector, persistence
- `src/services/github/sync-service.ts` — modified: add `skipCi` to `SyncOptions`, append to commit messages
- `src/features/sync/components/SyncFAB.tsx` — modified: read skip-ci preference, pass to sync options
- `src/features/repos/components/RepoSettingsSheet.tsx` — new: repo settings bottom sheet
- `src/features/repos/components/RepoSettingsSheet.test.tsx` — new: tests
- `src/App.tsx` — modified: wire up RepoSettingsSheet state, update banner logic
- `src/components/layout/SettingsSheet.tsx` — modified: add "Repo settings" menu item
- `src/features/sync/components/BranchProtectionBanner.tsx` — no changes needed (already supports info mode)
- `src/features/sync/components/BranchFallbackPrompt.tsx` — no changes needed (coexists for error-driven flow)

### References

- Per-repo preference pattern: `src/stores/useSyncStore.ts` -> `repoSortModes` (line ~63), `repoSyncBranches` (line ~64)
- `partialize` for persistence: `src/stores/useSyncStore.ts` lines ~783-794
- `syncAllRepoTasksOnce`: `src/services/github/sync-service.ts` lines ~341-477
- `commitTasks`: `src/services/github/sync-service.ts` lines ~114-186
- `SyncOptions` interface: `src/services/github/sync-service.ts` line ~69
- `SyncFAB`: `src/features/sync/components/SyncFAB.tsx`
- `BranchProtectionBanner`: `src/features/sync/components/BranchProtectionBanner.tsx`
- `BranchFallbackPrompt`: `src/features/sync/components/BranchFallbackPrompt.tsx`
- `BottomSheet`: `src/components/ui/BottomSheet.tsx`
- `SettingsSheet`: `src/components/layout/SettingsSheet.tsx`
- `SettingsMenuItem`: `src/components/ui/SettingsMenuItem.tsx`
- `selectSyncBranch`: `src/stores/useSyncStore.ts` line ~158
- `setRepoSyncBranch`: `src/stores/useSyncStore.ts` line ~767
- Story 9-4 (branch fallback): `_bmad-output/implementation-artifacts/9-4-push-to-branch-fallback.md`
- Captured ideas: `captured-ideas-tholo91.md` lines 20-25 (Branching + Option to not trigger deployment)
