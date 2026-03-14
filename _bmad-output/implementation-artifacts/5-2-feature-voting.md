# Story 5.2: Feature Voting

Status: ready-for-dev

## Story

As a User,
I want to upvote features on the roadmap that matter to me,
so that the developer knows what the community wants most.

## Acceptance Criteria

1. [ ] **Vote Button:** Each roadmap item (status: planned or in-progress) displays a vote button with the current vote count.
2. [ ] **Single Vote Per Feature:** A user can vote for a feature at most once. Tapping again removes the vote (toggle behavior).
3. [ ] **Vote Persistence:** Votes persist across sessions using localStorage.
4. [ ] **Visual Feedback:** Voting provides immediate visual feedback — the button fills/animates and the count updates optimistically.
5. [ ] **Vote Sorting:** Features within the same status group are sorted by vote count (descending), so the most wanted features rise to the top.
6. [ ] **Shipped Features:** Shipped features do not show a vote button.

## Tasks / Subtasks

- [ ] Extend Roadmap Data & State
  - [ ] Add vote state to Zustand store or a dedicated `useVoteStore.ts`: `{ votes: Record<string, boolean> }` (featureId → hasVoted).
  - [ ] Persist vote state via Zustand `persist` middleware (localStorage).
- [ ] Build Vote Button Component
  - [ ] Create `src/features/community/components/VoteButton.tsx`.
  - [ ] Display vote count and voted/not-voted state.
  - [ ] Toggle vote on tap with optimistic UI update.
  - [ ] Animate vote action (subtle scale + fill transition).
- [ ] Integrate with RoadmapView
  - [ ] Add VoteButton to each non-shipped roadmap item card.
  - [ ] Sort items within status groups by vote count (descending).
- [ ] Vote Aggregation Strategy (Future-Ready)
  - [ ] For MVP: votes are local-only (per device). Add a `// TODO: aggregate via GitHub Reactions or lightweight API` comment.
  - [ ] Document the future path: GitHub Issues + Reactions as a zero-cost backend for vote aggregation.

## Dev Notes

- **Local-Only Votes (MVP):** Individual vote counts are per-device for the MVP. This is intentional — it still gives the user a sense of participation and lets them "mark" what they care about. True aggregation can come later via GitHub Reactions on Issues tagged `roadmap`.
- **Future Aggregation Path:** Each roadmap item could have an optional `githubIssueNumber` field. A future story could sync votes to GitHub Reactions (thumbs-up) and read aggregated counts back. This keeps the architecture zero-backend.
- **Community Spirit:** The voting is about "Sag uns, was dir wichtig ist" — not competitive feature polls. Keep the tone collaborative.
- **Touch Targets:** Vote button must be at least 44x44px per mobile-first guidelines.

### Project Structure Notes

- **Community Module:** `src/features/community/`
- **Store:** `src/stores/useVoteStore.ts` (or extend `useSyncStore.ts`)

### References

- [Source: _bmad-output/implementation-artifacts/5-1-roadmap-teaser-data-model.md]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
