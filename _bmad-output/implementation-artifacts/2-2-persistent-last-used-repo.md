# Story 2.2: Persistent "Last Used" Repository Intelligence

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want the app to automatically select my last-used repository on launch,
so that I don't have to select it every time I want to capture a new idea.

## Acceptance Criteria

1. [x] **Selection Persistence:** When a repository is selected, its ID and full name are persisted to `LocalStorage` via the `storage-service.ts` buffer.
2. [x] **Smart Hydration:** On app launch, the `useSyncStore` (Zustand) is hydrated with the "Last Used" repository data from LocalStorage.
3. [x] **Default Selection:** If a persisted repository exists, the UI automatically defaults to it as the capture target, skipping the selection step.
4. [x] **Validation on Load:** The hydrated repository selection is validated against the user's available repositories (using the cached list from Story 2.1) to ensure access hasn't been lost.
5. [x] **Fallback Logic:** If the persisted repository is no longer accessible, the system clears the "Last Used" state and prompts the user to select a new target.

## Tasks / Subtasks

- [x] Implement Persistence Logic (AC: 1, 2)
  - [x] Update `setSelectedRepo` in `useSyncStore.ts` to include a "Write-Through" to `LocalStorage`.
  - [x] Configure Zustand's `persist` middleware to include the `selectedRepo` state.
- [x] Implement Hydration & Validation (AC: 2, 4)
  - [x] Update the `AuthGuard` or a dedicated `RepoGuard` to validate the hydrated repository ID on app launch.
  - [x] Implement `validateRepoAccess(repoId: number)` in `repo-service.ts`.
- [x] Build Fallback UI (AC: 5)
  - [x] Implement a "Repo Not Found" error state in the app header or Pulse input.
  - [x] Ensure automatic redirect to the `RepoSelector` if the last-used repo is missing.

## Dev Notes

- **Zustand Persistence:** Reuse the hydration promise pattern from Story 1.3 to ensure the `selectedRepo` is available before the Pulse UI is rendered.
- **Write-Through Pattern:** Ensure the repository selection is saved synchronously to `LocalStorage` BEFORE updating the Zustand store.
- **Validation:** Use the `getMyRepos` cache where possible to avoid redundant GitHub API calls during the "Last Used" validation loop.

### Project Structure Notes

- **Repo Module:** `src/features/repos/`
- **GitHub Service:** `src/services/github/repo-service.ts`
- **Global Store:** `src/stores/useSyncStore.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#State Management Patterns - Sync Heartbeat]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR2]
- [Source: _bmad-output/implementation-artifacts/1-3-persistent-session-management.md#Dev Notes - React 19 Hydration]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (March 2026)

### Debug Log References

### Completion Notes List

- AC1 (Selection Persistence): Already implemented in prior story — `setSelectedRepo` uses Write-Through pattern to LocalStorage, and `selectedRepo` is included in Zustand `persist` `partialize` config.
- AC2 (Smart Hydration): Zustand persist middleware with `skipHydration: true` rehydrates `selectedRepo` from localStorage during the hydration promise flow established in Story 1.3.
- AC3 (Default Selection): App.tsx already checks `selectedRepo` state and skips the RepoSelector when a persisted repo exists.
- AC4 (Validation on Load): Added `validateRepoAccess()` to `repo-service.ts` and integrated it into `hydration.ts` to validate the persisted repo after successful token validation.
- AC5 (Fallback Logic): If `validateRepoAccess` returns false, the hydration flow clears `selectedRepo` via `setSelectedRepo(null)`, which triggers the RepoSelector UI in App.tsx.

### File List

- `src/services/github/repo-service.ts` — Added `validateRepoAccess()` function
- `src/services/github/repo-service.test.ts` — Added 5 tests for `validateRepoAccess`
- `src/components/auth/hydration.ts` — Added repo validation during hydration flow
- `src/components/auth/hydration.test.ts` — Added 4 tests for last-used repo validation
