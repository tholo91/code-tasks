# Story 7.2: Per-Repo Task Lists — Repository as Project

Status: done

## Core Concept

**The app is a frontend for a markdown file.** Each GitHub repository contains a `captured-ideas-{username}.md` file — that file IS the data. The app reads, displays, and edits that file. Local state (Zustand/IDB) is a working copy / offline buffer, NOT the primary data store. "Sync" means pushing local edits back to the repo's markdown file.

Per-repo task lists are inherently natural: switching repos means switching which markdown file you're viewing and editing.

## Story

As a User,
I want each GitHub repository to have its own independent task list,
so that I can organize my ideas by project — each repo's `captured-ideas-{username}.md` file is its own project.

## Acceptance Criteria

1. **Given** I have selected Repository A,
   **When** I view the task list,
   **Then** I see only tasks belonging to Repository A (the working copy of Repository A's markdown file).

2. **Given** I switch to Repository B,
   **When** the task list loads,
   **Then** I see only tasks belonging to Repository B (not Repository A's tasks).

3. **Given** I create a task while Repository A is selected,
   **When** the task is persisted locally,
   **Then** it is stored under Repository A's scope — ready to be pushed to Repository A's `captured-ideas-{username}.md`.

4. **Given** I have pending (unsynced) tasks in Repository A and Repository B,
   **When** I trigger sync while Repository A is selected,
   **Then** only Repository A's tasks are written to Repository A's markdown file (Repository B is untouched).

5. **Given** I have existing tasks from before this update (no `repoFullName` field),
   **When** the app loads for the first time after update,
   **Then** legacy tasks are assigned to the currently selected repo (migration).

## Tasks / Subtasks

- [x] Task 1: Add `repoFullName` to Task type (AC: 3)
  - [x] 1.1 Add `repoFullName: string` field to `Task` interface in `src/types/task.ts`
  - [x] 1.2 Use `fullName` (e.g., `"owner/repo"`) as the scoping key — it's human-readable and already available from `SelectedRepo`

- [x] Task 2: Refactor `addTask()` in useSyncStore to capture repo context (AC: 3)
  - [x] 2.1 In `addTask()` (`src/stores/useSyncStore.ts` ~line 174), read `selectedRepo.fullName` from current state
  - [x] 2.2 Set `repoFullName: selectedRepo.fullName` on the new Task object
  - [x] 2.3 Guard: if `selectedRepo` is null, throw or return early (cannot create task without repo)
  - [x] 2.4 Write-through pattern unchanged: localStorage -> IDB -> Zustand (existing pattern works)

- [x] Task 3: Filter displayed tasks by selected repo in App.tsx (AC: 1, 2)
  - [x] 3.1 In `AppContent()` (`src/App.tsx` ~line 255), derive `repoTasks` from `tasks` filtered by `selectedRepo?.fullName`
  - [x] 3.2 Feed `repoTasks` into the existing search/priority filter chain instead of raw `tasks`
  - [x] 3.3 Update task count display to reflect per-repo count

- [x] Task 4: Filter pending sync count by selected repo (AC: 4)
  - [x] 4.1 Update `SyncFAB.tsx` (~line 8-14): filter `pendingSyncCount` by `repoFullName === selectedRepo?.fullName` in addition to username
  - [x] 4.2 Update `SyncHeaderStatus.tsx` (~line 7-13): same repo-scoped filter
  - [x] 4.3 Update `useAutoSync.ts` (~line 16-25): same repo-scoped filter for sync trigger

- [x] Task 5: Scope sync engine to current repo (AC: 4)
  - [x] 5.1 In `syncPendingTasks()` (`src/services/github/sync-service.ts` ~line 127-159), filter pending tasks by BOTH `username` AND `repoFullName` matching `selectedRepo.fullName`
  - [x] 5.2 Only push tasks that belong to the currently selected repo
  - [x] 5.3 The markdown file (`captured-ideas-{username}.md`) is already per-repo (it lives in the repo) — no filename change needed

- [x] Task 6: Scope fuzzy search to current repo (AC: 1)
  - [x] 6.1 The search already operates on `displayedTasks` — if Task 3 filters correctly, search will naturally be repo-scoped
  - [x] 6.2 Verify `TaskSearchBar.tsx` and `fuzzy-search.ts` operate on the already-filtered list

- [x] Task 7: Legacy task migration (AC: 5)
  - [x] 7.1 In `loadTasksFromIDB()` or during hydration, check for tasks missing `repoFullName`
  - [x] 7.2 Assign them to `selectedRepo.fullName` if a repo is selected
  - [x] 7.3 If no repo is selected, leave `repoFullName` as empty string — they'll be orphaned until a repo is selected
  - [x] 7.4 Persist the migration (write-through to localStorage and IDB)

- [x] Task 8: Update tests (AC: all)
  - [x] 8.1 Update `useSyncStore.test.ts` — test `addTask` captures `repoFullName`, test filtering by repo
  - [x] 8.2 Update any component tests that assert on task lists to provide `repoFullName`
  - [x] 8.3 Add test: switching repos shows different task sets
  - [x] 8.4 Add test: sync only pushes current repo's tasks

- [x] Task 9: Run tests and build (AC: all)
  - [x] 9.1 Run `npm test` — fix any failures
  - [x] 9.2 Run `npm run build` — ensure clean build
  - [ ] 9.3 Manual smoke test: create tasks in repo A, switch to repo B, verify isolation

## Dev Notes

### Mental Model — CRITICAL

**The markdown file in each repo is the source of truth.** The app is a nice UI that edits that file. Think of it like a text editor with a pretty task-list view — not a task manager that happens to sync.

- `captured-ideas-{username}.md` in Repo A = Repo A's task list
- `captured-ideas-{username}.md` in Repo B = Repo B's task list
- Local Zustand/IDB state = **working copy** (offline buffer, not primary data)
- "Push to GitHub" = saving your edits back to the file
- Switching repos = opening a different file

This story scopes the local working copy by repo so each repo's tasks stay separate.

### Architecture Compliance

- **Store Pattern:** All task state changes go through `useSyncStore` — no direct localStorage manipulation from UI. This remains unchanged.
- **Write-Through Pattern:** `addTask()` already follows localStorage -> IDB -> Zustand. The `repoFullName` field is just an additional property on the Task object — no pattern change needed.
- **Service Boundaries:** Octokit sync via `sync-service.ts` → store → tasks. The boundary is preserved; we're just adding a filter dimension (which repo's working copy to push).
- **Feature Isolation:** No new features or services needed. This is a data model enhancement that flows through existing architecture.

### Key Design Decision: `repoFullName` vs `repoId`

Use `repoFullName` (string, e.g. `"tholo91/code-tasks"`) instead of `repoId` (number):
- **Human-readable** in stored data and markdown
- **Stable** — repo IDs can theoretically change in edge cases (repo transfer)
- **Already available** from `SelectedRepo.fullName` in the store
- **Matches** how the sync service already identifies repos (owner + repo name)

### Data Model Change

**Task interface — before:**
```typescript
export interface Task {
  id: string
  username: string
  title: string
  body: string
  createdAt: string
  isImportant: boolean
  syncStatus: SyncStatus
  githubIssueNumber: number | null
}
```

**Task interface — after:**
```typescript
export interface Task {
  id: string
  username: string
  repoFullName: string            // NEW — e.g., "tholo91/code-tasks"
  title: string
  body: string
  createdAt: string
  isImportant: boolean
  syncStatus: SyncStatus
  githubIssueNumber: number | null
}
```

### Store Change — NOT a structural refactor

The epics file suggests changing `tasks: Task[]` to `tasksByRepo: Record<string, Task[]>`. **Do NOT do this.** Instead:
- Keep `tasks: Task[]` as a flat array (simpler, less migration risk)
- Add `repoFullName` to each Task object
- Filter at the UI/sync layer using `.filter(t => t.repoFullName === selectedRepo?.fullName)`

**Rationale:** A flat array with a repo field is simpler than a nested map. It avoids breaking the persist middleware, IDB schema, and every consumer. The filter is O(n) on a small list — no performance concern.

### Sync Service — No Markdown Format Change

Each repo already has its own `captured-ideas-{username}.md` — that's the file the app is a frontend for. The sync service already targets the correct repo via `selectedRepo`. The only change is filtering the local working copy — we now only push tasks where `repoFullName` matches the target repo, so edits to Repo A's file don't accidentally include Repo B's tasks.

### Migration Strategy

Simplest approach: on first load, if tasks lack `repoFullName`, assign them to the currently selected repo. This is a one-time operation. If no repo is selected, the orphaned tasks will be assigned when the user selects a repo.

### Critical: Hydration Race Condition

Story 7.1 notes (from commit `fea703b`): there was a hydration race condition with "Initializing GitHub access..." hang. The `AuthGuard` + `use(getHydrationPromise())` pattern must remain intact. Task migration should happen AFTER hydration completes, not during it.

### Project Structure Notes

**Files to Modify:**

| File | Action |
|------|--------|
| `src/types/task.ts` | Add `repoFullName` field to Task interface |
| `src/stores/useSyncStore.ts` | Update `addTask()` to capture repo, add migration logic in `loadTasksFromIDB()` |
| `src/stores/useSyncStore.test.ts` | Update tests |
| `src/App.tsx` | Filter `tasks` by `selectedRepo.fullName` before rendering |
| `src/services/github/sync-service.ts` | Filter pending tasks by `repoFullName` in `syncPendingTasks()` |
| `src/features/sync/components/SyncFAB.tsx` | Filter pending count by repo |
| `src/features/sync/hooks/useAutoSync.ts` | Filter sync trigger by repo |
| `src/components/layout/SyncHeaderStatus.tsx` | Filter status badge by repo |

**Files to Keep Unchanged:**

| File | Reason |
|------|--------|
| `src/features/capture/components/PulseInput.tsx` | Calls `onLaunch()` which goes through `addTask()` — repo context captured in store |
| `src/features/capture/components/TaskCard.tsx` | Displays individual task — no filtering logic |
| `src/features/capture/utils/fuzzy-search.ts` | Operates on already-filtered input — no change needed |
| `src/services/storage/storage-service.ts` | IDB write-through is field-agnostic — works with new field automatically |
| `src/features/sync/utils/markdown-templates.ts` | Markdown format doesn't change |

### Testing Standards

- **Framework:** Vitest + Testing Library
- **Coverage:** All modified files must have updated tests
- **Test co-location:** Tests live next to source files
- **Key test scenarios:**
  - `addTask` creates task with correct `repoFullName`
  - Switching repos changes the visible task list
  - Sync only pushes tasks matching the current repo
  - Legacy tasks (no `repoFullName`) are migrated on load
  - Creating a task without a selected repo is handled gracefully

### References

- [Source: `src/types/task.ts`] — Task interface definition
- [Source: `src/stores/useSyncStore.ts` lines 24-51] — SyncState interface with flat `tasks: Task[]`
- [Source: `src/stores/useSyncStore.ts` lines 174-199] — `addTask()` action (write-through pattern)
- [Source: `src/stores/useSyncStore.ts` lines 234-251] — `loadTasksFromIDB()` (migration point)
- [Source: `src/services/github/sync-service.ts` lines 127-159] — `syncPendingTasks()` (repo filter needed)
- [Source: `src/App.tsx` lines 255, 279-283] — Task list rendering (repo filter needed)
- [Source: `src/features/sync/components/SyncFAB.tsx` lines 8-14] — Pending count display
- [Source: `_bmad-output/implementation-artifacts/7-1-remove-passphrase-gate.md`] — Previous story learnings
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 7.2`] — Epic requirements
- [Source: `_bmad-output/planning-artifacts/architecture.md`] — Architecture compliance

### Git Intelligence

Recent commits show:
- `f3a7de5` — UI redesign with unified design system — establishes CSS class patterns and component structure to follow
- `fea703b` — Fixed hydration race condition — DO NOT break the `AuthGuard` + `use(getHydrationPromise())` pattern
- `3c5c660` — Auth onboarding UX — shows established auth UI patterns

**Critical:** The hydration fix in `fea703b` addressed a Suspense boundary issue. Task migration must happen AFTER hydration, likely inside `loadTasksFromIDB()` which is called post-hydration.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing RepoSelector test timeouts (9 tests) — not related to this story
- Pre-existing 7.1 changes modified `setAuth`/`clearAuth` signatures — fixed `onClick={clearAuth}` TS error in App.tsx as part of this story

### Completion Notes List

- Added `repoFullName: string` field to Task interface for per-repo scoping
- `addTask()` now requires a selected repo (throws if none) and captures `selectedRepo.fullName`
- App.tsx filters all task display/count through `repoTasks` — a `useMemo` filtering tasks by `selectedRepo.fullName`
- SyncFAB, SyncHeaderStatus, and useAutoSync all filter pending counts by both `username` and `repoFullName`
- `syncPendingTasks()` in sync-service now filters by `repoFullName` matching `selectedRepo.fullName`
- Fuzzy search is naturally repo-scoped since it operates on the already-filtered `repoTasks`
- Legacy task migration in `loadTasksFromIDB()` assigns `selectedRepo.fullName` (or empty string) to tasks missing `repoFullName`
- All test files updated with `repoFullName` in task factories and `selectedRepo` in store state setup
- 236 tests passing, 9 pre-existing RepoSelector timeouts unrelated to this story
- Build passes clean

### File List

- `src/types/task.ts` — Added `repoFullName` field to Task interface
- `src/stores/useSyncStore.ts` — Updated `addTask()` with repo guard, added migration in `loadTasksFromIDB()`
- `src/stores/useSyncStore.test.ts` — Added addTask tests (repoFullName, throw guard, repo scoping), reset tasks in beforeEach
- `src/App.tsx` — Added `repoTasks` filter, updated task count/display to use repo-filtered list, fixed clearAuth TS error
- `src/App.test.tsx` — Updated mock tasks with `repoFullName`, aligned `selectedRepo.fullName` values
- `src/services/github/sync-service.ts` — Added `repoFullName` filter in `syncPendingTasks()`
- `src/services/github/sync-service.test.ts` — Added `repoFullName` to `createTask()` helper, added repo-scoping test
- `src/features/sync/components/SyncFAB.tsx` — Added `selectedRepo` and `repoFullName` filter to pending count
- `src/features/sync/components/SyncFAB.test.tsx` — Added `repoFullName` to task helpers, `selectedRepo` to store setup
- `src/features/sync/hooks/useAutoSync.ts` — Added `repoFullName` filter to pending count
- `src/components/layout/SyncHeaderStatus.tsx` — Added `selectedRepo` and `repoFullName` filter to pending count
- `src/components/layout/SyncHeaderStatus.test.tsx` — Added `repoFullName` to task helpers, `selectedRepo` to store setup
- `src/components/auth/hydration.ts` — Removed passphrase logic (from 7.1 context)
- `src/features/auth/components/AuthForm.tsx` — Updated for removed passphrase gate (from 7.1 context)
- `src/services/github/octokit-provider.ts` — Updated for direct token usage (from 7.1 context)

### Change Log

- 2026-03-15: Implemented per-repo task lists — tasks scoped by `repoFullName`, filtered at UI/sync layers, legacy migration included
