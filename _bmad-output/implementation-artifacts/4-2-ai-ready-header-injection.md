# Story 4.2: AI-Ready Header Injection

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an AI Agent,
I want the task file to include a standardized instruction header,
so that I can immediately understand the context and priority of the tasks I need to execute.

## Acceptance Criteria

1. [x] **Header Injection:** If the `captured-ideas-{username}.md` file does not exist or lacks the standardized header, the system injects it during the first sync.
2. [x] **Markdown Formatting:** Tasks are appended as Markdown items (`- [ ]`) with clear Title, Description, and Priority indicators.
3. [x] **Standard Metadata:** Each task includes a timestamp and a status field (e.g., `[Created: 2026-03-11]`).
4. [x] **Consistency:** The system follows the BMad standard for "Living Documents" (as defined in the PRD and docs).
5. [x] **SHA Persistence:** Ensures the header injection doesn't cause a conflict by using the current `sha` for the file update.

## Tasks / Subtasks

- [x] Define the AI-Ready Header (AC: 1, 4)
  - [x] Create `src/features/sync/utils/markdown-templates.ts` containing the standardized AI-Ready instruction header.
- [x] Implement Markdown Generator (AC: 2, 3)
  - [x] Implement `formatTaskAsMarkdown(task: Task)`:
    - **Format:** `- [ ] **Task Title** ([Created: 2026-03-11]) (Priority: {{isImportant}})`
    - **Description:** Included on the next line if available.
- [x] Integrate Header Injection (AC: 1, 5)
  - [x] Update `syncPendingTasks()` in `sync-service.ts`:
    - **Step 1:** Check if file content contains the signature header.
    - **Step 2:** If missing, prepend the header to the content.
    - **Step 3:** Append the new tasks.
    - **Step 4:** Push the final content to GitHub.
- [x] Validation & Test (AC: 2)
  - [x] Verify the formatting against a sample `captured-ideas.md` file (using the format from `docs/example-format.md`).

## Dev Notes

- **Header Template:** The header should provide clear instructions for AI agents on how to process the file.
- **Consistency:** Use the BMad signature format for all task appends.
- **Markdown Purity:** Keep the file pure Markdown; avoid non-standard tags that might break agent parsers.

### Project Structure Notes

- **Sync Module:** `src/features/sync/`
- **Markdown Templates:** `src/features/sync/utils/markdown-templates.ts`
- **GitHub Service:** `src/services/github/sync-service.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries - AI-Ready Header Logic]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR9]
- [Source: docs/example-format.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (March 2026)

### Debug Log References

- None

### Completion Notes List

- Created `markdown-templates.ts` with AI-Ready header template, signature detection (`HEADER_SIGNATURE`), and `buildFileContent()` orchestrator
- Header includes AI agent instructions, priority legend, and "Living Document" guidance per BMad standard
- `formatTaskAsMarkdown()` generates per-task markdown with title, ISO date, priority indicator, and indented description
- `buildFileContent()` handles 3 scenarios: new file (header+tasks), existing without header (inject header+append), existing with header (append only)
- Refactored `sync-service.ts` to delegate markdown formatting and header logic to `markdown-templates.ts`
- Updated `commitTasks()` to pass username for header personalization
- 19 new unit tests in markdown-templates.test.ts + 3 header injection tests in sync-service.test.ts
- Format verified against `docs/example-format.md` — uses `- [ ]` checkboxes, timestamps, and structured metadata
- No regressions introduced

### Change Log

- 2026-03-14: Implemented Story 4.2 — AI-Ready Header Injection (all ACs satisfied)

### File List

- `src/features/sync/utils/markdown-templates.ts` (new) — AI-Ready header template, task formatting, file content builder
- `src/features/sync/utils/markdown-templates.test.ts` (new) — 19 unit tests for all template functions
- `src/services/github/sync-service.ts` (modified) — Integrated header injection via buildFileContent, removed inline formatting
- `src/services/github/sync-service.test.ts` (modified) — Added 3 header injection tests, updated commitTasks calls
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — Status update
- `_bmad-output/implementation-artifacts/4-2-ai-ready-header-injection.md` (modified) — Story completion
