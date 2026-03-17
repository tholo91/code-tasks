# Story 8.9: AI Agent Header Update

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an AI Agent processing a captured-ideas.md file,
I want clear instructions that I can check off completed tasks and attribute my work,
so that I know exactly what I'm allowed to do with the task list and the file stays clean.

## Acceptance Criteria

1. Given an AI agent opens a `captured-ideas-{username}.md` file, when it reads the instruction header, then it clearly understands: (1) it can mark tasks as done by changing `- [ ]` to `- [x]`, and (2) it should append "Checked by [Agent Name]" to the task description after completing it.
2. Given the header is updated, when the next sync from the app occurs, then the new header is written to any new files, and existing files with the old header are updated on next full sync.

## Tasks / Subtasks

- [x] Task 1: Update `getAIReadyHeader()` instruction text in markdown-templates.ts (AC: #1, #2)
  - [x] Subtask 1.1: Locate the existing bullet `> - Mark tasks as done (\`- [x]\`) after processing` in `getAIReadyHeader()`.
  - [x] Subtask 1.2: Replace that bullet with: `> - Mark tasks as done (\`- [x]\`) after processing and append "Checked by [Agent Name]" to the task description`
  - [x] Subtask 1.3: Add the additional bullet: `> - You may add notes or context below the \`managed-end\` marker — they will not be overwritten`
- [x] Task 2: Update `markdown-templates.test.ts` to match the new header text (AC: #1)
  - [x] Subtask 2.1: Find all header content snapshot/assertion strings in `src/features/sync/utils/markdown-templates.test.ts` that reference the old instruction bullet.
  - [x] Subtask 2.2: Update those assertions to match the new instruction text exactly.
  - [x] Subtask 2.3: Run `npm test` and confirm all tests pass with zero failures.

## Dev Notes

- This is a purely content-level change — no logic, no new state, no new components. The only code modified is the string body of `getAIReadyHeader()` and the corresponding test assertions.
- `getAIReadyHeader(username)` lives in `src/features/sync/utils/markdown-templates.ts`. It returns the full AI-ready header block that is written to the top of `captured-ideas-{username}.md` on sync.
- The `HEADER_SIGNATURE` constant (`<!-- code-tasks:ai-ready-header -->`) does NOT change. This means `hasAIReadyHeader()` will still detect the existing header correctly, and the sync engine's Case 4 (markers rewrite) will overwrite the old instructions with the new ones on the next full sync for all existing files — no migration needed.
- The two changes to make inside the header body:
  - **Before:** `> - Mark tasks as done (\`- [x]\`) after processing`
  - **After:** `> - Mark tasks as done (\`- [x]\`) after processing and append "Checked by [Agent Name]" to the task description`
  - **Add:** `> - You may add notes or context below the \`managed-end\` marker — they will not be overwritten`
- The existing tests in `markdown-templates.test.ts` test the header content. They will fail after the change until updated — this is expected and intentional. Update the test strings to match the new output exactly.
- Do NOT change the `hasAIReadyHeader()` detection logic or the `HEADER_SIGNATURE` value.
- Do NOT change the `getAIReadyHeader()` function signature — the Story 8.7 story will later add a `customInstruction` parameter, but that is out of scope for this story.

### Project Structure Notes

- All changes are co-located in `src/features/sync/utils/` — both the source file and its test live there.
- No new files, no new exports, no new imports required.
- Naming conventions: file is already kebab-case (`markdown-templates.ts`) — no change needed.
- No store changes, no component changes, no service changes.

### References

- Story definition and technical notes: [Source: _bmad-output/planning-artifacts/epic-8-planning.md#Story 8.9 — AI Agent Header Update]
- Codebase state / key files table: [Source: _bmad-output/planning-artifacts/epic-8-planning.md#Key Files]
- Architecture constraints (testing, boundaries): [Source: _bmad-output/planning-artifacts/epic-8-planning.md#Architecture Constraints]
- `getAIReadyHeader()` location: `src/features/sync/utils/markdown-templates.ts`
- Test file location: `src/features/sync/utils/markdown-templates.test.ts`
- Current instruction text (before): `> - Mark tasks as done (\`- [x]\`) after processing` [Source: _bmad-output/planning-artifacts/epic-8-planning.md#Codebase State — AI-Ready Header]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blockers. Purely content-level change as specified._

### Completion Notes List

- Task 1: Updated `getAIReadyHeader()` — replaced mark-tasks bullet with attribution version, added notes-context bullet.
- Task 2: Searched test file for assertions referencing old bullet text — none existed. Added 2 new failing tests (RED) for new text, then made them pass (GREEN) with the source change. All 47 tests pass.
- Pre-existing `AuthForm.test.tsx` failure confirmed as unrelated to this story (caused by separate WIP changes in `AuthForm.tsx`).

### File List

- `src/features/sync/utils/markdown-templates.ts`
- `src/features/sync/utils/markdown-templates.test.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/8-9-ai-agent-header-update.md`
