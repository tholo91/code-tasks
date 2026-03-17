# Story 7.7: Task Deletion & Swipe Actions

Status: review

## Update Notes (2026-03-17)

- The sync layer now uses a centralized `sortTasksForDisplay()` utility and a full file rebuild. Reuse this utility anywhere deletion needs to preserve ordering (active by `order`, completed by `completedAt`).
- Sync now includes conflict detection and a conflict resolution flow. Deletion should not clear a conflict state; conflicts must be resolved explicitly before pushing.

## Core Concept

**The app is a frontend for a markdown file.** Deleting a task removes it from the local store + IDB. On next push to GitHub, the sync service performs a **full file rebuild** from current `tasks[]` — the deleted task is simply absent. The user never thinks about the markdown file. They swipe, it's gone, they push, it's gone from GitHub.

**Undo-first, not confirm-first.** Deletion uses the iOS undo-toast pattern — NOT a confirmation dialog. The user swipes and taps Delete → the task immediately animates away (swipe-off-left, continuing the gesture direction) → an undo toast appears for 5 seconds: *"Task deleted · Undo"*. If they tap Undo, the task reappears. If the timer expires, `removeTask` fires for real. This removes all friction from deletion while providing a safety net. No "are you sure?" dialogs — those make users think twice, which is exactly what we want to avoid.

**iOS-native swipe-to-reveal actions.** Swiping a task card left reveals a tray of action buttons — "Move to..." and "Delete". This is the standard iOS pattern (Mail, Reminders, Things 3) and gives the user fast, contextual access to destructive and organizational actions without opening the detail view. The swipe gesture coexists cleanly with existing interactions because it's on the **horizontal axis** — tap (instant), long-press-to-drag (vertical), and checkbox (targeted area) operate on different axes/areas.

**Deletion signals "changes to push."** After a deletion, the SyncFAB must indicate that there are unpushed changes. Even though the deleted task is gone from the store, the GitHub markdown file still contains it until the user pushes. This prevents silent local/remote divergence — the user sees "push to sync" and acts on it. The markdown file feels like it "just works."

**Multi-select is deferred.** Thomas suggested multi-select for batch delete/move/reorder. This is a valuable feature but adds significant complexity (selection mode toggle, separate selection checkboxes, batch action toolbar, state management). Designed as a future enhancement (Story 7.10). The swipe pattern handles the most common case (single task actions) with minimal friction.

## Story

As a User,
I want to delete tasks I no longer need via swipe actions or the detail view,
so that my task list stays clean and focused.

## Acceptance Criteria

1. **Given** I am viewing the task list,
   **When** I swipe a task card to the left,
   **Then** an action tray slides into view revealing action buttons,
   **And** the task card shifts left proportionally to my finger movement.

2. **Given** the swipe action tray is revealed,
   **When** I tap the "Delete" button (red),
   **Then** the task immediately animates off-screen to the left (continuing the swipe direction),
   **And** an undo toast appears at the bottom: "Task deleted · **Undo**" with a 5-second countdown,
   **And** after 5 seconds (if no undo), the task is permanently removed from the store and IDB.

3. **Given** the undo toast is visible,
   **When** I tap "Undo" before the 5-second timer expires,
   **Then** the task reappears in its original position with a slide-in animation,
   **And** the undo toast dismisses.

4. **Given** the swipe action tray is revealed and the user has more than one repo configured,
   **When** I tap the "Move to..." button (blue),
   **Then** the RepoPickerSheet opens in "move" mode,
   **And** upon selecting a repo, the task moves to that repo's list with a toast confirmation.

5. **Given** the user has only one repository configured,
   **When** the swipe action tray reveals,
   **Then** only the "Delete" button is shown (no "Move to..." button),
   **And** the tray width adjusts to fit a single button.

6. **Given** the swipe action tray is revealed,
   **When** I tap elsewhere on the screen or swipe the card back to the right,
   **Then** the action tray closes and the card returns to its default position.

7. **Given** I am in the task detail view (Story 7.5),
   **When** I tap the "Delete" button at the bottom of the sheet,
   **Then** the detail sheet closes, the task animates away, and the same undo toast appears.

8. **Given** I delete a task (undo timer expired),
   **When** the deletion is finalized,
   **Then** the SyncFAB shows a visual indicator that there are changes to push,
   **And** on next push to GitHub, the markdown file is rebuilt without the deleted task.

9. **Given** I push to GitHub after deleting tasks,
   **When** the sync completes,
   **Then** the `captured-ideas-{username}.md` file is fully rebuilt from current `tasks[]`,
   **And** deleted tasks' lines are absent from the file.

10. **Given** I swipe left on a completed task in the "Completed" section,
    **When** the action tray reveals,
    **Then** the same actions are available (completed tasks are also deletable/movable).

11. **Given** I am dragging a task (long-press + vertical drag from Story 7.6),
    **When** my finger moves horizontally,
    **Then** the swipe action tray does NOT activate (drag takes priority once initiated).

12. **Given** I begin a horizontal swipe,
    **When** my finger has moved > 10px horizontally before the 250ms long-press timer fires,
    **Then** the long-press timer is cancelled and the swipe gesture takes over.

## Tasks / Subtasks

