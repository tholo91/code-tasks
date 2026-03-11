# Story 4.4: Manual Sync Trigger (Ghost-Writer FAB)

Status: ready-for-dev

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

- [ ] Build the Ghost-Writer FAB Component (AC: 1, 2, 4)
  - [ ] Create `src/features/sync/components/SyncFAB.tsx`.
  - [ ] Implement the "Breathe" animation and the "Syncing" spinner state using Framer Motion.
  - [ ] Position the FAB in the bottom-right of the screen, following the 8px base grid.
- [ ] Implement Manual Sync Action (AC: 3, 5)
  - [ ] Implement `handleManualSync()` in the FAB component.
  - [ ] Call `syncPendingTasks()` from `sync-service.ts`.
  - [ ] Update the `useSyncStore.ts` state upon completion to trigger the fade-out.
- [ ] Build Header Status Indicator (AC: 6)
  - [ ] Update `src/components/layout/AppHeader.tsx` to include the global sync status indicator.
  - [ ] Use `octicon-check` (Green) for synced and `octicon-sync` (Amber) for pending.

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

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
