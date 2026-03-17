# Deep Dive Recommendations  -  Post Story 7.6

Date: 2026-03-17

Purpose: This is a handoff document for a fresh agent. It lists future improvements and risks observed during a deep dive. It does not enumerate fixes already applied.

## 1. Sync Reliability and Conflict Handling

Problem: Sync and persistence are optimistic and can produce silent conflicts when a repo changes remotely, when multiple devices are used, or when background sync overlaps a user edit. The current flow lacks durable conflict detection and a user-facing resolution path.

Impact: Users may lose edits, see tasks reshuffled, or get unexpected overwrites after a GitHub push or pull. This is high risk for a tool positioned as reliable and GitHub-integrated.

Recommendation:
1. Add per-repo sync metadata: lastSyncedSha, lastSyncAt, inFlight flag, and a monotonic local revision.
2. On sync pull, compare GitHub file SHA to lastSyncedSha; if changed and local revision has pending edits, mark a conflict state instead of auto-merging.
3. Implement a conflict UI: "Remote changed" banner with options to view diff, keep local, or overwrite remote.
4. Implement a retry with exponential backoff for network errors and rate-limits.

Implementation notes:
1. Centralize sync state in the store, not in components, to avoid divergent flags.
2. Make sync requests idempotent by attaching a requestId to prevent double-apply.
3. Persist lastSyncedSha in IDB so the state survives restarts.

Suggested files to inspect:
1. `src/stores/useSyncStore.ts`
2. `src/services/GitHubService.ts`
3. `src/services/StorageService.ts`
4. `src/features/sync/*` (if present)

Suggested tests:
1. Unit test: conflict detection when SHA changes while local pending exists.
2. Integration test: sync with simulated 409/403/429 responses and backoff.

## 2. Quick Capture Pipeline (Latency and Friction)

Problem: The capture flow still includes extra interaction steps on mobile, and immediate reliability depends on several async paths (state update, IDB write, UI update). There is no "capture-first" mode that hard-prioritizes speed and resilience.

Impact: Slower capture increases drop-off. Users want to dump ideas instantly and trust that sync will happen later.

Recommendation:
1. Introduce a "quick capture" mode: single field, auto-focus, submit on Enter, immediate optimistic add.
2. Add a local capture queue that persists drafts before rendering, so a hard refresh never loses the just-captured item.
3. Add a "capture while offline" indicator that informs the user but never blocks.

Implementation notes:
1. Create a small local queue in IDB keyed by repo, flushed on next sync.
2. Ensure the capture UI is a pure function of local state; never depend on GitHub network state.
3. Normalize input on save (trim, collapse whitespace) to avoid duplicate tasks with near-identical text.

Suggested files to inspect:
1. `src/features/capture/*`
2. `src/stores/useSyncStore.ts`
3. `src/services/StorageService.ts`

Suggested tests:
1. E2E: offline capture persists after reload.
2. Unit: queue flushes in correct order after reconnect.

## 3. Mobile-First Drag and Reorder UX

Problem: Drag-and-drop is touch-first but still lacks a dedicated affordance for accessibility and long lists. On small screens, accidental drags and scroll conflicts are likely.

Impact: Users can feel drag is "fiddly," reducing trust and slowing prioritization.

Recommendation:
1. Add an optional drag handle to reduce accidental drags and improve clarity.
2. Implement auto-scroll while dragging near top/bottom of the list.
3. Add a "reorder mode" toggle for large lists, enabling more predictable interactions.

Implementation notes:
1. Use a handle component with `aria-label="Reorder"` and a larger touch target (min 44px).
2. Auto-scroll can be implemented via `requestAnimationFrame` when pointer is near viewport edges.
3. For large lists, consider a visual "edit mode" that disables tap-to-open to avoid conflicts.

Suggested files to inspect:
1. `src/features/capture/components/DraggableTaskCard.tsx`
2. `src/App.tsx`
3. `src/styles/*`

Suggested tests:
1. E2E: drag on iOS Safari in a list of 50+ tasks with auto-scroll.
2. Accessibility: keyboard-only reorder with handle focus.

## 4. Accessibility and Keyboard Support

Problem: Keyboard and screen-reader support is incomplete for reorder and quick capture workflows, and focus management is fragile around sheets.

Impact: Users who rely on keyboard or assistive tech will struggle with key workflows, hurting adoption and compliance.

