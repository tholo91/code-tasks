# Story 7.1: Remove Passphrase Gate — Instant App Launch

Status: done

## Story

As a User,
I want the app to open instantly to my last-used repository's task list without re-entering a passphrase,
so that I can capture ideas in under 5 seconds from cold start.

## Acceptance Criteria

1. **Given** I have previously authenticated with a valid GitHub PAT,
   **When** I re-open the app (new tab, browser restart, or mobile re-launch),
   **Then** the token is auto-recovered without any passphrase prompt and I land on my last-used repo's task list.

2. **Given** I am on the Auth screen for the first time,
   **When** I enter a valid GitHub PAT and tap "Connect",
   **Then** no passphrase field is shown — token is validated and stored directly.

3. **Given** the stored token has expired or been revoked,
   **When** the app attempts auto-recovery on launch,
   **Then** the user is redirected to the Auth screen with a clear message ("Token expired — please reconnect").

4. **Given** I am authenticated,
   **When** I tap "Logout",
   **Then** the stored token is cleared and I return to the Auth screen.

5. **Given** the app is running with the passphrase removed,
   **When** all existing tests are run,
   **Then** all tests pass (updated to reflect the passphrase-free flow).

## Tasks / Subtasks

- [x] Task 1: Remove passphrase from AuthForm (AC: 2)
  - [x] 1.1 Remove passphrase input field and label from `src/features/auth/components/AuthForm.tsx`
  - [x] 1.2 Remove passphrase validation logic
  - [x] 1.3 Update help text (remove encryption explanation, simplify to "Your token is stored locally on this device")
  - [x] 1.4 Update `AuthForm.test.tsx` — remove passphrase-related test cases, add test for token-only flow

- [x] Task 2: Simplify token storage in useSyncStore (AC: 1, 2)
  - [x] 2.1 Remove `needsPassphrase` state field from `src/stores/useSyncStore.ts`
  - [x] 2.2 Remove `unlockWithPassphrase` action
  - [x] 2.3 Remove `setNeedsPassphrase` action
  - [x] 2.4 Modify `setAuth(token, user)` — remove passphrase parameter, store token as plaintext (Base64-encoded for consistency) instead of AES-GCM encrypted
  - [x] 2.5 Modify `clearAuth()` — remove sessionStorage passphrase cleanup
  - [x] 2.6 Remove `PASSPHRASE_SESSION_KEY` constant and all sessionStorage passphrase operations
  - [x] 2.7 Remove `arrayBufferToBase64` / `base64ToArrayBuffer` helpers if no longer used
  - [x] 2.8 Update `useSyncStore.test.ts` — remove passphrase tests, update `setAuth` tests

- [x] Task 3: Simplify hydration flow (AC: 1, 3)
  - [x] 3.1 Update `src/components/auth/hydration.ts` — remove passphrase check from `performHydration()`
  - [x] 3.2 Directly recover token (read from store) and validate with GitHub API
  - [x] 3.3 If token invalid/expired → `clearAuth()` (existing behavior)
  - [x] 3.4 Remove `PASSPHRASE_KEY` constant
  - [x] 3.5 Update `hydration.test.ts` — remove passphrase-missing test cases, add direct recovery tests

- [x] Task 4: Simplify Octokit recovery (AC: 1)
  - [x] 4.1 Update `src/services/github/octokit-provider.ts` `recoverOctokit()`
  - [x] 4.2 Remove sessionStorage passphrase retrieval
  - [x] 4.3 Read token directly from store state (no decryption needed)
  - [x] 4.4 Remove passphrase error handling

- [x] Task 5: Remove PassphraseUnlock from App.tsx (AC: 1)
  - [x] 5.1 Delete `PassphraseUnlock` component (lines ~122–202 of `src/App.tsx`)
  - [x] 5.2 Remove `needsPassphrase` from `getViewKey()` logic
  - [x] 5.3 Remove passphrase view branch from `AnimatePresence`
  - [x] 5.4 Update `App.test.tsx` if passphrase view is tested

