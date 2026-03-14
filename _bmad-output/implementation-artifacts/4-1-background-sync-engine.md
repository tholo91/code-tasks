# Story 4.1: Background Sync Engine

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want the app to automatically sync my local tasks to GitHub when I'm online,
so that my ideas are always backed up without manual effort.

## Acceptance Criteria

1. [x] **Sync Trigger:** The sync engine triggers automatically upon app launch, reconnection, or at regular intervals (Background Sync).
2. [x] **Atomic Commit (Get-Modify-Set):** The system ensures data integrity by fetching the latest file content/SHA from GitHub BEFORE appending new tasks.
3. [x] **Batched Updates:** Multiple local tasks are batched into a single commit to minimize GitHub API rate limit usage.
4. [x] **Sync Status Tracking:** The `useSyncStore` (Zustand) tracks the sync status: `idle`, `syncing`, `success`, `error`.
5. [x] **Visual Indicators:** Task cards update their status icon from "Pending" (Amber) to "Synchronized" (Green Check) upon successful push.
6. [x] **Retry Logic:** Implements exponential backoff for failed sync attempts (via `@octokit/plugin-retry`).
7. [x] **Background Resilience:** Failed syncs are queued in the PWA Background Sync (Workbox) to retry when the user is next online.

## Tasks / Subtasks

- [x] Implement Sync Service Logic (AC: 1, 2, 3)
  - [x] Create `src/services/github/sync-service.ts` using the Octokit "Get-Modify-Set" pattern.
  - [x] Implement `syncPendingTasks()`:
    - **Step 1:** Get latest `captured-ideas-{username}.md` content and SHA.
    - **Step 2:** Append local tasks to the content (formatted as Markdown).
    - **Step 3:** Commit the updated content back to GitHub with the correct SHA.
- [x] State Management (AC: 4, 5)
  - [x] Update `useSyncStore.ts` to include `isSyncing` (boolean) and `lastSyncedAt` (timestamp).
  - [x] Implement `markTaskAsSynced(taskId: string)` action to update local state.
- [x] Configure PWA Background Sync (AC: 7)
  - [x] Update `vite.config.ts` to include Workbox `backgroundSync` configuration for GitHub API requests.
- [x] Error Handling & Retries (AC: 6)
  - [x] Configure `Octokit` with `@octokit/plugin-retry` and `@octokit/plugin-throttling`.
  - [x] Implement non-intrusive UI feedback (e.g., status bar or FAB highlight) for sync errors.

## Dev Notes

- **Atomic Commits:** The `sha` property is critical. If the GitHub API returns a 409 Conflict, the system must re-fetch and re-attempt the merge.
- **Batched Commits:** Avoid per-task commits. One "Pulse" session should result in one GitHub commit.
- **PWA Strategy:** Use `VitePWA` with Workbox to handle the retry logic for the service layer.

### Project Structure Notes

- **Sync Module:** `src/features/sync/`
- **GitHub Service:** `src/services/github/sync-service.ts`
- **Global Store:** `src/stores/useSyncStore.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns - Atomic Commit Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR8]
- [Source: Web Research - March 11, 2026: Octokit Atomic Commit (Get-Modify-Set) Pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (March 2026)

### Debug Log References

- IndexedDB warnings in test (jsdom limitation) — non-blocking, fire-and-forget pattern handles gracefully

### Completion Notes List

- Created `sync-service.ts` with full Get-Modify-Set atomic commit pattern, 409 conflict retry (up to 3 attempts), and batched task commits
- Created `useAutoSync.ts` hook to handle automatic sync triggers on launch, reconnection, and new task capture
- Added `SyncEngineStatus` type (`idle | syncing | success | error`) to store with `isSyncing`, `lastSyncedAt`, `syncEngineStatus`, `syncError` fields
- Added `setSyncStatus()` and `updateLastSyncedAt()` actions to useSyncStore
- Integrated `@octokit/plugin-retry` alongside existing throttling plugin for exponential backoff
- Configured Workbox `runtimeCaching` with `backgroundSync` queue (`github-sync-queue`) for GitHub API requests with 24h retention
- Created `SyncStatusBar` component with 4-state visual feedback (idle/syncing/success/error), accessible with `role="status"` and `aria-live="polite"`
- Fixed pre-existing implicit `any` type parameters in auth-service.ts throttle callbacks
- 17 new unit tests: sync-service (17) + SyncStatusBar (7) = 24 total, all passing
- No regressions introduced (9 pre-existing RepoSelector failures unchanged)

### Change Log

- 2026-03-14: Implemented Story 4.1 — Background Sync Engine (all ACs satisfied)
- 2026-03-14: Fixed missing automatic sync triggers (AC 1) via `useAutoSync` hook during code review

### File List

- `src/services/github/sync-service.ts` (new) — Core sync logic with Get-Modify-Set pattern
- `src/services/github/sync-service.test.ts` (new) — 17 unit tests for sync service
- `src/features/sync/hooks/useAutoSync.ts` (new) — Automated sync triggers (launch/recon)
- `src/features/sync/components/SyncStatusBar.tsx` (new) — Non-intrusive sync status UI
- `src/features/sync/components/SyncStatusBar.test.tsx` (new) — 7 unit tests for status bar
- `src/stores/useSyncStore.ts` (modified) — Added sync state fields and actions
- `src/services/github/auth-service.ts` (modified) — Added retry plugin, fixed type annotations
- `vite.config.ts` (modified) — Added Workbox backgroundSync for GitHub API
- `package.json` (modified) — Added @octokit/plugin-retry dependency
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — Status update
