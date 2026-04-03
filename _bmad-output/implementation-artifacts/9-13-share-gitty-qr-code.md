# Story 9.13: Share Gitty with QR Code

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Gitty user,
I want to quickly share Gitty with someone by showing a QR code,
so that they can scan it with their phone and instantly open either the app or the GitHub repo — without typing a URL or searching.

## Acceptance Criteria

1. **[Share Button in About View]** Given I am viewing the About Gitty screen, when I look below the existing action buttons ("Star on GitHub", "Report an Issue"), then I see a "Share Gitty" button that is visually consistent with the existing button row style.

2. **[QR Modal Opens]** Given I tap the "Share Gitty" button, when the modal opens, then I see a bottom sheet (using the existing `BottomSheet` component) containing a QR code and a tab/toggle to switch between two share targets.

3. **[Two Share Targets]** Given the QR share sheet is open, when I see the tab selector, then there are two options: "App" (default, selected) showing the Gitty PWA URL (`https://tholo91.github.io/code-tasks/`), and "GitHub" showing the repository URL (`https://github.com/tholo91/code-tasks`). Each tab displays the corresponding QR code and a human-readable URL label below it.

4. **[QR Code Renders Correctly]** Given either tab is selected, when the QR code renders, then it encodes the correct URL, is at least 200x200px, uses a dark-on-light color scheme for maximum scan reliability, and has sufficient quiet zone (margin) around it.

5. **[Copy URL Fallback]** Given the QR share sheet is open, when I tap a "Copy link" button below the QR code, then the currently displayed URL is copied to the clipboard and a brief confirmation toast or inline "Copied!" label appears.

6. **[Native Share API]** Given the browser supports the Web Share API (`navigator.share`), when I tap a "Share" button next to "Copy link", then the native OS share sheet opens with the current URL. Given the browser does not support `navigator.share`, when the share sheet renders, then the "Share" button is hidden (only "Copy link" is shown).

7. **[Close Behavior]** Given the QR share sheet is open, when I tap the backdrop, swipe down, or tap a close button, then the sheet closes and I return to the About Gitty view.

8. **[Reduced Motion]** Given the user has `prefers-reduced-motion` enabled, when the QR share sheet opens or closes, then it uses instant transitions (no slide animation), consistent with all other sheets in the app.

9. **[Touch Targets]** Given I am on a mobile device, when I interact with the tab selector, Copy link button, or Share button, then all interactive elements have a minimum 44x44px touch target.

10. **[Accessibility]** Given a screen reader is active, when the QR share sheet is open, then the sheet has `aria-label="Share Gitty"`, the QR code `<canvas>` or `<svg>` has `role="img"` with an `aria-label` describing the encoded URL, and all buttons have descriptive labels.

## Tasks / Subtasks

- [ ] **T1: Install `qrcode` library**
  - [ ] T1.1: Run `npm install qrcode` and `npm install -D @types/qrcode` — this is a lightweight, well-maintained QR code generator that outputs to canvas or SVG. No heavy dependencies.
  - [ ] T1.2: Verify the dependency is added to `package.json`

- [ ] **T2: Create `ShareQRSheet.tsx` component** (AC: 2, 3, 4, 5, 6, 7, 8, 9, 10)
  - [ ] T2.1: Create `src/features/community/components/ShareQRSheet.tsx`
  - [ ] T2.2: Use the existing `BottomSheet` component (`src/components/ui/BottomSheet.tsx`) as the container — same pattern as `SyncErrorSheet` and `SettingsSheet`
  - [ ] T2.3: Add a tab/toggle with two options: "App" and "GitHub". Use `useState` to track the active tab. Default to "App".
    - "App" tab encodes URL: `https://tholo91.github.io/code-tasks/`
    - "GitHub" tab encodes URL: `https://github.com/tholo91/code-tasks`
  - [ ] T2.4: Render the QR code as an SVG string using `qrcode.toString(url, { type: 'svg', width: 200, margin: 2 })` and inject via `dangerouslySetInnerHTML` inside a container div. Apply `role="img"` and `aria-label` to the container.
  - [ ] T2.5: Below the QR code, display the current URL as a muted text label so users can verify what they are sharing
  - [ ] T2.6: Add "Copy link" button — uses `navigator.clipboard.writeText(url)`. On success, briefly change button text to "Copied!" for 2 seconds using local state + `setTimeout`. Style as secondary outlined button matching existing patterns.
  - [ ] T2.7: Add "Share" button — conditionally rendered only if `typeof navigator.share === 'function'`. Calls `navigator.share({ title: 'Gitty — Task capture for developers', url })`. Style as primary button with `var(--color-accent)`.
  - [ ] T2.8: Ensure all interactive elements have min 44x44px touch targets
  - [ ] T2.9: Apply `useReducedMotion()` — if true, sheet transitions should be instant (this is handled by `BottomSheet` already, but verify)
  - [ ] T2.10: Use Framer Motion `AnimatePresence` for the tab content transition — fade the QR code when switching tabs using `TRANSITION_FAST` from `src/config/motion.ts`

- [ ] **T3: Define share URLs as constants** (AC: 3)
  - [ ] T3.1: In `src/config/app.ts`, add two exported constants:
    ```ts
    export const APP_URL = 'https://tholo91.github.io/code-tasks/'
    export const GITHUB_REPO_URL = 'https://github.com/tholo91/code-tasks'
    ```
  - [ ] T3.2: Update the existing hardcoded `https://github.com/tholo91/code-tasks` references in `AboutGittyView.tsx` and `SettingsSheet.tsx` to use `GITHUB_REPO_URL` — keeps things DRY

