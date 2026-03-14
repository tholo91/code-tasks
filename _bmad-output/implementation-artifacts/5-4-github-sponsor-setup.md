# Story 5.4: GitHub Repository Sponsor Setup

Status: ready-for-dev

## Story

As a Project Maintainer,
I want the GitHub repository to be configured for sponsorship and donations,
so that visitors on GitHub can easily find ways to support the project.

## Acceptance Criteria

1. [ ] **FUNDING.yml:** A `.github/FUNDING.yml` file exists with at least one configured platform (GitHub Sponsors, Buy Me a Coffee, Ko-fi, or custom URL).
2. [ ] **Sponsor Button:** The "Sponsor" heart button appears on the GitHub repository page, linking to the configured platforms.
3. [ ] **README Section:** The README contains a concise, tasteful "Unterstütze Gitty" / "Support Gitty" section with:
   - A one-liner explaining why support helps (infrastructure costs, indie project).
   - A badge or link to the donation platform.
   - The same warm, honest tone as the in-app prompt.
4. [ ] **No Over-Selling:** The support section is near the bottom of the README, not the first thing visitors see. The project speaks through its features first.

## Tasks / Subtasks

- [ ] Create FUNDING.yml
  - [ ] Create `.github/FUNDING.yml` with platform configuration.
  - [ ] Configure at least one of: `github` (GitHub Sponsors username), `buy_me_a_coffee`, `ko_fi`, or `custom` URL.
  - [ ] Verify the Sponsor button appears on the repository page after push.
- [ ] Update README.md
  - [ ] Add a "Unterstütze Gitty" section near the bottom (before license, after features/usage).
  - [ ] Include a short, personal message: "Gitty ist ein Indie-Projekt. Wenn es dir hilft, hilf mir, es am Laufen zu halten."
  - [ ] Add a badge linking to the donation platform (e.g. Buy Me a Coffee badge, GitHub Sponsors badge).
  - [ ] Keep the tone consistent with the in-app donation prompt (Story 5.3).
- [ ] Choose & Set Up Donation Platform
  - [ ] Evaluate: GitHub Sponsors (most native, but requires approval), Buy Me a Coffee (quick setup), Ko-fi (no fees on donations).
  - [ ] Set up an account on the chosen platform.
  - [ ] Update `DONATION_URL` in `src/config/community.ts` (from Story 5.3) with the actual URL.
  - [ ] **Placeholder Guard:** Ensure the DonationPrompt CTA button and settings link are hidden (or show "Coming soon") when `DONATION_URL` is still a placeholder. Add an `isPlaceholder` check (e.g., `DONATION_URL.includes('placeholder')` or a dedicated `DONATION_CONFIGURED = true` flag) so Story 5.3 can ship safely before 5.4 is complete.

## Dev Notes

- **Platform Recommendation:** Start with **Ko-fi** or **Buy Me a Coffee** for instant setup. Apply for **GitHub Sponsors** in parallel (approval takes days/weeks). Once approved, add it to FUNDING.yml alongside the other platform.
- **FUNDING.yml Format Example:**
  ```yaml
  # These are supported funding model platforms
  github: [your-username]
  buy_me_a_coffee: your-username
  ko_fi: your-username
  custom: ["https://your-donation-page.com"]
  ```
- **Badge Example for README:**
  ```markdown
  [![Support Gitty](https://img.shields.io/badge/Support-Gitty-ff5e5b?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/your-username)
  ```
- **This is a meta-story:** Unlike the other stories, this one involves GitHub repo configuration and platform setup, not app code. It can be done independently and in parallel with Epics 3-4.
- **Dependency Note:** Story 5.3 (Donation Prompt) creates a `DONATION_URL` placeholder in `src/config/community.ts`. If 5.3 ships before 5.4, the placeholder guard ensures users don't land on a broken URL. This story must update that constant once the real platform is live.
- **Community Spirit:** The README section should feel inviting, not desperate. Think "Wenn du magst" not "Bitte spende".

### Project Structure Notes

- **GitHub Config:** `.github/FUNDING.yml`
- **App Config:** `src/config/community.ts` (shared with Story 5.3)

### References

- [Source: _bmad-output/implementation-artifacts/5-3-donation-prompt.md]
- [Source: GitHub Docs - Setting up FUNDING.yml]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
