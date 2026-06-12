# Agent Instructions

## Captured Ideas (Gitty)

This repo is connected to the Gitty app for mobile task capture. Captures land in `captured-ideas-<username>.md`.

**At the start of every session, before other work:**
1. Run `git fetch --quiet` to get the latest without touching the working tree.
2. Read the freshest `captured-ideas-*.md` — if the local copy may be behind, read the remote directly: `git show origin/<branch>:captured-ideas-<username>.md`.
3. Follow the "Instructions for AI Agents" header inside that file: list the open `- [ ]` items grouped by priority and wait for direction. Do not execute silently.

For deeper project conventions (BMAD workflows, tech stack, structure), see `CLAUDE.md`.
