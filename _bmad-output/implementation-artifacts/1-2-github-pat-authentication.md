# Story 1.2: GitHub PAT Authentication & Encryption

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to enter my GitHub Personal Access Token (PAT) and have it stored securely,
so that I can access my repositories without re-entering credentials every session.

## Acceptance Criteria

1. [x] **Auth UI:** A dedicated Authentication screen/modal with a secure input field for the GitHub PAT.
2. [x] **Token Validation:** Upon submission, the system uses `octokit` to validate the PAT by calling the `getAuthenticated` user endpoint.
3. [x] **Secure Encryption:** Successfully validated tokens are encrypted using **AES-GCM** (Web Crypto API) with a high-iteration PBKDF2 derived key (min 600,000 iterations).
4. [x] **Persistent Storage:** The encrypted token is stored in `LocalStorage` via the `storage-service.ts` buffer.
5. [x] **State Integration:** The authentication status and user metadata (username, avatar) are stored in the `useSyncStore` (Zustand).
6. [x] **Navigation:** Upon successful auth, the user is redirected to the main capture interface (The Pulse).
7. [x] **Error Handling:** Invalid tokens or network failures are displayed as non-intrusive error states on the auth form.

## Tasks / Subtasks

- [ ] Implement Security Utilities (AC: 3)
  - [ ] Create `src/services/storage/crypto-utils.ts` for AES-GCM encryption/decryption using the Web Crypto API.
  - [ ] Implement `encryptData` and `decryptData` with PBKDF2 key derivation (600,000 iterations).
- [ ] Implement Auth Service (AC: 2, 5)
  - [ ] Create `src/services/github/auth-service.ts` using `octokit`.
  - [ ] Implement `validateToken(token: string)` and `getAuthenticatedUser(octokit: Octokit)` methods.
- [ ] Build Auth Feature UI (AC: 1, 6, 7)
  - [ ] Create `src/features/auth/components/AuthForm.tsx` using React 19 `useActionState` for handling the submission action.
  - [ ] Use GitHub Primer (Dark Dimmed) styling for the form and inputs.
  - [ ] Implement redirect logic to the Pulse screen upon success.
- [ ] State Management (AC: 5)
  - [ ] Update `src/stores/useSyncStore.ts` to include `isAuthenticated`, `user`, and `token` (encrypted) state.
  - [ ] Ensure the "Write-Through" pattern: data is encrypted and saved to LocalStorage BEFORE updating the store.

## Dev Notes

- **React 19 Actions:** Leverage `useActionState` and `useFormStatus` to handle the asynchronous auth flow natively without `useEffect`.
- **Encryption Standard:** AES-GCM is mandatory. IV must be 12 bytes; salt must be 16 bytes. Store as a single buffer: `[salt(16) + iv(12) + ciphertext]`.
- **Octokit v4+:** Use the `Octokit` constructor with the `auth` property. 
- **Architectural Boundary:** No UI component communicates with GitHub directly. `AuthForm` calls `auth-service.ts` or a Zustand action.

### Project Structure Notes

- **Auth Module:** `src/features/auth/`
- **GitHub Service:** `src/services/github/auth-service.ts`
- **Crypto Utility:** `src/services/storage/crypto-utils.ts`
- **Global Store:** `src/stores/useSyncStore.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR1, FR3]
- [Source: Web Research - March 11, 2026: React 19 Action State and AES-GCM Best Practices]

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash (March 2026)

### Debug Log References

### Completion Notes List

### File List
