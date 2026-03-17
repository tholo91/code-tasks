---
stepsCompleted: [1, 2, 3]
inputDocuments: ["_bmad-output/planning-artifacts/prd.md", "_bmad-output/planning-artifacts/architecture.md", "_bmad-output/planning-artifacts/ux-design-specification.md"]
lastEdited: '2026-03-15'
editHistory:
  - date: '2026-03-15'
    changes: 'Course Correction: Added Epic 7 (The Real App), added FR10-FR12, updated FR1/FR3/FR4, paused Epic 5, absorbed Epic 6. Reordered epic list by current priority.'
---

# code-tasks - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for code-tasks, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

**Current Priority (as of 2026-03-15):** Epic 7 is the active focus. Epics 1–4 are done (backend). Epic 5 is paused. Epic 6 is absorbed into Epic 7.

## Requirements Inventory

### Functional Requirements

FR1: Users can authenticate via GitHub PAT with persistent encrypted token storage. Token is set once and auto-unlocked on subsequent sessions — no per-session passphrase.
FR2: Users can select a target repository with a persistent "Last Used" default.
FR3: System can persist access tokens in local storage (AES-GCM encrypted with device-derived key, no passphrase gate).
FR4: Users can create tasks via a FAB (+) button that opens a structured bottom sheet (title, notes, priority). Keyboard shortcut (Cmd+Enter) retained as power-user path.
FR5: Users can toggle "Important" flags and trigger capture via a single gesture.
FR6: System can provide visual animation-based feedback (latency < 100ms) upon local capture.
FR7: System can store ideas in persistent local storage to prevent data loss during offline sessions.
FR8: System can automatically synchronize pending changes to GitHub upon reconnection.
FR9: System can inject standardized AI-Ready headers and metadata into `captured-ideas-{username}.md`.
FR10: Users can mark tasks as complete, edit task details inline, and delete tasks.
FR11: Users can reorder tasks via drag & drop within a repository's task list.
FR12: Each repository maintains an independent task list, scoped to that repo.

### NonFunctional Requirements

NFR1: Core capture UI interactive (TTI) in < 1.5s on 4G connections.
NFR2: UI animations maintained at 60 FPS.
NFR3: Tokens and local data encrypted at rest (AES-GCM).
NFR4: All API traffic over HTTPS.
NFR5: 100% data retention for captured ideas; exponential backoff for failed syncs.
NFR6: Zero conflict rate via `{username}` scoping strategy.
NFR7: PWA manifest and Service Worker compliant for "Add to Home Screen" on iOS/Android.

### Additional Requirements

- **Starter Template:** Initialize with `npm create @vite-pwa/pwa@latest` and Capacitor 7.
- **Infrastructure:** React 19, Vite 7, Zustand for state management.
- **Integration:** Use a centralized Octokit Service Layer for all GitHub interactions.
- **Sync Logic:** Atomic "Push-All" logic via a "Write-Through" pattern to LocalStorage.
- **Visual Direction:** GitHub Primer (Dark Dimmed) with Framer Motion (spring-based physics).
- **Primary Capture:** FAB (+) button with Bottom Sheet form (title, notes, priority).
- **Status Clarity:** Subtle status indicators (Check/Sync/Cloud-Off) to confirm remote parity.
- **Mobile-First:** One-handed capture optimization (44x44px targets).
- **Haptics:** Distinct patterns for Capture, Complete, and Archive.
- **Per-Repo Scoping:** Each repository acts as a project with its own independent task list.

### FR Coverage Map

FR1 (GitHub Auth): Epic 1 - The Secure Vault
FR2 (Repo Selection): Epic 2 - The Target
FR3 (Local Token Storage): Epic 1 - The Secure Vault + Epic 7 (passphrase removal)
FR4 (Task Creation): Epic 7 - The Real App (FAB + Bottom Sheet)
FR5 (Important Flag/Gesture): Epic 3 - The Pulse
FR6 (Capture Feedback): Epic 3 - The Pulse
FR7 (Offline Persistence): Epic 3 - The Pulse
FR8 (Background Sync): Epic 4 - The Bridge
FR9 (AI-Ready Formatting): Epic 4 - The Bridge
FR10 (Task Management — Complete/Edit/Delete): Epic 7 - The Real App
FR11 (Drag & Drop Reorder): Epic 7 - The Real App
FR12 (Per-Repo Task Lists): Epic 7 - The Real App

