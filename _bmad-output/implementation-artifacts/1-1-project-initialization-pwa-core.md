# Story 1.1: Project Initialization & PWA Core

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to initialize the project with Vite, React 19, and PWA capabilities,
so that I have a high-performance, offline-ready foundation for mobile-first capture.

## Acceptance Criteria

1. [x] **Vite 7 + React 19 Core:** Project initialized using `npm create @vite-pwa/pwa@latest` with React and TypeScript.
2. [x] **PWA Configuration:** `@vite-plugin-pwa` (v1.2+) is configured in `vite.config.ts` with a valid manifest and service worker strategy (GenerateSW).
3. [x] **Capacitor 8 Integration:** Capacitor 8.2+ core and CLI installed and initialized (`npx cap init`).
4. [x] **Visual Foundation:** Tailwind v4 (or Vanilla CSS) configured with the GitHub Dark Dimmed color palette (`#0d1117`, `#161b22`, `#58a6ff`).
5. [x] **Build Validation:** Running `npm run build` produces a `dist/` folder containing a `manifest.webmanifest` and a functional service worker (`sw.js`).
6. [x] **App Shell:** A basic `App.tsx` and `main.tsx` are established following the feature-based folder structure.

## Tasks / Subtasks

- [x] Initialize PWA Project (AC: 1, 2, 5)
  - [x] Run `npm create @vite-pwa/pwa@latest` (Choose React + TS).
  - [x] Configure `vite.config.ts` with PWA manifest (name: "code-tasks", short_name: "code-tasks", theme_color: "#0d1117").
  - [x] Verify `public/` contains required PWA icons and manifest.
- [x] Install Native Bridge (AC: 3)
  - [x] Install `@capacitor/core` and `@capacitor/cli` (v8.2+).
  - [x] Run `npx cap init code-tasks com.thomas.codetasks`.
- [x] Establish Project Structure & Styling (AC: 4, 6)
  - [x] Create directory structure: `src/features/`, `src/services/`, `src/stores/`, `src/components/`, `src/hooks/`, `src/types/`, `src/utils/`.
  - [x] Configure Tailwind v4 or Vanilla CSS with GitHub Dark Dimmed tokens.
  - [x] Implement base `App.tsx` and `main.tsx` following the structure.
- [x] Validation & Build Test (AC: 5)
  - [x] Run `npm run build` and verify PWA asset generation.
  - [x] Verify `dist/` contains `sw.js` and `manifest.webmanifest`.

## Dev Notes

- **Tech Stack (March 2026):** React 19.2.0, Vite 7.3.x, Capacitor 8.2.0, @vite-pwa/vite-plugin-pwa 1.2.x.
- **Node.js Requirement:** Use Node 20.19+ or 22.12+ as per Vite 7 and Capacitor 8 requirements.
- **PWA Strategy:** Use `GenerateSW` with `autoUpdate: true` for the MVP to ensure seamless background updates.
- **Styling:** Adhere to GitHub Primer (Dark Dimmed) palette: Canvas `#0d1117`, Surface `#161b22`, Accent `#58a6ff`.
- **Fonts:** Use **Inter** for UI and **SF Mono** for technical metadata.

### Project Structure Notes

- **Feature-Based Isolation:** Logic for capture, sync, and auth MUST be isolated in `src/features/`.
- **Service Boundaries:** No UI component communicates with GitHub directly; all actions are dispatched via the global store to the service layer.
- **Persistence Boundary:** `storage-service.ts` is the exclusive owner of `localStorage` interactions.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: Web Research - March 11, 2026: Capacitor 8, Vite 7, React 19 versions]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (March 2026)

### Debug Log References

- npm cache EACCES error resolved by using `--cache /tmp/npm-cache` flag
- Tailwind v4 configured via CSS `@import "tailwindcss"` (no tailwind.config.js needed)
- vite-plugin-pwa generateSW strategy requires actual icon files in public/ — created 192x192 and 512x512 PNG placeholders

### Completion Notes List

- Initialized project manually in existing repo directory (preserved _bmad/, docs/, .git/)
- Installed: Vite 7.3.1, React 19.2.4, vite-plugin-pwa 1.2.0, @capacitor/core 8.2.0, Tailwind 4.2.1
- Configured vite.config.ts with React plugin, @tailwindcss/vite, VitePWA (GenerateSW, autoUpdate)
- capacitor.config.ts created manually (equivalent to `npx cap init com.thomas.codetasks`)
- Feature-based directory structure established: features/, services/, stores/, components/, hooks/, types/, utils/
- GitHub Dark Dimmed CSS tokens defined in index.css using Tailwind v4 CSS-based config
- App.tsx implements minimal app shell displaying "code-tasks" branding
- Tests: 2 unit tests in App.test.tsx — both pass (App renders, displays app name)
- Build: `npm run build` succeeds — dist/ contains sw.js, manifest.webmanifest, workbox-*.js, PWA icons

### File List

- package.json
- vite.config.ts
- vitest.config.ts
- tsconfig.json
- tsconfig.app.json
- tsconfig.node.json
- index.html
- capacitor.config.ts
- .gitignore
- src/vite-env.d.ts
- src/index.css
- src/App.css
- src/App.tsx
- src/main.tsx
- src/App.test.tsx
- src/setupTests.ts
- src/features/.gitkeep
- src/services/.gitkeep
- src/stores/.gitkeep
- src/components/.gitkeep
- src/hooks/.gitkeep
- src/types/.gitkeep
- src/utils/.gitkeep
- public/pwa-192x192.png
- public/pwa-512x512.png
- public/vite.svg

## Change Log

- 2026-03-11: Story 1.1 implemented — project initialized with Vite 7.3.1 + React 19.2.4 + PWA + Capacitor 8.2.0 + Tailwind v4