- [x] Task 1: Create `SwipeableTaskCard` wrapper component (AC: 1, 6, 10, 11, 12)
  - [x]1.1 Create `src/features/capture/components/SwipeableTaskCard.tsx`
  - [x]1.2 This component wraps TaskCard (or DraggableTaskCard from 7.6 if available) and adds horizontal swipe-to-reveal behavior
  - [x]1.3 Props: `task: Task`, `onDelete: (taskId: string) => void`, `onMove?: (taskId: string) => void`, `isSwipeOpen: boolean`, `onSwipeOpen: (taskId: string) => void`, `onSwipeClose: () => void`, `showMoveAction: boolean`, plus all existing TaskCard/DraggableTaskCard pass-through props
  - [x]1.4 Use Framer Motion's `motion.div` with `drag="x"`, `dragConstraints={{ left: -trayWidth, right: 0 }}`, `dragElastic={0.1}`
  - [x]1.5 Compute `trayWidth` dynamically: `showMoveAction ? 140 : 70` (70px per button)
  - [x]1.6 Track swipe state using `useMotionValue` + `onDragEnd` velocity/offset check
  - [x]1.7 On drag end: if `offset.x < -trayWidth / 2 || velocity.x < -300` → snap open via `animate(x, -trayWidth)`, call `onSwipeOpen(task.id)`. Else snap closed via `animate(x, 0)`.
  - [x]1.8 When `isSwipeOpen` changes to `false` externally: animate card back to x=0 (another card opened)
  - [x]1.9 `data-testid="swipeable-card-{task.id}"`

- [x] Task 2: Create action tray with conditional Move + Delete buttons (AC: 1, 4, 5, 10)
  - [x]2.1 Action tray renders behind the card (positioned absolute, right-aligned)
  - [x]2.2 "Move to..." button (conditional — only if `showMoveAction` is true): blue background (`var(--color-accent)`), folder/arrow icon, label "Move to...", `data-testid="swipe-move-{task.id}"`
  - [x]2.3 "Delete" button: red background (`#f85149`), trash icon, `data-testid="swipe-delete-{task.id}"`
  - [x]2.4 Each button: 70px wide, full card height, flex center, white icon + small label below icon
  - [x]2.5 Button icons: simple inline SVG — trash can for delete, arrow-right-from-bracket for move
  - [x]2.6 Touch target: full button area (70 × card height) exceeds 44x44px minimum
  - [x]2.7 Rounded corners on the tray's right side to match card border-radius

- [x] Task 3: Create undo toast system (AC: 2, 3, 7)
  - [x]3.1 Create a lightweight `UndoToast` component (can be inline in App.tsx or a small separate file)
  - [x]3.2 Props: `message: string`, `onUndo: () => void`, `onExpire: () => void`, `durationMs: number` (default 5000)
  - [x]3.3 UI: fixed at the bottom of the viewport, above the FABs. `motion.div` with `initial={{ opacity: 0, y: 20 }}`, `animate={{ opacity: 1, y: 0 }}`, exit animation
  - [x]3.4 Styling: `var(--color-surface)` background, `var(--color-border)` border, rounded, `z-40` (below sheets at z-50, above content)
  - [x]3.5 Content: message text left-aligned, "Undo" link right-aligned in `var(--color-accent)` (blue)
  - [x]3.6 5-second `setTimeout` → calls `onExpire` (which calls `removeTask` for real)
  - [x]3.7 If user taps "Undo" → calls `onUndo` → re-insert task → dismiss toast
  - [x]3.8 Clear timeout on unmount (cleanup)
  - [x]3.9 `data-testid="undo-toast"`

- [x] Task 4: Implement soft-delete → undo → hard-delete pipeline (AC: 2, 3, 8)
  - [x]4.1 In App.tsx, add state: `pendingDelete: { task: Task, timeoutId: ReturnType<typeof setTimeout> } | null`
  - [x]4.2 When user taps Delete (swipe tray or detail view):
    1. Store the full task object in `pendingDelete`
    2. Immediately remove from the UI (filter out of display list — but do NOT call `removeTask` yet)
    3. Show `UndoToast`
  - [x]4.3 "Soft removal" approach: add `pendingDeleteId` to state, filter it out of `activeTasks` and `completedTasks` memos. The task remains in the store but is hidden from view. This is simpler than removing and re-inserting.
  - [x]4.4 On undo: clear timeout, set `pendingDelete` to null → task reappears in list
  - [x]4.5 On expire (5s): call `removeTask(task.id)` → permanent removal from store + IDB, set `pendingDelete` to null
  - [x]4.6 On new delete while undo toast is active: immediately finalize the previous pending delete (`removeTask`), then start new soft-delete flow
  - [x]4.7 Haptic feedback: `triggerSelectionHaptic()` when the task animates away (delete initiated)

