# Story 5.1: Roadmap Teaser & Feature Data Model

Status: ready-for-dev

## Story

As a User,
I want to see what features are planned for Gitty,
so that I know the project is alive and I can look forward to what's coming.

## Acceptance Criteria

1. [ ] **Roadmap Data Model:** A structured data source (JSON file or TypeScript constant) defines the roadmap with fields: `id`, `title`, `description`, `status` (planned | in-progress | shipped), `category` (optional).
2. [ ] **Roadmap View:** A dedicated Roadmap screen/panel is accessible from the app's navigation (e.g. settings menu, bottom nav, or a subtle "What's next?" link).
3. [ ] **Feature List:** Planned and in-progress features are displayed as cards with title, short description, and status badge.
4. [ ] **Shipped Features:** Shipped features are visually distinguished — muted styling with a checkmark, shown in a collapsed "Already shipped" section at the bottom.
5. [ ] **Empty State:** If no features are in the roadmap (edge case), a friendly message is shown: "Wir planen gerade — schau bald wieder rein!"
6. [ ] **Mobile-First:** The roadmap view follows the existing mobile-first design language (44x44px tap targets, GitHub Dark Dimmed palette).
7. [ ] **Description Truncation:** Feature descriptions longer than 3 lines are truncated with an ellipsis on mobile. No expand/collapse needed for MVP.
8. [ ] **Unique IDs:** Roadmap item IDs must be unique. A runtime assertion (dev-only) guards against duplicate IDs to prevent React key collisions and vote-mapping errors (Story 5.2 dependency).

## Tasks / Subtasks

- [ ] Define Roadmap Data Model
  - [ ] Create `src/data/roadmap.ts` with a typed array of `RoadmapItem` objects.
  - [ ] Define `RoadmapItem` interface in `src/types/roadmap.ts`: `{ id: string; title: string; description: string; status: 'planned' | 'in-progress' | 'shipped'; category?: string }`.
  - [ ] Populate with initial features from `docs/Development-Roadmap.md` and the existing epics.
- [ ] Build Roadmap View Component
  - [ ] Create `src/features/community/components/RoadmapView.tsx`.
  - [ ] Render roadmap items grouped by status: "In Arbeit" → "Geplant" → "Umgesetzt".
  - [ ] Use status badges with distinct colors (amber for in-progress, blue for planned, green for shipped).
- [ ] Add Navigation Entry
  - [ ] Add a "Roadmap" or "Was kommt als Nächstes?" link to the app's settings/menu area.
  - [ ] Implement routing or modal/sheet to show the RoadmapView.
- [ ] Style & Polish
  - [ ] Follow GitHub Dark Dimmed palette.
  - [ ] Ensure smooth scroll and correct touch targets on mobile.
  - [ ] Apply `line-clamp-3` (or equivalent CSS) to feature description text on mobile viewports.
- [ ] Data Integrity Guard
  - [ ] Add a dev-only runtime assertion in `roadmap.ts` that verifies all IDs are unique: `new Set(items.map(i => i.id)).size === items.length`.

## Dev Notes

- **Data Source Strategy:** For MVP, a static TypeScript file is sufficient. No backend needed. Updates ship with app releases. Later, this could be driven by GitHub Issues with labels.
- **Community Spirit:** The roadmap is not just a feature list — it's a signal that this is an active, transparent project. The tone should be warm and inviting, not corporate.
- **Zustand Integration:** The roadmap data doesn't need to go into the global store initially — it's read-only static data. Voting state (Story 5.2) will be added to the store later.

### Project Structure Notes

- **Community Module:** `src/features/community/`
- **Types:** `src/types/roadmap.ts`
- **Data:** `src/data/roadmap.ts`

### References

- [Source: docs/Development-Roadmap.md]
- [Source: _bmad-output/planning-artifacts/epics.md]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
