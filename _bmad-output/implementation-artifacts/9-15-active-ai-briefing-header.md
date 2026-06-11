# Story 9.15: Active AI Briefing Header + Branch Awareness

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer who uses Claude Code, Cursor, or Codex on a repo that Gitty syncs to,
I want the captured-ideas file to *actively brief* my AI agent at session start — including which branch the freshest version lives on and how to decide between quick fix and proper story —
so that I never act on stale data and the AI behaves predictably across all my repos.

## Acceptance Criteria

1. Given an AI agent reads `captured-ideas-{username}.md`, when it parses the header, then the instructions **directively** tell it to (a) print every unchecked task back to the user grouped by priority (🔴 first), (b) propose a one-line approach per task, and (c) only then wait for the user's direction. Passive phrasing ("check for new tasks") is removed.

2. Given Gitty knows which branch this file is synced to (from `repoSyncBranches[repoKey]` in `useSyncStore`), when it generates the header, then the header includes a literal line: `> 📍 This file is synced to branch \`{branch}\` in this repo. To get the latest captures from another branch, run: \`git fetch && git show origin/{branch}:captured-ideas-{username}.md\`.` The `{branch}` defaults to the repo's default branch when no fallback is set.

3. Given an AI agent finishes work on a task, when it decides how to handle it, then the header provides explicit criteria: *trivial (≤ 30 min, clearly bounded, no design choices) → execute and mark `- [x]` with `[Processed by: AgentName]`; non-trivial → propose a story or quick spec and wait for user confirmation. If in doubt, treat as non-trivial.*

4. Given the existing `HEADER_SIGNATURE` (`<!-- code-tasks:ai-ready-header -->`) is preserved, when an existing repo with the old header syncs, then `hasAIReadyHeader()` still detects it and the rewrite happens via the existing Case 4 markers-rewrite path with no migration code.

5. Given the test suite covers `getAIReadyHeader()`, when the header content changes, then all snapshot/assertion strings in `markdown-templates.test.ts` are updated to match exactly and `npm test` passes with zero failures.

6. Given branch awareness is added, when `getAIReadyHeader()` is called from generation paths, then it accepts an optional `syncBranch?: string` parameter and the call sites in `sync-service.ts` pass the resolved branch. Behavior is unchanged when the parameter is omitted (existing tests pass).

## Tasks / Subtasks

