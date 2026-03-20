---
title: 'Post-Import Feedback & Safe-Vault Guarantee'
slug: 'safe-vault-import-feedback'
created: '2026-03-20'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React 19', 'TypeScript', 'Framer Motion', 'Zustand']
files_to_modify: ['src/features/sync/components/SyncImportBanner.tsx', 'src/App.tsx', 'src/utils/task-diff.ts', 'src/features/sync/components/SyncResultToast.tsx']
code_patterns: ['Toast with AnimatePresence + motion.div', 'useReducedMotion() fallback', 'TRANSITION_FAST from config/motion.ts']
test_patterns: ['Vitest + Testing Library', 'vi.mock framer-motion', 'co-located test files']
---

# Tech-Spec: Post-Import Feedback & Safe-Vault Guarantee

**Created:** 2026-03-20

## Overview

### Problem Statement

After a user clicks "Update" on the SyncImportBanner (remote-update variant), the banner disappears silently — no confirmation of what happened. The user doesn't know if their local ideas are safe. Additionally, the initial-import variant uses scary wording ("Importing will overwrite your local list"), and there is no runtime guard preventing task deletion in the merge logic. Users need to feel their phone is a **safe vault** where nothing disappears — tasks are only ever checked (completed) or archived, never deleted by remote sync.

### Solution

1. Show a confirmation toast after import summarizing what changed (e.g., "2 tasks checked, 1 archived. Your 3 ideas are safe.")
2. Soften SyncImportBanner wording in both variants to reinforce safety
3. Add a defensive runtime assertion in `buildMergedTaskList` that guarantees no local task is ever dropped (only completed or archived)

### Scope

**In Scope:**
- Post-import confirmation toast (reuse existing SyncResultToast component)
- Wording changes in SyncImportBanner (both `initial-import` and `remote-update` variants)
- Runtime guard in `buildMergedTaskList` preventing task count reduction
- Tests for new behavior

**Out of Scope:**
- SyncConflictBanner redesign (separate concern)
- SyncFAB behavior changes
- New store actions or state
- Changes to `replaceTasksForRepo` (only used when local is empty — no data loss risk)

## Context for Development

### Codebase Patterns

