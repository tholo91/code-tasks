# Story 9.4: Push to Branch Fallback

Status: done

## Story

As a user with a branch-protected repository,
I want Gitty to automatically push my tasks to a fallback branch instead of failing,
so that my tasks are safely synced to GitHub even when the default branch blocks direct pushes.

## Acceptance Criteria

1. Given I sync and the push fails with a branch-protection error, when the error is detected, then a prompt appears asking "Push to a branch instead?" with a suggested branch name (e.g., `gitty/{username}`) and options to accept or dismiss.

2. Given I accept the branch fallback prompt, when I confirm, then:
   - The branch is created from the default branch's HEAD (if it doesn't exist yet)
   - My tasks are pushed to that branch
   - The branch name is remembered for this repo (persisted across sessions)

3. Given I have a remembered fallback branch for this repo, when I sync next time, then Gitty pushes directly to the fallback branch without asking again — no extra prompts.

4. Given I have a remembered fallback branch, when I view the BranchProtectionBanner, then it shows the active fallback branch name and a "Change" option instead of the current "Can't sync" message.

5. Given the fallback branch push also fails (e.g., the branch itself is protected, or network error), when the error occurs, then the existing error flow is shown (red SyncFAB + error state) — no infinite fallback loop.

6. Given I want to clear or change my fallback branch, when I tap "Change" on the banner, then I can enter a different branch name or disable the fallback to go back to the default "Can't sync" state.

7. Given the fallback branch already exists on the remote, when I push, then Gitty pushes to it normally (no branch creation needed — just commit to the existing branch).

## Tasks / Subtasks

