# Mobile → Desktop AI Connection — Findings & Ideas

> Collected: 2026-06-11  
> Scope: How Gitty-captured ideas from the mobile app reach an AI agent on the developer's desktop (Claude Code, Cursor, VS Code, Codex).

---

## 1. The Core Loop (what we're closing)

```
📱 Mobile (Gitty app)
   → captures idea, sets priority 🔴 / ⚪
   → pushes to GitHub (captured-ideas-{username}.md)

🖥️ Desktop (AI agent session — Claude Code / Cursor / Codex)
   → agent reads file
   → lists open tasks, proposes approach
   → executes trivial ones, proposes stories for the rest
```

**The problem:** every step in that loop has historically been manual or passive. The file existed, but nothing told the agent to look at it, how to read it, or how to fetch the freshest version. That's what 9-15 + 9-16 + the CLAUDE.md integration fix.

---

## 2. Delivery Mechanisms — What's Shipped or Planned

### 2A. Self-briefing header (Story 9-15)

- `getAIReadyHeader()` is rewritten from passive ("check for new tasks") to **directive** — 6-point numbered instructions, active imperative voice.
- New point 7 (optional): `📍 This file is synced to branch \`{branch}\`...` — tells the agent exactly where to fetch from.
- **Trigger:** fires on every sync. Every connected repo gets a one-time ~50-line header rewrite on the first post-ship sync.
- **Coverage:** any AI agent that reads the file benefits — no install step needed.
- **Limitation:** agent must *find* the file first. The header only helps after the file is open.

### 2B. `/captured-ideas` slash command (Story 9-16)

- Shipped as `.claude/commands/captured-ideas.md` inside the code-tasks repo.
- **What it does:** `git fetch --all`, scans `origin/main` + `origin/gitty/*` branches, picks freshest version per user, parses unchecked tasks between managed markers, prints grouped by 🔴 / ⚪ with one-line AI-suggested approach per task.
- **Token guard:** >10 unchecked items → suggests only the first 5, appends "… and N more".
- **Coverage:** Claude Code only (native slash command). Cursor / Codex users need a manual workaround (see section 4).
- **Multi-user support:** lists all `captured-ideas-*.md` users found; prompts disambiguation before proceeding.

### 2C. CLAUDE.md auto-injection (Tech-spec: `claude-md-integration`)

- After first successful sync with a newly linked repo, Gitty shows a dismissible in-app banner: "Enable AI agent integration?"
- If accepted: checks if `CLAUDE.md` exists → appends Task Discovery section (or creates minimal `CLAUDE.md`). Uses signature `<!-- code-tasks:task-discovery -->` to prevent double-injection.
- **Purpose:** bridges the gap for devs who never manually add the file reference. Ensures the first Claude Code session in any freshly cloned repo surfaces the captured-ideas file automatically.
- **Status:** tech-spec written (2026-03-23), not yet a story / not in sprint.

---

## 3. Agent Behavior Contract (what the header instructs)

Established in Story 9-15. Every AI agent reading `captured-ideas-{username}.md` is now told to:

1. Never edit tasks between `managed-start` / `managed-end` markers.
2. **First action every session:** scan managed block for unchecked `- [ ]` items. Print back grouped by priority (🔴 first), one-line approach per item. Then wait — do not silently execute.
3. **Trivial** (≤ 30 min, clearly bounded, no design choices) → execute, mark `- [x]`, append `[Processed by: AgentName]`, add brief note in task body.
4. **Non-trivial** → propose a story or quick spec. Do not implement until user confirms scope. When in doubt, treat as non-trivial.
5. Never delete or reorder tasks. Only the mobile app manages task lifecycle.
6. May add notes/context below `managed-end` — will not be overwritten.
7. *(when branch is known)* `📍 This file is synced to branch \`{branch}\`...` — run `git fetch && git show origin/{branch}:captured-ideas-{username}.md` to get latest.

---

## 4. Cursor / VS Code / Codex — Known Gaps & Workarounds

| Tool | Gap | Current workaround |
|---|---|---|
| **Cursor** | No slash command support | Copy `.cursorrules` snippet from README (manual) |
| **VS Code** | No slash command | `.vscode/tasks.json` alias is a future idea; manual `git show` for now |
| **Codex** | No native file-reading hook | Point it at the raw GitHub URL via `AGENTS.md` (future story) |
| **Claude Code** | ✅ Full support via `/captured-ideas` + CLAUDE.md | — |

**`.cursorrules` snippet (copy-paste block for README):**  
`git fetch && git show origin/$(git remote show origin | grep 'HEAD branch' | cut -d: -f2 | xargs):captured-ideas-*.md`  
**Important:** use `captured-ideas-*.md` glob — `$USER` is the OS username, not the GitHub username, and silently finds nothing.

**Future ideas for Cursor parity:**
- Ship a `.cursorrules` file alongside the slash command that gives Cursor the same session-start behavior (could be Task 4 of 9-16 README section).
- A future `AGENTS.md` convention (Codex) referencing the captured-ideas path and the trivial/non-trivial decision rules.

---

## 5. Branch Strategy — How Files Are Located

Gitty uses a two-branch model:

