# Epic 8: The Polish — Master Planning Document

**Created:** 2026-03-17
**Source:** Field-testing feedback from `captured-ideas-tholo91.md` (16 tasks captured by Thomas)
**Process:** SM + Party Mode (PM John, UX Sally, Architect Winston, QA Quinn) analysis
**Status:** Nearly done — 10/12 stories shipped (2026-03-20). Card redesign (8-10) pending decision, per-repo AI instructions (8-7) deferred post-MVP.

---

## Context

Epic 7 (The Real App) is **100% complete** (all 9 stories shipped). Thomas tested the app in real life and captured 16 feedback items. These are not hypothetical requirements — they are **observed UX friction and missing features** from the person who built and uses Gitty daily.

Epic 8 focuses on the gap between "functional" and "delightful". The north star is **Things 3 on iOS** — that feeling of effortless, obvious, beautiful task management.

---

## Codebase State (as of 2026-03-17)

### Tech Stack
- React 19, Vite 7, TypeScript 5.8
- Zustand v5 with persist middleware (`src/stores/useSyncStore.ts`)
- Framer Motion v12 (spring physics, `AnimatePresence`, `Reorder`)
- TailwindCSS 4 + CSS custom properties (GitHub Dark Dimmed palette)
- Octokit for GitHub API — all calls go through service layer
- IndexedDB (via `StorageService`) + LocalStorage (Zustand persist)

### Key Files
| File | Purpose |
|------|---------|
| `src/App.tsx` | Main orchestrator — all sheet state, list rendering, drag/drop |
| `src/stores/useSyncStore.ts` | Zustand store — all task CRUD, sync state, repo meta |
| `src/types/task.ts` | Task interface |
| `src/utils/task-sorting.ts` | `sortTasksForDisplay()` — active (by order) + completed (by completedAt) |
| `src/features/capture/components/TaskCard.tsx` | Individual task card |
| `src/features/capture/components/SwipeableTaskCard.tsx` | TaskCard wrapped with swipe-to-delete gesture tray |
| `src/features/capture/components/DraggableTaskCard.tsx` | TaskCard wrapped with dnd-kit drag handle |
| `src/features/capture/components/CreateTaskSheet.tsx` | FAB bottom sheet for task creation |
| `src/features/capture/components/TaskDetailSheet.tsx` | Task editing bottom sheet |
| `src/features/capture/components/PriorityFilterPills.tsx` | `all/important/not-important` filter pills |
| `src/features/sync/utils/markdown-templates.ts` | AI-Ready header + markdown formatting |
| `src/features/sync/components/SyncFAB.tsx` | Push-to-GitHub FAB |
| `src/components/layout/AppHeader.tsx` | App header with repo name + action buttons |
| `src/components/layout/SyncHeaderStatus.tsx` | Header sync status indicator |
| `src/components/layout/SettingsSheet.tsx` | Settings bottom sheet (Roadmap + GitHub + version) |

### Task Data Model (current — complete, no changes needed)
```typescript
interface Task {
  id: string                    // UUID v4 (already implemented)
  username: string              // GitHub login
  repoFullName: string          // "owner/repo"
  title: string
  body: string
  createdAt: string             // ISO 8601 (already implemented)
  updatedAt: string | null      // ISO 8601 (already implemented)
  isImportant: boolean
  isCompleted: boolean
  completedAt: string | null    // ISO 8601
  order: number                 // drag & drop sort position
  syncStatus: 'pending' | 'synced'
  githubIssueNumber: number | null
}
```

### Store Actions (current)
`addTask`, `updateTask`, `toggleComplete`, `reorderTasks`, `removeTask`, `moveTaskToRepo`, `markTaskSynced`, `loadTasksFromIDB`, `replaceTasksForRepo`, `setSyncStatus`, `setRepoSyncMeta`

### Current App.tsx State Variables (relevant to Epic 8)
```typescript
const [showCompleted, setShowCompleted] = useState(true)   // → Story 8.2: change to false
const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)  // → Story 8.3: remove
const [searchQuery, setSearchQuery] = useState('')
const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
```

### Current List Rendering (App.tsx ~line 617)
Active tasks use `SwipeableTaskCard` inside `Reorder.Group`.
Completed tasks also use `SwipeableTaskCard` (not draggable).
`SwipeableTaskCard` exposes swipe tray with Delete + Move buttons.

