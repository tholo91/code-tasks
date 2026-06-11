# Mobile → Desktop Connection: Findings & Ideas

> **What this document is:** A living synthesis of all findings, stories, and strategic questions around how Gitty (mobile) connects with AI coding agents on desktop — Claude Code, Cursor, VSCode, Codex, Gemini CLI.
> Last updated: 2026-06-11

---

## 1. The Core Loop We're Solving

```
Phone (Gitty app)
  └── captures idea / task
        └── syncs to GitHub as markdown → captured-ideas-{username}.md
              └── AI agent on desktop reads the file
                    └── acts on tasks
                          └── commits, checks off tasks
                                └── phone syncs back → loop complete
```

**The gap today:** every step in this loop except the phone-to-GitHub sync has friction. AI agents don't know:
- Which file to look at
- Which branch has the freshest version
- How to behave when they open it
- Whether the task is trivial or needs a story
- Whether they're allowed to just act, or must ask first

---

## 2. Current Friction Points (observed, not assumed)

### A. The stale-file problem
AI agents read the markdown from wherever their IDE loaded the repo — which may be `main` while the actual file lives on `gitty/{username}`. No fetch, no awareness, silent stale data.

### B. The passive-header problem
Current `captured-ideas.md` header says *"check for new tasks"* — passive. Agents need per-session prompting to actually list and act. Without prompting, the file sits unread.

### C. The trivial-vs-story judgment gap
No agent knows when it should just do the thing vs. when it should stop and propose a story. Result: agents either overclaim (do too much, surprise Thomas) or underclaim (ask for approval on 5-minute fixes).

### D. The branch confusion problem
After Story 9-11 (branch strategy), Gitty can push to `gitty/{username}` instead of `main`. But the AI agent on desktop has no idea. It runs on main, the file is on a different branch, nothing is fresh.

### E. The Cursor / Codex exclusion problem
The `/captured-ideas` slash command (Story 9-16) only works in Claude Code. Cursor users, Codex users, Gemini CLI users — nothing. They either run raw git commands or miss the feature entirely.

### F. The context-handoff problem
When a desktop AI agent finishes a session, there's no structured handoff back to the phone. No "here's what I did, here's what's still open." The phone has the final state (via sync), but the session context is lost.

---

## 3. Solutions In Flight

### 3A. Story 9-15 — Active AI Briefing Header
**Status:** `draft`, ready-for-dev  
**File:** `_bmad-output/implementation-artifacts/9-15-active-ai-briefing-header.md`

**What it does:** Rewrites `getAIReadyHeader()` to be directive instead of passive.

The new header:
- Tells every AI agent to scan unchecked items at session start and print them grouped by priority (🔴 first)
- Gives the trivial/non-trivial decision rule (≤30 min, bounded, no design → act; else → propose story)
- Adds a branch-awareness line: "This file is on branch `{branch}` — here's how to fetch it"
- Is backwards-compatible — existing repos get the rewrite automatically on next sync

**Why it matters:** With 9-15, any AI agent (Claude Code, Cursor, Codex) that reads the file gets directive behavior for free — no special tooling needed. It's the universal baseline.

---

### 3B. Story 9-16 — /captured-ideas Slash Command
**Status:** `draft`, ready-for-dev  
**File:** `_bmad-output/implementation-artifacts/9-16-captured-ideas-slash-command.md`

**What it does:** Ships `.claude/commands/captured-ideas.md` inside every Gitty-managed repo.

The command:
- Runs `git fetch --all` automatically
- Finds the freshest `captured-ideas-{username}.md` across `origin/main` and all `origin/gitty/*` branches
- Prints unchecked tasks grouped by priority with a one-line suggested approach per task
- Handles multi-user repos, empty state, missing files, and network failure gracefully

**Why it matters:** Zero friction for Claude Code users. Monday morning: `cmd+T` → `claude` → `/captured-ideas` → done. The file is always fresh because the command fetches before reading.

**Limitation:** Claude Code only. Cursor / Codex users need a workaround (see section 4C).

---

### 3C. Quick Spec — qs-claude-md-integration
**Status:** `ready-for-dev`

Auto-injects the Task Discovery section into the repo's `CLAUDE.md` on first sync. This is the discoverability layer — a dev who has never heard of Gitty but clones a Gitty-managed repo will see the connection instructions in the first Claude Code session.

**9-16 should reference this** — when both are shipped, the CLAUDE.md injection mentions `/captured-ideas` exists.

---

## 4. Expansion Paths Not Yet Solved

### 4A. Cursor Users
**The gap:** Cursor has `.cursorrules` but no slash commands in the same sense as Claude Code.