- Toasts use `AnimatePresence` + `motion.div` with `TRANSITION_FAST`, positioned `fixed bottom-24`
- `SyncResultToast` already exists at `src/features/sync/components/SyncResultToast.tsx` — can be reused for post-import feedback by passing a different message
- `computeImportDiff` returns `ImportDiffSummary` with `completedByAgent`, `archived`, `localSafeCount`, `newFromRemote`, `updatedWithNotes`
- `buildMergedTaskList` in `task-diff.ts` handles the merge: local pending tasks are kept, matched tasks get remote updates, unmatched synced tasks get archived
- The `onImport` handler in App.tsx (lines ~680-700) calls `mergeRemoteTasksForRepo` for remote-update, then clears `importPrompt` and `diffSummary` — but never shows feedback
- `useReducedMotion()` fallback required on all animated components (architecture constraint 6)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/sync/components/SyncImportBanner.tsx` | Banner UI — wording changes needed |
| `src/features/sync/components/SyncResultToast.tsx` | Existing toast — reuse for post-import feedback |
| `src/App.tsx` | onImport handler — needs to show toast after import |
| `src/utils/task-diff.ts` | `buildMergedTaskList` — add safety guard; `computeImportDiff` — already has diff data |
| `src/features/sync/components/SyncImportBanner.test.tsx` | Existing tests — update wording assertions |
| `src/features/sync/components/SyncResultToast.test.tsx` | Existing tests — may need message format test |

### Technical Decisions

- Reuse `SyncResultToast` (already built in Story 8-6) rather than creating a new component — it accepts `message: string` and `onDismiss`, which is exactly what we need
- Build the post-import message from `diffSummary` (already computed before import) rather than re-computing after
- The safety guard in `buildMergedTaskList` is a **defensive assertion** — the current logic already never drops tasks, but an explicit guard makes the guarantee auditable and future-proof

## Implementation Plan

### Tasks

1. **Add post-import confirmation toast in App.tsx** (AC: #1)
   - In the `onImport` handler (~line 680), before clearing `diffSummary`, build a human-readable message from `diffSummary`
   - Call `setSyncResultMessage(message)` to reuse the existing toast mechanism
   - Helper function `buildImportFeedbackMessage(diff: ImportDiffSummary): string` — lives in `task-diff.ts`
   - Example outputs:
     - "2 tasks checked off, 1 archived. Your 3 ideas are safe."
     - "1 new task from remote. Your ideas are safe."
     - "Updated from remote. Nothing changed locally."

2. **Soften SyncImportBanner wording** (AC: #2)
   - `initial-import` variant: Change "Importing will overwrite your local list for this repo." → "Your local list is empty — this will load tasks from the remote file."
   - `remote-update` variant: Change "Want the latest status?" fallback → "New updates available from remote."
   - Keep the existing green "Your X new ideas are safe" line — it's already great
   - Change "Update" button label → "Apply updates" (clearer action)
   - Change "Import" button label → "Load tasks" (less technical)

3. **Add safety guard in buildMergedTaskList** (AC: #3)
   - After building the `result` array, assert: `result.length >= localTasks.length`
   - If assertion fails, log a warning and return `localTasks` unchanged (fail-safe: never reduce)
   - This is a defensive measure — the current logic already preserves all tasks, but the guard makes the guarantee explicit

4. **Update tests** (AC: #1, #2, #3)
   - `task-diff.test.ts` (if exists) or new file: test `buildImportFeedbackMessage` with various diff scenarios
   - `task-diff.test.ts`: test that `buildMergedTaskList` never returns fewer tasks than input
   - `SyncImportBanner.test.tsx`: update wording assertions
   - `App.test.tsx`: test that import triggers toast with diff summary message

### Acceptance Criteria

1. **Given** I click "Update" on the SyncImportBanner (remote-update), **when** the import completes, **then** a toast appears summarizing what changed (e.g., "2 tasks checked off, 1 archived. Your 3 ideas are safe.") and auto-dismisses after 2.5s.

2. **Given** the SyncImportBanner is shown, **when** I read the text, **then** the wording uses safe, non-threatening language — no "overwrite", no "replace", no red/danger styling for normal updates.

3. **Given** `buildMergedTaskList` is called with any combination of local and remote tasks, **when** the merge completes, **then** the result array length is always >= the local input length (no task is ever dropped).

4. **Given** I have local pending (unpushed) ideas, **when** a remote update is imported, **then** my pending ideas remain untouched and the toast confirms "Your X ideas are safe."

## Additional Context

### Dependencies

- Story 8-6 (Sync Result Feedback) must be merged first — it introduces `SyncResultToast` and `syncResultMessage` state in App.tsx
- Story 8-12 (Additive Import with Diff Summary) — already merged, provides the `computeImportDiff` and `buildMergedTaskList` infrastructure

### Testing Strategy

- Unit tests for `buildImportFeedbackMessage` (pure function, multiple scenarios)
- Unit test for safety guard in `buildMergedTaskList` (edge case: empty remote, duplicate titles)
- Integration test in App.test.tsx for post-import toast rendering
- Update SyncImportBanner.test.tsx for new wording

### Notes

- The core philosophy: **"On your phone, nothing gets deleted — only checked or archived."**
- "Archived" = task existed locally and was synced, but no longer exists on remote (dev/AI deleted it from the markdown). The task gets marked completed with `[Archived]` prefix — a graveyard for tasks that were removed upstream without being checked off.
- This spec is a UX-trust feature, not a functional feature. The merge logic already works correctly — we're adding visibility and guarantees.

### To Be Discussed Before Implementation — Check Back With Thomas

The following points emerged from Party Mode review (Sally/UX, John/PM, Amelia/Dev) and need Thomas's sign-off before the dev agent implements:

1. **ID-based safety guard vs count-based:** The spec currently proposes `result.length >= localTasks.length`. Party mode consensus: this should be **ID-based** — assert every local task ID exists in the output. If any ID is missing, abort merge and return local tasks + new remote-only tasks as fail-safe. Stronger guarantee, same effort. **Thomas: OK with ID-based?**

2. **Two-line toast format:** Instead of a single line ("2 tasks checked, 1 archived..."), use:
   ```
   ✓ Updated — your ideas are safe
     2 tasks completed by agent
   ```
   Safety-first headline, factual detail second. **Thomas: prefer this over single-line?**

3. **"Archived" vs "completed" in user-facing text:** Party mode flagged that "archived" is developer-speak and might sound scary ("where did my task go?"). Suggestion: use "completed" in all user-facing toast/banner text. The `[Archived]` body prefix stays as an internal implementation detail but isn't surfaced in notifications. **Thomas: OK to say "completed" even for archived tasks, or do you want users to distinguish?**

4. **Exact wording for SyncImportBanner remote-update variant:** The banner currently shows diff-aware text like "Agent completed 2 tasks" + "Your 3 new ideas are safe". The *specific strings* that appear when captured-ideas.md on main differs need Thomas's final sign-off since this is the critical trust moment. Current proposals:
   - Header: "Updates on main" → keep or change?
   - Primary line examples: "Agent completed 2 tasks" / "1 new task from remote" / "Remote changes detected"
   - Safety line (green): "Your 3 new ideas are safe" → keep as-is?
   - Button label: "Update" → "Apply updates"?
   - **Thomas: review these strings and confirm or revise.**

5. **Race condition between import toast and sync toast:** If the user imports AND a push succeeds at the same time, both try to set `syncResultMessage`. Proposed fix: import toast takes priority — the `syncing→success` effect checks if `syncResultMessage` is already set. **Thomas: OK with import-wins priority?**
