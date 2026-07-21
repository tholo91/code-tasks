# AI-native developer workflow and product direction

Updated: 2026-07-12

## The current Gitty workflow

1. On a phone, the developer captures a rough thought against one repository.
2. Gitty syncs `captured-ideas-<username>.md` to GitHub. A dedicated `gitty/<username>` branch and CI skipping are the safe default.
3. On the laptop, Claude Code/Codex-compatible instructions point the agent to fetch and read the capture inbox.
4. The human chooses a capture. A small clear task may be executed; a larger one becomes a BMAD/GSD story or an Issue.
5. Gitty imports the remote result so the phone remains the readable history of the capture.

## What is already working

- Markdown is a strong interchange format: it is versioned, human-readable, works without Gitty, and can be consumed by multiple agents.
- `AGENTS.md` and `CLAUDE.md` are useful discovery pointers. They solve "the capture is invisible at my desk."
- A dedicated capture branch plus ignored capture paths / `[skip ci]` protects normal deployments.
- Gitty uses a stable hidden task ID, which is much safer than matching a task only by its title.

## What is not yet trustworthy enough

### Repeated reminders

The current front-door text asks an agent to inspect captures every session. This maximises discovery but creates noise. No cross-tool mechanism currently knows that Thomas already reviewed the same capture in Codex, Claude Code, or Gemini CLI.

**Recommended behaviour:** discover automatically, but show new captures only once per changed remote revision. Never execute captures automatically.

### One checkbox means two different things

Today, a checked capture can mean either "I routed this into a story" or "the product change shipped." Those are different truths.

**Recommended lifecycle:**

| State | Meaning | Required proof |
| --- | --- | --- |
| Inbox | Captured, not yet reviewed | Capture ID and sync revision |
| Filed | Intentionally transformed or archived | Story path, issue URL, or archive reason |
| Done | The underlying work is actually complete | Merged PR / verified implementation reference |

The user confirmed that **Filed** may mean either transformed or archived. It must be visible in the UI and never masquerade as Done.

### Agent write-back must target the capture branch

For a phone to show an agent check-off, the agent must commit the task-status change to the same branch Gitty reads. This needs explicit branch-aware write-back and a visible import result; otherwise the file can be discovered correctly while completion fails to return to the phone.

## Product boundary

Gitty should be a **mobile capture inbox and trustworthy hand-off layer**, not a replacement for every planning tool.

- Keep raw capture in Gitty.
- Route significant work into BMAD/GSD.
- Create GitHub Issues only when the work needs discussion, delegation, public tracking, or dependencies.
- Do not make GitHub Issues the default capture destination. Phone capture must stay one-tap and private-by-default.

## Three falsifiable hypotheses

### H1 — One-time return-to-desk review

**Claim:** At least 3 of 5 AI-agent users can describe a specific capture or task they forgot, duplicated, or rediscovered after switching devices in the last seven days.

**Why it matters:** Validates a one-time "new captures since you last reviewed" hand-off.

**Validate if:** At least 3 show a real workaround: notes app, chat to self, README TODO, issue draft, or task file.

**Kill if:** Four or more already have a reliable mobile-to-repo loop and report no meaningful miss or duplication.

### H2 — Truthful routing beats more automation

**Claim:** At least 3 of 5 have separate places for loose ideas and committed work, and can show confusion when a task was planned versus actually completed.

**Why it matters:** Validates Inbox → Filed → Done, not an autonomous "run agent" button.

**Validate if:** At least 3 show or describe story/issue/task-file hand-offs and a status ambiguity.

**Kill if:** Four or more use one system with clear lifecycle semantics and see no need for a routing receipt.

### H3 — Branch and deployment confidence is a real adjacent pain

**Claim:** At least 3 of 5 can show a recent moment where an agent commit, task commit, or CI/deployment result made them stop to check branch state.

**Why it matters:** Determines whether Gitty should invest beyond capture into branch-confidence receipts.

**Validate if:** At least 3 can show the commit/PR/CI screen and explain the precaution they took.

**Kill if:** Four or more routinely use isolated branches/PRs and report no uncertainty or accidental deployment concern.

## What outside discussion suggests

Recent Claude Code, Codex, and workflow-community conversations repeatedly focus on:

- keeping durable context in concise `CLAUDE.md` / `AGENTS.md` and small task-specific Markdown files;
- breaking vague work into bounded tasks with acceptance criteria and deterministic checks;
- human approval before an agent changes scope or ships; and
- friction from permissions, session/context boundaries, and unclear verification.

This is an informed lead, not validation for Gitty. The interviews must establish whether mobile capture is a painful entry point in that larger workflow.

## Sources

- [Claude Code: persistent context, skills, agents, and hooks](https://code.claude.com/docs/en/features-overview)
- [Claude Code: session task lists](https://code.claude.com/docs/en/interactive-mode)
- [GitHub: planning and tracking work with Issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/planning-and-tracking-work-for-your-team-or-project)
- [GitHub: skipping selected Actions workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)
- [Community discussion: Markdown task tracking for Claude Code](https://www.reddit.com/r/ClaudeCode/comments/1r3v6y0/task_management_easier_with_markdown_files/)
- [Community discussion: permission friction in Codex automation](https://www.reddit.com/r/codex/comments/1ulnunh/automation_workflows/)
