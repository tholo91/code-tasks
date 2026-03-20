# Story 8.7: Per-Repo AI Instructions in Settings

Status: deferred-post-mvp
<!-- Deferred 2026-03-20: Power-user feature, not needed for MVP launch. Default AI header works. Revisit for v1.1. -->

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to customize the AI agent instruction header for each repository,
so that I can tell the AI what to do with my tasks in the context of that specific repo's workflow.

## Acceptance Criteria

1. Given I open the Settings sheet, when I tap "Repository Settings" (new option), then a sub-view/sheet opens showing the current repository's AI instruction text in an editable textarea.

2. Given I edit the instruction text and close the sheet, when the next sync happens, then the custom instruction text replaces the default "Instructions for AI Agents" section in the `captured-ideas-{username}.md` file.

3. Given I have not customized the instruction, when the sync runs, then the default instruction header is used (no regression — existing behaviour is preserved).

4. Given I switch to a different repository, when I open Repository Settings, then I see that repository's instruction (or the default placeholder if not yet customized).

## Tasks / Subtasks

- [ ] Task 1 — Store: add `repoInstructions` state and `setRepoInstruction` action (AC: 1, 2, 3, 4)
  - [ ] 1.1 — In `SyncState` interface (`src/stores/useSyncStore.ts`, lines 40–74), add the field `repoInstructions: Record<string, string>` after `hasPendingDeletions`.
  - [ ] 1.2 — Add the action signature `setRepoInstruction: (repoFullName: string, instruction: string) => void` to the `SyncState` interface.
  - [ ] 1.3 — In the `create<SyncState>()` initializer, add `repoInstructions: {}` as the default value alongside the other initial state fields.
  - [ ] 1.4 — Implement `setRepoInstruction` action: normalize the repo key with `normalizeRepoKey(repoFullName)` and store the instruction string under that key.
  - [ ] 1.5 — Add `repoInstructions` to the `partialize` section (currently ending around line 619) so it is persisted to `localStorage` across sessions. Keys are lowercase repo names (same convention as `repoSyncMeta`).

- [ ] Task 2 — Markdown templates: update `getAIReadyHeader` to accept an optional custom instruction (AC: 2, 3)
  - [ ] 2.1 — Change the signature of `getAIReadyHeader` in `src/features/sync/utils/markdown-templates.ts` (currently line 18) to `getAIReadyHeader(username: string, customInstruction?: string): string`.
  - [ ] 2.2 — When `customInstruction` is provided and non-empty, replace the entire blockquote instructions block (the `> **Instructions for AI Agents:** ... > - Add your own notes BELOW the managed-end marker` section) with a single blockquote containing the custom text. Preserve the `HEADER_SIGNATURE` comment, the `# Captured Ideas — {username}` heading, the `---` separator, and the `MANAGED_START` marker — only the instruction body changes.
  - [ ] 2.3 — When `customInstruction` is absent or empty, produce the existing default output exactly (no regression).
  - [ ] 2.4 — Update all call sites of `getAIReadyHeader` within `markdown-templates.ts` itself (`buildFullFileContent` line 199, `buildFileContent` cases on lines 249, 265, 275) to pass `customInstruction` through — requires propagating the parameter through `buildFileContent` and `buildFullFileContent` signatures as well.

- [ ] Task 3 — Sync service: thread the custom instruction through to file content builders (AC: 2, 3)
  - [ ] 3.1 — In `syncAllRepoTasksOnce` (`src/services/github/sync-service.ts`, around line 266), after destructuring the store state, also read `repoInstructions` from `useSyncStore.getState()`. Derive `const customInstruction = repoInstructions[repoKey] ?? undefined`.
  - [ ] 3.2 — Pass `customInstruction` to `buildFullFileContent(repoTasks, user.login, customInstruction)` (line 311 area) — requires `buildFullFileContent` to also accept and forward the parameter (update its signature and call to `getAIReadyHeader`).
  - [ ] 3.3 — In `syncPendingTasksOnce` (line 494 area) and `commitTasks` (line 84 area), similarly thread `customInstruction` through the `buildFileContent` call chain so both sync paths use the custom instruction.
  - [ ] 3.4 — Verify: when `repoInstructions[repoKey]` is undefined, all paths fall back to the unmodified default header — no behavioural change for existing users.

- [ ] Task 4 — UI: add "Repository Settings" row to `SettingsSheet` (AC: 1)
  - [ ] 4.1 — Add a new `onOpenRepoSettings: () => void` prop to the `SettingsSheetProps` interface in `src/components/layout/SettingsSheet.tsx`.
  - [ ] 4.2 — Insert a new `<button>` row between the Roadmap row and the GitHub link row (or below the GitHub link — match visual grouping). Use the same `rounded-lg px-3 py-3` styling, `var(--color-canvas)` background, and chevron icon pattern as the Roadmap button. Label: "Repository Settings". Use a gear/settings SVG icon at 18×18px with `var(--color-accent)` stroke colour. Add `data-testid="settings-repo-settings"`.
  - [ ] 4.3 — The button's `onClick` should call `onClose()` then `onOpenRepoSettings()` — same pattern as the Roadmap button.
  - [ ] 4.4 — In `src/App.tsx`, add `showRepoSettings` boolean state (`useState(false)`), wire `onOpenRepoSettings` on the `SettingsSheet` invocation, and render `<RepoSettingsSheet>` inside `<AnimatePresence>` when `showRepoSettings` is true.

