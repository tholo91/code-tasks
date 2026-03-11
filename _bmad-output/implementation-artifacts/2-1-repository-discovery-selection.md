# Story 2.1: Repository Discovery & Selection

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to search and select my target GitHub repository,
so that I can specify where my `captured-ideas-{username}.md` file will live.

## Acceptance Criteria

1. [x] **Repo Selector UI:** A dedicated search input and list interface (following GitHub Primer "ActionList" pattern) for repository selection.
2. [x] **Async Search:** The system uses `octokit.rest.search.repos` to fetch repositories as the user types (debounced).
3. [x] **User Repos First:** The initial (empty) search state displays the user's recently accessed or owned repositories.
4. [x] **Performance:** The search results are loaded asynchronously using React 19 `use()` and `Suspense` for a non-blocking experience.
5. [x] **Selection Logic:** Selecting a repository updates the `useSyncStore` (Zustand) with the repository's `id`, `full_name`, and `owner`.
6. [x] **Visual Feedback:** Selected state is clearly indicated in the list; the current target repository is displayed in the app header.
7. [x] **Error Handling:** Handles GitHub API search rate limits (30 req/min) gracefully with non-intrusive feedback.

## Tasks / Subtasks

- [ ] Implement Repository Service (AC: 2, 3)
  - [ ] Create `src/services/github/repo-service.ts` using `octokit`.
  - [ ] Implement `searchUserRepos(query: string)` and `getMyRepos()` methods using `octokit.paginate.iterator`.
- [ ] Build Repo Selector UI (AC: 1, 4, 6)
  - [ ] Create `src/features/repos/components/RepoSelector.tsx` following the GitHub Primer "ActionList" component anatomy.
  - [ ] Use React 19 `use()` to consume the search promise inside a `Suspense` boundary.
  - [ ] Implement a 300ms debounce on the search input to protect API rate limits.
- [ ] State Integration (AC: 5)
  - [ ] Update `src/stores/useSyncStore.ts` to include `selectedRepo` state and a `setSelectedRepo` action.
  - [ ] Ensure the selected repository is displayed in the main app header.
- [ ] Error & Rate Limit Handling (AC: 7)
  - [ ] Implement a "Retry" or "Rate Limited" state in the search results UI.
  - [ ] Use `@octokit/plugin-throttling` in the service layer for secondary rate limit handling.

## Dev Notes

- **React 19 Search:** Use the `use(searchPromise)` pattern for "type-to-filter" inside `Suspense`. Avoid manual loading flags in the component.
- **Octokit Pagination:** Use `per_page: 100` and `octokit.paginate.iterator` for efficient fetching of the user's repositories.
- **UX Fidelity:** Follow the GitHub Primer palette: Border `#30363d`, Accent Blue `#58a6ff` for the active selection.

### Project Structure Notes

- **Repo Module:** `src/features/repos/`
- **GitHub Service:** `src/services/github/repo-service.ts`
- **Global Store:** `src/stores/useSyncStore.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - Repository Switcher]
- [Source: Web Research - March 11, 2026: Octokit Search and React 19 use() hook patterns]

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
