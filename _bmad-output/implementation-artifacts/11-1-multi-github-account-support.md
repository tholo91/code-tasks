# Story 11.1: Multi-GitHub Account Support

Status: backlog

## Story

As a developer with multiple GitHub accounts (e.g. personal + work),
I want to connect and switch between them in Gitty,
so that I can capture tasks to repos across all my accounts without logging in and out.

## Acceptance Criteria

1. User can store more than one GitHub PAT, each associated with a labeled account (e.g. "Personal", "Work")
2. User can switch the active account via a clear UI affordance (e.g. account selector in header or settings)
3. Repository list updates immediately to reflect the active account's repos
4. Tasks are scoped to the account + repo they were created under
5. Encrypted token storage extends to support multiple tokens (AES-GCM vault)
6. Existing single-account users are seamlessly migrated (no data loss, no re-auth required)
7. Offline mode works correctly regardless of which account was last active

## Tasks / Subtasks

- [ ] Task 1: Multi-token storage architecture (AC: #5, #6)
  - [ ] Extend encrypted storage from single token to keyed token vault
  - [ ] Migration logic for existing single-token users
- [ ] Task 2: Account management UI (AC: #1, #2)
  - [ ] Add/remove account flow in Settings
  - [ ] Account switcher component (header or settings)
  - [ ] Account label + avatar display
- [ ] Task 3: Scoped data model (AC: #3, #4)
  - [ ] Repos filtered by active account
  - [ ] Tasks tagged with account origin
  - [ ] Octokit service re-initialization on account switch
- [ ] Task 4: Offline & sync handling (AC: #7)
  - [ ] Offline queue per account
  - [ ] Sync engine awareness of active account context

## Dev Notes

- Current auth: single PAT encrypted with AES-GCM in LocalStorage (`src/services/github/`, `src/stores/`)
- Octokit is initialized once on login — will need re-init or multi-instance pattern
- This is a substantial feature touching auth, storage, sync, and repo selection layers
- Consider whether account switch should be a full "context switch" or allow cross-account views

### Project Structure Notes

- Token storage: `src/services/` (encrypted storage layer)
- Auth flow: `src/features/auth/`
- Repo selection: `src/features/repos/`
- Sync engine: `src/services/github/`
- Stores: `src/stores/` (Zustand with persist middleware)

### References

- [Source: _bmad-output/implementation-artifacts/1-2-github-pat-authentication.md] — original single-token auth story
- [Source: _bmad-output/implementation-artifacts/1-3-persistent-session-management.md] — session persistence design
- [Source: _bmad-output/planning-artifacts/architecture.md] — AES-GCM encryption pattern

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