### CR Coverage Map (Community Requirements)

CR1 (Roadmap Teaser): Epic 5 - The Village
CR2 (Feature Voting): Epic 5 - The Village
CR3 (Donation Prompt): Epic 5 - The Village
CR4 (GitHub Sponsor Setup): Epic 5 - The Village

## Epic List (Priority Order)

### Epic 7: The Real App (Task Management UX Overhaul) ← CURRENT FOCUS
Transform Gitty from a capture experiment into a real, native-feeling todo app. Each GitHub repository is treated as a project with its own task list backed by a single `captured-ideas-{username}.md` file. Quick Capture via FAB is prioritized. Users can create, complete, edit, delete, and reorder tasks. The app opens instantly without passphrase gates. Sync to GitHub is explicit and clear.
**FRs covered:** FR1 (updated), FR3 (updated), FR4 (updated), FR10, FR11, FR12

### Epic 1: The Secure Vault (Foundations & Auth) — DONE
Establish the secure connection to GitHub and local storage.
**FRs covered:** FR1, FR3

### Epic 2: The Target (Repository Selection) — DONE
Build the intelligence to find and remember where your ideas should go.
**FRs covered:** FR2

### Epic 3: The Pulse (High-Velocity Capture) — DONE (frontend being replaced by Epic 7)
The original "Pulse" interface. Backend (offline persistence, priority toggles, search, filter) retained. Frontend capture flow replaced by Epic 7's FAB + Bottom Sheet.
**FRs covered:** FR4, FR5, FR6, FR7

### Epic 4: The Bridge (Sync Engine & AI Formatting) — DONE (sync UX refined in Epic 7)
Sync engine and AI-Ready headers. Core sync logic retained, UX polish in Epic 7.
**FRs covered:** FR8, FR9

### Epic 5: The Village (Community & Sustainability) — PAUSED
Paused until core UX (Epic 7) is complete. Community features should only ship once the app feels right.
**CRs covered:** CR1, CR2, CR3, CR4

## Epic 7: The Real App (Task Management UX Overhaul)

Transform Gitty from a capture experiment into a real, native-feeling todo app. Each GitHub repository is treated as a project with its own task list backed by a single `captured-ideas-{username}.md` file. Quick Capture via FAB is prioritized. The app opens instantly without passphrase gates. Sync to GitHub is explicit and clear.

### Story 7.1: Remove Passphrase Gate — Instant App Launch

As a User,
I want the app to open instantly to my last-used repository's task list,
So that I can capture ideas in under 5 seconds without re-entering a passphrase.

**Acceptance Criteria:**

**Given** I have previously authenticated with a valid GitHub PAT
**When** I re-open the app
**Then** the token is auto-decrypted using a device-derived key (no passphrase prompt)
**And** I land directly on my last-used repository's task list
**And** the PassphraseUnlock component is removed entirely

**Technical Notes:**
- Replace passphrase-based AES-GCM with device-derived key encryption
- Remove `needsPassphrase` state and `unlockWithPassphrase` action from store
- Remove `PassphraseUnlock` component from App.tsx
- Ensure token validation still occurs on app load (redirect to auth if token is invalid/expired)

**Priority:** P0 — Blocks quick capture flow

### Story 7.2: Per-Repo Task Lists — Repository as Project

As a User,
I want each GitHub repository to have its own independent task list,
So that I can organize my ideas by project and sync each repo's tasks to its own markdown file.

**Acceptance Criteria:**

**Given** I have selected Repository A
**When** I view the task list
**Then** I see only tasks belonging to Repository A

