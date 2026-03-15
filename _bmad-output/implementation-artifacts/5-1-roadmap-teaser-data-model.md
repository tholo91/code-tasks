# Story 5.1: Roadmap Teaser & Feature Data Model

Status: done

## Story

As a User,
I want to see what features are planned for Gitty,
so that I know the project is alive and I can look forward to what's coming.

## Acceptance Criteria

1. [x] **Roadmap Data Model:** A structured data source (TypeScript constant) defines the roadmap with fields: `id`, `title`, `description`, `status` (planned | in-progress | shipped), `category`.
2. [x] **Roadmap View:** A dedicated Roadmap screen/panel is accessible from the app's navigation.
3. [x] **Feature List:** Planned and in-progress features are displayed as cards with title, description, and status badge.
4. [x] **Shipped Features:** Shipped features are visually distinguished and shown in a collapsed "Umgesetzt" section.
5. [x] **Empty State:** If no features are in the roadmap, a friendly message is shown.
6. [x] **Mobile-First:** Follows GitHub Dark Dimmed palette and 44x44px touch targets.
7. [x] **Description Truncation:** Descriptions are truncated with `line-clamp-3`.
8. [x] **Unique IDs:** Runtime assertion guards against duplicate IDs in dev mode.

## Tasks / Subtasks

- [x] Define Roadmap Data Model
  - [x] Create `src/data/roadmap.ts` with a typed array of `RoadmapItem` objects.
  - [x] Define `RoadmapItem` interface in `src/types/roadmap.ts`.
  - [x] Populate with initial features from roadmap docs.
- [x] Build Roadmap View Component
  - [x] Create `src/features/community/components/RoadmapView.tsx`.
  - [x] Render roadmap items grouped by status.
  - [x] Use status badges with distinct colors (amber, blue, green).
- [x] Add Navigation Entry
  - [x] Add a "Was kommt als Nächstes?" link to the main screen footer.
  - [x] Implement overlay/modal to show the RoadmapView.
- [x] Style & Polish
  - [x] Follow GitHub Dark Dimmed palette.
  - [x] Ensure smooth scroll and 44x44px touch targets.
  - [x] Apply `line-clamp-3` to feature descriptions.
- [x] Data Integrity Guard
  - [x] Add a dev-only runtime assertion in `roadmap.ts` for unique IDs.

## Dev Notes

- **Overlay Strategy:** Implemented as a full-screen overlay within `App.tsx` using Framer Motion's `AnimatePresence`.
- **Styling:** Adheres strictly to the defined GitHub Dark Dimmed CSS variables.
- **Content:** Initial data populated from `docs/Development-Roadmap.md`.

### Project Structure Notes

- **Community Module:** `src/features/community/`
- **Types:** `src/types/roadmap.ts`
- **Data:** `src/data/roadmap.ts`

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash (via Gemini CLI)

### Debug Log References

- None.

### Completion Notes List

- Defined `RoadmapItem` type and initial data in `src/data/roadmap.ts`.
- Created `RoadmapView.tsx` with grouped sections and collapsible "Shipped" area.
- Integrated `RoadmapView` into `App.tsx` with a toggleable overlay.
- Added a subtle "Was kommt als Nächstes?" link to the main capture screen footer.
- Verified unique ID runtime assertion.
- (Self-Correction during Story 3.5 review): Fixed 1-character fuzzy search and added integration tests while implementating this story.

### File List

- `src/types/roadmap.ts` (new)
- `src/data/roadmap.ts` (new)
- `src/features/community/components/RoadmapView.tsx` (new)
- `src/App.tsx` (modified)
