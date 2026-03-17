# Story 7.8: Branch Protection Detection & User Guidance

Status: done

## Update Notes (2026-03-17)

- The sync engine now supports a `conflict` state with a review sheet (remote vs local file). Branch protection handling must not override or mask the conflict flow.
- `syncPendingTasks` now returns `{ status: 'conflict' }` when remote SHA changed. Branch protection classification should only apply to commit failures (not SHA mismatch detection).

## Core Concept

**The user should never be confused by a sync failure.** When a repository has branch protection rules (require pull requests, require status checks, restrict pushers), the Octokit `createOrUpdateFileContents` call fails with a 403 or 422. Today, that surfaces as a cryptic "Sync failed" error in the SyncFAB. The user has no idea what went wrong or how to fix it. This story turns that into a clear, friendly, actionable message.

**Detect, don't block.** Branch protection is detected reactively — when sync fails — not proactively on repo selection. Proactive detection via the GitHub API (`GET /repos/{owner}/{repo}/branches/{branch}/protection`) requires admin scope, which many PATs don't have. Reactive detection is zero-cost, requires no additional permissions, and catches the actual problem.

**Banner with escape hatch, not modal.** The guidance appears as a dismissible banner at the top of the screen with a "Switch Repo" CTA button — the user can fix the problem in one tap. The banner also reassures: *"Your tasks are saved locally and won't be lost."* It does NOT block the app — the user can still create, edit, and manage tasks locally. Only sync is affected.

**Auto-sync suppression.** After a branch protection error, auto-sync is suppressed for that repo to prevent the error banner from appearing every time the app opens. Manual sync (tapping SyncFAB) always works — the user can retry anytime. Switching repos resets the suppression.

## Story

As a User,
I want to be warned clearly when sync fails because my repository has branch protection,
so that I understand what happened and know what to do about it.

## Acceptance Criteria

1. **Given** I tap "Push to GitHub" on a repo with branch protection,
   **When** the sync fails with a 403 or 422 error,
   **Then** a dismissible banner appears at the top with a clear message explaining the issue,
   **And** the banner provides actionable guidance.

2. **Given** the branch protection banner is showing,
   **When** I read the message,
   **Then** it says something like: *"Can't sync to this repo — it has restrictions that prevent Gitty from saving directly. Your tasks are saved locally and won't be lost."*
   **And** there is no technical jargon (no "403", no "pull requests", no "createOrUpdateFileContents"),
   **And** a "Switch Repo" button is visible that opens the repo picker.

3. **Given** the branch protection banner is showing,
   **When** I tap the "Switch Repo" button,
   **Then** the RepoPickerSheet opens so I can select a different repository.

4. **Given** the branch protection banner is showing,
   **When** I tap the dismiss button (X),
   **Then** the banner disappears,
   **And** it does not reappear until the next sync attempt fails for the same reason.

5. **Given** the branch protection banner was dismissed,
   **When** I switch to a different repository,
   **Then** the banner state resets (the new repo may or may not have protection).

6. **Given** sync fails for a reason OTHER than branch protection (network error, auth expired, etc.),
   **When** the error is handled,
   **Then** the branch protection banner does NOT appear,
   **And** the existing error state in SyncFAB handles it (turns red, shows error).

7. **Given** the SyncFAB shows an error state after a branch protection failure,
   **When** I look at the sync status,
   **Then** the SyncFAB shows its error state (red),
   **And** the SyncHeaderStatus badge shows "Sync error" or equivalent.

8. **Given** I am on a repo where sync previously failed due to branch protection,
   **When** I try to sync again (maybe I fixed the protection rules),
   **Then** the sync is attempted normally,
   **And** if it succeeds, the banner is cleared and the success state shows.

9. **Given** sync has previously failed due to branch protection on this repo,
   **When** the auto-sync hook would normally trigger (app load, reconnection),
   **Then** auto-sync is skipped for this repo to prevent repeated error banners on every app open,
   **And** manual sync via the SyncFAB is still available.

## Tasks / Subtasks