**Given** I switch to Repository B
**When** the task list loads
**Then** I see only tasks belonging to Repository B (not Repository A's tasks)

**Given** I create a task while Repository A is selected
**When** the task is persisted
**Then** it is stored under Repository A's scope in the store and IDB

**Technical Notes:**
- Refactor `useSyncStore`: change `tasks: Task[]` to `tasksByRepo: Record<string, Task[]>`
- All task operations (add, update, delete, toggle) must be scoped to `selectedRepo.fullName`
- IDB persistence must key tasks by repo
- Sync engine must push only the current repo's tasks to that repo's `captured-ideas-{username}.md`
- Migration: existing flat tasks should be assigned to the currently selected repo on first load

**Priority:** P0 — Data model foundation

### Story 7.3: FAB + Bottom Sheet Task Creation

As a User,
I want to tap a (+) button to quickly create a new task via a clean form,
So that task creation is obvious, fast, and feels like a real todo app.

**Acceptance Criteria:**

**Given** I am on the task list screen
**When** I tap the (+) FAB button in the bottom-right corner
**Then** a Bottom Sheet slides up with fields: Title (required), Notes (optional), Priority toggle

**Given** I have filled in at least a Title
**When** I tap "Add Task" or press Cmd+Enter
**Then** the task is created in the current repo's task list
**And** the Bottom Sheet closes with a smooth animation
**And** the new task appears at the top of the list with a brief highlight

**Given** I tap outside the Bottom Sheet or swipe it down
**When** the sheet dismisses
**Then** no task is created (cancel behavior)

**Technical Notes:**
- The (+) FAB replaces PulseInput as the primary creation path
- PulseInput can be retained as an optional inline capture for power users (or removed — Thomas's call)
- Bottom Sheet should use the same spring animation system as RepoPickerSheet
- Title field auto-focused when sheet opens
- 44x44px minimum touch target on FAB

**Priority:** P0 — Core capture flow

### Story 7.4: Task Checkboxes, Completion & Completed Section

As a User,
I want to check off tasks and see them grouped in a "Completed" section,
So that I can track progress and know which ideas have been handled.

**Acceptance Criteria:**

**Given** I see a task in the list
**When** I tap the checkbox on the left side of the task
**Then** the task is marked as completed with an animated strikethrough
**And** the task moves to the "Completed" section after a brief delay

**Given** there are completed tasks
**When** I view the task list
**Then** I see a collapsible "Completed (N)" section below the active tasks

**Given** I tap the checkbox on a completed task
**When** it toggles back
**Then** the task moves back to the active list (un-completes)

**Technical Notes:**
- Add `isCompleted: boolean` and `completedAt: string | null` to Task type
- Add `toggleComplete(taskId)` action to store
- Completed tasks render with `line-through` text decoration and muted opacity
- Markdown sync: completed tasks as `- [x]`, active as `- [ ]`
- Animation: checkbox fill + strikethrough should feel satisfying (spring physics)

**Priority:** P0 — Core management

### Story 7.5: Things-Style Task Detail View

As a User,
I want to tap a task and see a beautiful detail view where I can edit the title, notes, and priority,
So that I can flesh out my ideas with descriptions, checklists, and context.

**Acceptance Criteria:**

**Given** I tap on a task in the list
**When** the detail view opens
**Then** I see a slide-up panel (mobile) with: Title (editable), Notes/Description (editable, markdown-formatted), Priority toggle, Created timestamp, Repo assignment dropdown

**Given** I edit the title or notes
**When** I tap outside the field or close the detail view
**Then** changes are auto-saved

**Given** I tap outside the detail panel or swipe it down
**When** it dismisses
**Then** I return to the task list with changes persisted

**Given** I change the repository assignment in the detail view
**When** I select a different repo from the dropdown
**Then** the task moves to that repository's task list

**Technical Notes:**
- Add `updateTask(taskId, updates)` and `moveTaskToRepo(taskId, targetRepoFullName)` actions
- Notes field should support basic markdown rendering (bold, bullet lists, checklists)
- Auto-save with debounce (500ms after last keystroke)
- Things-style animation: slide up from bottom, slight scale-down of list behind

**Priority:** P1 — Enhancement

### Story 7.6: Drag & Drop Reorder

As a User,
I want to drag tasks up and down to reorder them by importance,
So that my most urgent ideas are always at the top.

**Acceptance Criteria:**

**Given** I long-press a task card
**When** I drag it vertically
**Then** other tasks shift to make room with smooth animations

**Given** I release the dragged task
**When** it drops into its new position
**Then** the new order is persisted to the store and IDB

**Technical Notes:**
- Add `order: number` field to Task type
- Add `reorderTasks(repoFullName, orderedTaskIds)` action
- Use a proven drag & drop library compatible with React 19 (e.g., @dnd-kit/sortable)
- Only active (non-completed) tasks are reorderable
- Haptic feedback on drag start (mobile)

**Priority:** P1 — Enhancement

### Story 7.7: Task Deletion

As a User,
I want to delete tasks I no longer need,
So that my task list stays clean and focused.

**Acceptance Criteria:**

**Given** I am in the task detail view
**When** I tap the "Delete" button
**Then** a brief confirmation appears ("Delete this task?")
**And** upon confirmation, the task is removed from the list with a fade-out animation

**Given** I swipe left on a task in the list view (stretch goal)
**When** the delete action is revealed
**Then** I can tap to delete with the same confirmation

**Technical Notes:**
- Add `deleteTask(taskId)` action to store
- Task removal must also update IDB and mark sync as dirty
- Deleted tasks are removed from the markdown file on next sync

**Priority:** P1 — Enhancement

### Story 7.8: Branch Protection Detection & User Guidance

As a User,
I want to be warned if a repository has branch protection that prevents direct pushes to main,
So that I understand why sync might fail and know what to do about it.

**Acceptance Criteria:**

**Given** I select a repository with branch protection on the default branch
**When** sync is attempted and fails due to branch protection
**Then** a clear, non-technical error message explains the issue
**And** a suggestion is provided (e.g., "This repo requires pull requests. Consider disabling branch protection for your capture file, or use a different branch.")

**Technical Notes:**
- Detect 403/422 errors from Octokit push attempts
- Could optionally check branch protection rules via GitHub API on repo selection
- Show guidance in a dismissible banner, not a blocking modal

**Priority:** P2 — Polish

### Story 7.9: Sync UX Polish — Per-Repo Push to GitHub

As a User,
I want a clear, obvious way to push my changes to GitHub after editing tasks,
So that I feel confident my ideas are safely stored in the repo for AI agents to pick up.

**Acceptance Criteria:**

**Given** I have made local changes (created, edited, completed, deleted, or reordered tasks)
**When** the app detects unsaved changes
**Then** a "Push to GitHub" button/FAB becomes prominent with a badge or indicator

**Given** I tap "Push to GitHub"
**When** the sync completes
**Then** I see a clear success confirmation (checkmark animation)
**And** the button returns to its idle state

**Given** I am viewing Repository A's tasks
**When** I push to GitHub
**Then** only Repository A's `captured-ideas-{username}.md` is updated (not other repos)

**Technical Notes:**
- Refactor SyncFAB to be repo-aware
- Change detection: compare current repo's tasks with last-synced snapshot
- The sync button should feel like a deliberate "save to cloud" action
- Consider renaming from "Ghost-Writer FAB" to something clearer like "Push to GitHub"

**Priority:** P1 — Enhancement

---

## Epic 1: The Secure Vault (Foundations & Auth) — DONE

Establish the secure connection to GitHub and local storage. After this epic, you'll be able to sign in and we'll have a safe place to store your tokens and cached ideas.

### Story 1.1: Project Initialization & PWA Core

As a Developer,
I want to initialize the project with Vite, React, and PWA capabilities,
So that I have a high-performance foundation for mobile-first capture.

**Acceptance Criteria:**

**Given** a new terminal session
**When** I run `npm create @vite-pwa/pwa@latest` and follow the architectural starter instructions
**Then** a React 19 + Vite 7 project is created with `@vite-plugin-pwa` configured
**And** the PWA manifest and service worker are present in the build output

### Story 1.2: GitHub PAT Authentication & Encryption

As a User,
I want to enter my GitHub Personal Access Token (PAT) and have it stored securely,
So that I can access my repositories without re-entering credentials every session.

**Acceptance Criteria:**

**Given** I am on the Auth screen
**When** I enter a valid GitHub PAT and click "Connect"
**Then** the token is validated against the GitHub API using Octokit
**And** the token is encrypted using AES-GCM and stored in LocalStorage (FR1, FR3, NFR3)
**And** I am redirected to the main capture interface upon success

### Story 1.3: Persistent Session Management

As a User,
I want the app to remember my authenticated state,
So that I can start capturing ideas immediately without logging in every time I open the app.

**Acceptance Criteria:**

**Given** I have previously authenticated successfully
**When** I re-open the app
**Then** the system decrypts the token from LocalStorage and validates it
**And** I am automatically signed in and taken to the capture screen (FR3)

## Epic 2: The Target (Repository Selection) — DONE

Build the intelligence to find and remember where your ideas should go. After this, the app will know exactly which repository to target, remembering your last choice to save you time.

### Story 2.1: Repository Discovery & Selection

As a User,
I want to search and select my target GitHub repository,
So that I can specify where my `captured-ideas-{username}.md` file will live.

**Acceptance Criteria:**

**Given** I am authenticated with a valid GitHub PAT
**When** I enter a search term in the "Target Repository" selector
**Then** the Octokit Service Layer fetches a list of my repositories from the GitHub API (FR2)
**And** I can select a single repository from the results

### Story 2.2: Persistent "Last Used" Repository Intelligence

As a User,
I want the app to automatically select my last-used repository on launch,
So that I don't have to select it every time I want to capture a new idea.

**Acceptance Criteria:**

**Given** I have previously selected a repository and captured an idea
**When** I re-open the app or start a new capture session
**Then** the "Last Used" repository ID is retrieved from LocalStorage (FR2)
**And** the UI automatically defaults to this repository as the capture target

## Epic 3: The Pulse (High-Velocity Capture) — DONE (frontend replaced by Epic 7)

The original "Pulse" interface. Backend (offline persistence, priority toggles, search, filter) retained. Frontend capture flow replaced by Epic 7's FAB + Bottom Sheet.

### Story 3.1: "The Pulse" UI & Instant Capture

As a User,
I want to type my idea into a focused "Pulse" input area,
So that I can capture my thoughts as fast as I can type them.

**Acceptance Criteria:**

**Given** I am on the main capture screen
**When** the app launches
**Then** the "Pulse" text area is automatically focused with the keyboard active (UX Requirement)
**And** the UI maintains 60 FPS while typing (NFR2)

### Story 3.2: Signature "Launch" Gesture & Visual Feedback

As a User,
I want to use a vertical swipe-up gesture to "launch" my idea into the vault,
So that I get a tactile and satisfying sense of closure after capturing an idea.

**Acceptance Criteria:**

**Given** I have typed an idea into the Pulse input
**When** I perform a vertical swipe-up gesture on the input area
**Then** the text collapses and "flies" into the task list below with a springy animation (FR6, UX Requirement)
**And** the visual feedback occurs in < 100ms (FR6)

### Story 3.3: Priority Toggles ("Important" Pills)

As a User,
I want to toggle an "Important" flag on my idea before launching it,
So that I can prioritize high-value sparks for immediate action.

**Acceptance Criteria:**

**Given** I am typing in the Pulse input
**When** I tap the "Important" pill toggle
**Then** the pill changes to its active "filled" state (FR5)
**And** the task is marked as high-priority in its local data object

### Story 3.4: "Overnight Offline" Local Persistence

As a User,
I want my ideas to be saved locally immediately upon capture, even if I'm offline,
So that I never lose a spark due to a bad connection.

**Acceptance Criteria:**

**Given** I am offline or have a poor connection
**When** I launch a task from the Pulse input
**Then** the task is synchronously written to LocalStorage (or IndexedDB) (FR7, NFR5)
**And** the task appears in the list with a "Sync Pending" indicator

### Story 3.5: Fuzzy Task Search

As a User,
I want a search bar above my captured task list that fuzzy-searches across task titles and descriptions,
so that I can quickly find specific ideas as my list grows.

**Acceptance Criteria:**

**Given** the task list has fewer than 5 tasks
**When** the app renders
**Then** the search bar is visible but visually de-emphasized (reduced opacity, muted placeholder)

**Given** the task list has 5 or more tasks
**When** the app renders
**Then** the search bar becomes fully prominent and active

**Given** a user types in the search bar
**When** any character is entered
**Then** the task list filters in real-time, fuzzy-matching against task title AND body/description

**Given** the user clears the search bar
**When** input is empty
**Then** the full task list is restored

**Given** no tasks match
**When** the filtered list is empty
**Then** an inline empty state is shown: "No tasks match '{{query}}'"

### Story 3.6: Priority Filter

As a User,
I want to filter my captured task list by priority (All / Important / Not Important),
so that I can focus on high-priority sparks without scrolling through everything.

**Acceptance Criteria:**

**Given** I am on the capture screen
**When** the task list renders
**Then** a filter control is visible with three states: All (default), Important, Not Important

**Given** the filter is set to Important
**When** active
**Then** only tasks with isImportant: true are shown

**Given** the priority filter is active AND the search bar has a query
**When** both filters are in effect
**Then** only tasks satisfying BOTH conditions are shown

**Given** the filtered list is empty
**When** no matching tasks exist
**Then** an inline empty state is shown: "No {{filterLabel}} tasks"

## Epic 4: The Bridge (Sync Engine & AI Formatting) — DONE (sync UX refined in Epic 7)

Sync engine and AI-Ready headers. Core logic retained, UX polish in Story 7.9.

### Story 4.1: Background Sync Engine

As a User,
I want the app to automatically sync my local tasks to GitHub when I'm online,
So that my ideas are always backed up without manual effort.

**Acceptance Criteria:**

**Given** I have unsynced local tasks and an active internet connection
**When** the sync heartbeat triggers or I open the app
**Then** the system batches the changes and pushes them to GitHub via Octokit (FR8)
**And** the task's status indicator updates to "Synchronized" (the GitHub checkmark)

### Story 4.2: AI-Ready Header Injection

As an AI Agent,
I want the task file to include a standardized instruction header,
So that I can immediately understand the context and priority of the tasks I need to execute.

**Acceptance Criteria:**

**Given** the `captured-ideas-{username}.md` file does not exist or lacks the header in the target repo
**When** the first task is synced to the repository
**Then** the system injects the standardized AI-Ready instructions and metadata at the top of the file (FR9)
**And** the task is appended correctly below the header

### Story 4.3: Conflict-Free User Scoping

As a Developer,
I want my tasks to be stored in a file specific to my username,
So that I can collaborate in a shared repository without causing merge conflicts with my teammates.

**Acceptance Criteria:**

**Given** I am authenticated as `{username}`
**When** a sync operation occurs
**Then** the system targets `captured-ideas-{username}.md` as the storage file (NFR6, FR9)
**And** I can confirm the file exists on GitHub with the correct name

### Story 4.4: Manual Sync Trigger (Ghost-Writer FAB)

As a User,
I want a clear visual cue when my local vault is ahead of GitHub and a way to trigger a sync manually,
So that I have absolute control and visibility over my data's synchronization status.

**Acceptance Criteria:**

**Given** I have unsynced local tasks
**When** the Floating Action Button (FAB) appears or highlights in its "Sync Needed" state
**Then** I can tap it to initiate an immediate push to GitHub (UX Requirement)
**And** I see a "Syncing..." animation until the remote parity is achieved

## Epic 5: The Village (Community & Sustainability) — PAUSED

Paused until Epic 7 is complete. Community features should only ship once the core app feels right.

**Community Requirements covered:**
- CR1: Users can view planned features (Roadmap Teaser)
- CR2: Users can vote on upcoming features (Feature Voting)
- CR3: Users are invited to support development costs (Donation Prompt)
- CR4: GitHub repository is configured for sponsorship visibility (FUNDING.yml, README badge)

### Story 5.1: Roadmap Teaser & Feature Data Model

As a User,
I want to see what features are planned for Gitty,
So that I know the project is alive and I can look forward to what's coming.

**Acceptance Criteria:**

**Given** I am on the main screen
**When** I tap the "Roadmap" entry in the menu or settings
**Then** I see a list of planned features with title, short description, and status (planned/in-progress/shipped)
**And** shipped features are visually distinguished (e.g. checkmark, muted style)

### Story 5.2: Feature Voting

As a User,
I want to upvote features on the roadmap that matter to me,
So that the developer knows what the community wants most.

**Acceptance Criteria:**

**Given** I am viewing the Roadmap
**When** I tap the vote button on a feature
**Then** my vote is recorded and the vote count increases by one
**And** I cannot vote for the same feature more than once
**And** my votes persist across sessions

### Story 5.3: Donation Prompt ("Unterstütze Gitty")

As a User,
I want to be gently reminded that I can support the project financially,
So that I have the option to contribute — but never feel pressured.

**Acceptance Criteria:**

**Given** I have used the app for at least 7 days and captured at least 5 ideas
**When** the donation prompt has not been shown or was last dismissed more than 30 days ago
**Then** a friendly, non-intrusive bottom sheet appears with a personal message and a link to the donation page
**And** I can dismiss it ("Später") or mark it as done ("Schon unterstützt" / "Kein Interesse")
**And** "Schon unterstützt" or "Kein Interesse" permanently hides the prompt

### Story 5.4: GitHub Repository Sponsor Setup

As a Project Maintainer,
I want the GitHub repository to be configured for sponsorship and donations,
So that visitors on GitHub can easily find ways to support the project.

**Acceptance Criteria:**

**Given** the repository is public on GitHub
**When** a visitor views the repository page
**Then** a "Sponsor" button is visible linking to the configured funding platforms
**And** the README contains a tasteful support badge/section
**And** FUNDING.yml is present with at least one platform configured