- [x] Task 1: Add `repoSyncBranches` to store + persistence (AC: #2, #3)
  - [x] Add `repoSyncBranches: Record<string, string>` to `SyncState` interface in `useSyncStore.ts`
  - [x] Initialize to `{}` in the store defaults
  - [x] Add `setRepoSyncBranch(repoFullName: string, branch: string | null)` action — sets or clears the fallback branch for a repo
  - [x] Add `repoSyncBranches` to `partialize` for persistence (same pattern as `repoSortModes`)
  - [x] Add selector: `selectSyncBranch(repoFullName: string)` — returns branch name or null

- [x] Task 2: Add branch-aware sync to `sync-service.ts` (AC: #2, #3, #5, #7)
  - [x] Add `syncToBranch(branchName: string, options?: SyncOptions)` export — variant of `syncAllRepoTasks` that:
    1. Gets the default branch's HEAD SHA via `octokit.rest.git.getRef({ ref: 'heads/main' })` (or the repo's default branch)
    2. Checks if the target branch exists via `octokit.rest.git.getRef({ ref: 'heads/{branchName}' })`
    3. If branch doesn't exist → create it: `octokit.rest.git.createRef({ ref: 'refs/heads/{branchName}', sha: headSha })`
    4. Push the file to the branch: same `createOrUpdateFileContents` call but with `branch: branchName` parameter
    5. On success → return `SyncResult` with `syncedCount`
    6. On failure → classify error normally (do NOT retry with another branch — that would be an infinite loop)
  - [x] Add helper `getDefaultBranch(octokit, owner, repo)` — calls `octokit.rest.repos.get()` and returns `data.default_branch` (usually "main" or "master")
  - [x] Modify `syncAllRepoTasks` to accept optional `branch?: string` in `SyncOptions` — if set, pass it as `branch` param to `createOrUpdateFileContents`

- [x] Task 3: Update SyncFAB to handle branch fallback flow (AC: #1, #2, #3)
  - [x] In `handleSync` callback in `SyncFAB.tsx`:
    - Before sync: check `repoSyncBranches[repoKey]` for a remembered branch
    - If branch exists → call `syncAllRepoTasks({ branch: rememberedBranch })` directly (no prompt)
    - If no branch and sync returns `errorType === 'branch-protection'` → set state to show the branch prompt (new `showBranchPrompt` local state)
  - [x] Do NOT handle the prompt UI in SyncFAB — emit the error type and let App.tsx handle the prompt (keeps SyncFAB focused on sync orchestration)

- [x] Task 4: Create `BranchFallbackPrompt` component (AC: #1, #2)
  - [x] Create `src/features/sync/components/BranchFallbackPrompt.tsx`
  - [x] Bottom sheet or modal that appears on branch-protection error when no fallback is remembered
  - [x] Shows: "This repo has branch protection. Push to a branch instead?"
  - [x] Pre-filled branch name: `gitty/{username}` (editable text input)
  - [x] Two buttons: "Push to branch" (confirm) and "Not now" (dismiss)
  - [x] On confirm: call `setRepoSyncBranch(repoFullName, branchName)` then re-trigger sync with that branch
  - [x] Use existing `BottomSheet` component (`src/components/ui/BottomSheet.tsx`)
  - [x] Style: match existing sheet patterns — `var(--color-surface)` background, `var(--color-border)` border
  - [x] `data-testid="branch-fallback-prompt"`

- [x] Task 5: Update `BranchProtectionBanner` for active fallback state (AC: #4, #6)
  - [x] Modify `src/features/sync/components/BranchProtectionBanner.tsx`
  - [x] Add prop: `fallbackBranch?: string | null`
  - [x] When `fallbackBranch` is set, show different content:
    - Icon: git-branch icon instead of lock icon
    - Text: "Syncing to branch `{fallbackBranch}`" (informational, not a warning)
    - Button: "Change" instead of "Switch Repo" — opens the branch fallback prompt to edit or clear
    - Color: info tint (`var(--color-info)` background) instead of warning gold
  - [x] When `fallbackBranch` is null → show existing "Can't sync" warning (no change)
  - [x] Add `onChangeBranch` callback prop for the "Change" button

- [x] Task 6: Wire up in `App.tsx` (AC: #1–#7)
  - [x] Import `BranchFallbackPrompt` and the new store selector
  - [x] Add `showBranchPrompt` state to `AppContent`
  - [x] Subscribe to `syncErrorType` — when it becomes `'branch-protection'` AND no fallback branch is set → show prompt
  - [x] Pass `fallbackBranch` to `BranchProtectionBanner`
  - [x] Handle "Change" from banner → open prompt in edit mode
  - [x] Handle confirm from prompt → save branch, clear error, re-trigger sync

- [x] Task 7: Tests (AC: #1, #2, #3, #5)
  - [x] `src/features/sync/components/BranchFallbackPrompt.test.tsx`:
    - Renders with pre-filled branch name `gitty/{username}`
    - Calls `onConfirm` with branch name on submit
    - Calls `onDismiss` on cancel
  - [x] `src/features/sync/components/BranchProtectionBanner.test.tsx` (update existing):
    - Shows lock + "Can't sync" when `fallbackBranch` is null
    - Shows branch icon + "Syncing to branch X" when `fallbackBranch` is set
    - Shows "Change" button when fallback is active
  - [x] `src/services/github/sync-service.test.ts` (update):
    - `syncAllRepoTasks({ branch: 'gitty/user' })` passes branch to API call
    - Branch creation is attempted when branch doesn't exist (mock 404 → createRef)

## Dev Notes

### 1. The `branch` Parameter in Octokit createOrUpdateFileContents

The `octokit.rest.repos.createOrUpdateFileContents` API accepts a `branch` parameter:

```typescript
await octokit.rest.repos.createOrUpdateFileContents({
  owner,
  repo,
  path: filePath,
  message: commitMessage,
  content: btoa(unescape(encodeURIComponent(content))),
  sha: existingSha,         // SHA of the file on the TARGET branch
  branch: 'gitty/username', // ← push to this branch instead of default
})
```

**Critical:** When pushing to a non-default branch, the `sha` must be the file's SHA on THAT branch, not on main. So when `branch` is set, `getFileContent` must also fetch from that branch:

```typescript
// getFileContent currently does:
await octokit.rest.repos.getContent({ owner, repo, path })

// For branch fallback, it needs:
await octokit.rest.repos.getContent({ owner, repo, path, ref: branchName })
```

Modify `getFileContent` to accept an optional `ref` parameter.

### 2. Branch Creation via Git Refs API

To create a branch from the default branch's HEAD:

```typescript
// Step 1: Get default branch HEAD
const { data: refData } = await octokit.rest.git.getRef({
  owner, repo, ref: `heads/${defaultBranch}` // e.g., 'heads/main'
})
const headSha = refData.object.sha

// Step 2: Create the branch
await octokit.rest.git.createRef({
  owner, repo,
  ref: `refs/heads/gitty/${username}`,
  sha: headSha,
})
```

If the branch already exists, `createRef` returns 422 — catch it and proceed to push. Use `getRef` first to check; if 404, create. If 200, the branch already exists.

### 3. Per-Repo Preference Pattern — Follow `repoSortModes`

The store already has the exact pattern needed:

```typescript
// Existing (repoSortModes):
repoSortModes: Record<string, SortMode>
setRepoSortMode: (repoFullName: string, mode: SortMode) => {
  const key = normalizeRepoKey(repoFullName)
  set((state) => ({
    repoSortModes: { ...state.repoSortModes, [key]: mode },
  }))
}

// New (repoSyncBranches) — identical pattern:
repoSyncBranches: Record<string, string>
setRepoSyncBranch: (repoFullName: string, branch: string | null) => {
  const key = normalizeRepoKey(repoFullName)
  set((state) => {
    const updated = { ...state.repoSyncBranches }
    if (branch) {
      updated[key] = branch
    } else {
      delete updated[key]
    }
    return { repoSyncBranches: updated }
  })
}
```

Add `repoSyncBranches` to the `partialize` function (line ~671) for persistence:

```typescript
partialize: (state) => ({
  ...existingFields,
  repoSyncBranches: state.repoSyncBranches,
})
```

### 4. Sync Flow with Branch Fallback — Decision Tree

```
SyncFAB.handleSync()
  │
  ├─ Has remembered branch for this repo?
  │   YES → syncAllRepoTasks({ branch: rememberedBranch })
  │          ├─ Success → done (toast, checkmark)
  │          └─ Fail → normal error flow (red FAB)
  │                    Do NOT prompt for another branch
  │
  └─ NO → syncAllRepoTasks() (push to default branch)
          ├─ Success → done
          ├─ branch-protection error → show BranchFallbackPrompt
          │   ├─ User confirms → setRepoSyncBranch(), re-sync with branch
          │   └─ User dismisses → show BranchProtectionBanner (existing)
          └─ Other error → normal error flow
```

### 5. Default Branch Name

Use `gitty/{username}` as the suggested fallback branch name. This:
- Avoids collision with user's feature branches
- Is clearly identifiable as a Gitty-managed branch
- Scoped to the user (consistent with the `captured-ideas-{username}.md` scoping)
- Example: `gitty/tholo91`

The username is available from `useSyncStore.getState().user.login`.

### 6. Re-triggering Sync After Branch Selection

When the user confirms a branch in the prompt, the flow is:
1. Save branch: `setRepoSyncBranch(repoFullName, branch)`
2. Clear current error: `setSyncStatus('idle')`
3. Re-trigger sync: call `handleSync()` from SyncFAB (or directly call `syncAllRepoTasks({ branch })`)

The cleanest approach: have App.tsx call `syncAllRepoTasks({ branch })` directly after setting the preference, rather than re-triggering the SyncFAB click. This avoids a redundant branch-protection check.

### 7. Conflict Detection on Branch

The existing conflict detection compares `lastSyncedSha` with the remote SHA. When pushing to a fallback branch, the SHA tracking is per-branch — the `repoSyncMeta.lastSyncedSha` should reflect the branch's SHA, not main's. Since `syncAllRepoTasks` always fetches the file from the target path (and now with `ref: branch`), the SHA will naturally be the branch's SHA. No special handling needed — the existing flow works as-is when the `branch` and `ref` params are passed consistently.

### Project Structure Notes

- `src/stores/useSyncStore.ts` — modified: add `repoSyncBranches` state + action + persistence
- `src/services/github/sync-service.ts` — modified: add `branch` to `SyncOptions`, update `getFileContent` with `ref`, add branch creation helper
- `src/features/sync/components/SyncFAB.tsx` — modified: check remembered branch before sync
- `src/features/sync/components/BranchFallbackPrompt.tsx` — new: branch selection bottom sheet
- `src/features/sync/components/BranchProtectionBanner.tsx` — modified: active fallback state
- `src/App.tsx` — modified: wire up prompt state + banner props

### References

- Per-repo preference pattern: `src/stores/useSyncStore.ts` → `repoSortModes` (line ~56, ~656–661, ~674)
- `partialize` for persistence: `src/stores/useSyncStore.ts` line ~668–676
- `syncAllRepoTasks`: `src/services/github/sync-service.ts` lines 240–390
- `SyncOptions` interface: `src/services/github/sync-service.ts` (add `branch?: string`)
- `classifySyncError` branch-protection detection: `src/services/github/sync-service.ts` lines 203–213
- `getFileContent` (needs `ref` param): `src/services/github/sync-service.ts` (internal function)
- `BranchProtectionBanner`: `src/features/sync/components/BranchProtectionBanner.tsx` (87 lines)
- `SyncFAB.handleSync`: `src/features/sync/components/SyncFAB.tsx` lines 37–68
- `BottomSheet` reusable component: `src/components/ui/BottomSheet.tsx`
- Octokit createOrUpdateFileContents `branch` param: GitHub REST API docs
- Octokit git.createRef: GitHub REST API docs
- Architecture: Octokit Service Layer pattern — all GitHub API calls through `src/services/github/`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Task 1: Added `repoSyncBranches` state, `setRepoSyncBranch` action, `selectSyncBranch` selector, and persistence via `partialize` to `useSyncStore.ts`. Follows existing `repoSortModes` pattern exactly.
- Task 2: Extended `SyncOptions` with `branch?: string`, added `getDefaultBranch` and `ensureBranchExists` helpers, updated `getFileContent` with optional `ref` parameter, and modified `syncAllRepoTasksOnce` to pass branch to `createOrUpdateFileContents`. Conflict detection is skipped for branch fallback pushes.
- Task 3: SyncFAB now checks `selectSyncBranch` for remembered branch and passes it to `syncAllRepoTasks`. Prompt UI is delegated to App.tsx per story spec.
- Task 4: Created `BranchFallbackPrompt` bottom sheet using existing `BottomSheet` component. Editable input pre-filled with `gitty/{username}`, confirm/dismiss buttons, proper test IDs.
- Task 5: `BranchProtectionBanner` now shows info state (branch icon, blue tint, "Syncing to branch X", "Change" button) when `fallbackBranch` is set, and original warning state (lock, gold, "Can't sync") when null.
- Task 6: Wired up in `App.tsx` — `showBranchPrompt` state, effect to auto-show prompt on branch-protection error, `handleBranchConfirm` that saves branch, clears error, and re-triggers sync. Banner receives `fallbackBranch` and `onChangeBranch` props.
- Task 7: 19 new tests (7 BranchFallbackPrompt + 12 BranchProtectionBanner) all pass. Updated App.test.tsx mocks for new exports. Full suite: 477 pass, 1 pre-existing failure (AuthForm, unrelated).

### Change Log

- 2026-03-20: Implemented Story 9.4 — Push to Branch Fallback (all 7 tasks, all ACs)

### File List

- `src/stores/useSyncStore.ts` — modified: added `repoSyncBranches` state, `setRepoSyncBranch` action, `selectSyncBranch` selector, `partialize` entry
- `src/services/github/sync-service.ts` — modified: added `branch` to `SyncOptions`, `getDefaultBranch`, `ensureBranchExists` helpers, `ref` param to `getFileContent`, branch support in `syncAllRepoTasksOnce` and `syncPendingTasksOnce`
- `src/features/sync/components/SyncFAB.tsx` — modified: reads fallback branch, passes to sync options
- `src/features/sync/components/BranchFallbackPrompt.tsx` — new: branch selection bottom sheet with disable fallback option
- `src/features/sync/components/BranchFallbackPrompt.test.tsx` — new: 7 tests
- `src/features/sync/components/BranchProtectionBanner.tsx` — modified: dual-mode (warning vs info) based on `fallbackBranch` prop
- `src/features/sync/components/BranchProtectionBanner.test.tsx` — modified: added 4 fallback-state tests
- `src/features/sync/components/SyncConflictBanner.tsx` — modified: added branch-aware force sync
- `src/features/sync/components/SyncConflictSheet.tsx` — modified: added branch-aware force sync
- `src/features/sync/components/SyncImportBanner.tsx` — modified: UI polish for remote updates (from story 8-12)
- `src/components/layout/SettingsSheet.tsx` — modified: added About Gitty link (from story 8-8)
- `src/utils/task-diff.ts` — modified: added buildImportFeedbackMessage and safety guard (from story 8-12)
- `src/App.tsx` — modified: wired up prompt state, fallback branch, auto-prompt on error, re-sync on confirm
- `src/App.test.tsx` — modified: added `selectSyncBranch` and `syncAllRepoTasks` mocks