- [x] Task 1: Add branch protection error detection to sync service (AC: 1, 5)
  - [x] 1.1 In `sync-service.ts` → `syncPendingTasks()`, catch the error thrown by `commitTasks`
  - [x] 1.2 Inspect the error: if `status === 403` or `status === 422`, check the error message for branch protection indicators
  - [x] 1.3 GitHub API returns these messages for branch protection:
    - 403: `"Resource not accessible by personal access token"` (if PAT lacks push permission due to protection)
    - 422: `"protected branch hook declined"` or `"Changes must be made through a pull request"`
    - 403: `"push declined due to repository rule violations"`
  - [x] 1.4 Return a structured error: `{ syncedCount: 0, error: message, errorType: 'branch-protection' | 'auth' | 'network' | 'unknown' }`
  - [x] 1.5 Add `errorType` to the return type of `syncPendingTasks`
  - [x] 1.6 Map error conditions:
    - `status === 403` + message contains "protection" or "rule violations" or "pull request" → `'branch-protection'`
    - `status === 422` + message contains "protected" or "pull request" → `'branch-protection'`
    - `status === 401` or `status === 403` + message contains "credentials" or "token" → `'auth'`
    - Network errors (no status) → `'network'`
    - Everything else → `'unknown'`

- [x] Task 2: Add `syncErrorType` to store (AC: 1, 4, 6, 7)
  - [x] 2.1 Add `syncErrorType: 'branch-protection' | 'auth' | 'network' | 'unknown' | null` to `SyncState` interface
  - [x] 2.2 Initialize as `null`
  - [x] 2.3 Update `setSyncStatus` to accept optional `errorType` parameter: `setSyncStatus(status, error?, errorType?)`
  - [x] 2.4 When `status === 'error'`, store both `syncError` and `syncErrorType`
  - [x] 2.5 When `status !== 'error'`, reset `syncErrorType` to `null`
  - [x] 2.6 Reset `syncErrorType` to `null` when `selectedRepo` changes (AC: 4) — add to `setSelectedRepo`
  - [x] 2.7 Add `syncErrorType` to `partialize` exclusion list (do NOT persist error type across sessions — it should be fresh)

- [x] Task 3: Create `BranchProtectionBanner` component (AC: 1, 2, 3, 4)
  - [x] 3.1 Create `src/features/sync/components/BranchProtectionBanner.tsx`
  - [x] 3.2 Props: `onDismiss: () => void`, `onSwitchRepo: () => void`
  - [x] 3.3 UI: full-width banner at the top of the main view (below AppHeader, above search bar)
  - [x] 3.4 Styling: amber/warning background (`var(--color-warning)` at 15% opacity), `var(--color-border)` border, rounded, padding
  - [x] 3.5 Icon: lock SVG on the left (inline, simple)
  - [x] 3.6 Message text (NO technical jargon — no "pull requests", no "403", no API terms):
    ```
    Can't sync to this repo — it has restrictions that prevent
    Gitty from saving directly.
    Your tasks are saved locally and won't be lost.
    ```
  - [x] 3.7 "Switch Repo" CTA button: `btn-ghost` style with `var(--color-accent)` text, positioned below the message or inline-right. Calls `onSwitchRepo`. `data-testid="banner-switch-repo"`
  - [x] 3.8 Dismiss button: "X" icon top-right corner, `aria-label="Dismiss"`, calls `onDismiss`
  - [x] 3.9 Animation: `motion.div` with `initial={{ height: 0, opacity: 0 }}`, `animate={{ height: 'auto', opacity: 1 }}`, exit reverse. Wrap in `AnimatePresence`.
  - [x] 3.10 Text styling: `text-body` for main message, `text-label` for "saved locally" reassurance in `var(--color-text-secondary)`
  - [x] 3.11 `data-testid="branch-protection-banner"`
  - [x] 3.12 Do NOT include technical details (no HTTP status codes, no API endpoint names, no "pull requests")

- [x] Task 4: Wire banner into App.tsx (AC: 1, 3, 4, 5, 8)
  - [x] 4.1 Add state: `const [bannerDismissed, setBannerDismissed] = useState(false)`
  - [x] 4.2 Read `syncErrorType` from store: `const syncErrorType = useSyncStore((s) => s.syncErrorType)`
  - [x] 4.3 Show banner when: `syncErrorType === 'branch-protection' && !bannerDismissed`
  - [x] 4.4 On dismiss: `setBannerDismissed(true)`
  - [x] 4.5 On "Switch Repo": call `setShowRepoPicker(true)` — reuses the existing RepoPickerSheet in App.tsx
  - [x] 4.6 Reset `bannerDismissed` when `selectedRepo` changes: add `useEffect` that sets `setBannerDismissed(false)` when `selectedRepo` changes
  - [x] 4.7 Reset `bannerDismissed` when sync succeeds: `syncErrorType` becoming `null` (after successful sync) implicitly hides the banner
  - [x] 4.8 Place `<BranchProtectionBanner>` in the main view, after `<AppHeader>` and before the search bar, inside the `max-w-[640px]` container
  - [x] 4.9 Wrap in `<AnimatePresence>`