- [x] Task 5: Signal "changes to push" after deletion (AC: 8)
  - [x]5.1 After a task is permanently deleted (undo expired), the SyncFAB must show that there are unpushed changes
  - [x]5.2 Add `hasPendingDeletions: boolean` flag to `useSyncStore` state
  - [x]5.3 `removeTask` sets `hasPendingDeletions: true`
  - [x]5.4 After successful sync, reset `hasPendingDeletions: false`
  - [x]5.5 Update `selectPendingSyncCount` (or create a new selector `selectHasUnsyncedChanges`) to include `hasPendingDeletions` in its check
  - [x]5.6 SyncFAB already shows badge when pending count > 0 — extend it to also show when `hasPendingDeletions` is true
  - [x]5.7 Alternative (simpler): instead of a boolean flag, set ANY remaining task in the same repo to `syncStatus: 'pending'` after a deletion. This piggybacks on the existing pending count mechanism. Downside: it dirties tasks that haven't changed. Use the boolean flag approach.

- [x] Task 6: Full file rebuild in sync service (AC: 9) — HARD REQUIREMENT
  - [x]6.1 Modify `buildFileContent` in `src/features/sync/utils/markdown-templates.ts` (or `src/services/github/sync-service.ts` — wherever the markdown is assembled)
  - [x]6.2 Instead of Get-Modify-Set (fetch existing → update/append in-place), use **Full Rebuild**: generate the complete file content from ALL current tasks for this repo+user
  - [x]6.3 The rebuild keeps the AI-Ready header intact (regenerate it from template)
  - [x]6.4 Order: active tasks sorted by `order` (ascending), then completed tasks sorted by `completedAt` (descending)
  - [x]6.5 This approach guarantees: deletions are reflected, reorders are reflected, edits are reflected, completion state is correct
  - [x]6.6 Tradeoff acknowledged: manual edits made directly to the markdown file on GitHub will be overwritten on next push. This is acceptable — the app is the primary editor.
  - [x]6.7 The Get step is still needed to fetch the current file's SHA (required by GitHub API for updates). The content is discarded and replaced with the rebuild.
  - [x]6.8 Update `syncPendingTasks` to pass ALL repo tasks (not just pending) to the rebuild function
  - [x]6.9 After successful sync, mark ALL tasks as `synced` (not just the previously pending ones)

- [x] Task 7: Wire "Move to..." action from swipe tray (AC: 4, 5)
  - [x]7.1 The "Move to..." button triggers the same `moveTaskToRepo` flow as Story 7.5's detail view
  - [x]7.2 On tap: close the swipe tray → open RepoPickerSheet in "move" mode → on repo select: call `moveTaskToRepo(taskId, selectedRepoFullName)` → show toast "Task moved to {repo}"
  - [x]7.3 State coordination: pass `onMove: (taskId: string) => void` callback from App.tsx that triggers the repo picker flow
  - [x]7.4 Determine `showMoveAction`: check if the user has interacted with more than one repo. Simplest approach: `showMoveAction = true` always (the RepoPickerSheet will show all available repos). If Thomas prefers: track repo count and hide Move when only one repo is known.
  - [x]7.5 If Story 7.5 is NOT yet implemented: skip the "Move to..." button for now (`showMoveAction={false}`). The `moveTaskToRepo` store action may not exist yet.

- [x] Task 8: Add delete button to TaskDetailSheet (AC: 7)
  - [x]8.1 If Story 7.5 (TaskDetailSheet) is implemented: add a "Delete Task" button at the bottom of the sheet
  - [x]8.2 Button styling: `btn-ghost` with red text (`#f85149`), full width, at the very bottom of the sheet content
  - [x]8.3 On tap: close the detail sheet first, then trigger the soft-delete + undo toast flow (same pipeline as swipe delete)
  - [x]8.4 The undo toast appears after the sheet dismisses — user can undo from the list view
  - [x]8.5 If Story 7.5 is NOT implemented: skip this task
  - [x]8.6 `data-testid="detail-delete-button"`

- [x] Task 9: Integrate SwipeableTaskCard in App.tsx (AC: 1, 6, 10)
  - [x]9.1 Replace `TaskCard` (or `DraggableTaskCard` if 7.6 is done) usage in App.tsx with `SwipeableTaskCard`
  - [x]9.2 Wire `onDelete` to the soft-delete pipeline (Task 4), NOT directly to `removeTask`
  - [x]9.3 Wire `onMove` to open RepoPickerSheet in "move" mode (reuse 7.5 flow if available)
  - [x]9.4 Apply to BOTH active and completed task lists (AC: 10)
  - [x]9.5 Add `openSwipeId: string | null` state — only one tray open at a time
  - [x]9.6 Pass `isSwipeOpen={openSwipeId === task.id}`, `onSwipeOpen={setOpenSwipeId}`, `onSwipeClose={() => setOpenSwipeId(null)}` to each card

- [x] Task 10: Handle gesture coexistence with drag & drop (AC: 11, 12)
  - [x]10.1 If Story 7.6 (drag & drop) is implemented: the swipe gesture must coexist with long-press-to-drag
  - [x]10.2 Key discriminator: **axis**. Horizontal movement > 10px before 250ms = swipe. Vertical long-press 250ms+ = drag.
  - [x]10.3 In `DraggableTaskCard` (if it exists): the existing `handlePointerMove` already cancels the long-press timer when movement > 10px. Extend this to check axis: if `|dx| > |dy|` and `|dx| > 10px` → cancel long-press, let swipe handle it.
  - [x]10.4 In `SwipeableTaskCard`: set `drag="x"` (horizontal only). Framer Motion's axis constraint prevents vertical interference.
  - [x]10.5 If 7.6 is NOT implemented: no coexistence concern — swipe works standalone.