### Current Sorting (task-sorting.ts)
- Active tasks: `order` asc, fallback `createdAt` desc
- Completed tasks: `completedAt` desc
- **No user-selectable sort modes exist yet**

### AppHeader
- Renders at top of main view — **NOT sticky** (no `position: sticky` applied)
- Shows repo name via `onChangeRepo` button
- Located: `src/components/layout/AppHeader.tsx`

### CreateTaskSheet (current behavior)
- ✅ Auto-focuses title with 50ms delay on mount
- ✅ `Enter` in title field jumps to notes field (`notesRef.current?.focus()`)
- ✅ Tap-outside-to-close already works (backdrop `onClick` check)
- ✅ Notes textarea auto-expands (`handleNotesChange` adjusts height)
- ❌ Title field is `<input type="text">` — single line only, does not expand
- ❌ iOS keyboard pushes sheet off-screen (viewport/scroll issue)
- ❌ Auto-focus 50ms delay may be insufficient on iOS (keyboard timing)

### SettingsSheet (current)
Has: Roadmap, GitHub link, version label. Missing: About Gitty.

### AI-Ready Header (markdown-templates.ts `getAIReadyHeader()`)
Current instruction to agents: "Mark tasks as done (`- [x]`) after processing"
Missing: permission to add agent attribution to task descriptions.

---

## Epic 8 Stories — Full Definitions

### Story 8.1 — List View UX: Sticky Repo Header + Priority Visual Indicators

**User Story:**
As a User,
I want to always see which repository I'm in and visually identify important tasks at a glance,
So that I never lose context while scrolling and can prioritize immediately without reading labels.

**Captured Ideas Addressed:**
- "List view scrolling — one should always know what repository one is in, sticky/visible with a nice UI at the top" 🔴
- "List View UI — should be closer to Things / one should see which tasks are important in a way — maybe with an emoji? Or how?" 🔴

**Acceptance Criteria:**

Given I scroll down through a long task list
When tasks scroll past the top
Then the repository name remains visible in a sticky header at the top of the screen

Given I have tasks marked as Important
When I view the task list
Then important tasks have a distinct visual treatment (e.g., a colored left-border accent or a subtle priority dot) that makes them stand out without needing to read "Important"

Given I have a mix of important and normal tasks
When I view the list
Then the visual hierarchy is immediately clear — important tasks pop, normal tasks recede

**Technical Notes:**
- `AppHeader` is currently NOT sticky. Add `position: sticky; top: 0; z-index: 40` to the AppHeader container in `src/components/layout/AppHeader.tsx`. Ensure background is opaque (no see-through during scroll).
- `TaskCard` in `src/features/capture/components/TaskCard.tsx` needs the priority visual. Recommended approach: a 3px left border accent (`var(--color-danger)` or `var(--color-accent)`) on the card container when `task.isImportant === true`. Keep it subtle — no icons or text labels needed.
- Do NOT change the `PriorityFilterPills` — those already handle filtering. This is purely visual on the card.
- The "Things-like" aesthetic means: minimal, purposeful, not loud. A colored border is enough.
- Test that the sticky header doesn't obscure any content — add appropriate top padding/margin to the main content area if needed.

**Files to touch:**
- `src/components/layout/AppHeader.tsx`
- `src/features/capture/components/TaskCard.tsx`
- `src/App.tsx` (potentially adjust top padding in main section)

**Tests:**
- `src/features/capture/components/TaskCard.test.tsx` — add test for `isImportant=true` rendering priority accent
- `src/components/layout/AppHeader.tsx` — no test needed for sticky CSS change (visual only)

**Priority:** P0

---

### Story 8.2 — Completed Tasks: Default Collapsed

**User Story:**
As a User,
I want the "Completed" section to be collapsed by default when I open the app,
So that my active task list is clean and focused — I only see done work when I explicitly choose to.

**Captured Ideas Addressed:**
- "Completed tasks — It should be untoggled (closed) when opening the app. Also, how does the filtering or search work with completed tasks?" 🔴

**Acceptance Criteria:**

Given I open the app (fresh load or navigation)
When the task list renders
Then the "Completed (N)" section is collapsed by default — only the disclosure header is visible

Given I tap "Completed (N)"
When the section expands
Then completed tasks animate in normally

Given I search for a term that matches a completed task
When the filter runs
Then the completed section auto-expands to show the matching completed task (search overrides the default-collapsed state)