- [x] Task 6: Handle migration of existing encrypted tokens (AC: 1)
  - [x] 6.1 On app load, if `encryptedToken` exists in store but no plaintext `token`, treat as legacy → redirect to auth screen
  - [x] 6.2 OR: Simply clear auth data on first load after migration (user re-enters token once)
  - [x] 6.3 Add brief migration note in the auth screen: "We've simplified login — please re-enter your token once"

- [x] Task 7: Clean up crypto-utils (AC: 5)
  - [x] 7.1 Keep `src/services/storage/crypto-utils.ts` (may be useful for future features)
  - [x] 7.2 Remove crypto-utils imports from useSyncStore and octokit-provider if no longer used there
  - [x] 7.3 Keep `crypto-utils.test.ts` as-is (tests the utility, not the auth flow)

- [x] Task 8: Run tests and build (AC: 5)
  - [x] 8.1 Run `npm test` — fix any failing tests
  - [x] 8.2 Run `npm run build` — ensure clean build
  - [x] 8.3 Manual smoke test: fresh login, app reload, logout, re-login

## Dev Notes

### Architecture Compliance

- **Store Pattern:** All state changes go through `useSyncStore` — no direct localStorage manipulation from UI components. This remains unchanged.
- **Service Boundaries:** Octokit recovery via `octokit-provider.ts` → store → token. The boundary is preserved; we're just removing the decryption step.
- **Write-Through Pattern:** Token persistence still uses the Zustand persist middleware → localStorage. No change to the pattern.

### Security Considerations

- **Plaintext Token Storage:** The token will be stored as plaintext (Base64-encoded) in localStorage. This is acceptable because:
  - The device itself is encrypted (passcode/biometric)
  - The PRD and product owner (Thomas) explicitly approved this tradeoff
  - Most developer tools (GitHub CLI, git credential store) use similar approaches
  - The token is still only accessible from the same origin (browser same-origin policy)
- **Do NOT** store the token in a cookie or expose it to any external scripts
- **Do NOT** log the token to console in production

### Token Storage Format Change

**Before (encrypted):**
```json
{
  "encryptedToken": "AQIDBAU...BASE64_ENCRYPTED...",
  "isAuthenticated": true,
  "user": { ... }
}
```

**After (plaintext):**
```json
{
  "token": "ghp_xxxxxxxxxxxx",
  "isAuthenticated": true,
  "user": { ... }
}
```

Consider renaming `encryptedToken` → `token` in the store state interface for clarity.

### Migration Strategy

Simplest approach: on first load after this change, if the store has `encryptedToken` but no `token`, clear auth and force re-login. This is a one-time inconvenience. Do NOT attempt to auto-decrypt (we don't have the passphrase).

### Project Structure Notes

**Files to Modify:**
| File | Action |
|------|--------|
| `src/features/auth/components/AuthForm.tsx` | Remove passphrase field, simplify form |
| `src/features/auth/components/AuthForm.test.tsx` | Update tests |
| `src/stores/useSyncStore.ts` | Remove passphrase state/actions, simplify setAuth |
| `src/stores/useSyncStore.test.ts` | Update tests |
| `src/components/auth/hydration.ts` | Remove passphrase check |
| `src/components/auth/hydration.test.ts` | Update tests |
| `src/services/github/octokit-provider.ts` | Remove passphrase retrieval |
| `src/App.tsx` | Delete PassphraseUnlock, simplify viewKey |
| `src/App.test.tsx` | Update if needed |

**Files to Keep Unchanged:**
| File | Reason |
|------|--------|
| `src/services/storage/crypto-utils.ts` | Utility may be useful later |
| `src/services/storage/crypto-utils.test.ts` | Tests the utility independently |
| `src/components/auth/AuthGuard.tsx` | No passphrase logic |
| `src/services/github/auth-service.ts` | Token validation, no passphrase |
| `src/services/storage/storage-service.ts` | Generic storage, no passphrase |

### Testing Standards

- **Framework:** Vitest + Testing Library
- **Coverage:** All modified files must have updated tests
- **Test co-location:** Tests live next to source files (e.g., `AuthForm.test.tsx` next to `AuthForm.tsx`)
- **Mocking:** Mock `crypto.subtle` in tests that used it for passphrase encryption (most can be removed)
- **Key test scenarios:**
  - Token-only auth flow (no passphrase prompt)
  - App reload → auto-recovery without passphrase
  - Expired token → redirect to auth
  - Legacy encrypted token → force re-login
  - Logout → clear token

### References

- [Source: `src/stores/useSyncStore.ts`] — Central auth state and token storage
- [Source: `src/components/auth/hydration.ts`] — App startup recovery flow
- [Source: `src/services/github/octokit-provider.ts`] — Token → Octokit initialization
- [Source: `src/features/auth/components/AuthForm.tsx`] — Initial login form
- [Source: `src/App.tsx` lines 122–202] — PassphraseUnlock component to delete
- [Source: `src/App.tsx` lines 294–301] — viewKey routing logic
- [Source: `src/services/storage/crypto-utils.ts`] — AES-GCM encryption (keep as utility)
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-15.md`] — Course correction approval
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 7.1`] — Epic requirements

