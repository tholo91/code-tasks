# Agent Instructions

## Captured Ideas (Gitty)

This repo is connected to the Gitty app for mobile task capture. Captures land in `captured-ideas-<username>.md`.

**At the start of every session, before other work:**
1. Run `git fetch --quiet` to get the latest without touching the working tree.
2. Read the freshest `captured-ideas-*.md` — if the local copy may be behind, read the remote directly: `git show origin/<branch>:captured-ideas-<username>.md`.
3. Follow the "Instructions for AI Agents" header inside that file. Inspect captures quietly and never block the user's request with a backlog. For an unseen capture revision, write one Seen receipt to its capture branch and give at most one compact, non-blocking summary. Otherwise say nothing about Gitty unless Thomas asks to review it or what to work on next.

For deeper project conventions (BMAD workflows, tech stack, structure), see `CLAUDE.md`.
