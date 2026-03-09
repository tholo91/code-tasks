# code-tasks

A GitHub-backed task management PWA — powerful by simplicity.

---

## Vision

Manage tasks and ideas directly in GitHub repositories. Each repository gets a single `captured-ideas.md` file that acts as the source of truth. The app reads and writes this file transparently — but the UI looks and feels exactly like a native task manager (inspired by [Things](https://culturedcode.com/things/)): individual task cards, smooth animations, quick capture, detail views.

The genius is in the gap: **one clean Markdown file in the background, a beautiful task app in the foreground.**

---

## The Single-File Model

Each repository contains exactly one task file (e.g. `captured-ideas.md`). Every user action — adding, editing, reordering, completing, archiving a task — modifies this file. The file is always human-readable and usable without the app.

### File structure

```markdown
<!-- AI: This is a list of raw ideas and tasks. Please ask me what you should do with them. -->

## Buy better coffee

Created: 2026-01-15 09:32
Last edit: 2026-01-16 14:05
Status: open
Priority: high
Tags: personal, shopping

### Content

- Whole beans, not ground
- Try a local roaster

### Description

I keep running out mid-week. Need to set up a standing order or at least
stock up. The Chemex deserves better.

---

## Refactor auth module

Created: 2026-01-10 11:00
Last edit: 2026-01-10 11:00
Status: done

### Content

- Extract token refresh logic
- Add unit tests

---

## Old idea I never acted on

Created: 2025-12-01 08:00
Last edit: 2026-01-02 09:15
Status: archived
```

### Status values

| Value      | Meaning                          |
|------------|----------------------------------|
| `open`     | Active, visible in the main list |
| `done`     | Completed, hideable via toggle   |
| `archived` | Hidden from all default views    |

---

## UI — Things-Inspired

The file is invisible to the user. What they see is a clean, animated task interface:

- **Task list** — each `## Heading` becomes a card
- **Quick capture** — tap `+` or press a shortcut; a fast input appears; hitting Enter creates the task instantly and animates it into the list
- **Task detail** — tapping a card slides in a detail panel (no page navigation, just a panel); shows title, content checklist, Markdown description, timestamps, priority, tags
- **Drag & drop** — cards reorder smoothly; the file is rewritten in the new order
- **Done** — checking a task crosses it out and dims it; a toggle shows/hides all done tasks
- **Archive** — swipe or use a menu action; archived tasks disappear from view

### Animations

All transitions should feel intentional and light — not decorative:

- New task: slides in from bottom, fades up
- Delete/archive: slides out to the right, collapses height
- Detail panel: slides in from the right (or bottom on mobile); dismisses with back-swipe or Escape
- Done: smooth strikethrough + opacity fade
- Drag: card lifts (subtle shadow), list items shift fluidly, drops snap into place

---

## Features

### Authentication & Data
- **Sign in with GitHub** — OAuth, no separate account needed
- **GitHub as backend** — one `captured-ideas.md` per repo
- **Autosave** — every change is written to local storage instantly; no manual save
- **Push to GitHub** — a FAB appears when local changes are ahead of the remote; tapping it commits and pushes to `main`

### Offline & Platform
- **PWA** — installable on desktop and mobile
- **Offline-first** — works without a connection; syncs when back online

### Repository & Project Management
- **Starred repositories** — pinned at the top of the repo list, separated visually from the rest
- **Repository sorting** — unstarred repos sorted by last-modified task (descending)
- **Create new project** — create a new GitHub repo from within the app; the task file is initialized automatically

### Task Management
- **Quick capture** — minimal friction; just a title is enough to create a task
- **Drag & drop** — reorder tasks; order is persisted to the file
- **Timestamps** — `Created` and `Last edit` set and updated automatically
- **Priority** — optional: `high`, `medium`, `low` (or none)
- **Tags** — free-form, comma-separated
- **Done / Archive** — two distinct states; archive is the "out of sight, not deleted" escape hatch
- **Show/hide done** — toggle completed tasks in the list view

### Task Detail View
- Slides in on task tap; no full page load
- Editable title
- Checklist editor for `### Content` items
- Markdown editor for `### Description` (preview/edit toggle)
- Timestamps shown (read-only)
- Priority selector and tag input
- Archive and delete actions

---

## UX Principles

- **Powerful by simplicity** — every feature earns its place
- **Zero learning curve** — it looks like a to-do app; GitHub is an implementation detail
- **GitHub-transparent** — `captured-ideas.md` is always clean, readable, and editable without the app
- **Coherent motion** — animations reinforce the mental model (things slide in from where they'll live; they leave toward where they're going)

---

## Open Questions

- [ ] **File naming** — `captured-ideas.md`, `tasks.md`, or user-configurable per repo?
- [ ] **Multiple lists per repo** — strictly one file, or allow named lists (e.g. `backlog.md`, `sprint.md`)? If multiple, how does the UI surface them?
- [ ] **Task order in file** — newest on top, or preserve drag-drop order (file order = display order)?
- [ ] **Conflict resolution** — if the same file is edited on two devices before a push, how does the app handle a merge conflict?
- [ ] **FAB scope** — push only the current repo, or a global "push all pending" action?
- [ ] **Priority in Markdown** — frontmatter YAML (`---` block at top of task) or inline field as used above?
- [ ] **AI agent prompt** — HTML comment (invisible in rendered Markdown) or a visible blockquote at the top of the file?
- [ ] **Repo creation flow** — public or private by default? Does the app commit an initial `captured-ideas.md` on creation?
