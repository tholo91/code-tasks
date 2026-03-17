---
stepsCompleted: ["step-01-init", "step-02-context", "step-03-starter", "step-04-decisions", "step-05-patterns", "step-06-structure", "step-07-validation"]
inputDocuments: ["_bmad-output/planning-artifacts/prd.md", "_bmad-output/planning-artifacts/product-brief-code-tasks-2026-03-10.md", "docs/research-impulses.md", "docs/vision.md", "docs/example-format.md", "docs/the-gitty-chronicles.md"]
workflowType: 'architecture'
project_name: 'code-tasks'
user_name: 'Thomas'
date: '2026-03-10'
lastEdited: '2026-03-17'
editHistory:
  - date: '2026-03-16'
    changes: 'Course Correction: Updated data model (per-repo tasks, completion, ordering), auth (device-derived key, no passphrase), component architecture (FAB + Bottom Sheet, TaskDetailSheet, drag & drop), replaced Pulse references with current task management paradigm.'
  - date: '2026-03-17'
    changes: 'Epic 8 additions: SortMode type, repoSortModes + repoInstructions in store, updated getAIReadyHeader signature, new components (SortModeSelector, RepoSettingsSheet, SyncResultToast, AboutGittyView), iOS visualViewport keyboard fix pattern.'
---

...

## Architecture Validation Results

### Coherence Validation ✅
- **Decision Compatibility:** All technology choices (Octokit, LocalStorage, Zustand) are lightweight and perfectly compatible with the React 19 / Vite 7 / PWA stack.
- **Pattern Consistency:** Implementation patterns (Octokit Service Layer, Zustand Sync Heartbeat) directly support the core architectural decisions for speed and reliability.
- **Structure Alignment:** The feature-based folder structure (`src/features/`) provides clear isolation for capture, sync, and auth logic.

### Requirements Coverage Validation ✅
- **Functional Requirements Coverage:** Every FR from the PRD is mapped to a specific feature module or service layer.
- **Non-Functional Requirements Coverage:** Performance targets (< 1.5s TTI) are addressed via the lightweight "Lean & Mean" stack and LocalStorage synchronous buffer.

### Implementation Readiness Validation ✅
- **Decision Completeness:** All critical decisions (Persistence, Auth, Integration) are documented with 2026-verified versions.
- **Structure Completeness:** A specific, feature-based project tree has been defined to guide AI agents.
- **Pattern Completeness:** Naming, state management, and error handling patterns are clearly defined and enforceable.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION
**Confidence Level:** High

**Key Strengths:**
- **Capture Velocity:** FAB (+) → Bottom Sheet → instant local persist. One-tap creation meets the "5-second capture" goal.
- **Markdown-as-Backend:** Each repo's `captured-ideas-{username}.md` IS the database. The app is a beautiful, native-feeling frontend for a single markdown file per project.
- **Sync Integrity:** Octokit-driven "Get-Modify-Set" pattern with conflict retry prevents remote data loss.
- **Modular Evolution:** Feature-based structure facilitates growth without debt.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented.
- Use the Octokit Service Layer for all GitHub interactions.
- Adhere to the feature-based project structure.

**First Implementation Priority:**
Initialize the core project: `npm create @vite-pwa/pwa@latest`

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
code-tasks/
├── public/                     # Static assets (logo, manifest.json, sw.js)
├── src/
│   ├── components/             # Shared UI components
│   │   ├── auth/               # AuthGuard, hydration logic
│   │   ├── layout/             # AppHeader, SyncHeaderStatus
│   │   └── ui/                 # Skeletons, shared primitives
│   ├── config/                 # App configuration (motion.ts constants)
│   ├── features/               # Feature-based modules
│   │   ├── auth/               # PAT entry, validation, AuthForm
│   │   ├── capture/            # Task CRUD — the core interaction layer
│   │   │   ├── components/     # CreateTaskFAB, CreateTaskSheet, TaskCard,
│   │   │   │                   # TaskDetailSheet, PriorityPill, TaskSearchBar,
│   │   │   │                   # PriorityFilterPills
│   │   │   └── utils/          # fuzzy-search, filter-tasks
│   │   ├── community/          # Roadmap teaser, voting (paused)
│   │   ├── repos/              # Repository selection, RepoSelector
│   │   └── sync/               # SyncFAB, sync status, useAutoSync hook
│   │       └── utils/          # markdown-templates (AI-Ready header, task formatting)
│   ├── hooks/                  # Shared React hooks (useNetworkStatus)
│   ├── services/               # Infrastructure / API layer
│   │   ├── github/             # Octokit provider, auth-service, sync-service
│   │   ├── native/             # Haptic feedback (haptic-service.ts)
│   │   └── storage/            # IDB + LocalStorage persistence
│   ├── stores/                 # Zustand global state (useSyncStore.ts)
│   ├── types/                  # Shared TypeScript interfaces (task.ts)
│   ├── utils/                  # Pure utility functions (uuid, formatting)
│   ├── App.tsx                 # Main app shell — view routing, task list,
│   │                           # bottom sheet orchestration, Active/Completed split
│   ├── index.css               # Design system tokens + utility classes
│   └── main.tsx                # Entry point
├── capacitor.config.ts         # Native bridge config
├── vite.config.ts              # PWA and build config
└── package.json                # Dependencies (React 19, Vite 7, Octokit, Zustand,
                                # Framer Motion, Fuse.js, TailwindCSS 4)
