---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ["docs/vision.md", "docs/archive/QUESTIONS.md"]
date: "2026-03-10"
author: "Thomas"
---

...

## MVP Scope

### Core Features

- **GitHub OAuth Sign-in:** Zero-setup authentication using the user's existing GitHub account.
- **Repository Selector:** A simple list of the user's repos, defaulting to the **last-opened repository** for maximum speed.
- **The "Pulse" Input:** A single, high-fidelity text area for "Quick Capture" of the idea title and description.
- **User-Scoped Storage:** Automatically saves ideas to `captured-ideas-{username}.md` within the selected repository to eliminate merge conflicts.
- **"Ghost-Writer" Persistence:** Offline-first local storage (`IndexedDB`) that ensures ideas are saved instantly, even without a connection.
- **Manual "Push" FAB:** A simple "Floating Action Button" that appears when local changes are ahead of GitHub, allowing the user to "Launch" their ideas.
- **"AI-Ready" Header Initialization:** Automatically injects the persistent AI instruction block into the top of any new `captured-ideas-{username}.md` file.

### Out of Scope for MVP

- **Priority Pills & Tags:** No classification overhead for V1.
- **Multi-File Support:** Strictly one `captured-ideas-{username}.md` per repository.
- **In-App Editing:** The MVP focuses on *capture*, not full task management/refactoring.
- **Advanced Reordering:** No drag-and-drop reordering of the Markdown file in V1.
- **Mobile Native Apps:** Strictly a high-fidelity PWA for now.

### MVP Success Criteria

- **The "Max Test":** A developer can capture an idea in under 5 seconds from a cold start.
- **Zero Conflict Rate:** 0% merge conflicts in shared repositories due to the `{username}` suffix strategy.
- **"Safe Vault" Validation:** 100% of captured ideas successfully reach GitHub after an offline session.

### Future Vision

- **Voice-to-Task:** Direct voice note capture for hands-free "midnight sparks."
- **"Agent Triggering":** A "Start Agent" button that notifies an AI agent (like Claude Code or Gemini) to begin working on a specific task.
- **"Digital Silk" Dashboard:** A full "Things"-inspired task manager for refining and organizing the captured ideas.
- **Priority Pills & Tags:** Adding the "Binary Pills" for high-speed categorization once the core loop is proven.

...

## Success Metrics

### User Success Metrics

- **Time-to-Capture (TTC):** The "North Star" metric. Success is defined as < 5 seconds from app launch to "Idea Safely Stored."
- **Frictionless Routing:** % of captures that use the "Last Opened Repo" default (aiming for > 80% to prove the default logic is correct).
- **Data Integrity (The Safe Vault):** 0% reported data loss during offline-to-online transitions.
- **Midnight Usability:** Qualitative feedback on the "Warm/Nice" Dark Mode and the "Pill" priority interactions.

### Business Objectives

- **Developer Adoption:** Become the "Default Remote" for developers building with high-leverage AI agents (Claude Code, Gemini, etc.).
- **Format Standardization:** Seeing the `captured-ideas-{username}.md` format appear in public repositories on GitHub.
- **Brand Resonance:** Transitioning from the functional "code-tasks" to a warmer, more approachable brand (e.g., **Gitty-tasks**) that users *enjoy* opening at 3 AM.

### Key Performance Indicators (KPIs)

- **Active Capture Users:** Number of users who sync at least 3 ideas per week.
- **Average Sync Latency:** Time taken for a local "Pulse" entry to reach the GitHub repository once online.
- **Retention Rate:** % of users who return to capture a second idea within 48 hours of their first.

# Product Brief: code-tasks

## Executive Summary

`code-tasks` is a "Quick Capture" PWA that bridges the gap between late-night inspiration and GitHub execution. Inspired by the sleek UX of "Things" and "Sorted 3," it provides a stable, trustworthy, and beautiful interface for managing ideas directly in a GitHub repository via a transparent `captured-ideas.md` file. It is built for developers who need a frictionless vault for their thoughts—one that is "AI-ready" out of the box.

---

## Core Vision

### Problem Statement

Developers experience a "manual labor" trap when capturing ideas on the go. Currently, using third-party apps like Things requires a tedious manual sync process (copy/pasting) to move tasks into GitHub. This fragmentation leads to lost ideas, killed momentum, and a lack of a single source of truth.

### Proposed Solution

An offline-first, high-fidelity PWA that uses GitHub as a secure backend. It features a "Quick Capture" focus where one tap creates a task and one tap syncs it to a private-by-default repository. It’s a "Safe Vault" for ideas that never loses data, even during Wi-Fi drops.

### Key Differentiators

- **Frictionless Quick Capture:** No extra accounts; just GitHub. Built for speed and one-handed use on the go.
- **AI-Native Backbone:** Every `captured-ideas.md` starts with a persistent, modifiable AI prompt, making the task list instantly actionable for agents like Gemini or Claude.
- **Privacy-First Sync:** Uses `captured-ideas-{username}.md` to enable collaborative repos without merge conflicts.
- **High-Fidelity UX:** "Things"-inspired animations and "Sorted 3" style binary priority pills for "Important" vs. "Standard" tasks.
- **Stable & Trustworthy:** Robust offline storage ensures that a spark of genius is never lost to a bad connection.

---

## Target Users

### Primary Users

**Max the Maker (Founder-Builder)**
- **Role:** Solo founder or lead developer at a fast-moving startup.
- **Motivation:** To maintain a "Zero-Friction" link between their thoughts and their codebase. They want to be "AI-ready" without the manual sync tax.
- **Success Moment:** Seeing a midnight idea appear in the repo at 9 AM, formatted perfectly for an AI agent to pick up immediately.

**The Midnight Hacker (Creative Techie)**
- **Role:** Independent builder using high-leverage tools like Claude Code or Gemini.
- **Context:** Works best when the world is quiet; needs a high-fidelity "Warm/Nice" dark mode interface that doesn't feel like "work."
- **Success Moment:** Launching an idea into the "Safe Vault" with zero friction and total confidence that it's there for the morning.

### Secondary Users

- **AI Agents:** Consumers of the `captured-ideas.md` file who benefit from its structured "Properties List" (`- **Status:** open`).
- **Collaborators:** Team members who pull the repo and see the owner's thoughts and tasks in a human-readable, transparent format.

### User Journey

1.  **Discovery:** The developer realizes their current "Notes-to-Repo" flow is broken.
2.  **Onboarding:** Fast GitHub OAuth sign-in. Zero setup—just pick a repo.
3.  **Core Usage:** Open app, type idea into the "Pulse" input, hit "Important" pill (optional), and swipe up to sync.
4.  **Success Moment:** They sit down at their desk, run a `git pull`, and see their ideas already there, waiting for the AI agent to start the next task.
5.  **Long-term:** It becomes their "Default Vault"—no idea is too small to capture because the friction is gone.
