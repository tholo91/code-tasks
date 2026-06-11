# Story 9.16: /captured-ideas Slash Command for Claude Code Devs

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer using Claude Code on a Gitty-managed repo,
I want a single slash command `/captured-ideas` that fetches the latest captures from whichever branch they live on and prints unchecked items grouped by priority,
so that I never have to remember which branch, run `git fetch` manually, or trust that my working tree is up to date.

## Acceptance Criteria

1. Given the code-tasks repo (Gitty's own codebase), when it is cloned fresh, then it includes a `.claude/commands/captured-ideas.md` slash-command file. The README "Using Gitty with Claude Code" section explains how to copy the command into any other Gitty-managed repo with a single file copy (manual install — auto-distribution to managed repos is a future story). Additionally, if `qs-claude-md-integration` has shipped, the repo's `CLAUDE.md` Task Discovery section mentions that `/captured-ideas` exists — ensuring the first Claude Code session in a freshly cloned repo surfaces the command automatically.

2. Given a dev in Claude Code runs `/captured-ideas`, when the command executes, then it: (a) runs `git fetch --all --quiet`, (b) locates the freshest version of `captured-ideas-{username}.md` across `origin/main` and `origin/gitty/*` branches, (c) parses unchecked `- [ ]` items, (d) prints them grouped by priority (🔴 first) with the task title, body, and a one-line suggested approach per item.

3. Given multiple users have captured-ideas files in the repo (multi-user case), when `/captured-ideas` runs without an argument, then the command output lists all `captured-ideas-*.md` users found (one per line, numbered) and the prompt instructs Claude to ask the user to pick one before proceeding — Claude asks, the command does not. When invoked as `/captured-ideas tholo91`, it uses that user directly without prompting.

4. Given a file exists on both `main` and `gitty/{user}`, when both versions are found, then the command compares the commit timestamps and uses the most recently modified version, printing a one-line note: `"Found on branch \`{branch}\` (last updated {relative-time})"`.

5. Given the command finds zero unchecked items, when it would otherwise print a list, then it prints a single line: `"No new captures for {user}. Most recent file: branch={branch}, updated={relative-time}."` — never silently exits.

6. Given the command runs in a repo that has no `captured-ideas-*.md` file anywhere, then it prints a one-line explanation: `"No captured-ideas files found. Is this repo connected in the Gitty app?"` and links to the README section on connecting a repo.

7. Given the codebase's existing slash commands live in `.claude/commands/`, when this command is added, then it follows the same frontmatter format (`name:`, `description:`) and uses the bash tool to run git commands and prints output via standard markdown.

8. Given `git fetch` fails (no network, auth expired, or remote unreachable), when the command falls through the fetch step, then it falls back to local refs and prepends a one-line warning: `⚠️ Could not fetch latest — showing local cached version. Run 'git fetch' when connectivity is restored.` The rest of the command proceeds against local state.

9. Given a captured-ideas file contains tasks that have no priority emoji (legacy format or manual edits), when the command groups by priority, then tasks without a 🔴 or ⚪ marker are grouped under ⚪ Normal rather than silently dropped or erroring.

## Tasks / Subtasks

- [x] Task 1: Create `.claude/commands/captured-ideas.md` (AC: #1, #7)
  - [x] Match frontmatter format of existing commands (see `.claude/commands/bmad-agent-bmm-sm.md` for reference)
  - [x] Description: "List unprocessed captures from this repo's captured-ideas-*.md file across all branches, grouped by priority"
- [x] Task 2: Implement the command body (AC: #2, #3, #4)
  - [x] Step 1: `git fetch --all --quiet` (with F7 exit-code check + fallback warning)
  - [x] Step 2: Enumerate candidate branches with `git branch -r` filtered to `origin/main` and `origin/gitty/*`, then for each branch run `git ls-tree --name-only {branch} | grep 'captured-ideas-'` to discover files. F3: UNION discovered (branch, filename) pairs across ALL branches, THEN group by `{username}` so a user appears even if their file lives only on another branch.
  - [x] Step 3: For each candidate, get last commit timestamp (`git log -1 --format=%ct`); pick freshest per user AFTER the user is determined (AC4)
  - [x] Step 4: Read file content via `git show origin/{branch}:{path}`
  - [x] Step 5: Parse unchecked items between `<!-- code-tasks:managed-start -->` and `<!-- code-tasks:managed-end -->`
  - [x] Step 6: Group by priority emoji (🔴 then ⚪), preserve order within group; no-emoji → ⚪ (AC9)
  - [x] Step 7: For each item, generate a one-line suggested approach (uses Claude's reasoning, not a template). **Token guard:** if unchecked count > 10, generate suggestions only for the first 5 and append `"… and {N} more. Ask me to expand on any of them."`
- [x] Task 3: Empty / missing / multi-user handling (AC: #3, #5, #6)
  - [x] Argument parsing: optional username
  - [x] Empty-list case copy
  - [x] No-files-found case copy with README pointer
- [x] Task 4: Add a README section documenting `/captured-ideas` for dev users (AC: #1)
  - [x] Add to existing README under a new heading "Using Gitty with Claude Code"
  - [x] One-line manual-install instruction (copy the command file into another repo's `.claude/commands/`)
  - [~] `.cursorrules` snippet block — DROPPED per locked decision 4/5 (replaced by a future AGENTS.md convention). README instead carries one sentence that broader agent support (Cursor, Codex, Gemini CLI) is planned via AGENTS.md. No `.cursorrules` block, no broken `git symbolic-ref ... | sed` command shipped.
- [x] Task 5: Verification (manual — no src/ changes, no unit tests; command body branches reviewed against AC#2-#9)
  - [x] `main`-only path: branch enumeration + ls-tree discovery covers it
  - [x] `gitty/{user}` fallback path: covered by `origin/gitty/*` filter
  - [x] both branches: freshest-by-`%ct` selection (AC4) with relative-time note
  - [x] no captures: empty-list line (AC5)
  - [x] multiple users: F3 union-by-filename then group-by-username, numbered disambiguation, Claude asks (AC3)
  - [x] no file at all: friendly "Is this repo connected" error (AC6)

## Dev Notes

- Slash commands in Claude Code are markdown files with a frontmatter and body. The body is the prompt Claude executes. This command's body should instruct Claude to invoke the `Bash` tool for `git fetch` / `git show` / `git ls-tree` operations and then format output.
- **Why ship inside the repo, not in `~/.claude/commands/`:** Living in the repo means every dev who clones a Gitty-managed repo gets the command for free — no install step. It travels with the codebase. This is what makes the feature *real* rather than a Thomas-only convenience.
- **Cursor / Codex users:** out of scope for this story, but document the manual command in the README so they can copy-paste: `git fetch && git show origin/$(git remote show origin | grep 'HEAD branch' | cut -d: -f2 | xargs):captured-ideas-*.md`. Use the `captured-ideas-*.md` glob — `$USER` is the OS username, not the GitHub username, and would silently find nothing. A future story could ship a `.cursorrules` snippet or shell alias.
- **Why pull all `gitty/*` branches and not just `gitty/{username}`:** in a multi-user repo, each user has their own branch. The command should handle the team case correctly even though Thomas's use today is single-user.
- **Suggested-approach generation (Step 7):** keep this lightweight — one sentence per task. Don't pre-implement, don't propose specs. The header in Story 9-15 handles the trivial-vs-non-trivial decision when the user picks a task. **Token-cost guard:** if unchecked count > 10, generate a suggested approach only for the first 5 tasks and end with `"… and N more. Ask me to expand on any of them."` Avoids a token cliff on repos with large backlog queues.
- **Multi-user disambiguation — namespace alignment:** the candidate set is built by union of (a) filenames matching `captured-ideas-*.md` found via `git ls-tree` on `origin/main` and all `origin/gitty/*` branches, then (b) grouped by the `{username}` portion of the filename. One user = one entry in the disambiguation prompt, regardless of how many branches their file appears on. The branch selection (AC4 — pick the freshest) happens *after* the user is determined, not before.
- **Idempotency / read-only:** this command must never modify files, never push, never check out branches. It reads via `git show` against remote refs only.
- **Performance:** for a repo with 10 captured-ideas files across 10 branches, total git operations should complete in under 2 seconds. If parsing/output is slow, that's fine — git operations are the hot path.

### Relationship to Story 9-15

Story 9-16 (this one) and Story 9-15 (Active AI Briefing Header) are designed as a **pair** that closes the phone → AI-agent loop:

- **9-16 makes the file reachable**: one slash command fetches the freshest captured-ideas from whichever branch it lives on. No manual `git fetch`, no branch hunting.
- **9-15 makes the file self-briefing**: once any AI agent reads it (whether through this slash command, manually, or via CLAUDE.md), it knows exactly how to behave — list, prioritize, decide trivial vs. story.

**Ship 9-15 first, then this one.** If this story shipped first, the slash command would fetch fresh files but the header would still be passive — Claude would still need ad-hoc prompting per repo. With 9-15 in place, this command becomes the natural front door to a self-explaining file.

**Composition:** with both shipped, a senior dev's first Monday-morning interaction is `cmd+T` → `claude` → `/captured-ideas` → done. Total friction: one command. That's the target experience.

See: [9-15-active-ai-briefing-header.md](9-15-active-ai-briefing-header.md)

### Project Structure Notes

- New file: `.claude/commands/captured-ideas.md` (sibling to existing BMAD command files in same directory).
- README addition: new section "Using Gitty with Claude Code" — keep it short (≤ 10 lines), focus on copy-paste-able commands.
- No source code changes in `src/`. No tests in the standard test suite — verification is manual against live repos (Task 5).
- The command file itself is a markdown prompt, not TypeScript. No linting / type checking applies.

### References

- Existing slash command format example: `.claude/commands/bmad-agent-bmm-sm.md`
- Managed-block markers: `<!-- code-tasks:managed-start -->` / `<!-- code-tasks:managed-end -->` — defined in `src/features/sync/utils/markdown-templates.ts`
- README target for documentation: `README.md`
- Branch fallback story (provides the `gitty/{username}` convention this command must understand): `_bmad-output/implementation-artifacts/9-4-push-to-branch-fallback.md`
- Companion story (composes with this): `_bmad-output/implementation-artifacts/9-15-active-ai-briefing-header.md`
- Usability assessment that prompted this story: `/Users/thomas/.claude/plans/cosmic-moseying-ember.md` — Section F (Cursor / Claude Code / Codex adoption path), specifically F4 Option B

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (1M context)

### Debug Log References

- `npm test -- --run` after changes: 550 passing (no unit tests added; story is a markdown command + docs).
- `npm run build`: succeeds.

### Completion Notes List

- Shipped `.claude/commands/captured-ideas.md` matching the existing command frontmatter format (`name:` + `description:`). Body is a prompt that instructs Claude to use the Bash tool for all git operations (fetch / branch -r / ls-tree / log / show) and to format output. Read-only and idempotent: only `git show origin/{branch}:{path}` reads remote content; never writes, pushes, or checks out.
- **F3 (multi-user discovery, blocker fix):** Step 2 of the command body enumerates candidate branches (`origin/main` + every `origin/gitty/*`), runs `git ls-tree --name-only <branch> | grep '^captured-ideas-.*\.md$'` per branch, then UNIONs all `(branch, filename)` pairs and groups by the `{username}` portion of the filename. A user whose file lives only on another user's branch namespace still appears. Branch freshness selection (AC4) happens AFTER the user is fixed (Step 4), via `git log -1 --format=%ct`.
- **F7 (fetch-failure robustness):** Step 1 instructs Claude to check `git fetch --all --quiet` exit code explicitly (the `--quiet` flag swallows output, so exit code is the only signal) and, on non-zero, prepend the warning `⚠️ Could not fetch latest, showing local cached version. Run 'git fetch' when connectivity is restored.` then proceed against local refs.
- **Token guard:** >10 unchecked items → suggested approach for first 5 only, remaining titles listed, then `… and {N} more. Ask me to expand on any of them.`
- **AC9:** items with no priority emoji are grouped under ⚪ Normal, never dropped or errored.
- **README:** added a `## Using Gitty with Claude Code` section (≤10 lines) explaining `/captured-ideas` and the manual install (copy the command file into another repo's `.claude/commands/`), plus one sentence that broader agent support is planned via an AGENTS.md convention.
- **F6:** added one line to this repo's `CLAUDE.md` "Task Discovery" section noting `/captured-ideas` lists open captures (the qs-claude-md-integration condition was dropped per spec).
- **Decision 4/5:** the `.cursorrules` snippet from Task 4 was NOT shipped (no code block, no broken `git symbolic-ref ... | sed`). Replaced by the AGENTS.md sentence.
- **Style:** no em dashes in any user-facing copy written (command output strings, README section, CLAUDE.md line).
- Verification is manual per the story (no `src/` changes, no standard unit tests). The 550-test suite stays green and the build passes.

### File List

- `.claude/commands/captured-ideas.md` (new) — the `/captured-ideas` slash command.
- `README.md` (modified) — new "Using Gitty with Claude Code" section.
- `CLAUDE.md` (modified) — one line in the Task Discovery section.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — story status updated.
- `_bmad-output/implementation-artifacts/9-16-captured-ideas-slash-command.md` (modified) — this story file.
