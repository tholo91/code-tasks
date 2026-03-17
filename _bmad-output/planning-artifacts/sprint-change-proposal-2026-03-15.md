# Sprint Change Proposal — 2026-03-15

**Triggered by:** Thomas (Product Owner) — live testing revealed fundamentally broken UX
**Scope:** Moderate — new epic, paused epic, artifact updates, significant implementation
**Recommended Path:** Direct Adjustment — New Epic 7

---

## Section 1: Issue Summary

**Problem:** The code-tasks app has a functional backend (auth, sync, persistence) but a fundamentally broken frontend UX that prevents it from being used as a task capture and management tool. The passphrase gate blocks quick capture, tasks aren't scoped to repositories, and basic todo operations (complete, edit, delete, reorder) don't exist. The "Pulse" swipe-up interaction is the only way to create tasks and is undiscoverable.

**Core Philosophy Reminder:** Gitty is a lightweight frontend for a single `captured-ideas-{username}.md` file per GitHub repository. It is NOT a database-backed app. The markdown file IS the backend. Purpose: quick capture on-the-go for AI agent handoff.

**Discovery:** Thomas tested the live app and couldn't figure out how to create tasks. Previous "UI redesign" (PR #14) added visual polish but didn't address the interaction model.

**Evidence:**
- No `isCompleted` field, no `toggleComplete`, no `updateTask`, no `deleteTask`
- No FAB button, no bottom sheet for task creation
- No task detail view
- No per-repo task scoping (single flat `tasks[]` array)
- Passphrase required every session despite Story 1.3 claiming "persistent session"
- PulseInput: 354 lines of undiscoverable swipe gesture code

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Current Status | Impact |
|------|---------------|--------|
| Epic 1 (Secure Vault) | done | Backend OK, passphrase gate needs removal |
| Epic 2 (The Target) | done | Backend OK, tasks need repo scoping |
| Epic 3 (The Pulse) | done | Frontend needs complete replacement |
| Epic 4 (The Bridge) | done | Sync needs per-repo adaptation |
| Epic 5 (The Village) | in-progress | **PAUSED** — resume after Epic 7 |
| Epic 6 (UX Polish) | in-progress | **ABSORBED** into Epic 7 |
| **Epic 7 (NEW)** | **backlog** | **9 stories — complete UX overhaul** |

### Artifact Updates Required

- **PRD:** Add FR10–FR12, update FR1/FR3/FR4
- **Architecture:** Refactor data model (per-repo tasks), simplify auth, extend store actions
- **UX Spec:** Move Phase 2/3 features into Phase 1, add FAB creation flow, completed section
- **Sprint Status:** Add Epic 7, pause Epic 5, absorb Epic 6
- **Epics Doc:** Add Epic 7 with full story breakdown

---

## Section 3: Recommended Approach

**Path: Direct Adjustment — New Epic 7 "The Real App"**

**Rationale:** The backend infrastructure (auth validation, Octokit service layer, sync engine, IDB persistence) is solid and reusable. What's broken is the interaction layer on top. We add a new epic that replaces the frontend UX while leveraging existing services.

**Effort:** Medium overall
**Risk:** Low — additive, not destructive
**Timeline:** Extends current sprint by ~1 full sprint cycle

### Epic 7: The Real App — Story Breakdown

| Story | Title | Effort | Priority |
|-------|-------|--------|----------|
| 7.1 | Remove passphrase gate — auto-unlock with persisted token | Low | P0 |
| 7.2 | Per-repo task lists — scope tasks to selectedRepo in store + IDB | Medium | P0 |
| 7.3 | FAB + Bottom Sheet task creation (replace PulseInput as primary) | Medium | P0 |
| 7.4 | Task list with checkboxes, completion toggle, animated strikethrough, completed section | Medium | P0 |
| 7.5 | Things-style task detail view — markdown body, inline edit, auto-save, repo reassignment | Medium | P1 |
| 7.6 | Drag & drop reorder in list view | Medium | P1 |
| 7.7 | Task deletion with confirmation | Low | P1 |
| 7.8 | Branch protection detection + user guidance | Low | P2 |
| 7.9 | Sync UX polish — change detection, clear "Push to GitHub" CTA, per-repo sync | Medium | P1 |

