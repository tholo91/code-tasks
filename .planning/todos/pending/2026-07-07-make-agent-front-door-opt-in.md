---
created: 2026-07-07T20:49:21.080Z
title: Make agent front-door opt-in
area: sync
files:
  - src/services/github/sync-service.ts:206
  - src/services/github/sync-service.ts:586
  - src/services/github/sync-service.ts:802
  - src/features/sync/utils/markdown-templates.ts:369
  - src/features/sync/components/RepoSettingsSheet.tsx
---

## Problem

`ensureAgentFrontDoor()` currently writes or appends `AGENTS.md` and `CLAUDE.md` after sync as a best-effort side effect. The content is useful, but the behavior is dangerous for trust: a new OSS user can reasonably see this as Gitty committing files they never asked for.

This is especially sensitive because Gitty's core promise is "safe task capture in your repo". Surprise commits to instruction files work against that promise, even if the implementation is append-only and idempotent.

## Solution

Move agent front-door setup behind explicit opt-in. Show a small repo-level prompt or setting after first successful sync: "Enable AI agent session briefing?" If accepted, write `AGENTS.md` and `CLAUDE.md`; if dismissed, never write them silently. Store the decision per repo. Keep the append-only signature behavior, but remove fire-and-forget writes from ordinary sync unless opt-in is true.
