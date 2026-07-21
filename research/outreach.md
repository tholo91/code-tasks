# Outreach playbook — AI-agent developers

Goal: complete five 15-minute workflow conversations. Do not pitch Gitty or ask for feature opinions until the end.

## Who to prioritise

Talk to people who use at least one of Claude Code, Codex, Gemini CLI, Cursor, or GitHub Copilot agent mode **several times a week** and work across more than one repository or device.

Prioritise these signals:

- They share agent workflows, prompts, `AGENTS.md`, `CLAUDE.md`, skills, or coding-agent demos.
- They complain about context, branch state, permissions, hand-offs, review, task tracking, or CI.
- They are solo builders, staff engineers, developer-tool builders, or agency leads who regularly leave the desk and return to code.

Avoid recruiting only tool enthusiasts. Include at least two people who tried an agent and stopped using it regularly; their failure mode may be more valuable than a power user’s setup.

## Where they gather

| Place | Best use | How to contribute before DMing |
| --- | --- | --- |
| [Anthropic Discord / Claude Code community](https://code.claude.com/docs/en/quickstart) | Claude Code users asking about workflow and setup | Reply with a concrete workflow question or share a short, useful observation; DM only after a real exchange. |
| [Claude Code / Claude AI Reddit discussions](https://www.reddit.com/r/ClaudeCode/) | Public workflow posts and people who explain their setup | Comment with a helpful follow-up: ask how they capture and resume work after leaving the desk. |
| [r/codex](https://www.reddit.com/r/codex/) and the [OpenAI Developer Community](https://help.openai.com/en/articles/11096431) | Codex users with operational and permission pain | Offer to compare their current workaround, not to demo a product. |
| [Gemini CLI GitHub Discussions](https://github.com/google-gemini/gemini-cli/discussions) and [r/GeminiCLI](https://www.reddit.com/r/GeminiCLI/) | Gemini CLI setup and extension users | Ask about their project-memory and cross-session workflow. |
| GitHub repositories for agent workflow tools | Builders who have already paid the cost of solving workflow problems | Open a precise, non-promotional discussion or contact active maintainers. |
| Hacker News Show HN / "Ask HN" threads | Experienced independents and developer-tool builders | Respond to an active thread with a useful observation and invite a small number to a learning call. |

Communities are for learning in public first. Do not drop generic "I built an app, can I interview you?" posts.

## What they are saying, translated into useful research prompts

| Observed theme | What it may mean | Ask this, not a leading product question |
| --- | --- | --- |
| Markdown files and repo instructions | People want portable, inspectable context | "Show me the last file you rely on to restart agent work. How did it get there?" |
| Acceptance criteria and verification | Vague task input creates wasted agent loops | "Tell me about the last task you had to rewrite for an agent. What was missing?" |
| Context/session limits | Work is forgotten between sessions | "When you returned to a repo last time, what told you what was still open?" |
| Permissions and CI/branch anxiety | Automation is useful only when reversible and legible | "Show me the last agent commit you checked before trusting it. What were you looking for?" |
| Multi-agent orchestration | Power users seek a queue, but often create more process | "Which work do you deliberately refuse to hand to an agent, and why?" |

## The 15-minute call

Rule: ask about last week, not next month. If the question can be answered with "I would" or "I think," rewrite it.

1. What have you been building this week?
2. Which coding agent did you last use, and for what?
3. Walk me through the last time an idea or bug occurred while you were away from the main machine.
4. What did you do with it, exactly? Can you show me the note, message, issue, or commit?
5. When you next returned to the repo, how did you decide what to do?
6. Show me the last task/plan/instruction file your agent used.
7. Tell me about the last time a task was "done" in one place but not actually shipped.
8. Show me the last agent-generated commit or PR you paused before merging. What made you pause?
9. You mentioned [their workaround]. What happens when you forget to run it?
10. If you could change one part of that exact workflow, what would you remove?

At minute 13, ask permission to send a one-paragraph synthesis of what you heard. Only then say: "I am exploring a phone-to-repo capture loop. Is it okay if I show you a rough version after I compare a few workflows?"

## DM templates

### Warm contact

> Hey [Name] — I saw your [specific post/tool/workflow] and am learning how people actually run Claude Code/Codex/Gemini across real repos. I am not pitching anything; I want to understand the last time an idea or agent task got lost, duplicated, or awkwardly handed off. Would you be open to a 15-minute workflow walkthrough next week? I will send back a concise summary of patterns I find.

### Community reply, then DM

> Your point about [specific detail] is useful. I’m interviewing a handful of people about how they capture and resume agent work across devices, and I’d love to understand your real setup for 15 minutes. No demo or sales pitch — just last-week examples. Interested?

### Follow-up after no reply

> Quick nudge in case this got buried. I’m doing only five short learning calls and would value your concrete workflow; if timing is bad, no need to reply.

## Seven-day outreach sprint

| Day | Action | Success measure |
| --- | --- | --- |
| 1 | Make a list of 20 people: 8 warm, 8 community contributors, 4 outside Thomas’s usual DACH/founder network. | 20 specific names/handles, not audience categories. |
| 2 | Send 8 tailored warm DMs and leave 5 genuinely useful public comments. | 13 meaningful touches. |
| 3 | Send 6 community follow-ups only where there was a real exchange. | 2 calls booked total. |
| 4–6 | Run calls and log evidence immediately below. | 5 calls total. |
| 7 | Score the three hypotheses in `workflow-and-product-direction.md`. | One-page synthesis, including kill signals. |

## Interview log template

Copy this once per person into `research/interviews/YYYY-MM-DD-handle.md` after the call.

```md
# [Handle] — [date]

Tooling / context:

## Last-week evidence

- Capture or task hand-off:
- Restarting work:
- Planned vs done confusion:
- Branch / CI confidence:

## Artifact shown

- [terminal, task file, issue, PR, CI run, etc.]

## Exact workaround and cost


## Hypothesis signal

- H1: supports / weakens / no signal
- H2: supports / weakens / no signal
- H3: supports / weakens / no signal

## Quote / follow-up

```

## What Gitty can offer them now

Do not promise automation. Offer a useful, narrow exchange:

- a fast audit of their current agent hand-off and one short written summary;
- a copy of the cross-device workflow patterns after the five calls; or
- early testing of a one-time, trustworthy mobile-capture inbox.

That is credible because it respects their time and improves their current setup even if Gitty is not a fit.
