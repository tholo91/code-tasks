---
title: 'Quiet Agent Handoff Receipts'
slug: 'quiet-agent-handoff-receipts'
created: '2026-07-22'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React 19', 'TypeScript', 'Zustand persist', 'IndexedDB', 'Octokit', 'Vitest', 'Testing Library']
files_to_modify: ['src/types/task.ts', 'src/features/sync/utils/markdown-templates.ts', 'src/features/sync/utils/markdown-templates.test.ts', 'src/services/github/sync-service.ts', 'src/services/github/sync-service.test.ts', 'src/utils/task-diff.ts', 'src/utils/task-diff.test.ts', 'src/features/capture/components/TaskDetailSheet.tsx', 'src/features/capture/components/TaskDetailSheet.test.tsx', 'src/hooks/useRemoteChangeDetection.ts', 'src/App.tsx', 'src/features/sync/components/SyncConflictSheet.tsx']
code_patterns: ['stable task IDs in Markdown comments', 'managed Markdown section rewrite', 'additive monotonic remote merge', 'Zustand selectors with persisted Task records', 'existing task-detail metadata rows', 'Vitest unit/component tests']
test_patterns: ['Vitest pure-function round trips and merge tests', 'Testing Library component tests', 'mocked Octokit sync-service tests']
---

# Tech-Spec: Quiet Agent Handoff Receipts

**Created:** 2026-07-22

## Overview

### Problem Statement

Gitty reliably captures ideas on a phone, but its current sync contract does not distinguish an idea that was merely seen by an agent from one that became planned work or verified implementation. The app also encourages agents to announce captures on every session, which makes the handoff noisy and reduces trust.

### Solution

Keep Gitty's existing mobile capture UI intact while adding a small, Markdown-backed lifecycle receipt. The same capture branch becomes the source of truth for quiet, once-per-new-revision agent discovery and explicit Filed or Done write-back with proof.

### Scope

**In Scope:**

- Represent a capture as New, Seen, Filed, or Done in the Markdown exchange format and local task model.
- Persist the capture revision, one-time Seen receipt, optional proof reference, and the agent that performed the write-back.
- Surface the lifecycle receipt only in existing task detail and sync surfaces, without changing capture, task-list, sheet, or animation patterns.
- Change generated agent instructions so discovery is silent unless the capture revision is new, and each revision is surfaced once until it changes or is handled.
- Preserve dedicated capture-branch sync and stable task-ID reconciliation.

**Out of Scope:**

- A mobile navigation redesign, new dashboards, tabs, or notification system.
- Automatic execution of captured tasks without human selection.
- GitHub Issues as the default capture destination, GitHub App/OAuth authentication, or voice capture.
- Server-side background agents, cross-device notification scheduling, or integrations tied to one LLM provider.

## Context for Development

### Codebase Patterns