Recommendation:
1. Implement keyboard reordering (move up/down) with live region announcements.
2. Ensure all sheets trap focus correctly without blocking content.
3. Add explicit labels to controls and unique IDs for inputs.

Implementation notes:
1. Use a roving tabindex for reorder items and a single active handle.
2. Add `aria-live="polite"` to announce reorders.
3. For sheets, use a focus trap library that allows internal tabbables.

Suggested files to inspect:
1. `src/features/capture/components/CreateTaskSheet.tsx`
2. `src/features/capture/components/TaskDetailSheet.tsx`
3. `src/components/*`

Suggested tests:
1. Unit: keyboard reorder changes order and announces text.
2. E2E: tabbing through sheet fields in order.

## 5. Order Semantics for Completed Tasks

Problem: Order is applied to all tasks but completed tasks are also sorted by `completedAt` elsewhere. This dual sorting logic can cause surprising order in the markdown output, especially if completion toggles or migrations run.

Impact: Users may see completed tasks reorder unexpectedly after sync or migration, which feels like data loss.

Recommendation:
1. Define a separate `completedOrder` or always sort completed tasks strictly by `completedAt` and do not persist `order` for them.
2. Ensure markdown output has a clear rule: active tasks by `order`, completed tasks by `completedAt`.
3. Update migration logic to avoid assigning `order` to completed tasks unless required.

Implementation notes:
1. Refactor ordering to a single `sortTasksForDisplay()` util used in UI and markdown generation.
2. Keep ordering logic centralized to avoid drift between UI and sync output.

Suggested files to inspect:
1. `src/stores/useSyncStore.ts`
2. `src/services/MarkdownService.ts` (or equivalent)
3. `src/App.tsx`

Suggested tests:
1. Unit: completed tasks remain in completedAt order after reorder of active tasks.
2. Snapshot: markdown output ordering is stable.

## 6. GitHub Integration Robustness

Problem: GitHub integration likely assumes a single branch and a single file path. It may not handle repo permission changes, branch protection, or rate limits in a user-visible way.

Impact: Users can be blocked or confused when sync fails, especially for protected branches and multi-branch workflows.

Recommendation:
1. Detect default branch and store it per repo; prompt users if writing to a protected branch fails.
2. Gracefully handle 403/404/409 responses with targeted messaging.
3. Add a "dry run" mode to validate permissions before first sync.

Implementation notes:
1. Cache repo metadata (default branch, permissions) in IDB.
2. If a repo is read-only, disable editing and show a clear read-only indicator.
3. For rate limits, surface a countdown until reset.

Suggested files to inspect:
1. `src/services/GitHubService.ts`
2. `src/features/repos/*`
3. `src/stores/useSyncStore.ts`

Suggested tests:
1. Integration: simulate 403 (insufficient scopes), show UI state.
2. Unit: default branch discovery and caching.

## 7. Performance on Large Task Lists

Problem: Reordering and list rendering scales linearly, and may become sluggish on large lists, especially on mobile devices.

Impact: The UI can drop frames or feel unresponsive, undermining the "quick capture" promise.

Recommendation:
1. Add virtualization for long lists (react-virtual or similar) with a non-virtual fallback for small lists.
2. Memoize TaskCard and reduce per-item re-renders on reorder.
3. Batch IDB writes for reorder operations rather than per-task writes.

Implementation notes:
1. Virtualization and drag-reorder can conflict; consider a "reorder mode" that temporarily disables virtualization.
2. Use a write queue with debounce for IDB to avoid write storms.

Suggested files to inspect:
1. `src/App.tsx`
2. `src/features/capture/components/TaskCard.tsx`
3. `src/services/StorageService.ts`

Suggested tests:
1. Performance: reorder 100 tasks and measure total re-render count.
2. Manual: 200+ tasks on a mid-range mobile device.

## 8. Test Stability and Coverage

Problem: Some tests rely on browser APIs (IndexedDB, pointer events, Framer Motion) that are not fully mocked, leading to flaky or noisy runs.

Impact: Reduces confidence and slows delivery. This is especially risky as more complex interactions are added.

Recommendation:
1. Add a `fake-indexeddb` or `idb-keyval` mock in `vitest.setup.ts`.
2. Mock Framer Motion Reorder for unit tests to reduce runtime cost and OOM risk.
3. Introduce E2E tests for drag, capture, and sync with Playwright or Cypress.

