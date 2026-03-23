# CLAUDE.md — Project Instructions for Claude Code

## Project Overview

**code-tasks ("Gitty")** is a PWA for frictionless developer task capture, backed by GitHub repositories. Built with React 19, Vite 7, TypeScript, Zustand, and Octokit. Mobile-first, offline-capable, designed to feel native.

## BMAD Framework — ALWAYS USE

This project uses the **BMAD (Business Maturity Agile Development)** framework for all planning, tracking, and implementation work. Claude Code MUST integrate with it.

### Core Principle

Never work ad-hoc. All significant work flows through BMAD workflows and artifacts.

### Key Paths

- **BMAD Core Engine:** `_bmad/core/tasks/workflow.xml` — load this FIRST when executing any BMAD workflow
- **BMAD Config:** `_bmad/bmm/config.yaml` — project settings and variable definitions
- **Planning Artifacts:** `_bmad-output/planning-artifacts/` — PRD, architecture, epics, UX spec
- **Implementation Artifacts:** `_bmad-output/implementation-artifacts/` — story files and sprint-status.yaml
- **Sprint Status:** `_bmad-output/implementation-artifacts/sprint-status.yaml` — source of truth for progress

### When to Use Which BMAD Skill

| Situation | Skill / Command |
|-----------|----------------|
| "What should I work on next?" | `/bmad-bmm-sprint-status` |
| "Implement story X" or "dev this story" | `/bmad-bmm-dev-story` |
| "Create the next story" | `/bmad-bmm-create-story` |
| "Run code review" | `/bmad-bmm-code-review` |
| "Run sprint planning" | `/bmad-bmm-sprint-planning` |
| "Create a quick spec" for small changes | `/bmad-bmm-quick-spec` then `/bmad-bmm-quick-dev` |
| New feature idea or brainstorming | `/bmad-brainstorming` |
| "What do I do now?" | `/bmad-help` |

### BMAD Workflow Execution Rules

1. **Always load** `_bmad/core/tasks/workflow.xml` first — it is the execution engine
2. **Read the workflow.yaml** for the specific skill being invoked
3. **Follow workflow.xml instructions exactly** — do not skip steps
4. **Save outputs after each section** when generating documents from templates
5. **Update sprint-status.yaml** after completing or starting any story

### Sprint Status Updates

After implementing a story or changing story status:
- Update `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Update the story file's `Status:` field
- Commit and push changes

## Tech Stack & Conventions

- **Framework:** React 19 + Vite 7 + TypeScript 5.8
- **State:** Zustand with persist middleware
- **Styling:** TailwindCSS 4, GitHub Dark Dimmed palette
- **GitHub API:** Octokit SDK (centralized service layer in `src/services/github/`)
- **Storage:** LocalStorage with AES-GCM encryption for sensitive data
- **PWA:** @vite-plugin-pwa, Capacitor 8 for native bridge
- **Testing:** Vitest + Testing Library
- **Linting:** ESLint

### Project Structure

```
src/
  components/    # Shared UI components
  features/      # Feature modules (auth/, repos/, capture/, community/)
  services/      # API and storage layers
  stores/        # Zustand stores
  types/         # TypeScript interfaces
  hooks/         # Custom React hooks
  utils/         # Utility functions
  config/        # App configuration constants
  data/          # Static data (e.g. roadmap)
```

### Naming Conventions

- Components: PascalCase (`PulseInput.tsx`)
- Hooks: camelCase with `use` prefix (`useSyncStore.ts`)
- Services: kebab-case (`auth-service.ts`)
- Types: PascalCase interfaces in dedicated type files
- Store files: camelCase with `use` prefix

## Communication

- **User name:** Thomas
- **Communication language:** German or English (Thomas switches between both — match his language)
- **Document output language:** English
- **Project spirit:** Community-first indie project. "Wir bauen das zusammen." Not a startup, not SaaS.

## Task Discovery — Check Before Starting Work

At the start of every session or when asked "what's next", always check:

```
captured-ideas-{username}.md
```

The live file for this repo is **`captured-ideas-tholo91.md`** in the root. It contains Thomas's open tasks (unchecked `- [ ]` items) captured directly from the Gitty app. These are real, unprocessed ideas that may need to be turned into stories, quick specs, or BMAD artifacts.

- Open items (`- [ ]`) = not yet planned or implemented
- Items with `→ Planned: Story X` in their body = already captured in a story file
- Mark items as done (`- [x]`) and append `[Processed by: Claude]` after they have been turned into a story or resolved
- Do NOT manually edit tasks between `managed-start` and `managed-end` markers — the app owns that content

## Versioning

- **Single source of truth:** `package.json` → injected at build time via `__APP_VERSION__` in `vite.config.ts`
- **Central config:** `src/config/app.ts` exports `APP_NAME` and `APP_VERSION` — use these everywhere in code, never hardcode
- **Format:** `major.minor` (int.int, e.g. `1.12`) — no patch, no semver
- **When to bump:** Increment minor version for each deployment with meaningful changes

## Git Practices

- Commit messages in English, clear and descriptive
- Push to feature branches, not directly to main/master
- Run tests before committing implementation changes: `npm test`
- Build check: `npm run build`