---

## Section 4: Detailed Change Proposals

### 4.1 Epics Document — ADD Epic 7

```markdown
### Epic 7: The Real App (Task Management UX Overhaul)
Transform Gitty from a capture experiment into a real, native-feeling todo app.
Each GitHub repository is treated as a project with its own task list backed by
a single captured-ideas-{username}.md file. Quick Capture via FAB is prioritized.
Users can create, complete, edit, delete, and reorder tasks. The app opens
instantly without passphrase gates. Sync to GitHub is explicit and clear.

**FRs covered:** FR4 (updated), FR10, FR11, FR12
```

### 4.2 PRD — ADD Functional Requirements

```markdown
- **FR10:** Users can mark tasks as complete, edit task details inline, and delete tasks.
- **FR11:** Users can reorder tasks via drag & drop within a repository's task list.
- **FR12:** Each repository maintains an independent task list, scoped to that repo.
```

### 4.3 PRD — UPDATE Existing FRs

**FR4:**
```
OLD: Users can enter task titles/descriptions via the "Pulse" interface.
NEW: Users can create tasks via a FAB (+) button that opens a structured bottom sheet
     (title, notes, priority). Keyboard shortcut (Cmd+Enter) retained as power-user path.
```

**FR1/FR3:**
```
OLD: FR3 implies passphrase-protected token storage requiring per-session unlock.
NEW: Token persists encrypted at rest without per-session passphrase. Device-level
     encryption (passcode/biometric) provides the security layer. Users set the token
     once and never re-enter it.
```

### 4.4 Architecture — UPDATE Data Model

```
OLD: tasks: Task[] (flat global array)
NEW: tasksByRepo: Record<string, Task[]> (keyed by repo fullName)
     Each Task gains: isCompleted, completedAt, order (number for drag & drop)
```

### 4.5 Architecture — ADD Store Actions

```
updateTask, deleteTask, toggleComplete, reorderTasks, moveTaskToRepo
All operations are repo-scoped via selectedRepo context.
```

### 4.6 Architecture — UPDATE Auth

```
OLD: AES-GCM encryption with user-provided passphrase, unlock required per session
NEW: AES-GCM encryption with device-derived key, auto-unlock on app load.
     Remove PassphraseUnlock component entirely.
```

### 4.7 UX Spec — UPDATE Component Roadmap

```
OLD Phase 1: Pulse Input, Task Card (Basic), GitHub OAuth
NEW Phase 1: FAB + Bottom Sheet, Task Card (Full CRUD), Checkboxes, Detail View,
             Drag & Drop, Per-Repo Lists, Sync CTA
```

---

## Section 5: Implementation Handoff

**Scope Classification: Moderate**

### Handoff Plan

| Role | Responsibility |
|------|---------------|
| SM (Bob) | Update epics.md, sprint-status.yaml, create story files for 7.1–7.9 |
| Dev Agent | Implement stories in priority order: 7.1 → 7.2 → 7.3 → 7.4 → 7.5–7.9 |
| Thomas | Review and test each story on mobile before marking done |

### Success Criteria

- [ ] App opens without passphrase — straight to last-used repo's task list
- [ ] Each repo has its own independent task list
- [ ] FAB (+) button creates tasks via bottom sheet
- [ ] Tasks can be checked off with animated strikethrough
- [ ] Completed tasks appear in a separate section
- [ ] Task detail view supports markdown editing
- [ ] Drag & drop reordering works on mobile
- [ ] Tasks can be deleted
- [ ] "Push to GitHub" is clear and explicit
- [ ] The whole experience feels like a native todo app

---

**Approved by:** Thomas (2026-03-15)
**Next action:** SM updates planning artifacts, then Dev Agent begins Story 7.1
