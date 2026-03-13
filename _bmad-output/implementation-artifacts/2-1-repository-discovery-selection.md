# Story 2.1: Repository Discovery & Selection

Status: done

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

- [x] Implement Repository Service (AC: 2, 3)
  - [x] Create `src/services/github/repo-service.ts` using `octokit`.
  - [x] Implement `searchUserRepos(query: string)` and `getMyRepos()` methods using `octokit.paginate.iterator`.
- [x] Build Repo Selector UI (AC: 1, 4, 6)
  - [x] Create `src/features/repos/components/RepoSelector.tsx` following the GitHub Primer "ActionList" component anatomy.
  - [x] Use React 19 `use()` to consume the search promise inside a `Suspense` boundary.
  - [x] Implement a 300ms debounce on the search input to protect API rate limits.
- [x] State Integration (AC: 5)
  - [x] Update `src/stores/useSyncStore.ts` to include `selectedRepo` state and a `setSelectedRepo` action.
  - [x] Ensure the selected repository is displayed in the main app header.
- [x] Error & Rate Limit Handling (AC: 7)
  - [x] Implement a "Retry" or "Rate Limited" state in the search results UI.
  - [x] Use `@octokit/plugin-throttling` in the service layer for secondary rate limit handling.

## Dev Notes

- **React 19 Search:** Use the `use(searchPromise)` pattern for asynchronous repository fetching inside `RepoSelector`, wrapped in `Suspense`. 
- **Centralized Octokit:** `octokit-provider.ts` manages the decrypted `Octokit` instance recovery, ensuring secure and consistent access across the app.
- **Throttling:** Integrated `@octokit/plugin-throttling` to handle primary and secondary GitHub API rate limits gracefully.
- **UX Fidelity:** Follow the GitHub Primer palette: Border `#30363d`, Accent Blue `#58a6ff` for the active selection.

### Project Structure Notes

- **Repo Module:** `src/features/repos/`
- **Octokit Management:** `src/services/github/octokit-provider.ts`
- **GitHub Service:** `src/services/github/repo-service.ts`
- **Global Store:** `src/stores/useSyncStore.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - Repository Switcher]
- [Source: Web Research - March 11, 2026: Octokit Search and React 19 use() hook patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (March 2026)

### Debug Log References

- Installed `@octokit/plugin-throttling` to satisfy rate limiting requirements.
- Implemented `octokit-provider.ts` to manage decrypted Octokit instance recovery.
- Refactored `RepoSelector` and `App.tsx` to use React 19 `use()` + `Suspense` for all async operations.

### Completion Notes List

- **Task 1 (Repository Service):** Created `repo-service.ts` with mapped `GitHubRepo` interface. Integrated `@octokit/plugin-throttling` via `auth-service.ts`.
- **Task 2 (Repo Selector UI):** Created `RepoSelector.tsx` using React 19 `use()` and `Suspense` for search results. 300ms debounce on search input.
- **Task 3 (State Integration):** Extended `useSyncStore` with `selectedRepo` state. Integrated `RepoSelector` into `App.tsx` with a `RepoSelectorContainer` that recovers Octokit via `use()`.
- **Task 4 (Error & Rate Limit Handling):** Throttling plugin configured in `auth-service.ts`. `RepoSelector` handles empty states and loading via `Suspense` fallbacks.

### File List

- `src/services/github/repo-service.ts`
- `src/services/github/repo-service.test.ts`
- `src/services/github/octokit-provider.ts`
- `src/features/repos/components/RepoSelector.tsx`
- `src/features/repos/components/RepoSelector.test.tsx`
- `src/stores/useSyncStore.ts`
- `src/stores/useSyncStore.test.ts`
- `src/App.tsx`
- `src/App.css`

## Change Log

- 2026-03-13: Implemented repository discovery and selection (Story 2.1) — service layer, UI component, state integration, error handling. All 55 tests pass.