```

### Architectural Boundaries

**Service Boundaries:**
- **The Sync Boundary:** No UI component communicates with GitHub directly. All actions are dispatched via the `useSyncStore`, which coordinates with the `github-service.ts`.
- **The Persistence Boundary:** `storage-service.ts` is the exclusive owner of `localStorage` interaction, acting as a synchronous local-first buffer for the sync engine.

**Component Boundaries:**
- **Feature-Based Isolation:** Logic for "Capture" vs. "Sync" vs. "Auth" is strictly isolated in `src/features/`. Cross-feature communication is handled via the global `useSyncStore`.
- **Bottom Sheet System:** All modal interactions (CreateTaskSheet, TaskDetailSheet, RepoPickerSheet) share a consistent spring-animated bottom sheet pattern. Sheet orchestration lives in `App.tsx`.

**Data Boundaries:**
- **AI-Ready Header Logic:** The `sync` service encapsulates all logic for detecting new repository files and injecting the AI-Ready header.
- **Per-Repo Task Scoping:** Tasks are stored flat in `useSyncStore.tasks[]` but always filtered by `selectedRepo.fullName` before display. Each repo acts as an independent project.

### Requirements to Structure Mapping

**Feature/Epic Mapping:**
- **Identity & Auth (Epics 1, 7.1):** `src/features/auth/`, `src/services/github/auth-service.ts`, `src/components/auth/`
- **Task Management (Epics 3, 7.3–7.7):** `src/features/capture/` — CreateTaskFAB, CreateTaskSheet, TaskCard, TaskDetailSheet, drag & drop reorder, deletion
- **Sync Engine (Epics 4, 7.9):** `src/features/sync/`, `src/services/github/sync-service.ts`
- **Repo Selector (Epics 2, 7.2):** `src/features/repos/`, per-repo task scoping in `useSyncStore`
- **Community (Epic 5, paused):** `src/features/community/`

**Cross-Cutting Concerns:**
- **Global State:** `src/stores/useSyncStore.ts`
- **Offline Reliability:** `src/services/storage/storage-service.ts`
- **PWA Configuration:** `vite.config.ts`, `public/manifest.json`, `public/sw.js`

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Code Naming Conventions:**
- **Components:** `PascalCase` (e.g., `TaskCard.tsx`, `CreateTaskFAB.tsx`, `TaskDetailSheet.tsx`).
- **Services/Utils:** `kebab-case` (e.g., `github-service.ts`, `storage-service.ts`, `haptic-service.ts`).
- **Hooks:** `camelCase` with `use` prefix (e.g., `useSyncStore.ts`, `useAutoSync.ts`).
- **CSS:** Utility classes in `index.css` (e.g., `.btn-primary`, `.text-body`, `.input-field`). TailwindCSS 4 for layout.

### Structure Patterns

**Project Organization:**
- **Components:** Organized by feature (e.g., `src/features/capture/components`).
- **Services:** Centralized in `src/services/` (e.g., `src/services/github/`).
- **State:** Centralized in `src/stores/` (e.g., `src/stores/useSyncStore.ts`).
- **Tests:** Co-located with source files (e.g., `github-service.test.ts` next to `github-service.ts`).

### Format Patterns

**Data Exchange Formats:**
- **JSON Fields:** `camelCase` (e.g., `lastSyncedAt`, `isImportant`).
- **Date Format:** ISO 8601 strings for all timestamps.
- **Null Handling:** Explicit `null` for missing values, never `undefined` in stored data.

### State Management Patterns

**Sync Heartbeat:**
- All synchronization states (Offline, Pending count, Syncing status) MUST be managed in a single **Zustand store** (`useSyncStore`).
- **Write-Through Pattern:** Data is written to `localStorage` synchronously BEFORE updating the Zustand store to prevent data loss on crash.

### Process & Testing Patterns

**Error Handling:**
- **Silent-but-Visible Sync:** Background sync errors do not use intrusive alerts; they update the UI state (e.g., FAB turns red) for non-blocking recovery.
- **Retry Logic:** Exponential backoff for GitHub API calls, managed within the `github-service.ts`.

**Debug & Diagnostics:**
- **Hidden Debug UI:** A development-only debug overlay (`<DebugOverlay />`) used to manually toggle network states (Online/Offline) and clear local buffers for E2E testing.
- **Enforcement:** `import.meta.env.MODE === 'development'` check to ensure debug tools are excluded from production builds.

### Enforcement Guidelines

**All AI Agents MUST:**
- Use the **Octokit Service Layer** for all GitHub interactions; no raw `octokit` calls in UI components.
- Adhere to the **Atomic Commit** pattern: Pull -> Merge Local -> Push to prevent overwriting remote changes.
- Ensure 100% test coverage for all sync-retry and data-persistence logic.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- **Persistence Engine:** LocalStorage for immediate, synchronous "Midnight Spark" capture.
- **Auth Strategy:** GitHub Personal Access Tokens (PAT) for the leanest possible MVP.
- **GitHub Integration:** Official `octokit` library for all repository and file-level operations.

**Important Decisions (Shape Architecture):**
- **State Management:** `zustand` for high-performance, lightweight sync-state tracking.
- **Sync Logic:** Manual "Push" trigger via FAB + Automated "Pull" on app launch.

**Deferred Decisions (Post-MVP):**
- **OAuth Proxy:** Full OAuth flow deferred to Phase 2 (Growth) to prioritize speed-to-market.
- **IndexedDB Migration:** If data requirements exceed 5MB (highly unlikely for Markdown), we'll migrate from LocalStorage.

### Data Architecture

**Core Principle — Markdown-as-Backend:**
The app is a native-feeling frontend for a single `captured-ideas-{username}.md` file per GitHub repository. The markdown file IS the database. There is no server, no API backend. Each repository acts as an independent project.

**Local Persistence — Dual-Layer:**
- **IndexedDB (IDB):** Primary persistent store for task objects. Tasks are persisted to IDB immediately on creation/update (fire-and-forget). IDB survives page reloads and provides offline durability.
- **Zustand + LocalStorage:** In-memory state with `persist` middleware syncing to LocalStorage. Provides instant reactive UI updates. On app load, IDB tasks are merged into Zustand state.
- **Write-Through Pattern:** State updates flow: UI action → Zustand store → IDB persist (async, non-blocking) → UI re-renders from Zustand.

**Task Data Model:**
```typescript
interface Task {
  id: string                    // UUID v4
  username: string              // GitHub login — scoping key
  repoFullName: string          // "owner/repo" — per-repo scoping
  title: string                 // First line of captured text
  body: string                  // Description/notes, may be empty
  createdAt: string             // ISO 8601
  updatedAt: string | null      // ISO 8601 when last edited, null if never edited
  isImportant: boolean          // Priority flag
  isCompleted: boolean          // Completion state
  completedAt: string | null    // ISO 8601 when completed, null if active
  order: number                 // Sort position for drag & drop reorder
  syncStatus: 'pending' | 'synced'
  githubIssueNumber: number | null
}

