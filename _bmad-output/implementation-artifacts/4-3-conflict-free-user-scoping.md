# Story 4.3: Conflict-Free User Scoping

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want my tasks to be stored in a file specific to my username,
so that I can collaborate in a shared repository without causing merge conflicts with my teammates.

## Acceptance Criteria

1. [x] **Scoped File Targeting:** The system automatically targets `captured-ideas-{username}.md` as the storage file (NFR6).
2. [x] **Username Retrieval:** The `{username}` is extracted from the authenticated GitHub user profile during the sync operation.
3. [x] **Multi-File Resilience:** The system creates the file if it does not exist and ensures it never interferes with files from other users.
4. [x] **Zero-Conflict Strategy:** The sync engine uses the `{username}` scope to prevent race conditions during concurrent pushes to a shared repository.
5. [x] **Visual Confirmation:** The app indicates the targeted file name in the sync status or settings screen.

## Tasks / Subtasks

- [x] Implement Scoping Logic (AC: 1, 2)
  - [x] Implement `getScopedFileName(username: string)` in `sync-service.ts`.
  - [x] Ensure the `{username}` is derived from the `user` state in `useSyncStore.ts`.
- [x] Integration & Test (AC: 1, 3, 4)
  - [x] Verify that sync operations target the correct file name.
  - [x] Test with multiple "simulated" usernames to ensure file isolation.
- [x] Display Target File (AC: 5)
  - [x] Update `SyncStatusBar.tsx` to display the current target file name (e.g., `→ captured-ideas-thomas.md`).

## Dev Notes

- **The Scoping Strategy:** This is the primary mechanism for preventing merge conflicts in shared repositories.
- **Dynamic Naming:** Ensure the file name is updated instantly if the user switches accounts.

### Project Structure Notes

- **Sync Module:** `src/features/sync/`
- **GitHub Service:** `src/services/github/sync-service.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries - Conflict Avoidance]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR9, NFR6]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (March 2026)

### Debug Log References

None — no issues encountered.

### Completion Notes List

- Extracted inline `captured-ideas-${user.login}.md` into a dedicated `getScopedFileName(username)` function in sync-service.ts
- `syncPendingTasks()` now calls `getScopedFileName()` instead of inlining the template string
- Added target file indicator to `SyncStatusBar.tsx` — shows `→ captured-ideas-{username}.md` when user and repo are set
- Added 4 new unit tests for `getScopedFileName` (basic naming, hyphens/numbers, multi-user isolation)
- Added 1 integration test verifying `syncPendingTasks` uses the scoped file path
- Added 3 new component tests for the target file indicator in SyncStatusBar

### File List

- `src/services/github/sync-service.ts` — added `getScopedFileName()`, refactored `syncPendingTasks()` to use it
- `src/services/github/sync-service.test.ts` — added tests for `getScopedFileName` and scoped file path integration
- `src/features/sync/components/SyncStatusBar.tsx` — added target file name display with `data-testid="target-file-indicator"`
- `src/features/sync/components/SyncStatusBar.test.tsx` — added tests for target file indicator visibility