Given I clear the search
When the query is empty
Then the completed section returns to collapsed state

**Technical Notes:**
- `App.tsx` line 213: Change `useState(true)` to `useState(false)` for `showCompleted`. That's the core fix.
- The search override behavior (AC 3-4): watch `searchQuery` in a `useEffect`. When `searchQuery.length > 0` AND `completedTasks.some(t => visibleTasks.includes(t))` — auto-set `showCompleted(true)`. When query clears, set back to `false`.
- Do NOT persist `showCompleted` to localStorage — it should always reset to `false` on app open.

**Files to touch:**
- `src/App.tsx` (line 213 init, add useEffect for search-driven expand)

**Tests:**
- `src/App.test.tsx` — test that completed section starts collapsed, and that search query causes auto-expand when matching completed tasks exist

**Priority:** P0 — 1-line core fix + small search behavior enhancement

---

### Story 8.3 — Remove Swipe-to-Delete from List View

**User Story:**
As a User,
I want task deletion to only be available in the task detail view,
So that I never accidentally delete a task by mis-swiping, and the list feels clean and safe.

**Captured Ideas Addressed:**
- "Slide to delete fix — It looks a bit off. Maybe let's hide that for now and only show the 'delete task' only in a detail view" 🔴
- Thomas decision in party mode: remove entirely, not just hide

**Acceptance Criteria:**

Given I am viewing the active task list
When I swipe left on a task card
Then nothing happens — no delete tray, no action reveals

Given I open a task in the detail view
When I scroll to the bottom
Then a "Delete Task" button is visible with a confirmation step

Given I tap "Delete Task" in the detail view
When I confirm
Then the task is removed with the existing fade-out animation and UndoToast

**Technical Notes:**
- Replace `SwipeableTaskCard` with `DraggableTaskCard` for active tasks in `App.tsx` (inside `Reorder.Group`).
- Replace `SwipeableTaskCard` with plain `TaskCard` for completed tasks in `App.tsx` (completed tasks are not draggable).
- `SwipeableTaskCard.tsx` can be **kept in the codebase** but should no longer be imported in `App.tsx`. Do not delete the file — it may be referenced in tests.
- Remove swipe-related state from `App.tsx`: `openSwipeId`, `setOpenSwipeId`, `handleSwipeMove`, `handleDeleteInitiated` — BUT only if no other references remain.
- The `onDelete` prop on `TaskDetailSheet` already exists (`onDelete?: (taskId: string) => void`). Wire it up properly in `App.tsx` to call `handleDeleteInitiated` (or equivalent soft-delete logic from `pendingDelete` pipeline).
- The `UndoToast` soft-delete pipeline (5-second undo window) should still work from the detail view — do not break this.
- `showMoveAction` logic can move into `TaskDetailSheet` — the "Move to..." option should still exist there.

**Files to touch:**
- `src/App.tsx` — swap `SwipeableTaskCard` usages, clean up swipe state
- `src/features/capture/components/TaskDetailSheet.tsx` — ensure Delete button is visible and properly wired
- `src/features/capture/components/DraggableTaskCard.tsx` — review props, ensure it works without swipe wrapper
- `src/features/capture/components/TaskCard.tsx` — used for completed tasks

**Tests:**
- `src/features/capture/components/SwipeableTaskCard.test.tsx` — keep but mark as legacy/skip or update to reflect it's not used in main list
- `src/features/capture/components/TaskDetailSheet.test.tsx` — add test for delete button existence and confirm flow

**Priority:** P0

---

### Story 8.4 — Task Creation Flow Polish

**User Story:**
As a User,
I want the task creation sheet to feel perfectly native on mobile,
So that the keyboard, input focus, and scroll behavior are frictionless and the sheet is always in the right place.

**Captured Ideas Addressed:**
- "Starting new tasks (bottom sheet opens) — input field should immediately be focused and expand the longer it gets... Sometimes the keyboard and input are a bit off scroll-wise" 🔴
- "UI improvements — When clicking enter in the description, it should jump to the description field" ⚪ (note: Enter → notes already works, but verify it)

**Acceptance Criteria:**

Given I tap the FAB (+) button
When the CreateTaskSheet opens on iOS
Then the sheet animates into view AND the keyboard opens, with the sheet visible above the keyboard (not behind it)

Given the sheet is open with the keyboard visible
When I scroll the sheet content
Then the sheet stays anchored correctly — the input and buttons are always reachable

