# Story 3.4: "Overnight Offline" Local Persistence

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want my ideas to be saved locally immediately upon capture, even if I'm offline,
so that I never lose a spark due to a bad connection.

## Acceptance Criteria

1. [x] **Immediate Local Save:** Tasks are saved to `LocalStorage` (as a buffer) and `IndexedDB` (as a long-term local-first store) immediately upon "Launch."
2. [x] **Offline Accessibility:** The app loads and displays the list of unsynced (local-only) tasks even when there is no internet connection.
3. [x] **Sync Pending Indicator:** Unsynced tasks are visually flagged with an "Amber" sync indicator (e.g., `octicon-sync`).
4. [x] **Write-Through Pattern:** Data is written to local storage synchronously (LocalStorage buffer) BEFORE updating the Zustand store to ensure zero data loss on crash/exit.
5. [x] **Data Integrity:** No captured idea is lost during offline-to-online transitions; the system uses UUIDs to prevent local key collisions.
6. [x] **Visual State:** The list of captured ideas is clearly distinguished between "Synchronized" (GitHub Check) and "Pending" (Local Sync Pill).

## Tasks / Subtasks

- [x] Implement Offline State Logic (AC: 1, 4)
  - [x] Update `src/services/storage/storage-service.ts` to include a "Synchronous-then-Async" write pattern (Write to `localStorage` buffer first, then `IndexedDB` in background).
  - [x] Configure Zustand store to use the synchronous buffer for immediate UI responsiveness.
- [x] Build Local Task List (AC: 2, 3, 6)
  - [x] Implement the `TaskCard.tsx` with conditional "Sync Status" icons.
  - [x] Use `octicon-sync` (Amber: `#d29922`) for pending tasks and `octicon-check` (Green: `#3fb950`) for synced ones.
- [x] UUID & Collision Management (AC: 5)
  - [x] Integrate a lightweight UUID v4 generator for local task IDs.
  - [x] Ensure local tasks are scoped by `{username}` to avoid cross-user local collisions.
- [x] Network Monitoring (AC: 2)
  - [x] Implement a `useNetworkStatus()` hook in `src/hooks/` to track and display the "Offline" status bar.
  - [x] Show a subtle "Offline - Storing Locally" notification when connectivity is lost.

## Dev Notes

- **Synchronous-then-Async:** LocalStorage is the buffer for immediate "Midnight Spark" capture; IndexedDB is the durable local-first store.
- **Zustand Persistence:** The task list MUST be part of the persisted Zustand state.
- **Offline UX:** Follow the "Connectivity Trust" principle: never hide the sync status from the developer.

### Project Structure Notes

- **Storage Service:** `src/services/storage/storage-service.ts`
- **Network Hook:** `src/hooks/useNetworkStatus.ts`
- **Capture Module Components:** `src/features/capture/components/TaskCard.tsx`

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Platform Strategy - Offline-First Resilience]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR7]
- [Source: Web Research - March 11, 2026: Offline-first IndexedDB vs LocalStorage Performance]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (March 2026)

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- Implemented synchronous-then-async write pattern in StorageService: localStorage writes happen synchronously as a crash-safe buffer, then IndexedDB writes fire asynchronously for durable long-term storage.
- Added Task type with SyncStatus ('pending' | 'synced'), UUID v4 generation using crypto.randomUUID() with fallback.
- Extended Zustand store (useSyncStore) with tasks array, addTask (write-through), markTaskSynced, removeTask, and loadTasksFromIDB for IDB recovery on app start. Tasks are part of persisted state.
- Tasks are scoped by username (user.login) to prevent cross-user local collisions.
- Built TaskCard component with octicon-sync (amber #d29922) for pending and octicon-check (green #3fb950) for synced status, including color-coded pills and left border.
- Created useNetworkStatus hook tracking online/offline events with transient "Offline - Storing Locally" notification banner.
- Integrated task list display in App.tsx below PulseInput, wired PulseInput's onLaunch callback to addTask.
- Fixed pre-existing broken imports in octokit-provider.ts and unused parameter warning in auth-service.ts.
- All 69 new/modified tests pass. Build succeeds.

### Change Log

- 2026-03-14: Implemented Story 3-4 "Overnight Offline" local persistence

### File List

- src/services/storage/storage-service.ts (modified - added IndexedDB methods)
- src/services/storage/storage-service.test.ts (new)
- src/types/task.ts (new)
- src/utils/uuid.ts (new)
- src/utils/uuid.test.ts (new)
- src/stores/useSyncStore.ts (modified - added tasks state and actions)
- src/hooks/useNetworkStatus.ts (new)
- src/hooks/useNetworkStatus.test.ts (new)
- src/features/capture/components/TaskCard.tsx (new)
- src/features/capture/components/TaskCard.test.tsx (new)
- src/features/capture/components/PulseInput.tsx (modified - added onLaunch prop)
- src/App.tsx (modified - integrated task list, offline notification, onLaunch wiring)
- src/App.test.tsx (modified - updated mocks for new store fields and useNetworkStatus)
- src/services/github/octokit-provider.ts (modified - fixed pre-existing broken imports)
- src/services/github/auth-service.ts (modified - fixed pre-existing unused parameter)