- [x] Task 1: Rewrite `getAIReadyHeader()` body in `src/features/sync/utils/markdown-templates.ts` (AC: #1, #3)
  - [x] Replace the bullet list with the directive 6-point structure (see Dev Notes for verbatim text)
  - [x] Preserve `HEADER_SIGNATURE` exactly
- [x] Task 2: Add `syncBranch` parameter and branch-awareness line (AC: #2, #6)
  - [x] Add optional `syncBranch?: string` param to `getAIReadyHeader()`
  - [x] Inject the 📍 branch line (as point 7) only when `syncBranch` is provided
  - [x] Update all call sites to pass the resolved branch:
    - [x] `src/services/github/sync-service.ts` — `syncAllRepoTasksOnce` + `syncPendingTasksOnce` resolve `repoSyncBranches[repoKey] ?? targetBranch ?? (already-fetched defaultBranch)` and pass it to the builders
    - [x] `buildFullFileContent()` — added `syncBranch?: string` param, passes through to `getAIReadyHeader()`
- [x] Task 2b (F1 review-blocker): `buildFileContent()` is a second header-emitting builder
  - [x] Added `syncBranch?: string` param to `buildFileContent()`; passes it to `getAIReadyHeader()` in Case 1 (new file) and Case 2 (headerless file)
  - [x] Threaded `syncBranch` into `commitTasks()` (per-task commit path) and the `SyncConflictSheet` preview builder + keep-local push
- [x] Task 3: Update tests in `src/features/sync/utils/markdown-templates.test.ts` (AC: #5)
  - [x] Replace old passive assertion strings with new directive header text; assert old phrasing is gone
  - [x] Add a new test case: `getAIReadyHeader('tholo91', 'gitty/tholo91')` contains the branch line
  - [x] Add a new test case: `getAIReadyHeader('tholo91')` (no branch) does NOT contain the branch line
  - [x] Add a new test case: fresh repo with no existing header — full template written incl. managed markers around an empty task list; `hasAIReadyHeader()` returns true on the output
  - [x] Add tests proving `buildFileContent` and `buildFullFileContent` emit the branch line when a branch is passed (covers F1)
  - [x] Run `npm test` — all pass (550/550)
- [ ] Task 4: Manual verification on a live repo (AC: #1–#3) — deferred to user (requires live GitHub repo + dev build; automated tests cover header generation paths)
  - [ ] Trigger a sync in dev, open the resulting captured-ideas file, confirm header renders correctly
  - [ ] Test against an existing repo with the old header — confirm Case 4 rewrites it

## Dev Notes

**New header body (verbatim — paste into the template):**

```
<!-- code-tasks:ai-ready-header -->
# Captured Ideas — {username}

> **Instructions for AI Agents (read this first, every session):**
>
> 1. This file is managed by [code-tasks](https://github.com/tholo91/code-tasks). Tasks between the `managed-start` and `managed-end` markers are auto-generated. Never edit them by hand.
> 2. **First action every session:** scan the managed block for unchecked items (`- [ ]`). Print them back to the user **grouped by priority** (🔴 Important first, then ⚪ Normal), with a one-line suggested approach per task. Then wait for direction — do not execute silently.
> 3. **Decide per task:**
>    - **Trivial** (≤ 30 min, clearly bounded, no design choices) → execute, mark `- [x]`, append `[Processed by: YourAgentName]` to the task line, and add a brief note in the task body describing the change.
>    - **Non-trivial** → propose turning it into a story or quick spec. Do not implement until the user confirms scope.
> 4. Tasks use markdown checkboxes (`- [ ]` / `- [x]`). Priority: 🔴 Important or ⚪ Normal.
> 5. Never delete or reorder tasks. Only the mobile app manages task lifecycle.
> 6. You may add notes or context **below** the `managed-end` marker — they will not be overwritten.

---

<!-- code-tasks:managed-start -->
```

When `syncBranch` is provided, insert it as **point 7** inside the blockquote, between point 6 and the `---` separator line:

```
> 7. 📍 This file is synced to branch `{branch}` in this repo. To get the latest captures from another branch, run: `git fetch && git show origin/{branch}:captured-ideas-{username}.md`.
```

When `syncBranch` is omitted, the `---` follows immediately after point 6. The `<!-- code-tasks:managed-start -->` marker always follows the `---` — do not remove or reorder these.

- `HEADER_SIGNATURE` constant stays `<!-- code-tasks:ai-ready-header -->` — do NOT change. This keeps `hasAIReadyHeader()` detection working and makes Case 4 (markers rewrite) handle migration on the next full sync of any existing repo.
- **First-sync diff noise:** every repo that already has a connected Gitty sync will get a one-time ~40-line header rewrite on the first sync after this story ships. This is expected and correct. The diff will look large in GitHub but contains no task content changes. Story 9-11's `[skip ci]` flag is already applied to all sync commits, so no deployments are triggered. Thomas should be aware of this before shipping to avoid confusion if he reviews the PR.
- **Cursor / Codex note for the branch line:** the `📍` branch line tells users to run `git fetch && git show origin/{branch}:captured-ideas-{username}.md` in a terminal. This is useful for terminal users and Claude Code users who can invoke Bash. For Cursor or Codex users running in an IDE without a terminal context, this line is informational only — they'll need to trust their local copy or wait for Story 9-16's `/captured-ideas` slash command (Claude Code) or a future `.cursorrules` equivalent. No code change needed for this — just a known limitation to document.
- The 📍 branch line is **only** added when `syncBranch` is passed. Older call sites that don't pass it produce identical output to the unbranched version (backward compatible).
- The branch resolution logic already exists in `sync-service.ts` around lines 365–436 (`ensureBranchExists`, `repoSyncBranches` lookup). Read the resolved branch *before* writing the file and pass it through.
- Out of scope: per-repo custom instructions (that's Story 8-7, still deferred). This story keeps the header global and uniform — only the branch line varies per repo.
- Out of scope: any actual git fetch / pull automation. This story only *informs* the agent. The companion slash command (Story 9-16) is the active executor that does the fetching.

### Relationship to Story 9-16

Story 9-15 (this one) and Story 9-16 (`/captured-ideas` slash command) are designed as a **pair** that closes the phone → AI-agent loop:

- **9-15 makes the file self-briefing**: once any AI agent reads it, the agent knows exactly what to do — list, prioritize, decide trivial vs. story, and act on user confirmation.
- **9-16 makes the file reachable**: the dev runs one slash command and the freshest version is fetched from whichever branch it lives on, with no manual `git fetch` / `git checkout` dance.

**Ship 9-15 first.** If 9-16 shipped before 9-15, devs would get fresh files with the old passive prompt and the briefing magic wouldn't land. With 9-15 in place, even devs who never install the slash command get a better experience because the header itself is now directive.

See: [9-16-captured-ideas-slash-command.md](9-16-captured-ideas-slash-command.md)

### Project Structure Notes

- All changes are co-located in `src/features/sync/utils/` (header + tests) plus `src/services/github/sync-service.ts` (call-site updates).
- No new files, no new exports, no new stores, no new components.
- Naming conventions are preserved (kebab-case files, camelCase exports).
- No UI changes — header is markdown content only.

### References

- `getAIReadyHeader()` location: `src/features/sync/utils/markdown-templates.ts`
- Test file location: `src/features/sync/utils/markdown-templates.test.ts`
- Sync service branch resolution: `src/services/github/sync-service.ts` (around lines 365–436, `ensureBranchExists` + `repoSyncBranches` lookup)
- Branch storage: `repoSyncBranches` in `src/stores/useSyncStore.ts`
- Prior header story (precedent for content-level header changes): `_bmad-output/implementation-artifacts/8-9-ai-agent-header-update.md`
- Companion story (composes with this): `_bmad-output/implementation-artifacts/9-16-captured-ideas-slash-command.md`
- Usability assessment that prompted this story: `/Users/thomas/.claude/plans/cosmic-moseying-ember.md` — Section F (Cursor / Claude Code / Codex adoption path)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (1M context)

### Debug Log References

- `npm test -- --run` → 47 files, 550 tests passed (baseline was 539; +11 new tests for this story).
- `npm run build` → succeeded (only pre-existing chunk-size + dynamic-import warnings; no errors).
- `npx eslint` on all four changed source/test files → clean.

### Completion Notes List

- **AC#1 / AC#3 (directive header):** `getAIReadyHeader()` rewritten to the verbatim 6-point directive body from Dev Notes. Passive "check for new open tasks" phrasing removed; a regression test asserts it is gone. `HEADER_SIGNATURE` unchanged (`<!-- code-tasks:ai-ready-header -->`), so `hasAIReadyHeader()` detection and the Case 4 markers-rewrite migration path are preserved (AC#4, no migration code).
- **AC#2 / AC#6 (branch awareness):** `getAIReadyHeader(username, syncBranch?)` inserts the 📍 line as **point 7** inside the blockquote between point 6 and the `---`. When `syncBranch` is omitted, output is byte-identical to the unbranched version (backward compatible; the "no branch" unit test passes).
- **F1 (second header-emitting builder):** `buildFileContent()` also emits the header (Case 1 new file, Case 2 headerless file). Added `syncBranch?: string` to `buildFileContent()` and `buildFullFileContent()`, threaded through every header-emitting path. Cases 3/4 of `buildFileContent` reuse the existing file's `before` content and do not call `getAIReadyHeader()`, so nothing to thread there — the directive-header migration for existing repos happens on the next full-file rebuild (`buildFullFileContent`).
- **Call sites made branch-aware (F1):** `sync-service.ts` → `syncAllRepoTasksOnce` (`buildFullFileContent`), `syncPendingTasksOnce` → `commitTasks` → `buildFileContent`; `SyncConflictSheet.tsx` → local-preview `buildFileContent` (both try + catch fallback) and the keep-local `syncPendingTasks({ branch })` push (already passed the override; sync-service now resolves it into the header).
- **F2 (branch resolution + latency, LOCKED):** Both sync paths resolve `syncBranch = repoSyncBranches[repoKey] ?? options.branch ?? defaultBranch`, where `defaultBranch` is **only** used when it was already fetched for the fallback-branch path (`options.branch` set). There is NO stored default branch in `RepoSyncMeta`/`SelectedRepo`, and we add **no new GitHub round-trip** to learn it. Consequence: on the common no-override → main sync, `syncBranch` is `undefined` and the header omits the 📍 line — this is the LOCKED choice to avoid a sync-latency regression. The branch line appears whenever a per-repo override is set (the gitty branch is now the recommended default per qs-sync-data-loss-and-defaults) or when pushing to an explicit fallback branch.
- **Task 4 (manual live-repo verification):** deferred to the user — requires a live GitHub repo and a dev build. Automated tests fully cover the header-generation paths (branch / no-branch / fresh repo / both builders).

### File List

- `src/features/sync/utils/markdown-templates.ts` (modified — directive header rewrite, `syncBranch` param on `getAIReadyHeader`, `buildFullFileContent`, `buildFileContent`)
- `src/services/github/sync-service.ts` (modified — branch resolution in both sync paths; `syncBranch` threaded into `buildFullFileContent` and `commitTasks` → `buildFileContent`)
- `src/features/sync/components/SyncConflictSheet.tsx` (modified — branch-aware local-content preview builder)
- `src/features/sync/utils/markdown-templates.test.ts` (modified — updated assertions to directive text + 11 new tests covering branch line, fresh repo, both builders)
- `_bmad-output/implementation-artifacts/9-15-active-ai-briefing-header.md` (modified — Tasks, Dev Agent Record, Status)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story 9-15 status)
