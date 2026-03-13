# Story 3.5: Fuzzy Task Search

Status: ready-for-dev

## Story

As a User,
I want a search bar above my captured task list that fuzzy-searches across task titles and descriptions,
so that I can quickly find specific ideas as my list grows beyond a handful of items.

## Acceptance Criteria

1. **Given** the task list contains fewer than 5 tasks, **When** the app renders the capture screen, **Then** the search bar is visible but visually de-emphasized — muted placeholder text, reduced opacity — so it doesn't compete with The Pulse input.

2. **Given** the task list contains 5 or more tasks, **When** the app renders the capture screen, **Then** the search bar transitions to a fully active, prominent state (full opacity, standard Primer input styling).

3. **Given** a user types in the search bar, **When** any character is entered, **Then** the task list filters in real-time to show only tasks whose `title` OR `body` (description) fuzzy-matches the search term — with no delay perceptible to the user.

4. **Given** the search bar has input, **When** the user clears it (backspace or ✕ clear icon), **Then** the full unfiltered task list is restored instantly.

5. **Given** no tasks match the current search term, **When** the list would be empty, **Then** an inline empty state is shown: `"No tasks match '{{query}}'"` — no full-screen takeover.

6. **Given** the app is on mobile, **When** the user taps the search bar, **Then** the keyboard opens and the search bar meets the 44×44px minimum touch target requirement.

## Tasks / Subtasks

- [ ] Install and configure `fuse.js` (AC: #3)
  - [ ] `npm install fuse.js`
  - [ ] Create `src/features/capture/utils/fuzzy-search.ts` — exports a configured `Fuse` instance with `keys: ['title', 'body']`, `threshold: 0.4`, `includeScore: false`
- [ ] Build `TaskSearchBar` component (AC: #1, #2, #4, #6)
  - [ ] Create `src/features/capture/components/TaskSearchBar.tsx`
  - [ ] Implement progressive disclosure: prop `taskCount: number` drives opacity/style variant
  - [ ] Include clear (✕) icon button when input has value
  - [ ] Apply Primer token styling (`--color-border-default`, `--color-fg-muted`, `--color-accent-fg`)
  - [ ] Ensure 44×44px min touch targets on mobile
- [ ] Integrate search state and filtering into task list (AC: #3, #4, #5)
  - [ ] Add local `searchQuery` state (`useState<string>`) in the parent capture screen component — do NOT persist to Zustand
  - [ ] Pass `searchQuery` to `TaskSearchBar` and a filtered task array to the task list renderer
  - [ ] Filtering: if `searchQuery` is empty → pass all tasks; else → run `fuse.search(searchQuery)` and extract items
  - [ ] Empty state: render inline message `"No tasks match '{{searchQuery}}'"` when filtered list is empty
- [ ] Ensure animation respects `prefers-reduced-motion` (AC: #2)
  - [ ] Opacity transition on threshold change uses Framer Motion with `useReducedMotion()` guard
- [ ] Write unit tests (see Testing Requirements)

## Dev Notes

### Architecture Placement

- **Component:** `src/features/capture/components/TaskSearchBar.tsx` — co-located with The Pulse and Task Card components in the capture feature.
- **Utility:** `src/features/capture/utils/fuzzy-search.ts` — pure utility, no React, exports the configured `Fuse` instance and a typed wrapper function.
- **State:** Local `useState` in the capture screen (`src/features/capture/CaptureScreen.tsx` or equivalent parent). Search query is ephemeral UI state — no Zustand, no LocalStorage.
- **Data source:** Filter operates on the in-memory task array from `useSyncStore` — NOT re-fetched from LocalStorage on every keystroke.

### Fuse.js Configuration

```ts
// src/features/capture/utils/fuzzy-search.ts
import Fuse from 'fuse.js';
import { Task } from '@/types';

export const createTaskFuse = (tasks: Task[]) =>
  new Fuse(tasks, {
    keys: ['title', 'body'],
    threshold: 0.4,       // 0 = exact match, 1 = match anything — 0.4 is the sweet spot
    ignoreLocation: true, // search full string, not just the start
    minMatchCharLength: 2,
  });
```

> `threshold: 0.4` — intentionally chosen to catch common typos and partial matches without returning noise. If too aggressive in review, tighten to `0.3`.

### Progressive Disclosure Logic

```tsx
// De-emphasized when < 5 tasks, active when >= 5
const isProminent = tasks.length >= 5;
```

Use a Framer Motion `animate` prop to transition opacity: `0.4` → `1.0`. Respect `useReducedMotion()` — if true, skip animation and set opacity directly.

### Data Model Dependency

Tasks in LocalStorage/Zustand must have distinct `title` and `body` fields for Fuse.js keying to work. **Story 3.1** (The Pulse UI) establishes the task data shape — verify that the implemented `Task` type in `src/types/` includes:

```ts
interface Task {
  id: string;
  title: string;       // First line of Pulse input
  body: string;        // Remaining lines (may be empty string)
  isImportant: boolean;
  syncStatus: 'pending' | 'synced' | 'offline';
  createdAt: string;   // ISO 8601
}
```

If `body` is stored differently (e.g., `description`), update the Fuse keys accordingly.

### UX Alignment

- **Visual position:** Search bar sits between the repository context header and the task list, below The Pulse input area. Never overlaps or competes with the Pulse text area.
- **Styling:** Use Primer's `TextInput` component with a `LeadingVisual` search octicon (`octicon-search`).
- **Empty state:** Inline, centered below the search bar — NOT a full-screen illustration. Keep it minimal: muted text only.
- **Keyboard:** On desktop, `Cmd+F` / `Ctrl+F` should NOT hijack browser find — do NOT intercept this shortcut. Search bar focus is mouse/touch initiated only.

### Project Structure Notes

- Alignment: All files follow the feature-based pattern `src/features/capture/`.
- No new service layer needed — this is pure in-memory filtering.
- No new Zustand store slice needed.

### References

- [Source: architecture.md#Project Structure & Boundaries] — feature-based isolation pattern
- [Source: architecture.md#Naming Patterns] — PascalCase components, kebab-case utilities
- [Source: architecture.md#State Management Patterns] — Zustand for sync state only; local state for ephemeral UI
- [Source: ux-design-specification.md#Component Strategy] — Primer React components, Framer Motion for animations
- [Source: ux-design-specification.md#Accessibility Strategy] — 44×44px touch targets, `prefers-reduced-motion`
- [Source: ux-design-specification.md#Button Hierarchy] — Secondary actions use outline styling

## Testing Requirements

- **Unit:** `src/features/capture/utils/fuzzy-search.test.ts`
  - Test: exact title match returns task
  - Test: fuzzy title match (e.g., "compnent" matches "component") returns task
  - Test: body/description match returns task
  - Test: no match returns empty array
  - Test: empty query returns all tasks (handled upstream, but verify utility doesn't break)
- **Unit:** `TaskSearchBar.test.tsx`
  - Test: renders de-emphasized when `taskCount < 5`
  - Test: renders prominent when `taskCount >= 5`
  - Test: clear button appears when input has value, clears on click
- **Integration:** In the capture screen — type search query, verify filtered list updates; clear, verify full list restores.
- No E2E required for this story.

## Dev Agent Record

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

### Completion Notes List

### File List
