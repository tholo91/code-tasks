# Research & Development Impulses

These are the "sparks" and "clues" identified during the Party Mode and collaborative discovery sessions for **code-tasks** (Potential: **Gitty-tasks**). Use this as a reference for the upcoming [MR] and [TR] workflows.

## [TR] Technical Research Impulses
- **GitHub API Selection:** Compare REST vs. GraphQL for targeted `.md` file updates (O(n) parsing vs. direct segment editing).
- **Fine-Grained Security:** Architecture for scope-limited Personal Access Tokens (PATs) restricted to a single file pattern (`captured-ideas-*.md`).
- **3 AM Stability:** Service Worker "Background Sync" strategies for offline-to-online transitions during poor connectivity.
- **Secure Local Storage:** Implementation of `AES-GCM` encryption for storing GitHub tokens in `IndexedDB`.
- **Markdown Schema Parsing:** RegEx vs. AST parsing for the `- **Status:** open` property list to ensure high-fidelity "AI-Ready" data.

## [MR] Market Research Impulses
- **The "Digital Napkin" Competitors:** How do Apple Notes, Obsidian, and "Things" handle the "Capture-to-Action" gap?
- **Interaction Patterns:** Audit of "Sorted 3" binary priority pills and "Things" fluid animations to define our "Digital Silk" standard.
- **AI-Ready Standards:** Do any existing developer tools provide a "Staging Area" for AI agents like Claude Code or Gemini?
- **Warm Branding Audit:** Researching playful, developer-focused brands (e.g., Oh My Zsh, Homebrew) to inform the "Gitty-tasks" identity.

## [CB] Product Brief / PRD Impulses
- **"Pulse" Input:** A single-focus text area that defaults to the last-opened repository.
- **Binary Priority Pills:** "Important" vs. "Standard"—high-speed classification without tagging overhead.
- **AI-Ready Header:** A persistent, modifiable AI instruction block at the top of every `captured-ideas.md`.
- **Ghost-Writer Mode:** Ultra-minimal, high-contrast Dark Mode UI for midnight inspiration.
- **Single-File Model:** The "Safe Vault" principle—one transparent Markdown file as the source of truth.