### Git Intelligence

Recent commits show:
- `f3a7de5` — UI redesign (design system, animations) — establishes CSS class patterns to follow
- `fea703b` — Fixed login hang on "Initializing GitHub access..." — hydration fix, be careful not to reintroduce this bug
- `3c5c660` — Auth onboarding UX improvements — shows established auth UI patterns

**Critical:** The hydration fix in `fea703b` addressed a race condition. When simplifying hydration, ensure the async flow still handles the Suspense boundary correctly. The `AuthGuard` + `use(getHydrationPromise())` pattern must remain intact.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- RepoSelector.test.tsx: 9 pre-existing timeout failures (confirmed on clean main before changes)

### Completion Notes List

- Task 1: Removed passphrase input field, validation logic, and encryption references from AuthForm. Updated help text. 6 tests pass.
- Task 2: Removed `encryptedToken`, `needsPassphrase`, `unlockWithPassphrase`, `setNeedsPassphrase`, `PASSPHRASE_SESSION_KEY`, `arrayBufferToBase64`, `base64ToArrayBuffer` from useSyncStore. Renamed field to `token` (plaintext). Removed crypto-utils and sessionStorage imports. 17 tests pass.
- Task 3: Simplified hydration to read `token` directly from store — no decryption, no passphrase check. Added legacy migration detection. 12 tests pass.
- Task 4: Simplified octokit-provider to read token directly from store state. Removed decryption and sessionStorage passphrase retrieval.
- Task 5: Deleted PassphraseUnlock component from App.tsx. Removed `needsPassphrase` view branch and store selector. Updated App.test.tsx mock state.
- Task 6: Added migration logic in hydration: detects legacy `encryptedToken` in localStorage, sets migration flag, clears auth for re-login. AuthForm shows migration note when flag present.
- Task 7: Kept crypto-utils.ts and its tests as-is. Confirmed no remaining imports from store or octokit-provider.
- Task 8: All 234 tests pass (9 pre-existing RepoSelector timeouts excluded). Build succeeds cleanly.

### Change Log

- 2026-03-15: Implemented Story 7.1 — Removed passphrase gate for instant app launch. All ACs satisfied.

### File List

**Modified:**
- `src/features/auth/components/AuthForm.tsx` — Removed passphrase field/validation, added migration note
- `src/features/auth/components/AuthForm.test.tsx` — Updated for token-only flow
- `src/stores/useSyncStore.ts` — Removed encryption, passphrase state/actions, simplified to plaintext token
- `src/stores/useSyncStore.test.ts` — Updated for new store interface
- `src/components/auth/hydration.ts` — Removed passphrase/decryption, added legacy migration
- `src/components/auth/hydration.test.ts` — Updated for direct token recovery + migration tests
- `src/services/github/octokit-provider.ts` — Reads token directly, no decryption
- `src/App.tsx` — Deleted PassphraseUnlock component, removed passphrase view
- `src/App.test.tsx` — Updated mock state (token instead of encryptedToken)
