---
title: 'qs-sync-data-loss-and-defaults'
slug: 'qs-sync-data-loss-and-defaults'
created: '2026-06-11'
status: 'Implementation Complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  ['React 19', 'TypeScript 5.8', 'Zustand', 'Octokit', 'Vitest', 'Testing Library']
files_to_modify:
  [
    'src/features/sync/utils/markdown-templates.ts',
    'src/features/sync/components/SyncImportBanner.tsx',
    'src/App.tsx',
    'src/services/github/sync-service.ts',
    'src/stores/useSyncStore.ts',
    'src/features/sync/components/RepoSettingsSheet.tsx',
  ]
code_patterns:
  [
    'Pure serialize/parse functions in markdown-templates.ts',
    'Repo-scoped sync meta via setRepoSyncMeta keyed by lowercased repoFullName',
    'Conflict gate compares remoteSha against syncMeta.lastSyncedSha',
    'Selectors with ?? default fallbacks in useSyncStore.ts',
  ]
test_patterns:
  [
    'Vitest unit tests colocated next to source',
    'Octokit mocked in sync-service.test.ts',
    'Component tests with Testing Library in *.test.tsx',
  ]
---

# Tech-Spec: qs-sync-data-loss-and-defaults

**Created:** 2026-06-11

## Overview

### Problem Statement

The sync layer (markdown round-trip + GitHub push) has four data-loss defects, plus two
default settings that no longer match the desktop-AI-agent reality:

1. **Title with `**` truncates.** Serializer wraps the title as `**${title}**`; the
   non-greedy parser regex `/^- \[(x| )\]\s+\*\*(.+?)\*\*(.*)$/i` truncates any title that
   itself contains `**`.
2. **Multiline body loses lines after the first newline.** Serializer only indents the
   first body line; the parser stops collecting body lines at the first non-indented line,
   so lines 2+ of a multiline body are dropped.
3. **Dismissing the import banner never records `lastSyncedSha`.** The next push therefore
   sees `remoteSha !== lastSyncedSha` only by luck; in practice the dismissed remote state
   is not adopted as the baseline, so a later push can silently overwrite remote changes
   the user chose to ignore.
4. **Branch syncs skip the conflict check entirely.** The gate is guarded by
   `!targetBranch`, so pushes to a `gitty/{username}` fallback branch never run conflict
   detection. Once desktop AI agents write check-offs back to that branch, a push silently
   overwrites them.

Plus two default flips:

5. **`[skip ci]` should be ON by default** so routine task syncs do not burn CI minutes.
6. **The `gitty/{username}` dedicated branch should be RECOMMENDED (not forced)** in the
   repo branch settings, because pushing tasks to main triggers deploys and noise.

### Solution

Make the serializer escape `**` and indent every body line so the existing parser round-trips
cleanly; record the fetched SHA as the new baseline when the import banner is dismissed;
remove the `!targetBranch` exemption so branch pushes run the same SHA conflict gate (the
baseline is already recorded after branch pushes); flip the `skipCi` selector default to
`true`; and re-label the dedicated branch option as Recommended while keeping the choice.

### Scope

**In Scope:**

- 4 surgical sync data-loss bug fixes (items 1-4 above).
- 2 default flips (items 5-6 above).
- Focused unit/component tests proving each fix.
- Updating any existing test that asserts the old `skipCi` default or the old
  branch-skips-conflict behavior.

**Out of Scope:**

- Any change to push/commit logic beyond removing the conflict-gate exemption.
- Branch-scoping the `lastSyncedSha` field (the repo-scoped baseline is sufficient
  for the minimal fix and is already recorded after branch pushes).
- Migration of already-persisted truncated data.
- Any visual redesign of the RepoSettingsSheet beyond the Recommended label/copy.

## Context for Development

### Codebase Patterns

- **Serialize/parse are pure functions** in `src/features/sync/utils/markdown-templates.ts`.
  `formatTaskAsMarkdown` (line 83) serializes; `parseTasksFromMarkdown` (line 149) parses.
  Round-trip stability is the contract.