**Best available option:** a `.cursorrules` code block in the README (ships with Story 9-16, Task 4) that gives Cursor users a copy-pasteable session-start rule:

```
# .cursorrules snippet for Gitty users
At the start of every session, run:
  git fetch --all --quiet && git show origin/$(git remote show origin | grep 'HEAD branch' | cut -d: -f2 | xargs):captured-ideas-*.md
Then list unchecked items grouped by priority. Wait for user direction before acting.
```

**Longer-term:** a proper `.cursorrules` file shipped inside Gitty-managed repos (similar to how `.claude/commands/` travels with the repo). Not scoped to any story yet.

---

### 4B. VSCode Users
**The gap:** No native equivalent of `/captured-ideas` in VSCode's Copilot or Continue.dev workflows.

**Potential path:** a VSCode task (`.vscode/tasks.json`) that runs the same `git fetch + git show` command and outputs to the terminal. Cheap to implement, no IDE-deep integration required.

**Status:** Not scoped. Backlog idea.

---

### 4C. Gemini CLI Users
**The gap:** Gemini CLI reads context from stdin or a context file. Could be scripted as:
```bash
git fetch --quiet && git show origin/{branch}:captured-ideas-{user}.md | gemini-cli "Brief me on unchecked tasks"
```

**Status:** Not scoped. Worth a dev note in Story 9-16's README section.

---

### 4D. The "Context Handoff Back to Phone" Problem
**The gap:** When the AI agent finishes a session, the phone gets back the file (sync), but not the agent's session narrative. No "I did X, Y is still open, Z was blocked because..."

**Ideas explored:**
- Agent appends a dated session note below the `managed-end` marker (in-file, survives sync)
- Agent creates a separate `session-log-{date}.md` file in the repo (visible in GitHub, not in Gitty UI)
- Gitty surfaces "last agent session" in the repo header (requires parsing)

**Status:** Unscoped. Strong candidate for a future story or quick spec once 9-15 + 9-16 ship and the baseline loop is validated.

---

### 4E. Multi-Agent Coordination
**The gap:** If Thomas runs Claude Code AND Cursor on the same repo in the same day, both agents may write to the same markdown file. Gitty's additive merge (Story 8-12, 9-14) handles the markdown-level conflicts, but the agents have no awareness of each other.

**Ideas explored:**
- Agent locks (a `captured-ideas-{username}.lock` file committed before session start, deleted after)
- Agent-scoped task namespacing (`@claude:`, `@cursor:` prefixes)
- Session handoff file (structured JSON in the repo, agent reads before writing)

**Status:** Speculative. No story yet. Would benefit from the research in Story 12-1 — this is one of the hypotheses worth testing.

---

## 5. Strategic Questions (from Story 12-1 research plan)

These aren't answered yet — they're what the research conversations should surface.

