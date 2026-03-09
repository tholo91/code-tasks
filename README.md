# code-tasks

A GitHub-backed task management PWA — powerful by simplicity.

---

## Vision

Manage tasks and ideas directly in GitHub repositories. Tasks are stored as Markdown files, synced to GitHub, and accessible from any device. The app feels as fast as a native app while being a PWA.

---

## Core Concepts

### Task Format

Each task is stored in Markdown and follows this structure:

```markdown
## Task XYZ

Created: 2024-01-15 09:32
Last edit: 2024-01-16 14:05

### Content

- Sub-item one
- Sub-item two

### Description

I need this because… (supports full Markdown, like the Things mobile app detail view)
```

### Task List File

At the top of every task-list `.md` file, an AI agent prompt is included:

```markdown
<!-- AI: This is a list of raw ideas and tasks. Please ask me what you should do with them. -->
```

---

## Features

### Authentication & Data
- **Sign in with GitHub** — OAuth, no separate account needed
- **GitHub as backend** — tasks live in repos as Markdown files
- **Autosave** — changes are saved locally instantly
- **Push to GitHub** — a FAB (floating action button) appears whenever tasks in a repository have unpushed changes; tapping it pushes to `main`

### Offline & Platform
- **PWA** — installable, works offline
- **Offline-first** — all reads/writes go to local storage first, synced to GitHub when online

### Repository & Project Management
- **Create new projects** — optionally bootstrap a new GitHub repo from within the app
- **Starred repositories** — pinned repos appear in their own section above the rest
- **Repository sorting** — sorted by last-modified task (descending)

### Task Management
- **Quick capture** — fast, minimal input to create a task (like Things' Quick Entry)
- **Drag & drop** — reorder tasks within a list
- **Timestamps** — every task records `Created` and `Last edit`
- **Priority / Tags** — optional metadata to keep tasks organized without cluttering the UI
- **Done state** — check/uncheck tasks to mark them complete
- **Archive** — archive tasks to remove them from the active view
- **Show/hide completed** — toggle visibility of done tasks

### Task Detail View
- Slides in when a task is tapped (inspired by the Things app)
- Full Markdown editor for the description
- Shows created/last-edit timestamps
- Priority and tag assignment

---

## UX Principles

- **Powerful by simplicity** — every feature earns its place; no clutter
- **Feels native** — fast transitions, offline-capable, installable
- **GitHub-transparent** — the underlying Markdown files are always clean and human-readable without the app

---

## Open Questions

- [ ] Conflict resolution when the same file is edited on two devices before a push
- [ ] Should priority be a frontmatter field or inline Markdown notation?
- [ ] FAB push: push only the changed repo, or allow multi-repo batch push?
- [ ] Tag taxonomy: free-form strings, or a predefined set per repo?
