# Story 4.2: AI-Ready Header Injection

Status: ready-for-dev

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

- [ ] Define the AI-Ready Header (AC: 1, 4)
  - [ ] Create `src/features/sync/utils/markdown-templates.ts` containing the standardized AI-Ready instruction header.
- [ ] Implement Markdown Generator (AC: 2, 3)
  - [ ] Implement `formatTaskAsMarkdown(task: Task)`:
    - **Format:** `- [ ] **Task Title** ([Created: 2026-03-11]) (Priority: {{isImportant}})`
    - **Description:** Included on the next line if available.
- [ ] Integrate Header Injection (AC: 1, 5)
  - [ ] Update `syncPendingTasks()` in `sync-service.ts`:
    - **Step 1:** Check if file content contains the signature header.
    - **Step 2:** If missing, prepend the header to the content.
    - **Step 3:** Append the new tasks.
    - **Step 4:** Push the final content to GitHub.
- [ ] Validation & Test (AC: 2)
  - [ ] Verify the formatting against a sample `captured-ideas.md` file (using the format from `docs/example-format.md`).

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

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