- **Sync meta is repo-scoped**, keyed by `repoFullName.toLowerCase()` via
  `setRepoSyncMeta(repoFullName, updates)` in `useSyncStore.ts` (line 757). `lastSyncedSha`
  is a single value per repo, NOT per branch.
- **Conflict gate** in `sync-service.ts` (lines 378 and 627) returns `{ status: 'conflict' }`
  when `remoteSha !== syncMeta.lastSyncedSha`. The baseline `lastSyncedSha` is written after
  every successful push regardless of branch (lines 463-464 and 658-659).
- **Selectors** in `useSyncStore.ts` use `?? default`. `selectRepoSkipCi` (line 176) returns
  `state.repoSkipCi[key] ?? false`. The write side (`setRepoSkipCi`, line 863) DELETES the key
  when disabled, so a repo's skipCi is read ONLY through this selector default unless
  explicitly enabled — flipping the selector default to `true` is therefore the complete change.
- **Import banner** is rendered in `src/App.tsx` (line 730). The fetched remote SHA is carried
  on `importPrompt.sha`. The current `onDismiss` (line 737) only clears local UI state.

### Files to Reference

| File                                                      | Purpose                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/features/sync/utils/markdown-templates.ts`           | Serialize (`formatTaskAsMarkdown`) + parse (`parseTasksFromMarkdown`) — bugs 1 & 2 |
| `src/features/sync/utils/markdown-templates.test.ts`      | Round-trip unit tests for bugs 1 & 2                               |
| `src/App.tsx`                                             | SyncImportBanner render + `onDismiss` handler — bug 3              |
| `src/features/sync/components/SyncImportBanner.tsx`       | Banner component (Dismiss button) — bug 3                          |
| `src/features/sync/components/SyncImportBanner.test.tsx`  | Banner dismiss test — bug 3                                        |
| `src/services/github/sync-service.ts`                     | Conflict gate at lines 378 & 627 — bug 4                          |
| `src/services/github/sync-service.test.ts`                | Branch conflict test (line 716 asserts old behavior) — bug 4      |
| `src/stores/useSyncStore.ts`                              | `selectRepoSkipCi` default — default flip 5                       |
| `src/features/sync/components/RepoSettingsSheet.tsx`      | Branch strategy radio options — default flip 6                    |

### Technical Decisions

- **Bug 1 escape strategy:** at serialize time, collapse every literal `**` in `task.title`
  to a single `*` (a sensible, displayable, stable transform) so the `**...**` wrapper is the
  only `**` on the line and the non-greedy regex captures the full title. This is "reversible
  enough" per the spec — the displayed title stays readable. No parser change needed.
- **Bug 2:** prefix EVERY line of a multiline body with 2 spaces (split on `\n`, indent each).
  The parser already strips the 2-space prefix per line and rejoins with `\n` (lines 178-181),
  so mirroring the indent is the only change required.
- **Bug 3:** thread `importPrompt.sha` into the dismiss path. On dismiss, call
  `setRepoSyncMeta(repoFullName, { lastSyncedSha: sha, lastSyncAt, conflict: null })` so the
  dismissed remote becomes the baseline. Keep clearing the local UI state as before.
- **Bug 4:** remove the `!targetBranch &&` clause from BOTH conflict gates (line 378 in
  `syncAllRepoTasksOnce`, line 627 in `syncPendingTasksOnce`). No new SHA bookkeeping is
  needed: `lastSyncedSha` is already written after branch pushes, so a changed branch remote
  now triggers the conflict path. Update the stale test at line 716 to assert the NEW behavior.
- **Flip 5:** change `selectRepoSkipCi` default from `?? false` to `?? true`. Toggle still
  works because `setRepoSkipCi(repo, false)` deletes the key and `setRepoSkipCi(repo, true)`
  sets it — both are read back correctly through the flipped default for the "off" case ONLY
  via explicit deletion. NOTE: with the flipped default, "off" can no longer be represented by
  an absent key. See Notes for the consequence and the chosen minimal handling.
- **Flip 6:** UI/copy only. Add a "Recommended" pill/label to the Dedicated branch option and
  adjust the helper copy. Do NOT change which option is selected by default in component state
  unless required to honor "recommended" — keep the existing `branchMode` initialization
  (`currentBranch ? 'custom' : 'default'`) so a connected repo's saved choice is respected; the
  recommendation is communicated via label + copy. No em dashes in any added copy.

## Implementation Plan

### Tasks

- [x] Task 1: Escape `**` in serialized title (Bug 1)
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: In `formatTaskAsMarkdown` (line ~88), replace `task.title` in the wrapper with a
    sanitized title where every literal `**` is collapsed to `*`
    (e.g. `const safeTitle = task.title.replace(/\*\*/g, '*')`). Use `safeTitle` inside the
    `**...**` wrapper.
  - Notes: No parser change. Keeps the title displayable and the round-trip stable.

- [x] Task 2: Indent every line of a multiline body (Bug 2)
  - File: `src/features/sync/utils/markdown-templates.ts`
  - Action: In `formatTaskAsMarkdown` (line ~104-105), replace the single-line indent with a
    per-line indent: split `task.body` on `\n`, prefix each line with two spaces, rejoin with
    `\n`, and append on a new line.
  - Notes: Parser lines 178-181 already strip the 2-space prefix per line and rejoin with `\n`.

- [x] Task 3: Record baseline SHA on import-banner dismiss (Bug 3)
  - File: `src/App.tsx`
  - Action: In the `<SyncImportBanner ... onDismiss={...} />` render (line ~737), extend the
    dismiss handler to also call
    `setRepoSyncMeta(importPrompt.repoFullName, { lastSyncedSha: importPrompt.sha ?? null, lastSyncAt: new Date().toISOString(), conflict: null })`
    before clearing `importPrompt`/`diffSummary`.
  - Notes: `importPrompt.sha` is the fetched remote SHA already in scope. `setRepoSyncMeta` is
    already imported/used in this file. No prop change to `SyncImportBanner` is required.

- [x] Task 4: Apply the conflict gate to branch syncs (Bug 4)
  - File: `src/services/github/sync-service.ts`
  - Action: Remove the `!targetBranch &&` clause from the gate condition at line ~378
    (`syncAllRepoTasksOnce`) AND line ~627 (`syncPendingTasksOnce`), leaving
    `if (!options.allowConflict && syncMeta?.lastSyncedSha) { ... }`. Also update the stale
    inline comment ("skip for branch fallback") to reflect that branch pushes now run the gate.
  - Notes: `lastSyncedSha` is already written after branch pushes (lines 463-464, 658-659), so
    a changed branch remote now returns `status: 'conflict'`. No new bookkeeping.

- [x] Task 5: Flip `[skip ci]` default to ON (Flip 5)
  - File: `src/stores/useSyncStore.ts`
  - Action: In `selectRepoSkipCi` (line ~176-177), change `?? false` to `?? true`.
  - Notes: Toggle still works for turning it OFF (see Notes for the absent-key consequence and
    the minimal handling decision).

- [x] Task 6: Recommend the dedicated branch (Flip 6)
  - File: `src/features/sync/components/RepoSettingsSheet.tsx`
  - Action: Add a small "Recommended" label/pill to the Dedicated branch option (line ~112-119)
    and adjust the helper copy to explain it keeps task syncs off main. Keep the Default branch
    option and the radio choice intact. No em dashes in added copy.
  - Notes: UI/copy only. Do not change push logic or the `branchMode` initialization.

- [x] Task 7: Tests for bugs 1 & 2
  - File: `src/features/sync/utils/markdown-templates.test.ts`
  - Action: Add a round-trip test for a title containing `**` (serialize then parse, assert a
    sensible, stable title). Add a round-trip test for a 3-line body (serialize then parse,
    assert all 3 lines survive joined with `\n`).

- [x] Task 8: Test for bug 3
  - File: `src/features/sync/components/SyncImportBanner.test.tsx` (and/or App-level if the
    dismiss handler lives in App.tsx)
  - Action: Add/extend a test asserting that dismissing the import banner records the fetched
    remote SHA as `lastSyncedSha`. If the handler logic lives in `App.tsx`, assert the
    `setRepoSyncMeta` call is made with the fetched SHA when Dismiss is clicked.

- [x] Task 9: Test for bug 4 + fix stale test
  - File: `src/services/github/sync-service.test.ts`
  - Action: Update the existing "skips conflict detection when branch is provided" test
    (line ~716) to assert the NEW behavior: a branch push with a changed remote SHA returns
    `status: 'conflict'`. Rename/retitle as appropriate.

- [x] Task 10: Update any test asserting the old skipCi default
  - File: `src/stores/useSyncStore.test.ts` (or wherever `selectRepoSkipCi` is tested)
  - Action: Grep for assertions of `selectRepoSkipCi(...)` returning `false` by default and
    flip them to `true`. If none exist, no change.

### Acceptance Criteria

- [ ] AC1: Given a task whose title contains `**`, when it is serialized and re-parsed, then
      the parsed title is non-empty, displayable, and stable across a second round-trip.
- [ ] AC2: Given a task with a 3-line body, when it is serialized and re-parsed, then the
      parsed body contains all 3 lines joined by `\n`.
- [ ] AC3: Given an import banner showing a fetched remote SHA, when the user clicks Dismiss,
      then `setRepoSyncMeta` is called recording that SHA as `lastSyncedSha` for the repo.
- [ ] AC4: Given a previously synced repo with a recorded `lastSyncedSha`, when a branch push
      runs and the branch remote SHA differs from the baseline, then the sync returns
      `status: 'conflict'` and does not overwrite the remote.
- [ ] AC5: Given a repo with no explicit skipCi setting, when `selectRepoSkipCi` is read, then
      it returns `true`; and when the user turns the toggle OFF, the sync no longer appends
      `[skip ci]`.
- [ ] AC6: Given the RepoSettingsSheet is open, when the user views the branch options, then the
      dedicated `gitty/{username}` branch is labeled Recommended, the Default branch option is
      still selectable, and no em dashes appear in the new copy.
- [ ] AC7: Given the full test suite, when `npm test` runs, then all tests pass; and when
      `npm run build` runs, then it succeeds.

## Additional Context

### Dependencies

- No new external libraries. Uses existing Octokit mocks (sync-service.test.ts) and Testing
  Library (component tests).

### Testing Strategy

- **Unit:** markdown round-trip tests for `**` titles and multiline bodies.
- **Unit/Service:** branch-conflict test in sync-service.test.ts (mock a changed branch remote
  SHA, assert `status: 'conflict'`).
- **Component/Integration:** import-banner dismiss test asserting `setRepoSyncMeta` records the
  fetched SHA.
- **Regression:** update any test asserting the old skipCi default; run full `npm test` +
  `npm run build`.

### Notes

- **Flip 5 consequence (absent key can no longer mean "off"):** with the default flipped to
  `true`, an absent `repoSkipCi[key]` now reads as ON. `setRepoSkipCi(repo, false)` currently
  DELETES the key, which would read back as ON — i.e. turning the toggle off would appear to
  do nothing for that repo. The minimal correct fix is to make `setRepoSkipCi` persist `false`
  explicitly (store `false` instead of deleting) so an explicit OFF survives. Confirm the
  partialize list already persists `repoSkipCi` (it does, line ~889). Implement this minimal
  write-side adjustment as part of Task 5 so AC5's "turn it OFF" path actually works. Keep the
  change tight — only the `setRepoSkipCi` else-branch.
- **Bug 4 minimal-change rationale:** `lastSyncedSha` stays repo-scoped (not branch-scoped).
  This is sufficient because the baseline is recorded after each push (main or branch); a
  changed branch remote will differ from it and trip the gate. Branch-scoping is explicitly
  out of scope.
- **Already-modified file:** `src/components/landing/LandingPage.tsx` has approved uncommitted
  copy changes unrelated to this spec; they are committed together with these fixes per the
  task instructions but are not part of this spec's logic.
