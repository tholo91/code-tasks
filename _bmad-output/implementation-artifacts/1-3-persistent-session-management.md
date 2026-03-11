# Story 1.3: Persistent Session Management

Status: ready-for-dev

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

- [ ] Implement Hydration & Guard (AC: 1, 4)
  - [ ] Configure `useSyncStore.ts` with `persist` middleware and `skipHydration: true`.
  - [ ] Create `src/components/auth/AuthGuard.tsx` using React 19 `use(hydrationPromise)` to suspend rendering until hydration is complete.
- [ ] Implement Session Recovery (AC: 2, 3, 5)
  - [ ] Update `auth-service.ts` to include `revalidateSession(encryptedToken: string)` logic.
  - [ ] Implement `decryptData` integration for token recovery.
  - [ ] Ensure `Octokit` is re-initialized with the recovered token.
- [ ] Build Loading UI (AC: 4)
  - [ ] Create a lightweight `AuthSkeleton.tsx` for the Splash/Loading state.
  - [ ] Wrap the main application entry in `Suspense` targeting the `AuthGuard`.
- [ ] Handle Session Failure (AC: 6)
  - [ ] Implement `clearSession()` in `useSyncStore.ts` to wipe LocalStorage and reset state.
  - [ ] Ensure automatic redirect to `/auth` on validation failure.

## Dev Notes

- **React 19 Hydration:** Use the `use(hydrationPromise)` pattern inside the `AuthGuard` to integrate with `Suspense`. Avoid the legacy `useEffect` + `isMounted` flags.
- **Zustand Persistence:** Use the `persist` middleware with the `onRehydrateStorage` hook to trigger validation immediately after local data is restored.
- **Offline Logic:** If `navigator.onLine` is false, bypass the GitHub API validation but keep the session "Staged" until reconnection.

### Project Structure Notes

- **Auth Guard:** `src/components/auth/AuthGuard.tsx`
- **Loading UI:** `src/components/ui/AuthSkeleton.tsx`
- **Hydration Logic:** `src/stores/useSyncStore.ts`
- **Validation Logic:** `src/services/github/auth-service.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#State Management Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR3]
- [Source: Web Research - March 11, 2026: React 19 Suspense for Auth Hydration Patterns]

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