| Question | Stakes | Current lean |
|---|---|---|
| Is Gitty a task manager or a Git companion? | Product direction for next major epic | Leaning toward Git companion |
| Should sync confidence be more visible? | Feature scope for desktop integration | Yes, but how? |
| Which desktop tool is the priority? Claude Code / Cursor / Codex? | Feature prioritization for expansions above | Claude Code (Thomas's stack), then Cursor (market share) |
| Should agents know deployment state? | Whether to build deployment-visibility layer | Unknown — needs user data |
| Should Gitty have a CLI? | Whether to ship a `gitty` command for terminal users | Interesting — unvalidated |
| Where does Gitty draw the automation line? | Which actions require human confirmation | Core trust question |

**See Story 12-1 for the research plan** (`_bmad-output/implementation-artifacts/12-1-ai-native-developer-research-plan.md`). These questions map to the 3 falsifiable hypotheses that plan will define.

---

## 6. Product Direction Options (not decided)

From the AI-native developer research prompt, these are the 7 candidate directions for what Gitty could become. They're not mutually exclusive but they require different roadmaps:

| Direction | What it means | Stories that point this way |
|---|---|---|
| **Task manager** | Better capture, better UI, richer task metadata | Epic 7, Epic 8, Epic 10 |
| **Git companion** | Branch awareness, sync confidence, deployment state | 9-11, 9-15 branch line |
| **AI orchestration layer** | Gitty coordinates which agent works on which task | 9-15, 9-16, future multi-agent |
| **Deployment confidence system** | Shows "is this deployed? is it safe to merge?" | 9-11 (partial), unscoped |
| **Async AI task coordination** | Structured handoff between human and agent sessions | 4D above, unscoped |
| **GitHub-native memory layer** | Gitty = persistent context store for AI agents | 8-7, qs-claude-md, unscoped |
| **AI coding companion** | Active assistant, not passive task list | 9-15 header (directiveness) |

**Current trajectory:** Gitty is drifting toward **AI orchestration layer** + **GitHub-native memory layer**. Stories 9-15 and 9-16 accelerate that drift. Whether that's intentional is a question for the research conversations.

---

## 7. Immediate Next Actions

| Priority | Action | Story / Owner |
|---|---|---|
| 1 | Implement Story 9-15 (directive header) | dev story in new branch |
| 2 | Implement Story 9-16 (slash command) | dev story after 9-15 PR |
| 3 | Write the research plan doc | Story 12-1 deliverable |
| 4 | Send 5 DMs to AI-native devs | Thomas, this week |
| 5 | Write research/ai-native-devs-plan-v1.md | Story 12-1 tasks |
| 6 | Scope Cursor / VSCode expansion | After 9-15 + 9-16 shipped |
| 7 | Revisit "context handoff back to phone" | After 5 user conversations |

---

## 8. Open Questions for Future Sessions

- Should the branch-awareness line in 9-15 also show the *last commit timestamp* on that branch, not just the branch name? ("Last update: 3 hours ago" vs just `gitty/tholo91`)
- Should `/captured-ideas` also show *recently completed* tasks (last 24h)? Useful to see what the agent did yesterday without opening GitHub.
- Is there a lightweight way to show deployment state in the header? Even just "last push to main: 2h ago" would reduce the "is this deployed?" anxiety.
- Should Gitty write a `session-start.md` or `context.md` file to the repo that AI agents use as a briefing doc in addition to `captured-ideas`? Less about tasks, more about repo context (what's in progress, what's blocked, what the AI should know about the codebase state).
- Multi-agent locking — when is this actually a real problem vs. a theoretical one? Ask in user conversations.

---

## 9. DECISIONS — 2026-06-11 (Thomas, after full product/code review)

These are locked. Execution order:

1. **Bug fixes FIRST** (before 9-15/9-16) — one quick spec, data-loss fixes:
   - P1: task title containing `**` truncates on parse round-trip (`markdown-templates.ts:162`) — escape/strip at serialize time
   - P2: multiline task body drops everything after first newline (`markdown-templates.ts:106` + `:178`) — prefix continuation lines with 2 spaces, mirror in parser
   - P2: dismissing SyncImportBanner never sets `lastSyncedSha`, so the next sync bypasses the conflict gate (`sync-service.ts:378`) and silently overwrites remote — record fetched SHA on Dismiss
   - P2: branch syncs skip the conflict check entirely (`sync-service.ts:377` "append-only" assumption) — must hold once agents write check-offs back; re-import remote state before branch pushes or enable the SHA gate
2. **Flip defaults:** `[skip ci]` ON by default (`useSyncStore.ts:177`); `gitty/{username}` branch recommended (not forced) in repo-connect flow. Toggles stay.
3. **Story 9-15** (directive header) — include review blockers F1/F2 (see mobile-to-desktop-ai-connection.md section 6).
4. **Story 9-16** (/captured-ideas) — include F3; DROP the `.cursorrules` snippet (F4 moot, replaced by AGENTS.md below).
5. **Agent Connect (upgrade of qs-claude-md-integration):** banner after first sync writes ONE `AGENTS.md` section (read by Cursor, Codex, Copilot, Gemini CLI) + 1-line pointer in `CLAUDE.md`. Append-only with signature marker, NEVER overwrite existing files — pointer style: "check captured-ideas-*.md for open tasks first, fetch via git show origin/{branch}:...". Written via GitHub Contents API (no npx installer needed — Gitty has the PAT).
6. **NEW — mobile auto-sync (iCloud feel):** capture→push without tapping SyncFAB. Debounced auto-push (~30-60s after last change, or on app background). Build ONLY after step 1 fixes land (auto-push widens the conflict window). Desktop→phone direction is already near-automatic (visibilitychange fetch + import banner).

**Deferred / parked:** MCP server, npx CLI, VS Code/Cursor extension, dedicated tasks repo (Tier 2) — all pending the 5 user DMs (validation owned by Thomas, outside coding sessions).

**Confirmed:** username-scoped filenames (`captured-ideas-{username}.md`) stay — multi-user repos need them; the AGENTS.md snippet uses the glob form. Landing page copy updated 2026-06-11 (hero, subline, step 03, caption, footer — uncommitted).

**Standing style rule:** no em dashes in any user-facing copy.