- [x] Task 5: Update SyncFAB error handling (AC: 1, 6)
  - [x] 5.1 In `SyncFAB.handleManualSync`, pass `errorType` from `syncPendingTasks` result to `setSyncStatus`:
    ```ts
    if (result.error) {
      setSyncStatus('error', result.error, result.errorType)
    }
    ```
  - [x] 5.2 In the `catch` block, determine error type from the caught error and pass it through
  - [x] 5.3 The SyncFAB's existing red error state already handles the visual feedback — no additional changes needed to the FAB UI itself

- [x] Task 6: Suppress auto-sync after branch protection error (AC: 9)
  - [x] 6.1 In `src/features/sync/hooks/useAutoSync.ts`, read `syncErrorType` from the store
  - [x] 6.2 Before triggering auto-sync, check: `if (syncErrorType === 'branch-protection') return` — skip auto-sync
  - [x] 6.3 This prevents the error banner from reappearing on every app open or reconnection
  - [x] 6.4 Manual sync (SyncFAB tap) is unaffected — the user can always retry manually
  - [x] 6.5 When the user switches repos, `syncErrorType` resets to `null` (Task 2.6), so auto-sync resumes for the new repo
  - [x] 6.6 When the user manually syncs and it succeeds, `syncErrorType` resets to `null`, so auto-sync resumes

- [x] Task 7: Tests (AC: all)
  - [x] 7.1 **Sync service tests** (`sync-service.test.ts`):
    - Test 403 with "protection" message returns `errorType: 'branch-protection'`
    - Test 422 with "protected branch" message returns `errorType: 'branch-protection'`
    - Test 403 with "credentials" message returns `errorType: 'auth'`
    - Test network error returns `errorType: 'network'`
    - Test generic error returns `errorType: 'unknown'`
  - [x] 7.2 **Store tests** (`useSyncStore.test.ts`):
    - Test `setSyncStatus('error', msg, 'branch-protection')` sets `syncErrorType`
    - Test `setSyncStatus('success')` resets `syncErrorType` to null
    - Test `setSelectedRepo` resets `syncErrorType` to null
  - [x] 7.3 **BranchProtectionBanner tests** (`BranchProtectionBanner.test.tsx`):
    - Test renders with correct non-technical message text
    - Test "Switch Repo" button calls onSwitchRepo
    - Test dismiss button calls onDismiss
    - Test no technical jargon in rendered text (no "403", no "422", no "pull request")
    - Test "saved locally" reassurance text is present
    - Test accessibility: banner has appropriate role and aria attributes
  - [x] 7.4 **App.tsx tests** (`App.test.tsx`):
    - Test banner shows when syncErrorType is 'branch-protection'
    - Test banner hides when dismissed
    - Test "Switch Repo" opens RepoPickerSheet
    - Test banner resets when repo changes
    - Test banner does not show for other error types
  - [x] 7.5 **Auto-sync tests** (`useAutoSync` or integration):
    - Test auto-sync is skipped when `syncErrorType === 'branch-protection'`
    - Test auto-sync resumes after repo switch (syncErrorType reset)
    - Test manual sync still works when auto-sync is suppressed
  - [x] 7.6 Create `src/features/sync/components/BranchProtectionBanner.test.tsx`

- [x] Task 8: Run tests and build (AC: all)
  - [x] 8.1 `npm test` — fix failures
  - [x] 8.2 `npm run build` — clean build
  - [ ] 8.3 Manual smoke test:
    - Select a repo with branch protection → attempt sync → verify banner appears with clear, non-technical message
    - Verify "Your tasks are saved locally" reassurance is visible
    - Tap "Switch Repo" → verify RepoPickerSheet opens
    - Dismiss banner → verify it disappears
    - Close and reopen app → verify banner does NOT reappear automatically (auto-sync suppressed)
    - Switch repos → verify banner state resets
    - Retry sync after fixing protection → verify success clears banner
    - Trigger a network error → verify branch protection banner does NOT appear

