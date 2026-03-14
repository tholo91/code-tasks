# Story 4.4: Manual Sync Trigger (Ghost-Writer FAB)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want a clear visual cue when my local vault is ahead of GitHub and a way to trigger a sync manually,
so that I have absolute control and visibility over my data's synchronization status.

## Acceptance Criteria

1. [x] **"Ghost-Writer" FAB:** A Floating Action Button (FAB) appears only when there are unsynced local tasks (`pendingSyncCount > 0`).
2. [x] **Visual State:** The FAB uses a subtle "breathe" animation and the `octicon-sync` icon to indicate that a push is required.
3. [x] **Manual Trigger:** Tapping the FAB initiates an immediate, manual sync of all pending local tasks.
4. [x] **In-Progress Feedback:** While syncing, the FAB shows a "Syncing..." animation (spinner) and is disabled to prevent duplicate triggers.
5. [x] **Post-Sync Transition:** Upon successful sync, the FAB smoothly fades out as the `pendingSyncCount` returns to zero.
6. [x] **Status Bar:** A secondary sync status indicator is displayed in the app header (e.g., "All caught up" or "3 items pending").

## Tasks / Subtasks

- [x] Build the Ghost-Writer FAB Component (AC: 1, 2, 4)
  - [x] Create `src/features/sync/components/SyncFAB.tsx`.
  - [x] Implement the "Breathe" animation and the "Syncing" spinner state using Framer Motion.
  - [x] Position the FAB in the bottom-right of the screen, following the 8px base grid.
- [x] Implement Manual Sync Action (AC: 3, 5)
  - [x] Implement `handleManualSync()` in the FAB component.
  - [x] Call `syncPendingTasks()` from `sync-service.ts`.
  - [x] Update the `useSyncStore.ts` state upon completion to trigger the fade-out.
- [x] Build Header Status Indicator (AC: 6)
  - [x] Update `src/components/layout/AppHeader.tsx` to include the global sync status indicator.
  - [x] Use `octicon-check` (Green) for synced and `octicon-sync` (Amber) for pending.

## Dev Notes

- **The FAB Logic:** The FAB's visibility MUST be tied directly to the `pendingSyncCount` in the Zustand store.
- **Animations:** Use `stiffness: 400, damping: 30` for the FAB entrance/exit for a snappy feel.
- **Utilitarian Elegance:** The FAB should be non-intrusive; its presence is a signal, not a distraction.

### Project Structure Notes

- **Sync Module:** `src/features/sync/`
- **Sync Components:** `src/features/sync/components/SyncFAB.tsx`
- **Global Store:** `src/stores/useSyncStore.ts`

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - Ghost-Writer FAB]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR8]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (March 2026)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Created SyncFAB component with Framer Motion AnimatePresence for entrance/exit animations using spring physics (stiffness: 400, damping: 30). FAB uses breathe animation (scale pulse) when idle, switches to spinner when syncing. Positioned fixed bottom-right at 24px offset (8px grid). Only renders when pendingSyncCount > 0 for the current user.
- Implemented handleManualSync() that calls syncPendingTasks(), manages sync status via useSyncStore (syncing/success/error), updates lastSyncedAt on success, and disables the button during sync to prevent duplicate triggers.
- Created AppHeader component extracting header from App.tsx, with SyncHeaderStatus sub-component showing "All caught up" (green octicon-check), "N items pending" (amber octicon-sync), or "Syncing..." (blue spinning octicon-sync).
- Added 19 new tests: 11 for SyncFAB (visibility, aria-labels, click behavior, sync status updates, error handling) and 8 for SyncHeaderStatus (all states, user scoping, accessibility).
- All new tests pass. Build succeeds with no TypeScript errors.

### Change Log

- 2026-03-14: Implemented Story 4.4 — Ghost-Writer FAB and header sync status indicator

### File List

- src/features/sync/components/SyncFAB.tsx (new)
- src/features/sync/components/SyncFAB.test.tsx (new)
- src/components/layout/AppHeader.tsx (new)
- src/components/layout/SyncHeaderStatus.tsx (new)
- src/components/layout/SyncHeaderStatus.test.tsx (new)
- src/App.tsx (modified — integrated AppHeader + SyncFAB, removed inline header)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/4-4-manual-sync-trigger.md (modified)
