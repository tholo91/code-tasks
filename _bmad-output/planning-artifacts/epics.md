---
stepsCompleted: [1, 2, 3]
inputDocuments: ["_bmad-output/planning-artifacts/prd.md", "_bmad-output/planning-artifacts/architecture.md", "_bmad-output/planning-artifacts/ux-design-specification.md"]
---

# code-tasks - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for code-tasks, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can authenticate via GitHub OAuth (AES-GCM encrypted token storage).
FR2: Users can select a target repository with a persistent "Last Used" default.
FR3: System can persist access tokens in local storage (AES-GCM encrypted).
FR4: Users can enter task titles/descriptions via the "Pulse" interface.
FR5: Users can toggle "Important" flags and trigger capture via a single gesture.
FR6: System can provide visual animation-based feedback (latency < 100ms) upon local capture.
FR7: System can store ideas in persistent local storage to prevent data loss during offline sessions.
FR8: System can automatically synchronize pending changes to GitHub upon reconnection.
FR9: System can inject standardized AI-Ready headers and metadata into `captured-ideas-{username}.md`.

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
- **Signature Gesture:** Vertical swipe-up on the "Pulse" area to "launch" tasks into the vault.
- **Status Clarity:** Subtle status indicators (Check/Sync/Cloud-Off) to confirm remote parity.
- **Mobile-First:** One-handed capture optimization (44x44px targets).
- **Haptics:** Distinct patterns for Capture, Complete, and Archive.

### FR Coverage Map

FR1 (GitHub Auth): Epic 1 - The Secure Vault
FR2 (Repo Selection): Epic 2 - The Target
FR3 (Local Token Storage): Epic 1 - The Secure Vault
FR4 (Pulse Input): Epic 3 - The Pulse
FR5 (Important Flag/Gesture): Epic 3 - The Pulse
FR6 (Capture Feedback): Epic 3 - The Pulse
FR7 (Offline Persistence): Epic 3 - The Pulse
FR8 (Background Sync): Epic 4 - The Bridge
FR9 (AI-Ready Formatting): Epic 4 - The Bridge

## Epic List

### Epic 1: The Secure Vault (Foundations & Auth)
Establish the secure connection to GitHub and local storage. After this epic, you'll be able to sign in and we'll have a safe place to store your tokens and cached ideas.
**FRs covered:** FR1, FR3

### Epic 2: The Target (Repository Selection)
Build the intelligence to find and remember where your ideas should go. After this, the app will know exactly which repository to target, remembering your last choice to save you time.
**FRs covered:** FR2

### Epic 3: The Pulse (High-Velocity Capture)
The heart of the app. Implement the "Pulse" interface and the signature vertical swipe gesture. After this, you'll be able to capture ideas instantly with visual feedback, even if you're offline.
**FRs covered:** FR4, FR5, FR6, FR7

### Epic 4: The Bridge (Sync Engine & AI Formatting)
Build the automated sync engine that pushes your ideas to GitHub and formats them with the AI-Ready headers. After this, your ideas will be safely tucked away in your repo, perfectly formatted for your AI agents.
**FRs covered:** FR8, FR9

## Epic 1: The Secure Vault (Foundations & Auth)

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

## Epic 2: The Target (Repository Selection)

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

## Epic 3: The Pulse (High-Velocity Capture)

The heart of the app. Implement the "Pulse" interface and the signature vertical swipe gesture. After this, you'll be able to capture ideas instantly with visual feedback, even if you're offline.

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

## Epic 4: The Bridge (Sync Engine & AI Formatting)

Build the automated sync engine that pushes your ideas to GitHub and formats them with the AI-Ready headers. After this, your ideas will be safely tucked away in your repo, perfectly formatted for your AI agents.

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