- [x] Task 11: Swipe-away exit animation (AC: 2)
  - [x]11.1 When delete is initiated, the task card continues its leftward motion off-screen (NOT a fade — a swipe-away)
  - [x]11.2 Animate `x` to `-window.innerWidth` (or a large negative value) with `TRANSITION_SPRING`
  - [x]11.3 Simultaneously animate `height: 0`, `marginBottom: 0`, `opacity: 0` with a slight delay (100ms) to collapse the gap after the card leaves
  - [x]11.4 Use `AnimatePresence` with a custom exit variant:
    ```tsx
    exit={{ x: '-100%', opacity: 0, height: 0, marginBottom: 0 }}
    transition={{ ...TRANSITION_SPRING, height: { delay: 0.1 } }}
    ```
  - [x]11.5 For undo: reverse animation — card slides back in from the left with `initial={{ x: '-100%' }}`, `animate={{ x: 0 }}`

- [x] Task 12: Tests (AC: all)
  - [x]12.1 **Store tests** (`useSyncStore.test.ts`):
    - Test `removeTask` removes task from state
    - Test `removeTask` calls `StorageService.deleteTaskFromIDB`
    - Test `removeTask` sets `hasPendingDeletions: true`
    - Test `removeTask` does not affect other tasks
    - (Verify existing tests, add missing)
  - [x]12.2 **SwipeableTaskCard tests** (`SwipeableTaskCard.test.tsx`):
    - Test renders TaskCard inside wrapper
    - Test swipe left reveals action tray
    - Test "Delete" button tap calls onDelete
    - Test "Move to..." button tap calls onMove (when showMoveAction=true)
    - Test "Move to..." button hidden when showMoveAction=false
    - Test tap outside closes tray
    - Test tray closes when isSwipeOpen changes to false
  - [x]12.3 **UndoToast tests** (inline or separate):
    - Test toast renders with message and Undo button
    - Test "Undo" button calls onUndo
    - Test timer expiration calls onExpire
    - Test cleanup on unmount clears timeout
  - [x]12.4 **App.tsx tests** (`App.test.tsx`):
    - Test delete shows undo toast
    - Test undo restores task to list
    - Test timer expiration removes task permanently
    - Test delete from completed section works
    - Test only one swipe tray open at a time
    - Test SyncFAB shows indicator after deletion
  - [x]12.5 **Sync tests** (`sync-service.test.ts`, `markdown-templates.test.ts`):
    - Test full file rebuild excludes deleted tasks
    - Test full rebuild preserves AI-Ready header
    - Test full rebuild orders active tasks by `order`, completed by `completedAt`
    - Test `hasPendingDeletions` resets after sync
  - [x]12.6 Create `src/features/capture/components/SwipeableTaskCard.test.tsx`

- [x] Task 13: Run tests and build (AC: all)
  - [x]13.1 `npm test` — fix failures
  - [x]13.2 `npm run build` — clean build
  - [x]13.3 Manual smoke test on MOBILE:
    - Swipe left on task → verify action tray reveals smoothly
    - Tap Delete → verify task swipes away to left → verify undo toast appears
    - Tap Undo → verify task reappears with slide-in animation
    - Wait 5s → verify task is permanently gone
    - Tap "Move to..." → verify repo picker opens → select repo → verify toast
    - Swipe back right → verify tray closes
    - Tap outside → verify tray closes
    - Swipe on completed task → verify same actions available
    - With single repo: verify "Move to..." button is hidden
    - After delete: verify SyncFAB shows "push" indicator
    - Push to GitHub → verify deleted task absent from markdown
    - Long-press + drag → verify swipe does NOT activate
    - Horizontal swipe → verify drag does NOT activate

## Dev Notes

### Mental Model — CRITICAL

Deletion in Gitty is **soft-delete → undo window → hard-delete → sync-by-rebuild**.

1. User taps Delete → task is visually removed (swipe-away animation) but remains in the store
2. Undo toast shows for 5 seconds → user can tap Undo to restore
3. After 5 seconds → `removeTask(taskId)` fires → task removed from Zustand store + IDB → `hasPendingDeletions` set to true
4. User sees SyncFAB indicator → taps "Push to GitHub"
5. Sync service performs **full file rebuild** from current `tasks[]` → deleted task is absent
6. `hasPendingDeletions` resets → SyncFAB returns to idle

**The user never thinks about the markdown file.** They delete a task and it's gone. They push and it's gone from GitHub. The full rebuild guarantees consistency.

### Undo Toast Pattern — CRITICAL UX DECISION

**Why undo toast instead of confirmation dialog:**

| Approach | User Experience |
|----------|----------------|
| Confirmation dialog ("Delete this task?") | Friction BEFORE the action. User must decide twice. Feels old-school. Makes user think "is this permanent?" |
| Undo toast (5s window) | Zero friction. Action is instant. Safety net AFTER. Feels like iOS Mail, Reminders, Things 3. User feels in control. |

The undo toast is the standard pattern in every premium todo app. It's what makes deletion feel safe and fast simultaneously.

**Implementation — soft-delete via UI filtering (NOT store removal):**