// Epic 8 additions
type SortMode = 'manual' | 'created-desc' | 'updated-desc' | 'priority-first'
```

**Epic 8 Store Additions (useSyncStore):**
```typescript
repoSortModes: Record<string, SortMode>    // UI pref — persisted, keyed by normalizeRepoKey(fullName)
repoInstructions: Record<string, string>   // Custom AI header text per repo — persisted

setRepoSortMode(repoFullName, mode)        // Sets sort preference for a repo
setRepoInstruction(repoFullName, text)     // Sets custom AI instruction for a repo
```

**Epic 8 Updated API:**
- `getAIReadyHeader(username, customInstruction?)` — optional custom instruction replaces default instructions block
- `sortTasksForDisplay(tasks, { sortMode?, pendingToggleIds? })` — extended with sort mode support
```

**Per-Repo Task Scoping:**
Tasks are stored flat in `useSyncStore.tasks[]` but always filtered by `selectedRepo.fullName.toLowerCase()` before display. Switching repos instantly shows a different task list. Each repo's tasks sync independently to that repo's `captured-ideas-{username}.md`.

**Store Actions (useSyncStore):**
| Action | Purpose |
|--------|---------|
| `addTask(title, body)` | Create task scoped to `selectedRepo`, `syncStatus: 'pending'` |
| `toggleComplete(taskId)` | Flip `isCompleted`, set/clear `completedAt`, reset `syncStatus: 'pending'` |
| `updateTask(taskId, updates)` | Partial update (title, body, isImportant), reset `syncStatus: 'pending'` |
| `moveTaskToRepo(taskId, targetRepoFullName)` | Reassign task to different repo |
| `reorderTasks(repoFullName, orderedTaskIds)` | Persist new sort order for active tasks |
| `removeTask(taskId)` | Delete from store + IDB |
| `markTaskSynced(taskId, issueNumber)` | Mark as synced after GitHub push |
| `loadTasksFromIDB()` | Merge IDB tasks into Zustand on app load |

