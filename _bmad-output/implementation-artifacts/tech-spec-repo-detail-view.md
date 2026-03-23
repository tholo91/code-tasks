---
title: 'Repository Detail View'
slug: 'repo-detail-view'
created: '2026-03-23'
status: 'draft'
stepsCompleted: [1]
tech_stack: ['React 19', 'Zustand', 'Octokit', 'TypeScript', 'Framer Motion']
files_to_modify:
  - src/App.tsx
  - src/stores/useSyncStore.ts
code_patterns: ['Bottom sheet pattern (SettingsSheet)', 'View transition pattern (viewKey in App.tsx)']
test_patterns: []
---

# Tech-Spec: Repository Detail View

**Created:** 2026-03-23

## Overview

### Problem Statement

When a user taps the repo switcher in the header, they currently jump straight to a repo picker list. There's no way to see information about the currently linked repository — its README, the AI instructions in the captured-ideas header, or any other context. Users have no insight into what's in their repo without leaving the app.

### Solution

Replace the direct-to-picker behavior with a **Repository Detail View** that appears when tapping the repo switcher. This view shows:

1. **Repo overview section** — README content (or excerpt) from the repository
2. **AI instructions section** — The AI-ready header from `captured-ideas-{username}.md`, editable inline so users can customize agent instructions
3. **"Switch Repository" button** at the bottom — navigates to the existing repo picker

This gives users a "home base" for their current repo context before deciding to switch.

### Scope

**In Scope:**
- New view/screen triggered by header repo selector tap
- Fetch and display repo README.md (read-only, rendered markdown or plain text excerpt)
- Fetch and display AI-ready header from captured-ideas file (editable)
- Save edited AI instructions back to the repo via Octokit
- "Switch Repository" action at bottom of view
- Smooth transition animation (consistent with existing view transitions)

**Out of Scope:**
- Full markdown rendering engine (keep it simple — preformatted text or basic styling)
- Editing README from within the app
- Repo settings (branch, sync config) — those stay in Settings
- Offline editing of repo details (require online)

## Context for Development

### Codebase Patterns

- **View transitions**: `App.tsx` uses a `viewKey` state (`'main'`, `'repoPicker'`, etc.) with `AnimatePresence` for page transitions. The repo detail view would be a new `viewKey` value.
- **Bottom sheet pattern**: `SettingsSheet.tsx` and `BottomSheet.tsx` provide a slide-up overlay pattern. The repo detail view could be a full-page view or a tall bottom sheet — TBD based on UX preference.
- **GitHub file reading**: `sync-service.ts` `getFileContent()` already fetches files from repos. Reuse for README.md.
- **Header parsing**: `markdown-templates.ts` `splitAtMarkers()` can extract the header section from captured-ideas files.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/App.tsx` | View routing, repo selector click handler (`onChangeRepo`) |
| `src/components/layout/AppHeader.tsx` | Repo selector button that triggers this view |
| `src/features/sync/utils/markdown-templates.ts` | Header parsing utilities |
| `src/services/github/sync-service.ts` | `getFileContent()` for fetching README and captured-ideas |
| `src/components/ui/BottomSheet.tsx` | Possible container pattern |

### Technical Decisions

- **Needs further investigation**: Whether this should be a full-page view (new `viewKey`) or a tall bottom sheet. Full-page fits better with the mobile-first flow.
- **README fetching**: Lazy-load on view open, cache in memory (not persisted). Show loading skeleton while fetching.
- **AI instructions editing**: Use a simple `<textarea>` for editing the header block. On save, rewrite the captured-ideas file with updated header (reuse `buildFullFileContent` pattern).
- **Offline behavior**: Show cached repo name/info but disable README fetch and editing. Show "Connect to view repo details" message.

## Implementation Plan

### Tasks

> **Note:** This is a draft spec. Tasks need deeper investigation before implementation — particularly around the view architecture, markdown rendering approach, and how header editing integrates with the existing sync flow.

1. Add new `viewKey` value (e.g., `'repoDetail'`) to App.tsx view routing
2. Change header repo selector to navigate to repo detail view instead of repo picker
3. Create `RepoDetailView` component with sections:
   - Repo name + description (from GitHub API or cached)
   - README excerpt (fetched, read-only)
   - AI instructions (fetched from captured-ideas header, editable textarea)
   - "Switch Repository" button → navigates to repo picker
4. Add `fetchReadme()` utility to sync-service
5. Add header update function to save edited AI instructions back to captured-ideas file
6. Wire up view transitions with animation

### Acceptance Criteria

- **Given** a user taps the repo selector in the header, **then** the repo detail view opens (not the picker directly).
- **Given** the repo detail view is open, **when** README exists, **then** it displays the README content.
- **Given** the repo detail view is open, **then** the AI instructions from the captured-ideas header are shown and editable.
- **Given** the user edits AI instructions and saves, **then** the captured-ideas file is updated in the repo with the new header.
- **Given** the user taps "Switch Repository", **then** the repo picker opens.
- **Given** the user is offline, **then** a message indicates details are unavailable, but "Switch Repository" still works.

## Additional Context

### Dependencies

- Claude MD Integration spec (the AI instructions section shows/edits the same header that spec injects)
- Existing sync infrastructure (Octokit, file read/write)

### Testing Strategy

- TBD — needs deeper investigation during story creation

### Notes

- This is a **draft** spec. It captures the vision and rough architecture but needs a proper deep investigation pass (Step 2) before it's implementation-ready. Key open questions:
  - Full-page view vs. bottom sheet?
  - How much of README to show? First N lines? Collapsible?
  - Should the view also show sync status, last sync time, task count for the repo?
  - How does editing the AI header interact with concurrent sync? (Conflict potential)
- Consider creating a proper BMAD story for this rather than implementing from quick spec, as it touches core navigation flow.