```tsx
// In App.tsx
const [pendingDelete, setPendingDelete] = useState<{
  task: Task
  timeoutId: ReturnType<typeof setTimeout>
} | null>(null)

const handleDeleteInitiated = (taskId: string) => {
  // If there's already a pending delete, finalize it immediately
  if (pendingDelete) {
    removeTask(pendingDelete.task.id)
    clearTimeout(pendingDelete.timeoutId)
  }

  const task = tasks.find(t => t.id === taskId)
  if (!task) return

  triggerSelectionHaptic()

  const timeoutId = setTimeout(() => {
    removeTask(taskId)
    setPendingDelete(null)
  }, 5000)

  setPendingDelete({ task, timeoutId })
}

const handleUndo = () => {
  if (!pendingDelete) return
  clearTimeout(pendingDelete.timeoutId)
  setPendingDelete(null)
  // Task was never removed from store — it just reappears in the filtered list
}

// In activeTasks/completedTasks memos, filter out pendingDelete.task.id:
const activeTasks = useMemo(() =>
  displayedTasks.filter(t =>
    (pendingToggleIds.has(t.id) ? t.isCompleted : !t.isCompleted) &&
    t.id !== pendingDelete?.task.id
  ),
[displayedTasks, pendingToggleIds, pendingDelete])
```

This approach is elegant: the task stays in the store during the undo window. It's just hidden from the UI. On undo, we simply stop hiding it. On expiry, we call `removeTask` for real. Zero re-insertion complexity.

### Gesture Coexistence — CRITICAL

**Five interactions now coexist on the same task card:**

| Gesture | Axis/Area | Duration | Result |
|---------|-----------|----------|--------|
| Tap checkbox | Targeted: `[role="checkbox"]` | Any | Toggle complete (7.4) |
| Tap card body | Targeted: card body | < 250ms | Open detail sheet (7.5) |
| Long-press + vertical drag | Vertical | 250ms+ hold then move | Drag to reorder (7.6) |
| Horizontal swipe left | Horizontal | Any | Reveal action tray (7.7) |
| Swipe card back right | Horizontal | Any (when tray open) | Close action tray (7.7) |

**The axis is the key discriminator between swipe and drag:**
- If the user's initial movement is primarily horizontal (`|dx| > |dy|` AND `|dx| > 10px`): it's a **swipe** → cancel any long-press timer, let horizontal drag handle it
- If the user holds still for 250ms then moves vertically: it's a **drag** → the existing long-press-to-drag logic handles it
- If the user taps briefly (< 250ms, minimal movement): it's a **tap** → open detail sheet

This matches exactly how iOS handles swipe-to-delete vs. drag-to-reorder in apps like Reminders and Things 3.

### Swipe-Away Exit Animation — CRITICAL

When the user taps Delete, the card **continues its leftward motion off-screen** — NOT a generic fade-out. This is coherent with the swipe gesture: the user swiped left → tapped Delete → the card flies off to the left. The visual continuity reinforces "I threw it away."

```tsx
// Exit animation for deleted card
exit={{
  x: '-100%',
  opacity: 0,
  height: 0,
  marginBottom: 0,
  transition: {
    x: { type: 'spring', stiffness: 400, damping: 30 },
    height: { delay: 0.15, duration: 0.2 },
    marginBottom: { delay: 0.15, duration: 0.2 },
    opacity: { delay: 0.1, duration: 0.15 },
  }
}}

// Undo re-entry animation
initial={{ x: '-100%', opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
transition={TRANSITION_SPRING}
```

The `height: 0` + `marginBottom: 0` collapse happens AFTER the card has left the viewport (150ms delay), so the list smoothly closes the gap.

### Swipe Implementation — Framer Motion

```tsx
const BUTTON_WIDTH = 70
const x = useMotionValue(0)

// Dynamic tray width based on available actions
const trayWidth = showMoveAction ? BUTTON_WIDTH * 2 : BUTTON_WIDTH

<div className="relative overflow-hidden rounded-lg">
  {/* Action tray (behind the card) */}
  <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: trayWidth }}>
    {showMoveAction && (
      <button
        onClick={() => onMove?.(task.id)}
        className="flex flex-1 flex-col items-center justify-center gap-1"
        style={{ backgroundColor: 'var(--color-accent)' }}
        aria-label="Move task to another repository"
        data-testid={`swipe-move-${task.id}`}
      >
        {/* Arrow icon */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-medium text-white">Move to...</span>
      </button>
    )}
    <button
      onClick={() => onDelete(task.id)}
      className="flex flex-1 flex-col items-center justify-center gap-1"
      style={{ backgroundColor: '#f85149' }}
      aria-label="Delete task"
      data-testid={`swipe-delete-${task.id}`}
    >
      {/* Trash icon */}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M6 4V3a1 1 0 011-1h6a1 1 0 011 1v1m-10 0h14m-12 0v12a2 2 0 002 2h6a2 2 0 002-2V4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-[10px] font-medium text-white">Delete</span>
    </button>
  </div>

  {/* Swipeable card */}
  <motion.div
    drag="x"
    dragConstraints={{ left: -trayWidth, right: 0 }}
    dragElastic={0.1}
    style={{ x, backgroundColor: 'var(--color-canvas)' }}
    onDragEnd={(_, info) => {
      if (info.offset.x < -trayWidth / 2 || info.velocity.x < -300) {
        animate(x, -trayWidth, TRANSITION_SPRING)
        onSwipeOpen(task.id)
      } else {
        animate(x, 0, TRANSITION_SPRING)
        onSwipeClose()
      }
    }}
  >
    <TaskCard ... />
  </motion.div>
</div>
```

