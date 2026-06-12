# Story 9.17: Post-Sync "Run /captured-ideas" Hint Card

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer who just connected a repo in the Gitty mobile app,
I want a one-time hint after my first successful sync telling me to run `/captured-ideas` in Claude Code on desktop,
so that I actually discover the mobile→desktop handoff instead of leaving my captured tasks sitting unused on a branch I don't know exists.

## Context

This is the **third leg** of the AI-coding-tool adoption pair:
- **9-15** (done) — the active AI briefing header tells the *agent* what to do.
- **9-16** (done) — the `/captured-ideas` slash command lets the agent fetch and brief tasks.
- **9-17** (this story) — tells the *human* the desktop flow exists. Today, discovery depends entirely on the user happening to read the file header on a branch they may not know about. This card is the missing human-facing breadcrumb.

Scope is intentionally small: one dismissible card, shown once per repo, persisted in the sync store. No new sync logic, no API calls.

## Acceptance Criteria

1. Given a user completes their **first successful sync** for a given repo (i.e. that repo has no prior dismissal recorded and a sync just succeeded), when the sync result is shown, then a dismissible hint card appears with copy along the lines of: **"Connected! On desktop, open this repo in Claude Code and run `/captured-ideas` to hand your tasks to your AI agent."** The exact wording stays on-brand and mobile-first.

2. Given the hint card is shown, when the user dismisses it (tap dismiss / X), then the dismissal is persisted **per repo** in `useSyncStore` (LocalStorage via the existing `partialize` persistence), and the card never appears again for that repo on any device-session that shares the persisted store.

3. Given a user has already seen and dismissed the hint for a repo, when they sync that repo again (any number of subsequent syncs), then the card does **not** reappear.

4. Given a user has multiple connected repos, when they sync a second, not-yet-hinted repo for the first time, then the hint **does** appear for that repo (dismissal is tracked per repo, not globally).

5. Given a sync **fails** or is a no-op, when there is no successful first sync, then the hint card is **not** shown (it is tied to first *successful* sync, not to opening the app or selecting a repo).

6. Given the card references the `/captured-ideas` command, when rendered, then `/captured-ideas` is visually distinct (code/monospace styling) so it reads as a literal command to type, consistent with how commands are shown elsewhere in the app.

7. Given the card is dismissible, when shown, then it follows the same lightweight presentation and dismissal interaction pattern as the existing `SyncImportBanner` (no modal, no blocking — it sits inline like the import banner and can be dismissed instantly).

## Tasks / Subtasks

