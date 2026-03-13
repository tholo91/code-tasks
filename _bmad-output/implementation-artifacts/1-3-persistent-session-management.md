# Story 1.3: Persistent Session Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want the app to remember my authenticated state,
so that I can start capturing ideas immediately without logging in every time I open the app.

## Acceptance Criteria

1. [x] **Hydration Strategy:** On app launch, the `useSyncStore` (Zustand) is hydrated from `LocalStorage`.
2. [x] **Secure Decryption:** If an encrypted token exists, the system uses `crypto-utils.ts` to decrypt it (using the persistent device key or user secret).
3. [x] **Session Validation:** The decrypted token is validated against the GitHub API (`octokit.rest.users.getAuthenticated()`) BEFORE the user is granted access to the Pulse interface.
4. [x] **Loading State:** A non-blocking "Auth Skeleton" or Splash screen is shown while hydration and validation occur, using React 19 `Suspense` and the `use()` hook.
5. [x] **Auto-Login:** Upon successful validation, the user is automatically directed to the "Pulse" capture screen.
6. [x] **Token Expiry Handling:** If the token is invalid or expired, the session is cleared from both LocalStorage and the Zustand store, and the user is redirected to the Auth screen.
7. [x] **Network Resilience:** If the device is offline during launch, the system allows access based on the last-known "Valid" local state but flags a "Sync Required" warning.

## Tasks / Subtasks

- [x] Implement Hydration & Guard (AC: 1, 4)
  - [x] Configure `useSyncStore.ts` with `persist` middleware and `skipHydration: true`.
  - [x] Create `src/components/auth/AuthGuard.tsx` using React 19 `use(hydrationPromise)` to suspend rendering until hydration is complete.
- [x] Implement Session Recovery (AC: 2, 3, 5)
  - [x] Update `auth-service.ts` to include `revalidateSession(encryptedToken: string)` logic.
  - [x] Implement `decryptData` integration for token recovery.
  - [x] Ensure `Octokit` is re-initialized with the recovered token.
- [x] Build Loading UI (AC: 4)
  - [x] Create a lightweight `AuthSkeleton.tsx` for the Splash/Loading state.
  - [x] Wrap the main application entry in `Suspense` targeting the `AuthGuard`.
- [x] Handle Session Failure (AC: 6)
  - [x] Implement `clearSession()` in `useSyncStore.ts` to wipe LocalStorage and reset state.
  - [x] Ensure automatic redirect to `/auth` on validation failure.

## Dev Notes

- **React 19 Hydration:** Use the `use(hydrationPromise)` pattern inside the `AuthGuard` to integrate with `Suspense`. 
- **Zustand Persistence:** Store is configured with `skipHydration: true`. Hydration is managed manually by `hydration.ts` singleton to allow for asynchronous token validation before the app becomes interactive.
- **Offline Logic:** If `navigator.onLine` is false, the system trusts the local state but displays a "Sync Required" flag in the header.

### Project Structure Notes

- **Auth Guard:** `src/components/auth/AuthGuard.tsx`
- **Hydration Engine:** `src/components/auth/hydration.ts`
- **Loading UI:** `src/components/ui/AuthSkeleton.tsx`
- **Validation Logic:** `src/services/github/auth-service.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#State Management Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR3]
- [Source: Web Research - March 11, 2026: React 19 Suspense for Auth Hydration Patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (March 2026)

### Debug Log References

None.

### Completion Notes List

- Refactored `useSyncStore.ts` to use Zustand `persist` middleware with `skipHydration: true`.
- Passphrase is cached in `sessionStorage` during `setAuth()` to enable auto-login across page reloads.
- Created `src/components/auth/hydration.ts` with the core hydration logic: rehydrate store -> check auth state -> decrypt token -> validate with GitHub API -> clear on failure. Supports offline mode.
- Created `src/components/auth/AuthGuard.tsx` using React 19 `use(hydrationPromise)` pattern.
- Created `src/components/ui/AuthSkeleton.tsx` as a lightweight loading spinner.
- Updated `App.tsx` to wrap content in `<Suspense fallback={<AuthSkeleton />}><AuthGuard>...</AuthGuard></Suspense>`.
- `clearAuth()` wipes both localStorage and sessionStorage passphrase and resets hydration promise.

### Change Log

- 2026-03-13: Implemented persistent session management (Story 1.3) - hydration, session recovery, loading UI, session failure handling.

### File List

- `src/stores/useSyncStore.ts`
- `src/stores/useSyncStore.test.ts`
- `src/components/auth/AuthGuard.tsx`
- `src/components/auth/AuthGuard.test.tsx`
- `src/components/auth/hydration.ts`
- `src/components/auth/hydration.test.ts`
- `src/components/ui/AuthSkeleton.tsx`
- `src/components/ui/AuthSkeleton.test.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