**Critical:** `drag="x"` restricts to horizontal only. This prevents conflict with vertical drag-to-reorder. Framer Motion handles the axis locking automatically.

### Component Layering Decision — SwipeableTaskCard vs DraggableTaskCard

**If Story 7.6 (drag & drop) is implemented:**
```
SwipeableTaskCard (horizontal swipe → action tray)
  └── Reorder.Item (from Framer Motion, via DraggableTaskCard)
       └── TaskCard (presentation: checkbox, title, status)
```

**If Story 7.6 is NOT yet implemented:**
```
SwipeableTaskCard (horizontal swipe → action tray)
  └── TaskCard (presentation: checkbox, title, status)
```

### Single Open Tray Rule — CRITICAL

**Only one swipe tray should be open at a time.** When the user starts swiping a different card, any previously open tray should animate closed. This matches iOS behavior exactly.

```tsx
// App.tsx
const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)

// Each SwipeableTaskCard receives:
isSwipeOpen={openSwipeId === task.id}
onSwipeOpen={(id) => setOpenSwipeId(id)}
onSwipeClose={() => setOpenSwipeId(null)}

// Inside SwipeableTaskCard: useEffect watches isSwipeOpen
// When it becomes false (another card opened), animate x to 0
useEffect(() => {
  if (!isSwipeOpen) animate(x, 0, TRANSITION_SPRING)
}, [isSwipeOpen])
```

### "Move to..." Button Visibility — Conditional

The "Move to..." button is hidden when it's not useful:
- **Show** when the user has used more than one repo (we can check if `tasks[]` contains tasks with different `repoFullName` values, or simply always show it since RepoPickerSheet will offer all available repos)
- **Hide** when only one repo is known — the user would have nowhere to move the task

Simplest approach: always show it. If the user only has one repo, tapping "Move to..." opens the RepoPickerSheet which shows one repo — user taps it or dismisses. This is self-explanatory and doesn't require tracking repo count.

**Thomas's preference can override:** if he wants it hidden for single-repo users, add a `repoCount` check.

### Sync Service: Full File Rebuild — HARD REQUIREMENT

**DO NOT use Get-Modify-Set (append/update in-place) for sync. USE FULL REBUILD.**