| Branch | Purpose |
|---|---|
| `main` (default) | Standard sync target when no override is set |
| `gitty/{username}` | Fallback branch when main is protected or multi-user |

- `repoSyncBranches[repoKey]` in `useSyncStore` stores the active branch override per repo.
- The slash command must union files across **all** `origin/gitty/*` branches + `origin/main` before grouping by `{username}`. Branch selection (pick freshest by commit timestamp) happens *after* the user is determined.
- The branch-awareness line in the header tells agents which branch holds the authoritative copy.

---

## 6. Technical Findings — From Code Review (2026-06-11)

These were flagged during Phase 1 review of stories 9-15 and 9-16 before implementation. Status: pending Thomas's approval.

### F1 — Missing call site in `buildFileContent` (BLOCKER · 9-15)

[markdown-templates.ts:262+278](../src/features/sync/utils/markdown-templates.ts#L262) — `buildFileContent()` calls `getAIReadyHeader()` in Cases 1 (new file) and 2 (headerless file), but Story 9-15's Task 2 only enumerates `buildFullFileContent` + `sync-service.ts`. The conflict-resolution path (`SyncConflictSheet.tsx:59,61`) and the per-task commit path (`sync-service.ts:129`) will silently emit headerless branch lines.

**Fix:** add `syncBranch?: string` to `buildFileContent()` signature too, thread through.

### F2 — Branch fallback semantics contradictory in AC#2 (BLOCKER · 9-15)

AC#2 says "defaults to repo default branch when no fallback set" — but Task 2 + Dev Notes say "inject only when `syncBranch` is provided / behavior unchanged when omitted." These are two different behaviors.

**Recommended resolution:** sync-service always resolves the branch (fallback to `defaultBranch` if no override) and always passes it to `getAIReadyHeader`. Template optionality kept so unit tests for "no branch" case still hold.

### F3 — Multi-user file discovery underspecified (BLOCKER · 9-16)

Task 2 Step 2 only scans `main` + `gitty/*` branches, but a user whose file lives only on `gitty/{otheruser}` branch is missed in the disambiguation list. Dev Notes describe the correct union-by-filename approach but the Tasks block doesn't operationalize it.

**Fix:** explicit step: "union filenames across all candidate branches first, then group by `{username}` portion."

### F4 — `.cursorrules` snippet in Task 4 is broken (BLOCKER · 9-16)

Line 53 uses `git symbolic-ref --short refs/remotes/origin/HEAD` which returns `origin/main` — but then pipes to `sed 's|origin/||'` which is wrong for `--short`. The Dev Notes (line 66) use a different command entirely (`git remote show origin`). Devs copying either will get silent failures on fresh clones.

**Fix:** pick one verified command, test locally, document once.

### F5 — First-sync diff noise slightly understated (NICE-TO-HAVE · 9-15)

Dev Note says "~40-line header rewrite." With the 7-point list + branch line the actual diff is closer to 50+ lines. This PR's own `captured-ideas-tholo91.md` in this repo will be rewritten on the first post-merge sync — Thomas should expect it.

### F6 — AC#1 conditional CLAUDE.md edit creates undefined dependency (NITPICK · 9-16)

"If `qs-claude-md-integration` has shipped" leaves the story's CLAUDE.md edit step as a conditional. Recommend dropping the condition and treating the CLAUDE.md update as in-scope (it's a one-line addition) or explicitly marking it out-of-scope. Keeps 9-16 self-contained.

### F7 — fetch-failure detection underspecified in AC#8 (NICE-TO-HAVE · 9-16)

`git fetch --all --quiet` swallows output. The warning path in AC#8 needs explicit detection: capture non-zero exit code from the Bash tool invocation. Otherwise the warning never fires.

---

## 7. Deferred / Future Ideas

| Idea | Notes | Candidate story |
|---|---|---|
| `.cursorrules` file shipped with repo | Gives Cursor the same session-start behavior as the slash command | 9-17 or README-only first |
| `AGENTS.md` for Codex | Standard convention for pointing Codex at captured-ideas | Future epic |
| Per-repo custom instructions in header | Header today is global; per-repo context would go here | Story 8-7 (deferred) |
| Auto-distribution of `/captured-ideas` to managed repos | Today it's a manual file copy; Gitty could push it on connect | Future story |
| Settings toggle to re-trigger CLAUDE.md prompt | If user dismissed the banner and wants to opt in later | Future small feature |
| Shell alias / `npm run captures` | Non-IDE workaround for teams not using Claude Code / Cursor | Very low-effort README addition |

---

## 8. Story Map

```
Story 9-15 (ship first)
  └─ Rewrites getAIReadyHeader() → directive + branch-awareness line
  └─ Blocks: all downstream value because header is what agents read first

Story 9-16 (ship second)
  └─ /captured-ideas slash command
  └─ Composes with 9-15: fetches fresh file, which now self-briefs the agent

Tech-spec: claude-md-integration (not yet a story)
  └─ In-app banner → auto-injects CLAUDE.md Task Discovery section
  └─ Bridges the "agent doesn't know to look" gap for new repo connections

Future: .cursorrules / AGENTS.md parity
  └─ Closes Cursor + Codex gap without requiring Claude Code
```

---

*File owned by: Thomas Lorenz / Gitty project. Update as new findings land.*