## Dev Notes

### Error Detection Logic — CRITICAL

GitHub API returns different error shapes for branch protection. The detection must be **substring-based** on the error message, not just status code, because 403/422 have multiple meanings:

```ts
function classifySyncError(err: unknown): {
  message: string
  errorType: 'branch-protection' | 'auth' | 'network' | 'unknown'
} {
  if (!err || typeof err !== 'object') {
    return { message: 'Sync failed', errorType: 'unknown' }
  }

  const status = 'status' in err ? (err as { status: number }).status : 0
  const msg = err instanceof Error ? err.message : String(err)
  const msgLower = msg.toLowerCase()

  // Branch protection patterns
  if (
    (status === 403 || status === 422) &&
    (msgLower.includes('protection') ||
     msgLower.includes('pull request') ||
     msgLower.includes('rule violation'))
  ) {
    return {
      message: 'This repository has branch protection rules that prevent direct pushes.',
      errorType: 'branch-protection',
    }
  }

  // Auth errors
  if (status === 401 || (status === 403 && msgLower.includes('token'))) {
    return { message: 'Authentication failed. Please log in again.', errorType: 'auth' }
  }

  // Network errors (no status code)
  if (status === 0 || msgLower.includes('network') || msgLower.includes('fetch')) {
    return { message: 'Network error. Please check your connection.', errorType: 'network' }
  }

  return { message: msg, errorType: 'unknown' }
}
```

### Banner Design — Non-Technical, Friendly, Actionable

The banner must be understandable by a user who knows nothing about GitHub. **No status codes, no API terminology, no "pull requests."** Even "pull requests" is jargon — a designer or junior dev using Gitty shouldn't have to know what that means.

**Message:**
```
🔒 Can't sync to this repo
   This repository has restrictions that prevent Gitty from saving directly.
   Your tasks are saved locally and won't be lost.
   [Switch Repo]  [✕]
```

**Three elements, each with a purpose:**
1. **Problem** (line 1-2): What happened, in plain language
2. **Reassurance** (line 3): "Your tasks are saved locally" — eliminates vault anxiety
3. **Escape hatch** (button): "Switch Repo" opens the RepoPickerSheet — fix the problem in one tap

**Tone:** Calm and helpful, not alarming. The user's data is safe. Only sync is affected.

### Banner Placement

```
┌─────────────────────────────┐
│ AppHeader (repo name, sync) │
├─────────────────────────────┤
│ 🔒 Branch protection banner │ ← HERE (dismissible)
├─────────────────────────────┤
│ Search bar                  │
│ Priority filter pills       │
│ Task list...                │
└─────────────────────────────┘
```

The banner sits inside the `max-w-[640px]` content container, matching the content width. It appears with a slide-down animation and disappears with a collapse.

### Store Changes — Minimal

Add one field to `SyncState`:

```ts
interface SyncState {
  // ... existing fields ...
  syncErrorType: 'branch-protection' | 'auth' | 'network' | 'unknown' | null
}
```

Update `setSyncStatus`:
```ts
setSyncStatus: (status: SyncEngineStatus, error?: string, errorType?: string) => {
  set({
    syncEngineStatus: status,
    isSyncing: status === 'syncing',
    syncError: error ?? null,
    syncErrorType: status === 'error' ? (errorType as SyncState['syncErrorType']) ?? 'unknown' : null,
  })
},
```

Reset on repo change:
```ts
setSelectedRepo: (repo: SelectedRepo | null) => {
  set({ selectedRepo: repo, syncErrorType: null, syncError: null })
},
```

**Do NOT persist `syncErrorType`** — it should not survive app restarts. The error state is transient and will be re-detected on next sync attempt.

### Why Reactive Detection (Not Proactive)

The epic mentions optionally checking branch protection rules via GitHub API on repo selection. This was considered and rejected because:

1. **Permission issue:** `GET /repos/{owner}/{repo}/branches/{branch}/protection` requires admin access or a PAT with `admin:repo_hook` scope. Most users' PATs have only `repo` scope. The API call itself would fail with 403 for non-admin users.

2. **Rate limit cost:** Checking on every repo switch adds unnecessary API calls. The user may never sync to that repo.

3. **False sense of security:** Branch protection rules can change at any time. A proactive check on selection could pass, then fail on sync hours later.

