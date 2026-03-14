# Story 5.3: Donation Prompt ("Unterstütze Gitty")

Status: ready-for-dev

## Story

As a User,
I want to be gently reminded that I can support the project financially,
so that I have the option to contribute — but never feel pressured.

## Acceptance Criteria

1. [ ] **Trigger Conditions:** The donation prompt appears only when ALL of the following are true:
   - The user has used the app for at least 7 days (first launch timestamp in localStorage).
   - The user has captured at least 5 ideas (total capture count).
   - The prompt has not been permanently dismissed.
   - The prompt was last dismissed ("Später") more than 30 days ago, or has never been shown.
2. [ ] **Prompt UI:** A bottom sheet or modal with:
   - A short, personal message (e.g. "Hey! Gitty ist ein Herzensprojekt. Wenn es dir hilft, kannst du mir helfen, die Serverkosten zu decken.")
   - A primary CTA button linking to the donation page (e.g. Buy Me a Coffee, Ko-fi, or GitHub Sponsors).
   - A secondary "Später" (Later) dismiss button.
   - A tertiary "Schon unterstützt" (Already supported) or "Kein Interesse" (Not interested) link for permanent dismissal.
3. [ ] **Dismiss Behavior:**
   - "Später": Hides the prompt and records the dismiss timestamp. Re-triggers after 30 days if conditions are still met.
   - "Schon unterstützt" / "Kein Interesse": Permanently hides the prompt (sets a `donationPromptDismissedPermanently: true` flag).
4. [ ] **Non-Intrusive:** The prompt must not block the capture flow. It should appear after a successful capture, not during input.
5. [ ] **Once Per Session:** The prompt is shown at most ONCE per app session (page load). If dismissed, it does not re-appear until the next session — even if additional captures occur in the same session.
6. [ ] **Undo Permanent Dismiss:** If the user permanently dismisses the prompt ("Schon unterstützt" / "Kein Interesse"), the donation link remains accessible in the app settings or About screen so they can still find it later.
7. [ ] **Tone:** Warm, honest, humble. No guilt-tripping. No fake urgency. The message should feel like a friend asking, not a corporation upselling.

## Tasks / Subtasks

- [ ] Donation State Management
  - [ ] Add donation prompt state to Zustand (persisted): `{ firstLaunchDate: string | null; totalCaptureCount: number; donationLastDismissed: string | null; donationDismissedPermanently: boolean; donationPromptShown: boolean }`.
  - [ ] Track `firstLaunchDate` on app init (set once, never overwrite).
  - [ ] Increment `totalCaptureCount` on each successful idea capture.
- [ ] Donation Prompt Trigger Logic
  - [ ] Create `src/features/community/hooks/useDonationPrompt.ts`.
  - [ ] Implement the trigger logic: check all 4 conditions from AC1.
  - [ ] Expose `shouldShowPrompt` boolean and `dismissPrompt(type: 'later' | 'permanent')` action.
  - [ ] Add a `promptShownThisSession` in-memory flag (NOT persisted) to ensure the prompt shows at most once per page load.
- [ ] Build Donation Prompt Component
  - [ ] Create `src/features/community/components/DonationPrompt.tsx`.
  - [ ] Implement as a bottom sheet with slide-up animation.
  - [ ] Include personal message, CTA button (external link), dismiss options.
  - [ ] Style in GitHub Dark Dimmed palette with warm accent color for CTA.
- [ ] Configure Donation Link
  - [ ] Create `src/config/community.ts` with `DONATION_URL` constant.
  - [ ] Default to a placeholder URL until the actual donation page is set up (Story 5.4).
- [ ] Integration
  - [ ] Show the DonationPrompt in the main App shell, triggered after a successful capture (not on app launch).
  - [ ] Ensure it does not interfere with the Pulse input flow.
  - [ ] Guard against rapid-capture spam: only evaluate prompt trigger once per capture, skip if `promptShownThisSession` is true.
- [ ] Donation Link in Settings
  - [ ] Add a "Unterstütze Gitty" link in the settings/about area that opens the `DONATION_URL`. This ensures the donation link is always discoverable, even after permanent dismiss.

## Dev Notes

- **Tone Guide:** This is the most important part. The donation prompt is a reflection of the project's values. Draft examples:
  - "Hey! Gitty ist ein Herzensprojekt — gebaut in Nachtschichten und mit viel Kaffee. Wenn dir die App hilft, kannst du mir helfen, sie am Laufen zu halten."
  - "Gitty ist kostenlos und wird es bleiben. Aber Server kosten Geld. Wenn du magst, kauf mir einen Kaffee."
- **No Dark Patterns:** No countdown timers, no "X people donated today", no "You've saved Y hours". Just honesty.
- **Donation Platform Options:** Buy Me a Coffee, Ko-fi, or GitHub Sponsors. The URL is configurable. GitHub Sponsors is the most developer-native option.
- **Analytics (Future):** Consider adding a simple event when the prompt is shown/dismissed/clicked — but only if analytics are added to the app generally. No tracking just for donations.

### Project Structure Notes

- **Community Module:** `src/features/community/`
- **Config:** `src/config/community.ts`
- **Store:** Extend `useSyncStore.ts` or create `useCommunityStore.ts`

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- [Source: _bmad-output/planning-artifacts/prd.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
