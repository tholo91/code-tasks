---
stepsCompleted: [1, 2]
inputDocuments: ["README.md", "QUESTIONS.md"]
date: "2026-03-10"
author: "Thomas"
---

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