- [ ] **T4: Add "Share Gitty" button to `AboutGittyView.tsx`** (AC: 1)
  - [ ] T4.1: In `src/features/community/components/AboutGittyView.tsx`, add a new button in the actions section (after "Report an Issue"), styled as a secondary outlined button matching the "Report an Issue" pattern
  - [ ] T4.2: The button shows a share icon (share/arrow-up-from-box) and label "Share Gitty"
  - [ ] T4.3: On tap, set local state `showShareSheet = true` which renders the `ShareQRSheet` component

- [ ] **T5: Write tests** (AC: 1, 2, 3, 4, 5, 10)
  - [ ] T5.1: Create `src/features/community/components/ShareQRSheet.test.tsx`
  - [ ] T5.2: Test: component renders with "App" tab selected by default
  - [ ] T5.3: Test: switching to "GitHub" tab updates the displayed URL label
  - [ ] T5.4: Test: QR code container has correct `role="img"` and `aria-label`
  - [ ] T5.5: Test: "Copy link" button calls `navigator.clipboard.writeText` with the correct URL
  - [ ] T5.6: Test: "Share" button is hidden when `navigator.share` is undefined
  - [ ] T5.7: Test: "Share" button is shown when `navigator.share` is defined
  - [ ] T5.8: Update `AboutGittyView.test.tsx` — verify "Share Gitty" button renders
  - [ ] T5.9: Mock `qrcode` library in tests to avoid canvas/SVG rendering issues in jsdom

## Dev Notes

### UX Placement Rationale

The QR share feature belongs in the **About Gitty view** (`AboutGittyView.tsx`), not behind the app icon directly. Reasons:

1. **The app icon already opens Settings** (line 36-43 of `AppHeader.tsx`) — changing this would break established UX and muscle memory.
2. **About Gitty is the natural "tell a friend" context** — the user is already looking at what Gitty is, the star button, and the repo link. Adding "Share" here is a smooth extension.
3. **The flow is short:** App icon -> Settings -> About Gitty -> Share Gitty (3 taps). This is acceptable for a share action that is not used constantly.
4. An alternative considered was adding a share option directly to `SettingsSheet.tsx` as a menu item. This could be a future enhancement if sharing proves to be a frequent action, but for now the About view is the right home.

### QR Library Choice

**`qrcode`** (npm: `qrcode`) is recommended:
- 45KB gzipped, no heavy dependencies
- Supports SVG output (no canvas needed — better for SSR and testing)
- Well-maintained, 3M+ weekly downloads
- Works in browser and Node
- Alternative considered: `react-qr-code` — heavier, React-specific wrapper with less flexibility

### URL Constants

The GitHub repo URL `https://github.com/tholo91/code-tasks` is currently hardcoded in three places:
- `AboutGittyView.tsx` (Star on GitHub link, line 124; Report an Issue link, line 143)
- `SettingsSheet.tsx` (Find on GitHub link, line 58)

T3 centralizes this into `src/config/app.ts` alongside the existing `APP_NAME` and `APP_VERSION` constants. The PWA URL is derived from the GitHub Pages deployment pattern.

### Tab Design

The tab toggle should use a simple pill-style segmented control:
- Two segments: "App" | "GitHub"
- Active segment uses `var(--color-accent)` background with `var(--color-canvas)` text
- Inactive segment uses transparent background with `var(--color-text-secondary)` text
- Rounded-full pill shape, 32px height, fits within the sheet width
- Use `role="tablist"` and `role="tab"` with `aria-selected` for accessibility

### Existing Patterns to Follow

- **BottomSheet:** `src/components/ui/BottomSheet.tsx` — use as the sheet container
- **AboutGittyView:** `src/features/community/components/AboutGittyView.tsx` — the parent view where the share button lives
- **SettingsMenuItem:** `src/components/ui/SettingsMenuItem.tsx` — button styling reference
- **Motion config:** `src/config/motion.ts` — `TRANSITION_FAST` for tab content fade, `pageVariants` not needed (BottomSheet handles its own animation)
- **App constants:** `src/config/app.ts` — add `APP_URL` and `GITHUB_REPO_URL`

### Architecture Compliance

- **No new Zustand state** — this feature is purely presentational with local component state only
- **No new routes** — the sheet is rendered inline within `AboutGittyView`
- **Framer Motion v12+:** Use `AnimatePresence` for tab content transitions, `useReducedMotion()` fallback
- **TailwindCSS 4:** Use utility classes, follow existing color variable patterns
- **Touch targets:** All buttons minimum 44x44px per project standards
- **Testing:** Follow existing patterns — mock external APIs (`navigator.clipboard`, `navigator.share`, `qrcode`)

### References

- [Source: `src/features/community/components/AboutGittyView.tsx`] — parent component, add share button here
- [Source: `src/components/layout/AppHeader.tsx`] — header layout (app icon opens settings, not share)
- [Source: `src/components/layout/SettingsSheet.tsx`] — settings menu, has GitHub link
- [Source: `src/components/ui/BottomSheet.tsx`] — sheet pattern for QR modal
- [Source: `src/config/app.ts`] — add URL constants here
- [Source: `src/config/motion.ts`] — animation constants
- [Source: `_bmad-output/implementation-artifacts/8-8-about-gitty-settings.md`] — About Gitty story (done)
- [Source: `captured-ideas-tholo91.md`] — original captured idea: "Share gitty with QR Code"