Implementation notes:
1. Keep unit tests fast by mocking heavy animation libraries.
2. Use Playwright device profiles for iOS/Android input behavior.

Suggested files to inspect:
1. `vitest.config.ts`
2. `src/test/*`
3. `vitest.setup.ts` (if present)

Suggested tests:
1. E2E: mobile drag and reorder across 20+ items.
2. Unit: sync conflict and retry logic.

## 9. Security and Token Handling

Problem: GitHub token storage appears to be obfuscated rather than encrypted. This is a product risk if the app is marketed to developers.

Impact: Token compromise would be severe and erode trust.

Recommendation:
1. Use WebCrypto AES-GCM to encrypt tokens at rest.
2. Store encryption key in secure storage if available (Capacitor Secure Storage / Keychain / Android Keystore).
3. Add a "log out everywhere" flow and token rotation reminders.

Implementation notes:
1. Abstract token storage behind a `TokenVault` service.
2. Ensure zero-token handling when key access fails.

Suggested files to inspect:
1. `src/services/AuthService.ts` (or equivalent)
2. `src/services/StorageService.ts`

Suggested tests:
1. Unit: encryption/decryption round-trip.
2. Manual: token not visible in plain text in IDB.

## 10. Error Surfaces and User Trust

Problem: Errors are largely silent or logged. Users need clear status: syncing, offline, conflict, retrying, failed.

Impact: Without visible feedback, users don't know if the app is reliable or not.

Recommendation:
1. Add a global sync status indicator with a minimal state machine: idle, syncing, offline, error, conflict.
2. Provide a retry action and a short explanation of the last error.
3. Add a debug panel for developers to see sync history.

Implementation notes:
1. Use a central error store with timestamps and repo context.
2. Collapse errors into a single user-friendly string with a "details" option.

Suggested files to inspect:
1. `src/App.tsx`
2. `src/components/SyncStatus.tsx` (new)
3. `src/stores/useSyncStore.ts`

Suggested tests:
1. Unit: sync state transitions across success, failure, retry.
2. Manual: offline mode with pending tasks, then reconnect.

## 11. Remote Pull / Multi-Device Bootstrapping (Missing)

Problem: The app never reads or parses the GitHub file into local tasks. On a new device (or after clearing local storage), users see an empty list even though tasks exist in the repo. This also makes the "GitHub as source of truth" promise incomplete.

Impact: Users can overwrite remote tasks without realizing it, and multi-device usage becomes unreliable.

Recommendation:
1. Add an explicit "Import from GitHub" flow on repo selection (or a smart auto-import when local is empty).
2. Parse the managed section of the Markdown file into tasks, preserving `createdAt`, `updatedAt`, and `completedAt` where possible.
3. Provide a merge preview before overwriting local tasks if local data already exists.

Implementation notes:
1. Create a Markdown parser that reads between `managed-start` / `managed-end` markers.
2. Store a per-repo "lastPulledSha" to avoid repeated re-imports.
3. Guard against destructive auto-imports by requiring user confirmation when local tasks exist.

Suggested files to inspect:
1. `src/services/github/sync-service.ts`
2. `src/features/sync/utils/markdown-templates.ts`
3. `src/stores/useSyncStore.ts`

Suggested tests:
1. Integration: import existing file and render tasks on first launch.
2. Unit: parse a mixed header + managed section file into tasks.

## 12. Cross-Repo Pending Sync Visibility

Problem: Sync indicators and the Sync FAB are scoped to the currently selected repo. Pending changes in other repos are invisible, which can leave users believing they're fully synced when they're not.

Impact: Missed pushes across repos; unreliable trust signal.

Recommendation:
1. Add a global pending count in the repo selector and/or header.
2. Provide a "Sync all repos" action that iterates pending repos.
3. In the repo list, visually flag repos with pending changes.

Implementation notes:
1. Extend `selectPendingSyncCount` or add a `selectPendingSyncCountAllRepos`.
2. Update the repo selector UI to surface pending counts.

Suggested files to inspect:
1. `src/features/repos/components/RepoSelector.tsx`
2. `src/stores/useSyncStore.ts`
3. `src/components/layout/SyncHeaderStatus.tsx`