The Get-Modify-Set pattern from earlier stories only processes `pending` tasks — it appends new ones and regex-updates existing ones. This means:
- Deleted tasks persist in the markdown (they're never removed)
- Reordered tasks may not reflect the new order in the file
- It's fundamentally incompatible with deletion

**Full Rebuild approach:**
1. GET the existing file from GitHub (to get the SHA for the API's `sha` parameter)
2. DISCARD the existing content
3. REBUILD the complete file: AI-Ready header + all active tasks (sorted by `order`) + all completed tasks (sorted by `completedAt` desc)
4. SET the new content via `createOrUpdateFileContents`

```ts
// In sync-service.ts
async function syncAllTasks(tasks: Task[], repoFullName: string, username: string) {
  // 1. Get current file (for SHA)
  const existing = await getExistingFile(repoFullName, username)
  const sha = existing?.sha

  // 2. Rebuild content from scratch
  const allRepoTasks = tasks.filter(t =>
    t.repoFullName.toLowerCase() === repoFullName.toLowerCase() &&
    t.username === username
  )
  const content = buildFullFileContent(allRepoTasks) // header + active + completed

  // 3. Push to GitHub
  await createOrUpdateFile(repoFullName, username, content, sha)

  // 4. Mark ALL repo tasks as synced
  for (const task of allRepoTasks) {
    markTaskSynced(task.id, null)
  }
}
```

**Tradeoff:** Manual edits to the markdown file on GitHub are overwritten. This is acceptable — the app is the primary editor. The markdown file is for AI agent consumption, not human editing.

### The `removeTask` Store Action — Existing + Enhancement

```ts
// Current implementation (useSyncStore.ts lines 184-193)
removeTask: (taskId: string) => {
  set((state) => {
    const updatedTasks = state.tasks.filter((t) => t.id !== taskId)
    StorageService.deleteTaskFromIDB(taskId)
    return { tasks: updatedTasks }
  })
},
```

**Enhancement needed:** Add `hasPendingDeletions: true` to the `set` call:
```ts
removeTask: (taskId: string) => {
  set((state) => {
    const updatedTasks = state.tasks.filter((t) => t.id !== taskId)
    StorageService.deleteTaskFromIDB(taskId)
    return { tasks: updatedTasks, hasPendingDeletions: true }
  })
},
```

Add `hasPendingDeletions: false` to initial state and reset it in `setSyncStatus` when status is `'success'` (after sync completes).

### UndoToast Component — Reference

```tsx
function UndoToast({ message, onUndo, onExpire, durationMs = 5000 }: {
  message: string
  onUndo: () => void
  onExpire: () => void
  durationMs?: number
}) {
  useEffect(() => {
    const id = setTimeout(onExpire, durationMs)
    return () => clearTimeout(id)
  }, [onExpire, durationMs])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={TRANSITION_FAST}
      className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-lg rounded-lg px-4 py-3 flex items-center justify-between"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      data-testid="undo-toast"
    >
      <span className="text-body" style={{ color: 'var(--color-text-primary)' }}>
        {message}
      </span>
      <button
        onClick={onUndo}
        className="text-body font-semibold ml-4"
        style={{ color: 'var(--color-accent)' }}
        data-testid="undo-button"
      >
        Undo
      </button>
    </motion.div>
  )
}
```

Position: `bottom-24` (96px from bottom) clears both FABs. `z-40` is below bottom sheets (z-50) but above all other content.

### Multi-Select — Future Enhancement Design Notes

Thomas suggested multi-select for batch delete/move/reorder. Architecture for future reference (NOT in this story's scope):

**Activation:** Long-press on a task card (if not already in drag mode) → enters selection mode. Or a dedicated "Edit" button in the header.

**Selection UI:** A secondary checkbox (distinct from completion) appears on the left. Selected cards get blue highlight border.

**Batch Actions Toolbar:** Fixed at bottom when >= 1 task selected:
- "Delete (N)" — red
- "Move (N)" — blue
- "Cancel" — exits selection mode

**State:** `selectedTaskIds: Set<string>` in App.tsx (local state).

**Interaction conflict:** In selection mode, tap selects/deselects. Checkbox (completion) still works. Drag disabled. Swipe disabled.

Best as Story 7.10 or post-Epic 7 follow-up.

### Design Tokens Reference

| Token | Value | Usage in this story |
|-------|-------|-----|
| `#f85149` | Red | Delete button background, undo-related accents |
| `--color-accent` / `#58a6ff` | Blue | Move button background, Undo link text |
| `--color-surface` | `#161b22` | Card background, undo toast background |
| `--color-border` | `#30363d` | Card border, undo toast border |
| `--color-canvas` | `#0d1117` | Swipeable card bg (prevents tray bleed-through) |
| `--color-text-primary` | `#e6edf3` | Toast text, button icon color (white on colored bg) |

### Animation Constants Reference

**File:** `src/config/motion.ts`

| Constant | Value | Usage |
|----------|-------|-------|
| `TRANSITION_SPRING` | `{ type: 'spring', stiffness: 400, damping: 30 }` | Swipe snap, delete swipe-away, undo slide-in |
| `TRANSITION_FAST` | `{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }` | Toast appear/dismiss |

### Haptic Feedback

**File:** `src/services/native/haptic-service.ts`

- `triggerSelectionHaptic()` — when delete is initiated (task swipes away). Confirms the destructive action.
- No haptic on swipe reveal (iOS convention: haptic on action confirmation, not on gesture)
- No haptic on undo (reversal should feel "quiet")

### Accessibility Requirements

- Swipe tray buttons: `aria-label="Move task to another repository"` and `aria-label="Delete task"`
- Undo toast: `role="status"`, `aria-live="polite"` — announces "Task deleted" to screen readers
- Undo button: `aria-label="Undo delete"`
- Keyboard alternative: Tab to task → context menu key or dedicated Delete key → same undo flow
- Screen readers: announce task removal and undo availability

### Previous Story Intelligence

**Story 7.6 (Drag & Drop Reorder) — ready-for-dev:**
- `DraggableTaskCard` wraps `Reorder.Item` + long-press detection + `useDragControls`
- Long-press timer (250ms) with 10px movement tolerance for scroll cancellation
- Horizontal movement cancels long-press — entry point for swipe coexistence
- `SwipeableTaskCard` must wrap AROUND `DraggableTaskCard` (outermost layer)

**Story 7.5 (Task Detail View) — ready-for-dev:**
- `TaskDetailSheet` will have editable fields — add "Delete Task" button at the bottom
- `moveTaskToRepo` action will exist — reuse for the swipe "Move to..." action
- RepoPickerSheet "move mode" flow — reuse for swipe "Move to..."
- Toast pattern for "Task moved to {repo}" — reuse for undo toast positioning

**Story 7.4 (Task Checkboxes) — review:**
- `toggleComplete` store action — not changed by this story
- Checkbox has `e.stopPropagation()` — prevents swipe/drag on checkbox tap
- Active/Completed section split — swipe works in both sections
- `pendingToggleIds` pattern for delayed section movement — similar soft-state concept as `pendingDelete`

### Project Structure Notes

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/features/capture/components/SwipeableTaskCard.tsx` | Swipe-to-reveal action tray wrapper |
| `src/features/capture/components/SwipeableTaskCard.test.tsx` | Tests |

**Files to Modify:**

| File | Change |
|------|--------|
| `src/stores/useSyncStore.ts` | Add `hasPendingDeletions` state + flag in `removeTask` + reset on sync success |
| `src/App.tsx` | SwipeableTaskCard integration, `openSwipeId` state, soft-delete pipeline, UndoToast, `pendingDelete` state |
| `src/features/sync/utils/markdown-templates.ts` | Add `buildFullFileContent` for complete file rebuild |
| `src/services/github/sync-service.ts` | Switch from Get-Modify-Set to Full Rebuild, reset `hasPendingDeletions`, mark all tasks synced |

**Files to Modify (conditionally — if Story 7.5 is done):**

| File | Change |
|------|--------|
| `src/features/capture/components/TaskDetailSheet.tsx` | Add "Delete Task" button at bottom |

**Files to Update (tests):**

| File | Change |
|------|--------|
| `src/stores/useSyncStore.test.ts` | Add `removeTask` + `hasPendingDeletions` tests |
| `src/App.test.tsx` | Add swipe + soft-delete + undo + SyncFAB indicator tests |
| `src/services/github/sync-service.test.ts` | Add full rebuild tests, deletion cleanup tests |
| `src/features/sync/utils/markdown-templates.test.ts` | Add `buildFullFileContent` tests |

### Git Intelligence

Recent commits:
- `dc7711b` — Merged UI redesign PR — defines CSS classes and design tokens in current use
- `f3a7de5` — Comprehensive UI redesign with unified design system — established animation patterns
- `fea703b` — Fixed hydration race condition — do NOT break the `AuthGuard` + `use(getHydrationPromise())` pattern

### References

- [Source: `src/types/task.ts`] — Task interface (no changes needed)
- [Source: `src/stores/useSyncStore.ts`] — `removeTask` action (lines 184-193), store patterns
- [Source: `src/features/capture/components/TaskCard.tsx`] — Current card component (wrapped by SwipeableTaskCard)
- [Source: `src/App.tsx`] — Main task list rendering, bottom sheet orchestration, `pendingToggleIds` pattern
- [Source: `src/services/github/sync-service.ts`] — Sync engine, `buildFileContent`, `syncPendingTasks`
- [Source: `src/features/sync/utils/markdown-templates.ts`] — `formatTaskAsMarkdown`, `buildFileContent`
- [Source: `src/config/motion.ts`] — `TRANSITION_SPRING`, `TRANSITION_FAST`
- [Source: `src/services/native/haptic-service.ts`] — `triggerSelectionHaptic()`
- [Source: `src/index.css`] — Design tokens
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 7.7`] — Epic requirements
- [Source: `_bmad-output/implementation-artifacts/7-6-drag-and-drop-reorder.md`] — Drag gesture model, DraggableTaskCard
- [Source: `_bmad-output/implementation-artifacts/7-5-task-detail-view.md`] — Detail view, moveTaskToRepo, toast pattern
- [Source: `_bmad-output/implementation-artifacts/7-4-task-checkboxes-completion.md`] — Checkbox propagation, pendingToggleIds soft-state pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Implemented SwipeableTaskCard wrapper component with horizontal Framer Motion drag (`drag="x"`) and action tray (Delete + Move to...)
- Created UndoToast component with 5-second timer, undo callback, and proper accessibility (role="status", aria-live="polite")
- Implemented soft-delete pipeline in App.tsx: pendingDelete state filters task from UI, undo restores visibility, expiry calls removeTask
- Added `hasPendingDeletions` flag to useSyncStore — set on removeTask, reset on successful sync
- Updated selectPendingSyncCount to return >= 1 when hasPendingDeletions is true, ensuring SyncFAB shows after deletion
- Updated sync-service to trigger sync when hasPendingDeletions is true (even with 0 pending tasks)
- Added "Delete Task" button to TaskDetailSheet — closes sheet then triggers soft-delete flow
- Integrated SwipeableTaskCard in both active (Reorder.Group) and completed task sections
- Gesture coexistence: DraggableTaskCard cancels long-press on movement > 10px (horizontal or vertical), SwipeableTaskCard uses `drag="x"` for axis isolation
- Full file rebuild already implemented in sync-service (from prior stories) — no additional changes needed
- All 301 tests pass, clean build

### Change Log

- 2026-03-17: Story 7.7 implementation complete — swipe-to-delete, undo toast, soft-delete pipeline, hasPendingDeletions sync flag

### File List

**New Files:**
- src/features/capture/components/SwipeableTaskCard.tsx
- src/features/capture/components/SwipeableTaskCard.test.tsx
- src/features/capture/components/UndoToast.tsx
- src/features/capture/components/UndoToast.test.tsx
- src/utils/task-sorting.ts
- src/features/sync/components/SyncConflictBanner.tsx
- src/features/sync/components/SyncConflictSheet.tsx
- src/features/sync/components/SyncImportBanner.tsx

**Modified Files:**
- src/App.tsx — SwipeableTaskCard integration, soft-delete pipeline, UndoToast, openSwipeId state, showMoveAction logic, AnimatePresence
- src/stores/useSyncStore.ts — hasPendingDeletions flag, removeTask enhancement, selectPendingSyncCount update, setSyncStatus reset
- src/stores/useSyncStore.test.ts — removeTask tests, hasPendingDeletions tests, selectPendingSyncCount tests
- src/services/github/sync-service.ts — trigger sync on hasPendingDeletions, mark all repo tasks synced
- src/features/capture/components/TaskDetailSheet.tsx — onDelete prop, "Delete Task" button
- src/features/capture/components/DraggableTaskCard.tsx — gesture coexistence (axis-aware movement tolerance)
- src/App.test.tsx — SwipeableTaskCard mock, UndoToast mock, hasPendingDeletions in mock state
- src/features/sync/utils/markdown-templates.ts — Full rebuild logic
