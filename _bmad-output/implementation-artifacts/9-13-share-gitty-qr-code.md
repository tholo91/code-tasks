# Story 9-13: Share Gitty with QR Code

**Status: done**

## Description

Add a "Share Gitty" feature accessible from the About Gitty view. Users can share the app via QR code (App URL or GitHub repo URL), copy-to-clipboard, or native Web Share API.

## Acceptance Criteria

- [x] "Share Gitty" button appears in the About Gitty view
- [x] Clicking opens a ShareQRSheet (BottomSheet) with tabs for App URL and GitHub URL
- [x] QR codes are generated using the `qrcode` library
- [x] Tab switcher allows switching between App and GitHub QR codes
- [x] Copy-to-clipboard button copies the active URL
- [x] Web Share API integration for native sharing (when available)
- [x] URLs are centralized in `src/config/app.ts`
- [x] Mobile-first design with 44px touch targets
- [x] Framer Motion animations for sheet and tab transitions
- [x] Tests pass for all new components

## Tasks

- [x] Create `ShareQRSheet` component with tabbed QR code display
- [x] Add "Share Gitty" button to `AboutGittyView`
- [x] Implement copy-to-clipboard with visual feedback
- [x] Implement Web Share API integration
- [x] Write unit tests for ShareQRSheet and updated AboutGittyView
- [x] Fix vitest config to define `__APP_VERSION__` (was missing)
- [x] Build and test verification

## Dev Agent Record

- **Agent:** Claude Opus 4.6
- **Date:** 2026-04-03
- **Files changed:**
  - `src/features/community/components/ShareQRSheet.tsx` (new)
  - `src/features/community/components/ShareQRSheet.test.tsx` (new)
  - `src/features/community/components/AboutGittyView.tsx` (modified — added Share button + sheet integration)
  - `src/features/community/components/AboutGittyView.test.tsx` (modified — fixed version test, added share button test)
  - `src/config/app.ts` (already had APP_URL and GITHUB_REPO_URL — no changes needed)
  - `vitest.config.ts` (added `__APP_VERSION__` define to fix test environment)
- **Tests:** 14/14 passing (6 AboutGittyView + 8 ShareQRSheet)
- **Build:** Clean build, no new errors
- **Notes:**
  - `qrcode` and `@types/qrcode` were already in package.json
  - APP_URL and GITHUB_REPO_URL were already centralized in `src/config/app.ts`
  - Fixed pre-existing vitest config issue: `__APP_VERSION__` was not defined in test environment
  - Fixed pre-existing test that expected hardcoded `code-tasks v0.0.1` version string
