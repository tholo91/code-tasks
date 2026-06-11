# Gitty — code-tasks

> **Frictionless task capture for developers who work with AI agents.**

Gitty is an offline-first PWA that bridges the gap between a quick idea and a GitHub issue. It writes to a plain markdown file (`captured-ideas-{username}.md`) in your repo — no database, no extra accounts, no merge conflicts.

**Live app:** [code-tasks.vercel.app](https://code-tasks.vercel.app)

---

## How it works

1. **Capture** — one tap to add an idea from any device
2. **Sync** — pushes to `captured-ideas-{username}.md` in your GitHub repo
3. **Hand off** — the file is pre-formatted for AI agents (Claude, Gemini, etc.) to pick up and execute

Every list starts with a persistent AI prompt so your task file is instantly actionable — no extra formatting needed.

---

## Key features

- **Offline-first** — ideas are stored locally, synced when you're ready
- **AI-native** — markdown format designed for agent ingestion
- **Privacy-safe collaboration** — per-user files prevent merge conflicts in shared repos
- **Magic Link auth** — no password, no account beyond your GitHub OAuth
- **PWA + Capacitor** — installable on mobile and desktop

---

## Getting started (local dev)

**Prerequisites:** Node 20+, a GitHub OAuth App

```bash
git clone https://github.com/tholo91/code-tasks
cd code-tasks
npm install
cp .env.example .env.local   # add your GitHub OAuth credentials
npm run dev
```

Open `http://localhost:5173`.

---

## Project structure

```
src/
  components/    # Shared UI components
  features/      # Feature modules: auth, repos, capture, community
  services/      # GitHub API (Octokit) and storage layers
  stores/        # Zustand state
  types/         # TypeScript interfaces
  hooks/         # Custom React hooks
  utils/         # Utility functions
  config/        # App-wide constants (APP_NAME, APP_VERSION)
```

Key directories:

| Path | What's in there |
|------|----------------|
| `_bmad/` | AI agent workflows (BMAD framework) |
| `_bmad-output/` | PRD, architecture, epics, sprint status |
| `docs/` | Vision doc and architectural decisions |

---

## Using Gitty with Claude Code

This repo ships a `/captured-ideas` slash command in `.claude/commands/captured-ideas.md`. Run `/captured-ideas` in Claude Code to fetch the freshest `captured-ideas-*.md` across all branches and print your open captures grouped by priority. No manual `git fetch`, no branch hunting.

> **Where are the captures?** Gitty syncs each user's task file to a dedicated branch (by default `gitty/<username>`), not to `main`. If you don't see a `captured-ideas-*.md` on the branch you're on, that's expected — run `/captured-ideas` (it scans all branches), or `git fetch && git branch -r | grep gitty/` to find it.

To use it in another Gitty-managed repo, copy that one file into that repo's `.claude/commands/` directory (manual install, auto-distribution is a future story).

Broader agent support (Cursor, Codex, Gemini CLI) is planned via an AGENTS.md convention.

---

## Contributing

The project is open and community-driven — "Wir bauen das zusammen."

1. Check [`_bmad-output/implementation-artifacts/sprint-status.yaml`](./_bmad-output/implementation-artifacts/sprint-status.yaml) for open stories
2. Open a PR against `main`
3. Keep commits in English, run `npm test` before pushing

Have a feature idea or feedback? Drop a voice note — it takes 30 seconds:
**[Leave feedback on heyspeak.io](https://www.heyspeak.io/l/dPAgTYLhiBV_veeNE8Tq1w)**

---

## Tech stack

React 19 · Vite 7 · TypeScript · Zustand · TailwindCSS 4 · Octokit · Capacitor 8 · Vitest

---

*Built for developers, by a developer.*