4. **Reactive is simpler and accurate:** We detect the actual failure at the exact moment it matters. Zero extra API calls, zero permission concerns, 100% accurate.

### SyncFAB Error State — Already Works

The SyncFAB already handles error states:
- `setSyncStatus('error', message)` sets `syncEngineStatus: 'error'`
- The FAB shows red state (if it had visual error handling — currently it just stops syncing)
- `SyncHeaderStatus` shows the error badge

The only change is passing the `errorType` through so the banner knows whether to show. The FAB/header visual behavior is unchanged.

### Auto-Sync Suppression — CRITICAL UX

The `useAutoSync` hook triggers sync on app load and reconnection. Without suppression, a user whose selected repo has branch protection would see the error banner **every time they open the app** — before they've even done anything. That's terrible UX.

**Fix:** In `useAutoSync`, check `syncErrorType` before triggering:
```ts
const syncErrorType = useSyncStore((s) => s.syncErrorType)
if (syncErrorType === 'branch-protection') return // Skip auto-sync
```

This is clean because:
- Manual sync (SyncFAB) always works — user can retry
- Switching repos resets `syncErrorType` → auto-sync resumes for new repo
- Successful manual sync resets `syncErrorType` → auto-sync resumes

### What About Retry?

The user can always tap "Push to GitHub" again. If they've fixed the branch protection rules in GitHub settings, the retry will succeed, `setSyncStatus('success')` fires, and `syncErrorType` resets to `null` — which hides the banner automatically and re-enables auto-sync. No special retry logic needed.

### "Switch Repo" CTA — Zero New Infrastructure

The banner's "Switch Repo" button calls `onSwitchRepo` which maps to `setShowRepoPicker(true)` in App.tsx — the same function the AppHeader's repo name button uses. Zero new components, zero new state. The user picks a new repo, the banner resets, and they're back to capturing.

### Future Enhancement: Alternative Sync Strategies

For a future story, we could offer:
- **"Create a PR instead"** — push to a branch and open a PR
- **"Use a different branch"** — let the user configure a non-protected branch for capture files

These are significant scope additions and should be separate stories if pursued.

### Design Tokens Reference

| Token | Value | Usage in this story |
|-------|-------|-----|
| `--color-warning` | `#d29922` | Banner accent/border color |
| `--color-surface` | `#161b22` | Banner background |
| `--color-border` | `#30363d` | Banner border |
| `--color-text-primary` | `#e6edf3` | Banner message text |
| `--color-text-secondary` | `#8b949e` | Banner secondary text |

### Animation Constants Reference

**File:** `src/config/motion.ts`

| Constant | Value | Usage |
|----------|-------|-------|
| `TRANSITION_NORMAL` | Used in OfflineNotification | Banner slide-down animation |
| `TRANSITION_FAST` | `{ duration: 0.15 }` | Dismiss animation |

### Previous Story Intelligence

**Story 7.7 (Task Deletion) — ready-for-dev:**
- Full file rebuild in sync is a hard requirement — if that's implemented, sync pushes the entire file
- `hasPendingDeletions` flag added to store — similar pattern to `syncErrorType`
- UndoToast component — similar positioning/styling reference for the banner

**Story 7.4 (Task Checkboxes) — done:**
- `syncStatus: 'pending'` reset pattern — sync error should NOT change individual task syncStatus
- Completed section in App.tsx — banner goes ABOVE the task list, not between sections

**Existing error handling:**
- `SyncFAB.handleManualSync` catches errors and calls `setSyncStatus('error', message)` — we extend this
- `OfflineNotification` in App.tsx — similar banner pattern (fixed position, dismissible), but branch protection banner is inline, not fixed-position