- [ ] Task 5 — New component: `RepoSettingsSheet` (AC: 1, 2, 3, 4)
  - [ ] 5.1 — Create `src/components/layout/RepoSettingsSheet.tsx`. Props interface: `{ onClose: () => void; repoFullName: string; currentInstruction: string; defaultInstruction: string; onSave: (instruction: string) => void }`.
  - [ ] 5.2 — Follow the canonical bottom sheet pattern from `CreateTaskSheet.tsx`: `motion.div` backdrop with `onClick` close-on-tap, inner `motion.div` sheet with `initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}`, spring transition `{ stiffness: 400, damping: 35 }`, drag-y-to-dismiss (offset > 100 or velocity > 300), `<SheetHandle />` at top, `useReducedMotion()` fallback.
  - [ ] 5.3 — Sheet contents (top to bottom):
    - Read-only repo name label: `<p>` styled with `var(--color-text-secondary)` showing the `repoFullName` prop.
    - Section heading: "AI Agent Instructions" in `text-body font-medium`.
    - `<textarea>` pre-populated with `currentInstruction` (or `defaultInstruction` if empty). Attributes: `rows={8}`, `placeholder="Instructions for AI agents working with this file..."`, `resize-none`, `overflow-auto`, full-width, `var(--color-canvas)` background, `var(--color-border)` border, `rounded-lg`, `p-3`, `text-body`. Min touch target on the Save button: 44px height.
    - Save button: full-width, `var(--color-accent)` background, white text, `rounded-lg`, `py-3`, min-height 44px. `data-testid="repo-settings-save"`. On click: call `onSave(localValue)` then `onClose()`.
    - "Reset to default" link-style button below Save: calls `setLocalValue(defaultInstruction)` — does not save automatically, lets user review before saving.
  - [ ] 5.4 — Manage a local `useState` for the textarea value, initialized from `currentInstruction || defaultInstruction`. Local edits do not update the store until Save is tapped (no auto-save on close).
  - [ ] 5.5 — Apply `aria-label="Repository Settings"`, `role="dialog"`, `aria-modal="true"` on the outer motion container.

- [ ] Task 6 — Wire `RepoSettingsSheet` into `App.tsx` (AC: 1, 2, 4)
  - [ ] 6.1 — Import `useCallback` and the new `RepoSettingsSheet` component into `App.tsx`.
  - [ ] 6.2 — Derive the current repo's instruction from the store: `const repoInstructions = useSyncStore(s => s.repoInstructions)` and `const setRepoInstruction = useSyncStore(s => s.setRepoInstruction)`. Compute `const currentRepoKey = selectedRepo?.fullName.toLowerCase() ?? ''` and `const currentInstruction = repoInstructions[currentRepoKey] ?? ''`.
  - [ ] 6.3 — Derive the default instruction string. Extract it as a constant or import a helper from `markdown-templates.ts` — the default is the blockquote body that `getAIReadyHeader` currently hard-codes. Expose a named export `DEFAULT_AI_INSTRUCTIONS` string constant from `markdown-templates.ts` so `App.tsx` and the sheet can reference it without duplicating text.
  - [ ] 6.4 — Pass `onSave={(instruction) => setRepoInstruction(selectedRepo!.fullName, instruction)}` to `RepoSettingsSheet`.
  - [ ] 6.5 — Guard: if `selectedRepo` is null, do not render `RepoSettingsSheet` and disable/hide the Repository Settings button in `SettingsSheet`.

- [ ] Task 7 — Tests (AC: all)
  - [ ] 7.1 — `src/features/sync/utils/markdown-templates.test.ts`: add test cases for `getAIReadyHeader(username, customInstruction)`. Assert (a) custom text appears in output and the default block does not, (b) calling without `customInstruction` still produces the default output exactly (regression guard).
  - [ ] 7.2 — `src/features/sync/utils/markdown-templates.test.ts`: add test that `buildFileContent` and `buildFullFileContent` propagate a custom instruction to the header correctly.
  - [ ] 7.3 — `src/stores/useSyncStore.test.ts`: add test that `setRepoInstruction('owner/repo', 'my text')` stores the value under `normalizeRepoKey('owner/repo')` and that a second call for the same repo overwrites it, and a call for a different repo does not affect the first.
  - [ ] 7.4 — `src/components/layout/RepoSettingsSheet.test.tsx` (new file): render test asserting the textarea shows `currentInstruction` when provided, shows `defaultInstruction` when `currentInstruction` is empty, and that clicking Save calls `onSave` with the current textarea value.
  - [ ] 7.5 — `src/components/layout/SettingsSheet.test.tsx` (update existing if present): assert the "Repository Settings" button is rendered and calls `onOpenRepoSettings` on click.

