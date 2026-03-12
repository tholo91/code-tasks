# Markdown Format Specification

The `captured-ideas.md` file is the heart of `code-tasks`. It is designed to be human-readable, AI-actionable, and programmatically parseable.

## File Structure
Every `captured-ideas.md` starts with an AI-native block:

```markdown
<!-- AI: This is a list of raw ideas and tasks. Please ask me what you should do with them. -->
```

Each task is represented as a level-2 heading (`##`) followed by metadata and content sections.

## Task Element Breakdown

### 1. Title (Heading)
```markdown
## Task Title
```
The title serves as the task's primary identifier.

### 2. Metadata
```markdown
Created: 2026-03-12 10:30
Last edit: 2026-03-12 11:15
Status: open
Priority: high
Tags: work, critical
```
- **Status**: `open`, `done`, `archived`.
- **Priority**: `high`, `medium`, `low` (optional).
- **Tags**: Comma-separated strings.

### 3. Content Checklist
```markdown
### Content
- [ ] Task sub-item 1
- [x] Task sub-item 2
```
Sub-tasks are represented as standard Markdown checklist items.

### 4. Description
```markdown
### Description
Detailed notes, context, or further information goes here.
```
This section supports full Markdown syntax for rich descriptions.

---

## Example Task
```markdown
## Refactor Authentication Module

Created: 2026-03-10 09:00
Last edit: 2026-03-11 14:00
Status: open
Priority: medium
Tags: backend, technical-debt

### Content
- [ ] Extract token refresh logic
- [ ] Add unit tests for OAuth flow
- [ ] Update documentation

### Description
The current OAuth flow is becoming cumbersome to manage. Let's move the token management into a dedicated service.
```

## Parsing Rules
- Tasks are separated by the `##` heading.
- Property values (Created, Status, etc.) are expected to be on separate lines.
- The task order in the file determines the display order in the app.
