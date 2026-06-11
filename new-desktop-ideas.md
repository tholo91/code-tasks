# Mobile → Desktop AI Connection — Findings & Direction

> Research session: 2026-06-11. Covers how Gitty-captured tasks travel from phone to AI agent on desktop (Cursor, Claude Code, Codex, VSCode).

---

## 1. The Core Problem

A developer captures ideas on their phone (Gitty). Later they open their laptop, fire up an AI coding agent, and want the agent to *already know* what to work on — without manual steps.

Today that loop is broken in two ways:

- **File placement:** the `captured-ideas-{username}.md` lives in one specific repo. If the agent is working in a *different* repo, it can't see the file.
- **Briefing quality:** even when the agent does find the file, the header is passive — it doesn't instruct the AI to surface tasks immediately.

---

## 2. Current Gitty Architecture (what exists today)

- Sync is **manual only** (user taps SyncFAB). No auto-push on task creation.
- File lands at the **root of the selected project repo** — not a dedicated tasks repo.
- Each user gets a scoped file: `captured-ideas-{username}.md` (prevents multi-user merge conflicts).
- Commit message: `sync: N tasks (N active, N completed) via code-tasks`
- **`[skip ci]` toggle exists** per-repo in Settings → Repo Settings. When enabled, appended to every sync commit. Most users don't know it exists.
- **`deploy.yml` already ignores `captured-ideas-*.md`** path changes (belt-and-suspenders CI guard).
- The file has an AI-Ready header with managed-block markers. An AI agent can read it but gets only passive instructions today ("check for tasks").

---

## 3. Pain Points Identified

### A. CI/CD trigger anxiety
- **Perceived problem:** every sync = a GitHub Actions run = a potential deploy.
- **Actual state:** already solved — `[skip ci]` toggle + `deploy.yml` path-ignore.
- **Action needed:** surface the toggle better in onboarding / settings UI.

### B. Cross-repo accessibility
- **Real problem:** task file is in repo A, agent is working in repo B.
- Current model requires co-location. No mechanism to find tasks from another repo.
- This is the core friction explaining why Gitty isn't used consistently.

### C. Passive briefing
- Even when the agent finds the file, it doesn't know it should surface tasks proactively.
- Result: tasks sit unread unless the dev explicitly asks.

---

## 4. Research Findings — AI Dev Community

From Reddit, HN, and dev communities (June 2026):

- **MCP adoption is strong** for task tooling. 5+ Linear MCP servers exist independently. GitHub has an official MCP server. AI devs want "task → prompt" with zero friction.
- **Markdown-native task tools** (Backlog.md, Tasks.md, TaskGraph) are growing because they're git-friendly and AI-readable by design.
- **VSCode Agent Mode + MCP** is emerging as the standard pattern: project-level instruction files (`.clinerules`, `copilot-instructions.md`) + `@`-mention for scoped context.
- **No one is solving the mobile capture → AI handoff loop.** Existing tools assume desktop capture. This is Gitty's gap to own.
- The key developer frustration: "context loss between sessions" — having to re-explain what to work on every morning.

---

## 5. Solution Tiers

### Tier 1 — Quick wins (no new infrastructure)

| Fix | Effort | Impact |
|---|---|---|
| Enable `[skip ci]` in settings (UX discovery, already built) | 1h | Kills CI/CD anxiety |
| Improve onboarding copy to mention the toggle | 2h | Reduces setup friction |

### Tier 2 — Dedicated tasks repo (medium, this sprint or next)

- Add a "personal tasks repo" concept: one fixed repo (e.g. `tholo91/gitty-tasks`) where all captures land, regardless of which project you're in.
- Every Claude Code session on any repo gets told via CLAUDE.md to check `gitty-tasks`.
- Zero new infrastructure — a settings field + a convention.
- Solves the cross-repo problem without building a server.

### Tier 3 — MCP Server (strategic, AI dev scene positioning)

- Turns Gitty into a first-class AI tool — queryable by any MCP-capable agent (Claude Code, Cursor, Windsurf, Codex) without any file in the working repo.
- Pattern:
  ```
  Agent → gitty_get_tasks() → returns open items → agent starts working
  Agent → gitty_complete_task(id) → marks done → syncs to markdown
  ```
- **This is the positioning bet.** "Capture on phone, AI agent picks it up wherever it's working" — that story doesn't exist anywhere in the market today.
- Transport: simple Vercel serverless function, reads from GitHub via PAT, no new data layer.
- **Validate before building:** confirm AI devs won't just use Backlog.md + a CLAUDE.md pointer. The moat is mobile capture + cross-repo accessibility.

---

## 6. Stories Currently Shipping (pair, June 2026)

### 9-15 — Active AI Briefing Header

Rewrites `getAIReadyHeader()` from passive to directive:
- AI lists all unchecked tasks grouped by priority (🔴 first) on every session open
- AI proposes a one-line approach per task, then waits
- Adds optional branch-awareness line: tells AI exactly where the freshest file lives and how to fetch it

**Impact:** every AI session starts with a structured briefing, even without the slash command.

### 9-16 — `/captured-ideas` Slash Command

Ships `.claude/commands/captured-ideas.md` in the code-tasks repo:
- Runs `git fetch`, finds `captured-ideas-*.md` across `origin/main` and `origin/gitty/*` branches
- Picks the freshest version, parses unchecked items, prints grouped by priority with suggested approaches
- Handles multi-user repos, empty state, no-file state, network failures

**Scope (this story):** ships in code-tasks only. README explains how to copy the command into any other repo (manual 1-file copy). Auto-distribution to managed repos = future story.

**Impact:** `cmd+T → claude → /captured-ideas → done`. One command, zero branch hunting.

### Pair composition

```
9-15: file is self-briefing once ANY agent reads it
9-16: file is reachable in one command
Together: capture on phone → /captured-ideas on laptop → agent starts working
```

---

## 7. Future Direction

In priority order:

1. **Dedicated tasks repo** (Tier 2 above) — removes the "wrong repo" problem without new infrastructure
2. **Auto-inject `/captured-ideas` into managed repos** on first sync — so every Gitty user gets the command for free, no manual copy
3. **MCP server** — the strategic play for AI dev scene positioning; validate with 3–5 AI dev conversations first
4. **`.cursorrules` / Codex integration** — Cursor-native equivalent of the slash command (documented as copy-paste snippet today in 9-16)
5. **Bidirectional sync** — AI marks task done in the file → Gitty app state updates on next pull

---

## 8. Open Questions

- [ ] Does the dedicated tasks repo approach (Tier 2) kill the need for MCP, or does MCP still add value on top?
- [ ] Which Cursor/Codex users actually want this? (Validate before building the Cursor integration properly)
- [ ] Should the `/captured-ideas` command eventually live in a Gitty-managed CLAUDE.md injection (via `qs-claude-md-integration`) instead of a copied file?
- [ ] What's the right demo surface for AI dev communities? (Reddit r/ClaudeAI, Claude Discord, X/Twitter AI dev threads?)
