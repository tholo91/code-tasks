# Quick Spec — Auto-emit tool-agnostic agent "front door" on repo connect

Status: Draft
Created: 2026-06-12
Type: Quick Spec

## Problem

The captured-ideas file already carries tool-agnostic instructions (the `getAIReadyHeader` block). But on the desktop side, no agent opens that file unless something points it there at session start. Today that pointer only exists by hand in `code-tasks`'s own `CLAUDE.md`. New users who connect a repo from mobile get the captured-ideas file synced, but their desktop agent (Claude Code, Cursor, or Codex) has no "front door" telling it to read that file — so captures feel invisible on desktop until the user manually asks.

Verified behavior: Claude Code auto-loads only `CLAUDE.md`; Cursor and OpenAI Codex CLI read `AGENTS.md`. So a single file is not enough for cross-tool coverage.

## Goal

When the Gitty app first creates/syncs `captured-ideas-<user>.md` in a repo, it should also ensure a tool-agnostic "front door" exists so any agent surfaces captures at session start — without the user editing anything.

## Scope (minimum)

1. On the same commit/path logic that writes `captured-ideas-<user>.md` (`sync-service.ts` → `commitTasks` / `syncAllRepoTasksOnce`), also ensure:
   - `AGENTS.md` exists at repo root. If absent, create it with the front-door block. If present, only append the block when a Gitty signature marker is not already there (idempotent, never clobber user content).
   - `CLAUDE.md`: same idempotent append (Claude Code only reads this file). If absent, create minimal; if present, append the block below a signature marker only when missing.
2. Use a signature marker (e.g. `<!-- code-tasks:agent-front-door -->`) so re-syncs never duplicate the block — mirror the existing `HEADER_SIGNATURE` pattern in `markdown-templates.ts`.
3. Front-door block content = the 3-step pointer (fetch → read freshest captured-ideas → follow its header). Reuse one shared string builder; do not hardcode in two places.

## Out of scope

- No per-tool rule files (`.cursor/rules`, `.cursorrules`). Stay tool-agnostic — markdown only.
- No changes to the captured-ideas header itself (already correct).
- No new UI. This is silent, additive file scaffolding on sync.

## Acceptance criteria

1. Connecting a fresh repo and capturing one task produces, in the same repo: `captured-ideas-<user>.md`, plus `AGENTS.md` and `CLAUDE.md` each containing the front-door block under the signature marker.
2. Re-syncing does not duplicate the block in either file.
3. An existing `CLAUDE.md`/`AGENTS.md` with user content is preserved; the block is appended once, never overwritten.
4. The block instructs `git fetch` first, so a stale local checkout still surfaces the latest captures.

## Files to touch

- `src/services/github/sync-service.ts` — extend the commit path to also write/append the two front-door files.
- `src/features/sync/utils/markdown-templates.ts` — add `getAgentFrontDoor()` + signature marker + idempotent append helper.
- Tests: `src/features/sync/utils/markdown-templates.test.ts` (block generation + idempotent append), `src/services/github/sync-service.test.ts` (files emitted on first connect, not duplicated on re-sync).

## Notes

The manual stop-gap is already applied to Thomas's 5 connected repos (brief-nach-berlin, bremen-rauchfrei, surv.ai, thomas-lorenz, code-tasks). This spec generalizes that to every user automatically.
