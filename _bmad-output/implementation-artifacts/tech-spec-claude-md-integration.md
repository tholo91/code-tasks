---
title: 'Claude MD Integration Prompt for New Users'
slug: 'claude-md-integration'
created: '2026-03-23'
status: 'ready'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React 19', 'Zustand', 'Octokit', 'TypeScript']
files_to_modify:
  - src/features/sync/utils/markdown-templates.ts
  - src/services/github/sync-service.ts
  - src/stores/useSyncStore.ts
  - src/App.tsx
code_patterns: ['AI-ready header injection (Story 4-2)', 'Banner prompt pattern (SyncImportBanner)']
test_patterns: ['sync-service.test.ts']
---

# Tech-Spec: Claude MD Integration Prompt for New Users

**Created:** 2026-03-23

## Overview

### Problem Statement

Gitty creates `captured-ideas-{username}.md` files in user repositories with AI-ready headers, but there's no bridge to Claude Code. Users who use Claude Code in their repos have no way to know that their captured ideas exist — Claude Code won't check the file unless instructed via CLAUDE.md. This is a manual gap that breaks the "frictionless" promise.

### Solution

After the first successful sync with a newly linked repository, show a dismissible banner prompting the user: "Enable AI agent integration?" If accepted, Gitty checks if a `CLAUDE.md` exists in the repo root. If yes, append a Task Discovery section. If no, create a minimal `CLAUDE.md` with just that section. Track the setup state in `repoSyncMeta` so the prompt only appears once.

### Scope

**In Scope:**
- One-time banner prompt after first sync per repo
- Read existing `CLAUDE.md` from repo via Octokit (reuse `getFileContent` pattern)
- Append or create `CLAUDE.md` with Task Discovery section referencing `captured-ideas-{username}.md`
- Track `claudeMdOffered: boolean` in `repoSyncMeta` to prevent repeat prompts
- Dismissible — user can skip, never asked again for that repo

**Out of Scope:**
- Editing CLAUDE.md from within the app (covered by separate repo detail view story)
- Full CLAUDE.md generation beyond Task Discovery section
- Settings toggle to re-trigger the prompt later
- Multi-user CLAUDE.md merging

## Context for Development

### Codebase Patterns

- **Header injection pattern**: `markdown-templates.ts` already handles detect-and-inject for AI-ready headers in captured-ideas files. The same pattern (signature comment, `hasX()` check, conditional prepend/append) should be reused for CLAUDE.md.
- **Banner prompt pattern**: `SyncImportBanner` in App.tsx shows a dismissible prompt after sync events. The CLAUDE.md prompt should follow the same UX pattern — banner at top, accept/dismiss actions.
- **First sync detection**: `repoSyncMeta.lastSyncedSha === null` indicates a repo has never been synced. The prompt should fire once `lastSyncedSha` transitions from `null` to a value (i.e., first sync just completed).
- **GitHub file ops**: `sync-service.ts` has `getFileContent()` (lines 73-101) and `createOrUpdateFileContents` (line 425) — both reusable for CLAUDE.md read/write.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/features/sync/utils/markdown-templates.ts` | Header injection pattern to reuse; add CLAUDE.md template |
| `src/services/github/sync-service.ts` | GitHub file read/write; add `setupClaudeMd()` function |
| `src/stores/useSyncStore.ts` | `repoSyncMeta` type + persistence; add `claudeMdOffered` field |
| `src/App.tsx` | First sync detection + banner rendering (lines 355-375, 655-697) |
| `src/features/sync/components/SyncImportBanner.tsx` | Reference for banner component UX pattern |

### Technical Decisions

1. **Append vs. replace**: If CLAUDE.md exists, ALWAYS append. Never overwrite existing content. Use a signature comment (`<!-- code-tasks:task-discovery -->`) to detect if section already present.
2. **Minimal injection**: Only inject the Task Discovery section — don't add project context, tech stack, or other Gitty-specific info. Keep it clean and non-invasive.
3. **Commit message**: Use a clear commit message like `docs: add task discovery section to CLAUDE.md via Gitty`
4. **No retry on failure**: If the GitHub API call fails, silently mark as offered and don't re-prompt. User can set it up manually.

## Implementation Plan

### Tasks

1. **`markdown-templates.ts`** — Add CLAUDE.md template functions:
   - `getClaudeMdTaskDiscoverySection(username: string): string` — returns the section to inject
   - `hasTaskDiscoverySection(content: string): boolean` — checks for signature comment
   - Template content:
     ```markdown
     <!-- code-tasks:task-discovery -->
     ## Task Discovery

     Check `captured-ideas-{username}.md` for open task ideas captured via [Gitty](https://github.com/tholo91/code-tasks).
     - Open items (`- [ ]`) = not yet planned or implemented
     - Mark items as done (`- [x]`) after processing and append `[Processed by: YourAgentName]`
     - Do NOT edit tasks between `managed-start` and `managed-end` markers
     ```

2. **`sync-service.ts`** — Add `setupClaudeMdInRepo(octokit, owner, repo, username, branch?)`:
   - GET `CLAUDE.md` from repo root
   - If 404: create new file with just the Task Discovery section
   - If exists + already has signature: no-op
   - If exists + no signature: append section to end of file
   - PUT via `createOrUpdateFileContents`

3. **`useSyncStore.ts`** — Extend `RepoSyncMeta`:
   - Add `claudeMdOffered?: boolean` field (optional for backward compat)
   - Add `setClaudeMdOffered(repoFullName: string)` action

4. **`App.tsx`** — Add prompt logic:
   - After first sync completes (detect `lastSyncedSha` transition from null), set state to show CLAUDE.md banner
   - Only if `claudeMdOffered !== true` for that repo

5. **New component: `ClaudeMdBanner.tsx`** — Dismissible banner:
   - "Enable AI agent integration for this repo?"
   - Accept → calls `setupClaudeMdInRepo()`, marks offered
   - Dismiss → marks offered, hides forever

### Acceptance Criteria

- **Given** a user links a new repo and first sync completes, **when** `claudeMdOffered` is not set, **then** a banner appears offering CLAUDE.md setup.
- **Given** the user accepts, **when** no CLAUDE.md exists, **then** a new CLAUDE.md is created with the Task Discovery section.
- **Given** the user accepts, **when** CLAUDE.md exists without the section, **then** the section is appended.
- **Given** the user accepts, **when** CLAUDE.md already has the section (signature present), **then** no changes are made, banner still dismissed.
- **Given** the user dismisses the banner, **then** `claudeMdOffered` is set to true and the banner never reappears for that repo.
- **Given** the API call fails, **then** the banner is dismissed silently and the user is not re-prompted.

## Additional Context

### Dependencies

- Existing Octokit auth token (already available via sync flow)
- `repoSyncMeta` persistence (already in localStorage via Zustand persist)

### Testing Strategy

- Unit test `getClaudeMdTaskDiscoverySection()` output format
- Unit test `hasTaskDiscoverySection()` with/without signature
- Unit test `setupClaudeMdInRepo()` with mocked Octokit (404 case, existing file, already-has-section case)
- Integration: verify banner appears after first sync in test harness

### Notes

- This is a low-risk, high-value feature — it bridges Gitty's capture workflow with Claude Code's task discovery, closing the automation loop that was originally requested (captured-ideas item #13).
- The injected section is intentionally minimal and non-opinionated — it doesn't prescribe how the user should use Claude Code, just points it to the right file.
