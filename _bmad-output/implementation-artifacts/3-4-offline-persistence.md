# Story 3.4: "Overnight Offline" Local Persistence

Status: ready-for-dev

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

- [ ] Implement Offline State Logic (AC: 1, 4)
  - [ ] Update `src/services/storage/storage-service.ts` to include a "Synchronous-then-Async" write pattern (Write to `localStorage` buffer first, then `IndexedDB` in background).
  - [ ] Configure Zustand store to use the synchronous buffer for immediate UI responsiveness.
- [ ] Build Local Task List (AC: 2, 3, 6)
  - [ ] Implement the `TaskCard.tsx` with conditional "Sync Status" icons.
  - [ ] Use `octicon-sync` (Amber: `#d29922`) for pending tasks and `octicon-check` (Green: `#3fb950`) for synced ones.
- [ ] UUID & Collision Management (AC: 5)
  - [ ] Integrate a lightweight UUID v4 generator for local task IDs.
  - [ ] Ensure local tasks are scoped by `{username}` to avoid cross-user local collisions.
- [ ] Network Monitoring (AC: 2)
  - [ ] Implement a `useNetworkStatus()` hook in `src/hooks/` to track and display the "Offline" status bar.
  - [ ] Show a subtle "Offline - Storing Locally" notification when connectivity is lost.

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

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