- `Task` records are local-first, persisted verbatim through Zustand and IndexedDB. Optional receipt fields need no storage migration.
- `formatTaskAsMarkdown()` and `parseTasksFromMarkdown()` are the single Markdown serialization boundary. Stable `<!-- ct:id -->` anchors already make agent write-back safe across formatting and title changes.
- `buildMergedTaskList()` is deliberately additive and non-destructive. Receipt changes must use the same monotonic merge policy so a remote Filed/Done update is never overwritten by stale local state.
- The list deliberately stays visually quiet. `TaskDetailSheet` already owns an expandable metadata block and is the only mobile UI surface for the receipt.
- Capture branches are chosen per repository for outgoing sync, but current fetch and remote-change paths read the default branch. They must use the selected capture branch for phone import to reflect agent write-back.
- Generated Gitty instructions are signature-idempotent. The front-door block needs a versioned, bounded upgrade path so already-connected repositories receive the new quiet wording.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/types/task.ts` | Local task lifecycle model; add optional receipt fields. |
| `src/features/sync/utils/markdown-templates.ts` | Task receipt tags, parser/serializer, quiet agent header, versioned front-door migration. |
| `src/services/github/sync-service.ts` | Map remote receipt fields and read the selected capture branch. |
| `src/utils/task-diff.ts` | Detect and monotically merge remote receipt updates. |
| `src/features/capture/components/TaskDetailSheet.tsx` | Render a quiet handoff receipt and safe proof link in existing Details. |
| `src/hooks/useRemoteChangeDetection.ts` | Detect updates on the configured capture branch. |
| `src/App.tsx` | Pass the selected capture branch into initial and manual remote imports. |
| `src/features/sync/components/SyncConflictSheet.tsx` | Read conflict content from the configured capture branch. |
| `src/features/sync/utils/markdown-templates.test.ts` | Markdown, agent-instruction, and migration coverage. |
| `src/services/github/sync-service.test.ts` | Branch-aware fetch and remote task mapping coverage. |
| `src/utils/task-diff.test.ts` | Receipt-detection and monotonic merge coverage. |
| `src/features/capture/components/TaskDetailSheet.test.tsx` | Receipt/proof rendering coverage. |

### Technical Decisions

- Gitty remains LLM-agnostic: agents read and write plain Markdown on the configured capture branch.
- A receipt is optional data: no receipt means New; matching `Capture revision` and `Seen revision` means Seen; `Filed` means deliberately handed off; `Done` requires a non-empty HTTPS proof URL. Existing user-completed tasks remain generic Completed tasks unless an agent receipt exists.
- New user captures use their task UUID as the initial capture revision. Local edits to the captured title, body, or importance rotate the revision. Agent receipts never rotate it.
- Receipt tags use the managed task line: `[Capture revision: uuid] [Seen revision: uuid] [Seen by: Agent] [Seen: ISO-8601] [Gitty: Filed|Done] [Proof: https://…] [Handled: ISO-8601] [Processed by: Agent]`. Existing IDs, checkboxes, body notes, and `Processed by` remain compatible.
- The phone shows a receipt, rather than claiming that agents execute work automatically. It appears only inside existing task Details; task cards, bottom sheets, the sync pill, and animations remain unchanged.
- A new capture is surfaced once by comparing `Capture revision` and `Seen revision`. The agent then writes a Seen receipt to the same capture branch, making the result portable across later conversations and LLM tools. When the revisions match, agents proceed silently unless the user asks to review Gitty.
- Receipt merge is revision-gated and monotonic: New → Seen → Filed → Done. A remote receipt applies only when its seen revision matches the local capture revision; it can add proof/agent/time, but an older remote version cannot downgrade or erase an existing receipt.
- Read all Gitty data from the configured capture branch, including startup import, pull-to-refresh, remote-change detection, and conflict preview. The default branch remains the fallback when no capture branch is configured.
- The new agent instructions inspect Gitty captures at session start, but never list tasks or block the user's request. If at least one capture revision is unseen, the agent writes one Seen receipt per capture and gives one compact, non-blocking sentence. It otherwise remains silent until the user explicitly asks to review Gitty/what is next.
- This is one notification per capture revision across tools, which is more reliable and less annoying than a vague daily prompt. A calendar-based daily reminder is out of scope.

## Implementation Plan

### Tasks

- [x] Task 1: Make every incoming sync read the configured capture branch.
  - Files: `src/services/github/sync-service.ts`, `src/services/github/sync-service.test.ts`, `src/App.tsx`, `src/hooks/useRemoteChangeDetection.ts`, `src/features/sync/components/SyncConflictSheet.tsx`
  - Action: Add an optional branch/ref parameter to remote task and file fetches; pass it to the GitHub content request. Thread `repoSyncBranches` through initial import, pull-to-refresh, visibility-based remote checks, conflict preview, and Keep Remote. Retain the default-branch behavior if no branch is configured.
  - Notes: This is a precondition for any agent receipt written to `gitty/<user>` to reach the phone. Preserve existing outbound branch behavior and sync conflict guards.

- [x] Task 2: Add a revision-gated handoff receipt to the local task model.
  - Files: `src/types/task.ts`, `src/stores/useSyncStore.ts`, `src/test-utils/create-test-task.ts`, relevant store tests
  - Action: Add optional receipt fields for `captureRevision`, `seenRevision`, `seenAt`, `seenBy`, `handoffStatus`, `proofUrl`, and `handledAt`. Initialise new captures with their task UUID as `captureRevision`. When the phone changes title, body, or importance, generate a new capture revision and clear stale Seen/Filed/Done receipt data. Do not rotate the revision for transport state, manual checkbox completion, or remote agent receipt imports.
  - Notes: Absence of receipt data means New. Do not conflate the receipt with `syncStatus` or the existing generic `isCompleted` checkbox.

- [x] Task 3: Extend the managed Markdown protocol and migrate generated agent instructions.
  - Files: `src/features/sync/utils/markdown-templates.ts`, `src/features/sync/utils/markdown-templates.test.ts`, `AGENTS.md`, `CLAUDE.md`
  - Action: Serialize and parse task-line metadata for capture revision, Seen receipt, Filed/Done status, proof URL, and handled timestamp next to existing checkbox, completion, and `Processed by` tags. Treat invalid/missing proof for a raw Done tag as a generic completion, never as verified Done. Update both generated instruction blocks to silently inspect captures, write one Seen receipt for each unseen revision, issue at most one compact non-blocking summary, and otherwise stay silent until asked. Add bounded v2 front-door markers or a safe legacy replacement so existing Gitty blocks upgrade rather than remaining permanently noisy. Update this repository's installed AGENTS/CLAUDE instructions to the same quiet rule.
  - Notes: Preserve `<!-- ct:id -->`, managed markers, body indentation, agent notes below `managed-end`, old files without new tags, and German/English instruction generation. Proof links must be validated as `https:` URLs before the phone renders them as links.

- [x] Task 4: Make receipt imports visible, revision-safe, and monotonic.
  - Files: `src/services/github/sync-service.ts`, `src/services/github/sync-service.test.ts`, `src/utils/task-diff.ts`, `src/utils/task-diff.test.ts`, `src/features/sync/components/SyncImportBanner.tsx` if its existing copy needs a receipt-specific summary
  - Action: Map parsed receipt data into remote tasks. Extend import diff and merge logic to detect Seen, Filed, and Done changes and to import them only when the remote seen revision equals the local capture revision. Apply only forward state changes (New → Seen → Filed → Done); preserve a newer local capture revision and never downgrade/erase an existing receipt. Extend existing import feedback with receipt-specific wording only when there is a real receipt change.
  - Notes: Keep current protections for pending local captures, body conflict notes, title rename matching, stable-ID matching, and vanished remote tasks. Receipt-only remote updates must not be swallowed by `isAllZero`.

- [x] Task 5: Show the receipt inside existing task Details only.
  - Files: `src/features/capture/components/TaskDetailSheet.tsx`, `src/features/capture/components/TaskDetailSheet.test.tsx`
  - Action: Add one calm `Handoff` metadata row to the existing Details disclosure: New/Seen with agent and time, Filed with optional proof, or Done with a safe external proof link. Preserve the existing generic Completed row for manually completed legacy tasks.
  - Notes: Do not add list badges, task-card controls, navigation, new sheets, notifications, sync-pill states, or animation changes. Use existing typography, colors, touch targets, and `noopener noreferrer` link behavior.

- [x] Task 6: Verify the full phone-to-agent-to-phone protocol.
  - Files: focused tests above, plus any affected `App` or remote-change-detection tests
  - Action: Add regression tests for branch-scoped fetches, protocol round-trips, invalid receipt data, v1-to-v2 instruction upgrade, revision rotation on local capture edits, stale agent receipts, monotonic receipt merges, and Details rendering. Run focused tests, `npm run test:run`, `npm run lint`, and `npm run build`.
  - Notes: Do not stage or commit pre-existing PAT-error WIP, research documents, or unrelated specs with this feature.

### Acceptance Criteria

- [x] AC 1: Given a repository uses `gitty/thomas` as its sync branch, when an agent writes a receipt to that branch, then initial import, pull-to-refresh, visibility checks, and conflict resolution read that branch and can return the receipt to the phone.

- [x] AC 2: Given no sync branch is configured, when Gitty reads remote tasks, then it retains current default-branch behavior.

- [x] AC 3: Given a new or locally edited capture is synced, when Gitty serializes it, then its task line contains a stable capture revision and its existing stable task ID anchor remains unchanged.

- [x] AC 4: Given an agent reads an unseen capture revision, when it writes a valid Seen receipt on the configured capture branch, then the phone imports the agent, timestamp, and matching seen revision without altering the capture content.

- [x] AC 5: Given a user edits a capture after it was Seen, Filed, or Done, when the title, body, or importance changes, then the phone creates a new capture revision and does not present the old receipt as the current handoff state.

- [x] AC 6: Given an agent writes `[Gitty: Filed]`, when the receipt carries the matching capture revision, then the phone shows Filed in task Details and preserves an optional safe proof link.

- [x] AC 7: Given an agent writes `[Gitty: Done]` with a valid HTTPS proof URL, when the receipt is imported, then the phone shows Done with its proof link; when the proof is missing or invalid, then the phone never represents the task as verified Done.

- [x] AC 8: Given a remote receipt refers to an older capture revision, when the phone has a newer local capture revision, then the stale receipt is ignored and the newer local capture remains intact.

- [x] AC 9: Given a task is already Seen, Filed, or Done for its current revision, when Gitty imports an older or less advanced remote version, then the receipt never regresses or disappears.

- [x] AC 10: Given an existing Gitty-generated instruction block is present, when Gitty next writes the front-door file, then it replaces or supersedes the noisy v1 rule with the quiet v2 rule without duplicating the block.

- [x] AC 11: Given an agent starts a session with no unseen Gitty capture revision, when it reads generated Gitty instructions, then it proceeds without listing the capture backlog or blocking the user's request; when unseen revisions exist, it emits only one compact non-blocking summary after recording Seen receipts.

- [x] AC 12: Given a task has no agent receipt, when the user views it, then the mobile capture/list UI remains visually unchanged; when the user opens existing Details, then the quiet Handoff row is the only new mobile surface.

## Review Notes

- Adversarial review completed.
- Findings: 12 total, 10 fixed, 2 test coverage gaps tracked.
- Resolution approach: automatic fixes, based on the user’s implementation instruction.

## Additional Context

### Dependencies

No new dependencies. The implementation uses existing React, Zustand, IndexedDB, Octokit, and Vitest infrastructure. It depends on GitHub's existing branch `ref` parameter for content reads and on agents following the versioned Markdown protocol.

### Testing Strategy

Add Vitest unit tests for Markdown serialization/parsing, legacy compatibility, receipt validity, instruction migration, revision-safe merge, and branch-scoped Octokit reads. Add Testing Library coverage for the existing Details row and proof link. Test initial import, manual refresh, visibility change, and conflict Keep Remote with a configured capture branch. Run focused tests during development, then `npm run test:run`, `npm run lint`, and `npm run build`.

### Notes

Preserve the current mobile-first visual language: fast capture, bottom sheets, sync pill, and subtle existing motion.

The receipt is trustworthy only when the agent writes it back to the configured branch; Gitty cannot observe an agent merely reading a local checkout. The protocol deliberately creates one small capture-branch commit per newly seen capture revision to avoid repeated cross-tool prompts. A future server-side or calendar-based reminder is not part of this change.

Do not mix the existing uncommitted PAT-recovery changes, research documents, or unrelated quick specs into this feature's verification or eventual commit.