**Markdown Sync Format:**
```markdown
- [ ] **Task Title** ([Created: 2026-03-16]) (Priority: 🔴 Important)
  Optional description/notes indented below

- [x] **Completed Task** ([Created: 2026-03-15]) (Priority: ⚪ Normal)
```

### Authentication & Security

- **Auth Provider:** **GitHub PAT**. Users provide a Personal Access Token with `repo` scope once. No OAuth proxy required.
- **Token Persistence:** PAT is Base64-encoded and stored in Zustand's persisted LocalStorage partition. The token is set once and auto-recovered on subsequent sessions — no per-session passphrase or unlock gate.
- **Session Flow:** App load → Zustand hydration → token recovered → Octokit instance created → user lands on last-used repo's task list. If token is invalid/expired, user is redirected to the auth form.
- **Security Layer:** Device-level security (passcode/biometric) provides the protection layer. The app trusts the device boundary rather than adding its own passphrase gate.

### API & Communication Patterns

- **Integration Library:** **`octokit` (v4+)**. The official GitHub JavaScript SDK will handle all commit, pull, and repo-discovery logic.
- **Sync Pattern:** Atomic "Push-All" logic. When the user taps the FAB, all pending local tasks are batched and committed to GitHub in a single operation to minimize rate-limit usage.

### Frontend Architecture

- **State Management:** **`zustand` (v5+)** with `persist` middleware. Single store (`useSyncStore`) tracks auth, repo selection, tasks, sync status, and UI state. `skipHydration: true` with manual hydration via `AuthGuard` component.
- **Animation Engine:** **Framer Motion (v12+)**. Spring-based physics for all interactions: bottom sheet slides, checkbox fills, list layout transitions, drag & drop reorder. `useReducedMotion()` fallback to instant transitions.
- **Component Architecture:**
  - **Bottom Sheet System:** Shared pattern for all modal interactions — `CreateTaskSheet`, `TaskDetailSheet`, `RepoPickerSheet`, `RepoSettingsSheet`. Spring animation `{ stiffness: 400, damping: 35 }`, swipe-down-to-dismiss, click-outside-dismiss.
  - **CreateTaskFAB (+):** Primary task creation entry point. Fixed position bottom-right. Opens `CreateTaskSheet`.
  - **SyncFAB:** "Push to GitHub" trigger. Shows pending count badge. Positioned above CreateTaskFAB.
  - **TaskCard:** Compact list item with animated checkbox, sync status dot, priority badge, body preview. Tapping opens `TaskDetailSheet`.
  - **Active/Completed Split:** Task list divided into active tasks (reorderable) and collapsible "Completed (N)" section.
- **Design System:** GitHub Dark Dimmed palette via CSS custom properties in `index.css`. Utility classes (`.btn-primary`, `.text-body`, `.input-field`) + TailwindCSS 4 for layout. Mobile-first, 44x44px minimum touch targets.
- **Haptic Feedback:** `src/services/native/haptic-service.ts` — `triggerSelectionHaptic()` on checkbox, priority toggle, drag start.

### Decision Impact Analysis

**Implementation Sequence (Epic 7 — The Real App):**
1. ~~Initialize Vite PWA with TypeScript~~ (Done — Epic 1)
2. ~~Implement PAT Auth with device-derived key, remove passphrase gate~~ (Done — Story 7.1)
3. ~~Per-repo task scoping in Zustand store~~ (Done — Story 7.2)
4. ~~FAB + Bottom Sheet task creation~~ (Done — Story 7.3)
5. ~~Task checkboxes, completion, Active/Completed split~~ (Review — Story 7.4)
6. Task detail view with inline editing, auto-save, repo reassignment (Ready — Story 7.5)
7. Drag & drop reorder for active tasks (Backlog — Story 7.6)
8. Task deletion with confirmation (Backlog — Story 7.7)
9. Branch protection detection and user guidance (Backlog — Story 7.8)
10. Sync UX polish — per-repo push, change detection, clear CTA (Backlog — Story 7.9)

