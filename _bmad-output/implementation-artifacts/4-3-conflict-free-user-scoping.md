# Story 4.3: Conflict-Free User Scoping

Status: ready-for-dev

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

- [ ] Implement Scoping Logic (AC: 1, 2)
  - [ ] Implement `getScopedFileName(username: string)` in `sync-service.ts`.
  - [ ] Ensure the `{username}` is derived from the `user` state in `useSyncStore.ts`.
- [ ] Integration & Test (AC: 1, 3, 4)
  - [ ] Verify that sync operations target the correct file name.
  - [ ] Test with multiple "simulated" usernames to ensure file isolation.
- [ ] Display Target File (AC: 5)
  - [ ] Update the `RepoSelector.tsx` or `AppHeader.tsx` to display the current target file name (e.g., `Target: captured-ideas-thomas.md`).

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

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
