# Story 4.1: Background Sync Engine

Status: ready-for-dev

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

- [ ] Implement Sync Service Logic (AC: 1, 2, 3)
  - [ ] Create `src/services/github/sync-service.ts` using the Octokit "Get-Modify-Set" pattern.
  - [ ] Implement `syncPendingTasks()`:
    - **Step 1:** Get latest `captured-ideas-{username}.md` content and SHA.
    - **Step 2:** Append local tasks to the content (formatted as Markdown).
    - **Step 3:** Commit the updated content back to GitHub with the correct SHA.
- [ ] State Management (AC: 4, 5)
  - [ ] Update `useSyncStore.ts` to include `isSyncing` (boolean) and `lastSyncedAt` (timestamp).
  - [ ] Implement `markTaskAsSynced(taskId: string)` action to update local state.
- [ ] Configure PWA Background Sync (AC: 7)
  - [ ] Update `vite.config.ts` to include Workbox `backgroundSync` configuration for GitHub API requests.
- [ ] Error Handling & Retries (AC: 6)
  - [ ] Configure `Octokit` with `@octokit/plugin-retry` and `@octokit/plugin-throttling`.
  - [ ] Implement non-intrusive UI feedback (e.g., status bar or FAB highlight) for sync errors.

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

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