### Project Structure Notes

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/features/sync/components/BranchProtectionBanner.tsx` | Warning banner component |
| `src/features/sync/components/BranchProtectionBanner.test.tsx` | Tests |

**Files to Modify:**

| File | Change |
|------|--------|
| `src/services/github/sync-service.ts` | Add error classification, return `errorType` from `syncPendingTasks` |
| `src/stores/useSyncStore.ts` | Add `syncErrorType` state, update `setSyncStatus` signature, reset on repo change |
| `src/features/sync/components/SyncFAB.tsx` | Pass `errorType` from sync result to `setSyncStatus` |
| `src/features/sync/hooks/useAutoSync.ts` | Suppress auto-sync when `syncErrorType === 'branch-protection'` |
| `src/App.tsx` | Add `BranchProtectionBanner` with dismiss state + Switch Repo CTA, wire to `syncErrorType` |

**Files to Update (tests):**

| File | Change |
|------|--------|
| `src/services/github/sync-service.test.ts` | Add error classification tests |
| `src/stores/useSyncStore.test.ts` | Add `syncErrorType` state tests |
| `src/App.test.tsx` | Add banner visibility tests |
| `src/features/sync/components/SyncFAB.test.tsx` | Update for new `setSyncStatus` signature |

### Git Intelligence

Recent commits:
- `dc7711b` — Merged UI redesign PR — defines CSS classes and design tokens
- `f3a7de5` — Comprehensive UI redesign with unified design system
- `fea703b` — Fixed hydration race condition — do NOT break `AuthGuard` + `use(getHydrationPromise())`

### References

- [Source: `src/services/github/sync-service.ts`] — `syncPendingTasks`, `commitTasks`, error handling (lines 99-111)
- [Source: `src/stores/useSyncStore.ts`] — `setSyncStatus` (lines 232-238), `setSelectedRepo` (line 108)
- [Source: `src/features/sync/components/SyncFAB.tsx`] — `handleManualSync` error flow (lines 18-31)
- [Source: `src/components/layout/SyncHeaderStatus.tsx`] — Sync status badge patterns
- [Source: `src/App.tsx`] — `OfflineNotification` banner pattern (lines 85-121), main view layout
- [Source: `src/config/motion.ts`] — Animation constants
- [Source: `src/index.css`] — Design tokens, badge classes
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 7.8`] — Epic requirements
- [Source: `_bmad-output/implementation-artifacts/7-7-task-deletion.md`] — Previous story patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed `classifySyncError` to use `msgLower.includes('protect')` instead of `'protection'` to match both "protected" and "protection" in GitHub error messages.
- Removed unused `listItemVariants` import in App.tsx (pre-existing issue, fixed to pass build).
- Removed unused `TRANSITION_FAST` import in BranchProtectionBanner.tsx.

### Completion Notes List

- ✅ Implemented `classifySyncError()` function in sync-service.ts that classifies errors into branch-protection, auth, network, or unknown types
- ✅ Added `SyncErrorType` type and `errorType` field to `SyncResult` interface
- ✅ Added `syncErrorType` to Zustand store with proper lifecycle (reset on repo change, reset on success, not persisted)
- ✅ Created `BranchProtectionBanner` component with non-technical messaging, lock icon, Switch Repo CTA, dismiss button, and slide-down animation
- ✅ Wired banner into App.tsx with dismiss state, repo change reset, and AnimatePresence
- ✅ Updated SyncFAB to pass errorType through to setSyncStatus
- ✅ Updated useAutoSync to suppress auto-sync when syncErrorType is 'branch-protection'
- ✅ All 331 tests pass (31 test files), including 30+ new tests across sync-service, store, banner, App, and SyncFAB
- ✅ Build passes cleanly

### Change Log

- 2026-03-17: Implemented Story 7.8 — Branch protection detection with user-friendly banner, error classification, auto-sync suppression, and comprehensive tests

### File List

**New files:**
- `src/features/sync/components/BranchProtectionBanner.tsx` — Warning banner component
- `src/features/sync/components/BranchProtectionBanner.test.tsx` — Banner tests (8 tests)

**Modified files:**
- `src/services/github/sync-service.ts` — Added `classifySyncError()`, `SyncErrorType`, `errorType` in `SyncResult`
- `src/stores/useSyncStore.ts` — Added `syncErrorType` state, updated `setSyncStatus` signature, reset on repo change
- `src/features/sync/components/SyncFAB.tsx` — Pass `errorType` from sync result to `setSyncStatus`
- `src/features/sync/hooks/useAutoSync.ts` — Suppress auto-sync when `syncErrorType === 'branch-protection'`, pass errorType through
- `src/App.tsx` — Added `BranchProtectionBanner` with dismiss state, repo change reset
- `src/services/github/sync-service.test.ts` — Added error classification and integration tests (12 new tests)
- `src/stores/useSyncStore.test.ts` — Added `syncErrorType` state tests (5 new tests)
- `src/features/sync/components/SyncFAB.test.tsx` — Updated mock, added errorType passthrough test
- `src/App.test.tsx` — Added banner visibility tests (4 new tests)