## Dev Notes

- **Architecture boundary:** All state mutations go through `useSyncStore` actions. The UI component (`RepoSettingsSheet`) must call `onSave` which in turn calls `setRepoInstruction` from App.tsx — never call `useSyncStore` directly from within the sheet component.
- **Service boundary:** `sync-service.ts` reads `repoInstructions` from the store via `useSyncStore.getState()` — the same pattern already used for `repoSyncMeta` (line 266). No GitHub API changes are needed; the custom instruction only affects the content string written to the file.
- **Persistence:** `repoInstructions` must be added to `partialize` alongside `repoSyncMeta`. Keys should use the lowercase normalized repo name (use `normalizeRepoKey`) for consistency. This is a UI preference (not sync metadata), same as `repoSortModes` from Story 8.5.
- **No IDB write-through needed:** `repoInstructions` is not task data — it is user configuration. `localStorage` persistence via Zustand `partialize` is sufficient; no `StorageService.persistTaskToIDB` call is required.
- **Header signature unchanged:** `HEADER_SIGNATURE = '<!-- code-tasks:ai-ready-header -->'` must not change. This ensures existing files with the old header still get their instructions block rewritten on next sync (Case 4 in `buildFileContent`: split at markers, rewrite managed section, reassemble — the `before` section which contains the header and instructions IS rewritten because it comes from `getAIReadyHeader`, not from the existing file's `before` slice). Verify this logic path before shipping.
- **Bottom sheet spring constants:** `{ stiffness: 400, damping: 35 }` — see `src/config/motion.ts` (`TRANSITION_SHEET`) for the canonical import. Use `TRANSITION_SHEET` from that module rather than inline values.
- **Touch targets:** Save button must be ≥ 44px height. "Reset to default" button must also meet the 44×44px minimum.
- **`useReducedMotion`:** Wrap all motion in the sheet with `useReducedMotion()` check and substitute `{ duration: 0.15 }` transition when true — follow the exact pattern in `SettingsSheet.tsx` lines 11–12.
- **Story 8.9 interaction:** Story 8.9 updates the default `getAIReadyHeader` instruction text. If 8.9 ships before 8.7, the `DEFAULT_AI_INSTRUCTIONS` constant introduced here should reflect the updated text from 8.9. If 8.7 ships first, the constant uses the current default text; the Story 8.9 dev simply updates the constant and the function body together. Either order works — they are independent changes to the same string.

### Project Structure Notes

- New file: `src/components/layout/RepoSettingsSheet.tsx` — co-located with `SettingsSheet.tsx`, consistent with the existing layout component directory.
- New test file: `src/components/layout/RepoSettingsSheet.test.tsx` — co-located with the component (standard project convention).
- `DEFAULT_AI_INSTRUCTIONS` constant export added to `src/features/sync/utils/markdown-templates.ts` — keeps the single source of truth for the default instruction text.
- `buildFileContent` and `buildFullFileContent` in `markdown-templates.ts` both gain an optional `customInstruction?: string` parameter. All existing call sites in `sync-service.ts` must be updated to pass this through.
- No new top-level directories are introduced. No changes to `src/types/task.ts` for this story.

### References

- Story 8.7 full definition: [Source: `_bmad-output/planning-artifacts/epic-8-planning.md` §Story 8.7]
- `SyncState` interface and `partialize` section: [Source: `src/stores/useSyncStore.ts` lines 40–74, 611–619]
- `getAIReadyHeader` current signature and body: [Source: `src/features/sync/utils/markdown-templates.ts` lines 18–37]
- `buildFileContent` and `buildFullFileContent` call sites for `getAIReadyHeader`: [Source: `src/features/sync/utils/markdown-templates.ts` lines 199, 249, 265, 275]
- `syncAllRepoTasksOnce` store destructuring and `buildFullFileContent` call: [Source: `src/services/github/sync-service.ts` lines 266–311]
- `syncPendingTasksOnce` and `commitTasks` call to `buildFileContent`: [Source: `src/services/github/sync-service.ts` lines 84–150, 494–573]
- `SettingsSheet` props interface and Roadmap button pattern to replicate: [Source: `src/components/layout/SettingsSheet.tsx` lines 4–93]
- Canonical bottom sheet spring transition: [Source: `src/components/layout/SettingsSheet.tsx` lines 36–45; `src/config/motion.ts` — `TRANSITION_SHEET`]
- `normalizeRepoKey` helper (already exported from store): [Source: `src/stores/useSyncStore.ts` line 30]
- Architecture constraints (Zustand boundary, service boundary, bottom sheet pattern, touch targets, `useReducedMotion`): [Source: `_bmad-output/planning-artifacts/epic-8-planning.md` §Architecture Constraints]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