**Cross-Component Dependencies:**
The `octokit` instance is the central dependency for both the Repository Selector and the Sync Engine. Zustand acts as the "Heartbeat" connecting the UI to local-first storage. Framer Motion's `layout` prop and `AnimatePresence` provide automatic transition animations as tasks move between Active and Completed sections.

## Starter Template Evaluation

### Primary Technology Domain
**Mobile App (Cross-Platform / PWA-First)** based on project requirements for high-velocity capture and offline reliability.

### Selected Starter: Vite + React + @vite-pwa

**Rationale for Selection:**
The **Vite + React + `@vite-pwa/pwa`** stack provides a high-performance, modern core (React 19+, Vite 7+) with native PWA capabilities (Service Workers via Workbox) out-of-the-box. This ensures we hit the **< 1.5s TTI** target while keeping a clear, lean path to **Capacitor 7+** for App Store and Play Store deployment in Phase 2.

**Initialization Command:**

```bash
# 1. Create the PWA core (Choose React + TS)
npm create @vite-pwa/pwa@latest

# 2. Add the native bridge
npm install @capacitor/core @capacitor/cli
npx cap init
```

### Architectural Decisions Provided by Starter:

**Language & Runtime:**
**React 19+** with **TypeScript** for strict typing and concurrent mode support.

**Build Tooling:**
**Vite 7+** for instant HMR and optimized production build-time performance.

**PWA Engine:**
**`vite-plugin-pwa`** for service worker generation and manifest management, enabling offline-first reliability.

**Styling Solution:**
**Vanilla CSS** (preferred) or Tailwind v4 compatibility.

**Native Bridge:**
**Capacitor 7+** for optional native shell deployment and device API access.

**Note:** Project initialization using this command should be the first implementation story.


_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
**code-tasks (Gitty)** is a native-feeling todo app where each GitHub repository is a project backed by a single `captured-ideas-{username}.md` file. The app provides full task CRUD (create via FAB + Bottom Sheet, read as sorted list, update via detail view, delete with confirmation), drag & drop reordering, completion tracking, and explicit "Push to GitHub" sync. Authentication is a one-time PAT entry with auto-recovery on subsequent sessions. The system manages repository selection (with "Last Used" default), per-repo task scoping, and AI-Ready markdown formatting for agent consumption.

**Non-Functional Requirements:**
- **Performance:** Time-to-Interactive (TTI) < 1.5s; 60 FPS spring animations via Framer Motion.
- **Security:** Base64-encoded token in persisted LocalStorage; all API traffic over HTTPS.
- **Reliability:** 100% local data retention via IDB; exponential backoff for failed syncs.

**Scale & Complexity:**
The project is of **Medium/High Complexity** due to the native-like UX requirements (spring physics, drag & drop, haptics), the offline-to-online sync state machine, and per-repo task scoping on a PWA footprint.
- **Primary technical domain:** Mobile / Web App (PWA)
- **Complexity level:** Medium/High
- **Core architectural components:** Auth Service, Repository Service, Sync Engine (IDB + Octokit), Task Management UI (FAB, Bottom Sheets, TaskCard, drag & drop), AI Header Generator.

### Technical Constraints & Dependencies

- **GitHub REST API:** Primary remote storage via Octokit — file-level `createOrUpdateFileContents` for atomic commits.
- **IndexedDB:** Local-first persistent store for task objects, accessed via `StorageService`.
- **Framer Motion:** Animation engine for spring physics, layout transitions, bottom sheet gestures.
- **PWA / Service Workers:** "Add to Home Screen" capability and offline availability.

### Cross-Cutting Concerns Identified

- **Authentication State Persistence:** Auto-recovery of PAT on app load via Zustand hydration, with `AuthGuard` + Suspense boundary managing the async flow.
- **Conflict Avoidance:** Using `{username}` file-scoping to prevent merge conflicts in shared repos.
- **AI-Ready Standardization:** Every synced markdown file includes an instruction header for AI agent consumption.
- **Per-Repo Scoping:** All task operations are filtered/scoped to `selectedRepo.fullName`. Switching repos is instant.