- [x] Task 1: Add per-repo "hint seen" flag to the sync store (AC: #2, #3, #4)
  - [x] In `src/stores/useSyncStore.ts`, add `repoClaudeCodeHintSeen: Record<string, boolean>` to `SyncState`, defaulting to `{}`. Follow the exact pattern of `repoSkipCi` (`Record<string, boolean>` keyed by `normalizeRepoKey(repoFullName)`).
  - [x] Add setter `setRepoClaudeCodeHintSeen(repoFullName: string, seen: boolean)` mirroring `setRepoSkipCi` (lines ~863).
  - [x] Add selector `selectRepoClaudeCodeHintSeen(repoFullName)` mirroring `selectRepoSkipCi` (line ~176). **Default must be `false`** (absent key = not yet seen) — opposite of skipCi's `?? true`.
  - [x] Add `repoClaudeCodeHintSeen` to the `partialize` allowlist (lines ~878+) so the dismissal persists across reloads, alongside `repoSyncBranches` / `repoSkipCi`.
- [x] Task 2: Build the hint card component (AC: #1, #6, #7)
  - [x] Created `src/features/sync/components/ClaudeCodeHintCard.tsx`, styled and structured after `src/features/sync/components/SyncImportBanner.tsx` (same inline, dismissible treatment; GitHub Dark Dimmed palette).
  - [x] Render `/captured-ideas` in a monospace/code span.
  - [x] Props: `onDismiss`. Presentational — store access stays in `App.tsx`.
- [x] Task 3: Wire trigger to first successful sync (AC: #1, #3, #5)
  - [x] In `src/App.tsx`, `useEffect` watches `syncEngineStatus === 'success'`; if hint not yet seen for the repo, sets `showClaudeCodeHint = true`.
  - [x] On dismiss, calls `setRepoClaudeCodeHintSeen(repoFullName, true)` and hides card. Trigger fires on all sync-success paths (SyncFAB, SyncConflictBanner, SyncConflictSheet, branch re-sync) since all call `setSyncStatus('success')`.
- [x] Task 4: Tests
  - [x] Store unit tests (5 tests): selector defaults to `false`; setter persists `true`; normalized key; per-repo isolation; reset to false. All pass.
  - [x] Component tests (4 tests): `<code>` tag for command, Claude Code text present, onDismiss fires, testid present. All pass.
- [x] Task 5: Verification
  - [x] `npm test` green — 561 tests pass (48 files).
  - [x] `npm run build` clean — PWA v1.2.0.
  - [ ] Manual: connect a fresh repo → first sync shows card → dismiss → re-sync shows nothing; second repo shows its own card.

## Dev Notes

- **Closest analog component:** `src/features/sync/components/SyncImportBanner.tsx` (imported at `src/App.tsx:24`). Match its inline, non-blocking, dismissible style — do NOT introduce a modal.
- **Per-repo flag pattern to copy:** `repoSkipCi` in `src/stores/useSyncStore.ts` — `Record<string, boolean>` keyed by `normalizeRepoKey(repoFullName)`, setter at ~`863`, selector at ~`176`, persisted via `partialize` at ~`878`. The one inversion: hint default is `false` (absent = not seen), whereas skipCi defaults `true`.
- **Trigger location:** the success branches in `src/App.tsx` that set `lastSyncedSha` (~`381`/`391`/`400`). Tie the card to those, NOT to repo selection or app open, so AC#5 holds.
- **Do NOT add API calls or new sync round-trips** — this is pure UI + one persisted boolean. Keeps the "no latency regression" spirit of 9-15.
- **Copy guidance:** on-brand, mobile-first, "Wir bauen das zusammen." Single sentence + the command. Avoid jargon a non-CLI user wouldn't know — name "Claude Code" explicitly.

### Project Structure Notes

- New file: `src/features/sync/components/ClaudeCodeHintCard.tsx` (feature module, matches existing sync component location).
- Modified: `src/stores/useSyncStore.ts` (new flag + setter + selector + partialize entry), `src/App.tsx` (trigger + render).
- Naming follows conventions: PascalCase component, camelCase selector/setter with `select`/`set` prefixes.
- No conflicts with the unified structure; mirrors 9-11 (`repoSkipCi`) and 9-16 patterns exactly.

### References

- [Source: _bmad-output/implementation-artifacts/9-16-captured-ideas-slash-command.md] — the command this card points users to; multi-user + branch model.
- [Source: _bmad-output/implementation-artifacts/9-15-active-ai-briefing-header.md] — agent-facing half of the adoption pair; no-extra-API principle.
- [Source: src/stores/useSyncStore.ts#repoSkipCi] — per-repo persisted boolean flag pattern to copy.
- [Source: src/features/sync/components/SyncImportBanner.tsx] — dismissible inline banner pattern to copy.
- [Source: src/App.tsx:230] — local prompt/banner state pattern; success branches at :381/:391/:400.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Implemented `repoClaudeCodeHintSeen` per-repo flag in `useSyncStore` — mirrors `repoSkipCi` pattern exactly; default `false` (inverted from skipCi's `?? true`).
- `selectRepoClaudeCodeHintSeen` selector exported alongside existing selectors.
- `ClaudeCodeHintCard` component: same framer-motion/AnimatePresence pattern as `SyncImportBanner`; `/captured-ideas` rendered in `<code>` tag with blue tint; "Desktop ready" label; GitHub Dark Dimmed palette.
- Trigger: `useEffect` in `App.tsx` watches `syncEngineStatus`; fires on all success paths (SyncFAB, conflict resolution, branch re-sync) since all converge on `setSyncStatus('success')`.
- Dismissed per-repo via `setRepoClaudeCodeHintSeen` — persisted in localStorage via `partialize`.
- 9 new tests (5 store + 4 component). 561 total passing.

### File List

- `src/stores/useSyncStore.ts` (modified — new field, selector, setter, partialize entry)
- `src/features/sync/components/ClaudeCodeHintCard.tsx` (new)
- `src/features/sync/components/ClaudeCodeHintCard.test.tsx` (new)
- `src/stores/useSyncStore.test.ts` (modified — 5 new tests)
- `src/App.tsx` (modified — import, state, useEffect, JSX render)
- `_bmad-output/implementation-artifacts/9-17-post-sync-claude-code-hint.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status → review)