Given I type a long task title
When the title exceeds one line
Then the title input auto-expands to show the full text (no horizontal scroll, no truncation)

Given I am in the title field
When I press Enter (without Cmd/Ctrl)
Then focus moves to the Notes field (already implemented — verify still works)

Given I tap anywhere outside the sheet backdrop
When the backdrop is tapped
Then the sheet closes (already implemented — verify on mobile)

**Technical Notes:**
- **The iOS keyboard viewport problem:** iOS Safari raises the visual viewport but not `window.innerHeight`. The sheet needs to attach to `visualViewport` bounds. Solution: listen to `visualViewport.resize` event and adjust the sheet's bottom offset dynamically. Add a `useEffect` in `CreateTaskSheet` that sets `paddingBottom` or `bottom` based on `window.visualViewport?.height`.
- **Title auto-expand:** Change `<input type="text">` to `<textarea rows={1}>` with `overflow-hidden`, `resize-none`, and auto-height logic (same pattern as the notes field's `handleNotesChange`). Single-line feel but expands when needed.
- **Auto-focus timing:** The current 50ms delay may be insufficient on iOS where the keyboard takes ~300ms to appear. Consider increasing to 150ms or using `visualViewport` event as the trigger for focus.
- **Do NOT change** the `Cmd+Enter` submit shortcut — power user path.
- **Do NOT change** the notes field — it already auto-expands correctly.

**Files to touch:**
- `src/features/capture/components/CreateTaskSheet.tsx`

**Tests:**
- `src/features/capture/components/CreateTaskSheet.test.tsx` — test that title field is a textarea, test Enter→notes focus

**Priority:** P0

---

### Story 8.5 — Sorting & Filtering

**User Story:**
As a User,
I want to sort my tasks by created date, last edited date, or priority — and have my sort preference remembered per repository,
So that I can quickly find what I was just working on, or focus on what matters most.

**Captured Ideas Addressed:**
- Party mode consensus: "Sorting should be its own story — sort by edited/created, show important/normal and so forth"
- Thomas: "I want the tasks to be sorted by edited/created, show important/normal"

**Acceptance Criteria:**

Given I am viewing a repository's task list
When I tap a sort control
Then I can choose from: Manual (drag order), Newest First (created desc), Recently Edited (updatedAt desc), Priority First (important → normal, then by created)

Given I select "Recently Edited"
When the sort applies
Then tasks with a non-null `updatedAt` float to the top, sorted by `updatedAt` desc; tasks without `updatedAt` fall back to `createdAt` desc

Given I select "Priority First"
When the sort applies
Then important tasks appear before normal tasks within the active section; within each group, manual order is preserved

Given I switch sort mode for Repo A
When I switch to Repo B and back to Repo A
Then Repo A's sort preference is remembered

Given "Manual" sort is active
When I drag and drop to reorder
Then drag & drop is enabled normally

Given any non-"Manual" sort is active
When the drag handle is shown
Then drag & drop is disabled (handles hidden or non-interactive) — you can't manually reorder when using a sort mode

**Technical Notes:**
- Add new type to `src/types/task.ts`:
  ```typescript
  export type SortMode = 'manual' | 'created-desc' | 'updated-desc' | 'priority-first'
  ```
- Add per-repo sort preference to the store. Best approach: add `repoSortModes: Record<string, SortMode>` to `SyncState` in `useSyncStore.ts`. Add action `setRepoSortMode(repoFullName: string, mode: SortMode)`. Include `repoSortModes` in the persisted `partialize` section.
- Update `sortTasksForDisplay` in `src/utils/task-sorting.ts` to accept a `sortMode` parameter and implement all 4 sort modes.
- In `App.tsx`, derive `currentSortMode` from `repoSyncMeta` (or the new `repoSortModes`) based on `selectedRepo.fullName`. Pass to `sortTasksForDisplay`.
- **Sort UI:** A compact sort selector. Options: small icon button near the filter pills area that opens a dropdown/action sheet with 4 options. Keep it minimal — single icon (↕ or similar) with a subtle active indicator when non-manual sort is active.
- **Drag & drop gating:** When `currentSortMode !== 'manual'`, wrap drag handles in a `disabled` state or simply don't render the `Reorder.Group` (use a plain list instead). Show a subtle tooltip or info that drag is available in Manual mode.
- Filtering (`PriorityFilterPills`) works independently of sort mode — both can be active simultaneously.
- `repoSortModes` should NOT be included in the sync meta (it's a UI preference, not sync data).

**Files to touch:**
- `src/types/task.ts` — add `SortMode` type
- `src/stores/useSyncStore.ts` — add `repoSortModes`, `setRepoSortMode`, persist it
- `src/utils/task-sorting.ts` — extend `sortTasksForDisplay` with sort modes
- `src/App.tsx` — derive sort mode, pass to sorting, gate drag & drop, add sort UI
- New component: `src/features/capture/components/SortModeSelector.tsx`

**Tests:**
- `src/utils/task-sorting.ts` — unit tests for each sort mode
- `src/stores/useSyncStore.test.ts` — test `setRepoSortMode` action

**Priority:** P1

---

### Story 8.6 — Sync Result Feedback

**User Story:**
As a User,
I want to see a brief, informative popup after syncing to GitHub instead of a persistent pending count in the header,
So that I get satisfying confirmation of what happened without cluttered UI chrome.

**Captured Ideas Addressed:**
- "X items pending (upper right) — This can also go away, since the refresh button shows that as well. Maybe the refresh button should show a little popup first what happened (so like the commit message?)" ⚪

**Acceptance Criteria:**

Given I tap "Push to GitHub" (SyncFAB)
When the sync completes successfully
Then a brief toast/popup appears showing what was synced (e.g., "Pushed 3 tasks to owner/repo" or the commit message) for ~2.5 seconds then auto-dismisses

Given the sync fails
When the error occurs
Then the existing error state (SyncFAB red state + BranchProtectionBanner if applicable) continues to work — no regression

Given the sync is in progress
When `syncEngineStatus === 'syncing'`
Then the existing spinner/animation on SyncFAB still shows

Given I am not syncing and have no pending changes
When I view the header
Then the "X items pending" counter in `SyncHeaderStatus` is NOT shown (remove it)

**Technical Notes:**
- `SyncHeaderStatus` in `src/components/layout/SyncHeaderStatus.tsx` currently shows a pending count badge. Remove or hide this badge — it's redundant with SyncFAB.
- Add a `syncResultMessage: string | null` state to `App.tsx`. When `syncEngineStatus` transitions from `'syncing'` to `'success'`, set this to a friendly message. Auto-clear after 2500ms using `setTimeout`.
- The success toast should use the same `UndoToast` pattern or a simpler `motion.div` with `AnimatePresence` — reuse the animation system.
- The commit message format from `sync-service.ts` can be surfaced: e.g., "Synced 5 tasks → tholo91/code-tasks" — check `src/services/github/sync-service.ts` for what commit info is available.
- Do NOT remove the SyncFAB's success checkmark animation — keep that too.

**Files to touch:**
- `src/components/layout/SyncHeaderStatus.tsx` — remove pending count display
- `src/App.tsx` — add syncResultMessage state, watch syncEngineStatus transition
- New or reused toast component for the result popup

**Tests:**
- `src/components/layout/SyncHeaderStatus.test.tsx` — update tests to reflect no pending counter
- `src/App.test.tsx` — test success message appears on sync completion

**Priority:** P1

---

### Story 8.7 — Per-Repo AI Instructions in Settings

**User Story:**
As a User,
I want to customize the AI agent instruction header for each repository,
So that I can tell the AI what to do with my tasks in the context of that specific repo's workflow.

**Captured Ideas Addressed:**
- "Changing the instruction section of the repository — in the settings section of each repository, one should be able to modify the instruction for the AI agent, this can be super useful for a personal use case" 🔴

**Acceptance Criteria:**

Given I open the Settings sheet
When I tap "Repository Settings" (new option)
Then a sub-view/sheet opens showing the current repository's AI instruction text in an editable textarea

Given I edit the instruction text and close the sheet
When the next sync happens
Then the custom instruction text replaces the default "Instructions for AI Agents" section in the `captured-ideas-{username}.md` file

Given I have not customized the instruction
When the sync runs
Then the default instruction header is used (no regression)

Given I switch to a different repository
When I open Repository Settings
Then I see that repository's instruction (or the default if not yet customized)

**Technical Notes:**
- Add `repoInstructions: Record<string, string>` to `SyncState` in `useSyncStore.ts`. Add action `setRepoInstruction(repoFullName: string, instruction: string)`. Include in `partialize` for persistence.
- Default value: when `repoInstructions[repoKey]` is undefined/empty, fall back to the existing default header text.
- Update `getAIReadyHeader(username, customInstruction?: string)` in `src/features/sync/utils/markdown-templates.ts` to accept an optional `customInstruction` parameter. When provided, replace the default instructions block with the custom text.
- In `sync-service.ts`, retrieve the current repo's instruction from the store and pass to `buildFileContent` / `getAIReadyHeader`.
- UI: Add a "Repository Settings" row to `SettingsSheet.tsx` that opens a new `RepoSettingsSheet.tsx` component. This sheet contains: repo name (read-only label), instruction textarea (pre-populated with current value or default), save button.
- Textarea should have a placeholder: "Instructions for AI agents working with this file..."
- Keep the UI minimal — this is a power user feature.

**Files to touch:**
- `src/stores/useSyncStore.ts` — add `repoInstructions`, `setRepoInstruction`
- `src/features/sync/utils/markdown-templates.ts` — update `getAIReadyHeader()` signature
- `src/services/github/sync-service.ts` — pass custom instruction through
- `src/components/layout/SettingsSheet.tsx` — add Repository Settings row
- New: `src/components/layout/RepoSettingsSheet.tsx`

**Tests:**
- `src/features/sync/utils/markdown-templates.test.ts` — test custom instruction injection
- `src/stores/useSyncStore.test.ts` — test `setRepoInstruction`

**Priority:** P2

---

### Story 8.8 — About Gitty in Settings

**User Story:**
As a User,
I want to find a "Story of Gitty" page in the app's settings,
So that I can read the backstory, understand what Gitty is for, and easily star the repository.

**Captured Ideas Addressed:**
- "About this app — In the settings there should be a third option like a Readme of the app 'story of Gitty'? That should be the Readme or how I invented the idea. Maybe create a link to the gitty repo to star it?" ⚪

**Acceptance Criteria:**

Given I open the Settings sheet
When I tap "About Gitty"
Then a new view or sheet slides up with: app name + tagline, a short "Story of Gitty" paragraph, a "⭐ Star on GitHub" button that opens the repo URL, and the app version

Given I tap "⭐ Star on GitHub"
When the link opens
Then it opens `https://github.com/tholo91/code-tasks` in the user's browser (target="_blank")

Given I tap the back/close button
When the About view closes
Then I return to the Settings sheet

**Technical Notes:**
- Add an "About Gitty" row to `SettingsSheet.tsx`, similar to the existing Roadmap row.
- Create `src/features/community/components/AboutGittyView.tsx` — a simple presentational component. Can be a bottom sheet or a full-screen slide-up.
- The "Story of Gitty" content should be a short paragraph (2-3 sentences) written by Thomas — use a placeholder for now that Thomas can edit: `"Gitty was born out of frustration with task apps that don't speak GitHub. Built for developers who think in repos, not lists."`
- Show the app version from `package.json` or a constants file.
- Keep it personal and indie — not corporate. Match the "community-first indie project" tone from CLAUDE.md.
- The GitHub star link: `https://github.com/tholo91/code-tasks`

**Files to touch:**
- `src/components/layout/SettingsSheet.tsx` — add About Gitty row
- New: `src/features/community/components/AboutGittyView.tsx`

**Tests:**
- Simple render test for `AboutGittyView`

**Priority:** P2

---

### Story 8.9 — AI Agent Header Update

**User Story:**
As an AI Agent processing a captured-ideas.md file,
I want clear instructions that I can check off completed tasks and attribute my work,
So that I know exactly what I'm allowed to do with the task list and the file stays clean.

**Captured Ideas Addressed:**
- "Change the AI agent instruction — The AI agent working with this captured-ideas.md should know that he can check off tasks that he has finished and add to their description 'checked by Claude/Gemini'" ⚪

**Acceptance Criteria:**

Given an AI agent opens a `captured-ideas-{username}.md` file
When it reads the instruction header
Then it clearly understands: (1) it can mark tasks as done by changing `- [ ]` to `- [x]`, and (2) it should append "Checked by [Agent Name]" to the task description after completing it

Given the header is updated
When the next sync from the app occurs
Then the new header is written to any new files, and existing files with the old header are updated on next full sync

**Technical Notes:**
- Update `getAIReadyHeader(username)` in `src/features/sync/utils/markdown-templates.ts`.
- Change the existing bullet:
  - **Before:** `> - Mark tasks as done (\`- [x]\`) after processing`
  - **After:** `> - Mark tasks as done (\`- [x]\`) after processing and append "Checked by [Agent Name]" to the task description`
- Also consider adding: `> - You may add notes or context below the \`managed-end\` marker — they will not be overwritten`
- This is purely a content change to the header string. No logic changes needed.
- `hasAIReadyHeader()` detection uses `HEADER_SIGNATURE = '<!-- code-tasks:ai-ready-header -->'` — this doesn't change, so existing files will get the updated instructions on next sync (Case 4: markers rewrite).
- Run the existing `markdown-templates.test.ts` tests — they test the header content and will need updating to match the new text.

**Files to touch:**
- `src/features/sync/utils/markdown-templates.ts` — update `getAIReadyHeader()` body text
- `src/features/sync/utils/markdown-templates.test.ts` — update header snapshot/content tests

**Priority:** P2 (but smallest story — do this first as a warmup)

---

## Story Creation Process (Quality Gate)

For all future epics, each story must go through a **two-step creation process** before being marked `ready-for-dev`:

### Step 1 — Party Mode Review (sub-agent)
- Reads the story definition from the planning doc
- Simulates perspectives: PM (John), UX (Sally), Architect (Winston), QA (Quinn)
- Outputs feedback to a temp file: `_bmad-output/implementation-artifacts/review-{story-key}-feedback.md`
- Covers: scope risks, UX edge cases, architectural concerns, regression risks

### Step 2 — Story Writer (sub-agent, depends on Step 1)
- Reads planning doc + Step 1 feedback
- Writes final story file incorporating review feedback
- Deletes the temp feedback file after writing

Multiple story pairs can run in parallel — the constraint is only Step 2 waits for Step 1 of the **same** story.

> Note: Epic 8 stories were created without this gate (it was added after). For Epic 9+, always use the two-step process.

---

## Story Sequencing (Recommended Sprint Order)

| # | Story | Why this order |
|---|-------|---------------|
| 8.9 | AI Header Update | Smallest story — 5 min warmup, immediate value for AI agents |
| 8.2 | Completed Default Collapsed | 1-line core fix + small search behavior |
| 8.3 | Remove Swipe-to-Delete | Moderate — cleans up App.tsx significantly |
| 8.1 | List View UX | Sticky header + priority visual — foundation for "Things feel" |
| 8.4 | Creation Flow Polish | iOS keyboard fix — mobile-critical |
| 8.5 | Sorting & Filtering | New feature — biggest story, needs prior cleanup done |
| 8.6 | Sync Result Feedback | Polish — removes clutter, adds delight |
| 8.7 | Per-Repo AI Instructions | New feature — settings infrastructure |
| 8.8 | About Gitty | Simplest new feature — mostly static content |

---

## Parked Items (Not in Epic 8)

| Item | Reason | Future |
|------|--------|--------|
| Sync merge handling ("After Sync with main") | Architectural — needs diff/merge engine, own epic | Epic 9 |
| Speech-to-tasks | Future roadmap feature | Epic roadmap |
| GitHub Pages path filter | DevOps 1-liner: add `paths-ignore: ['**/captured-ideas-*.md']` to GitHub Actions workflow | Can be done as a quick commit, not a story |
| Moving task to another repo UX fix (close button, opacity) | Minor — already works functionally, detail view wires up move action | Absorbed into 8.3 if swipe removal surfaces this |

---

## Architecture Constraints (All Stories Must Follow)

1. **Zustand boundary:** All state mutations go through `useSyncStore` actions — no direct `set()` calls from UI components
2. **Service boundary:** All GitHub interactions go through `src/services/github/` — never from components
3. **IDB write-through:** Any task mutation must also call `StorageService.persistTaskToIDB(updatedTask)` after the store update
4. **Bottom sheet pattern:** All new sheets use spring animation `{ stiffness: 400, damping: 35 }`, swipe-down-to-dismiss, tap-backdrop-to-close. Reference `CreateTaskSheet.tsx` as the canonical example.
5. **Testing:** Co-locate tests with source files. All new store actions need unit tests. New components need render tests.
6. **Motion:** Use `useReducedMotion()` fallback in all animated components — instant transitions when user has motion disabled.
7. **Touch targets:** 44x44px minimum on all interactive elements.
