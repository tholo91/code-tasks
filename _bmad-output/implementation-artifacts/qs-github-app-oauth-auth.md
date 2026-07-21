# Quick Spec: GitHub App / OAuth Authentication

Status: draft

## Problem

Gitty currently relies on a manually pasted GitHub Personal Access Token. This works for an MVP, but it creates friction and trust issues:

- New repositories can fail to sync with `HTTP 403: Resource not accessible by personal access token` when the token was limited to selected repositories.
- Users must understand GitHub token scopes, repository access, and token settings before they can fix a sync failure.
- Token rotation, expiry, repo access changes, and multi-account usage are all pushed onto the user.
- The auth screen feels more like a developer workaround than a polished product flow.

## Recommended Direction

Move toward a GitHub App backed auth flow, with OAuth used for identity/session where needed.

For Gitty, a GitHub App is the better long-term model than asking users to keep editing PATs:

- User installs Gitty once and grants repository access through GitHub's native installation UI.
- Users can add/remove repositories later without creating a new token.
- Gitty can request narrow permissions, mainly `contents: read/write` for the selected repositories.
- Access can be revoked cleanly per installation.
- The app can show clearer states: "Gitty is not installed on this repository" instead of "token failed".

## User Benefits

1. **Less setup friction**
   Users tap "Connect GitHub", pick repos, and return to Gitty. No copy-paste token ceremony.

2. **Better new-repo flow**
   When sync fails because a repo is not authorized, Gitty can send the user to GitHub's installation settings to add that repo.

3. **Higher trust**
   GitHub's own install screen explains exactly what Gitty can access. This is easier to trust than a raw PAT field.

4. **Safer permissions**
   Installation tokens are short-lived and scoped to the app installation. Gitty no longer stores a long-lived PAT in the browser/app storage.

5. **Cleaner multi-account support**
   Users can connect personal/work GitHub accounts through GitHub's account switcher and installations, instead of managing multiple PATs manually.

6. **Better error recovery**
   Gitty can distinguish:
   - not installed on repo
   - missing contents permission
   - installation suspended/revoked
   - branch protection
   - network failure

7. **More professional onboarding**
   "Sign in with GitHub" matches user expectations for a product. PAT auth can remain as an advanced fallback.

## Product Scope

### MVP Slice

- Add "Sign in with GitHub" as the primary auth action.
- Keep existing PAT flow behind "Advanced: use personal access token" for local-only and early adopter fallback.
- Add backend/token broker if required for GitHub App private key and OAuth exchange.
- Store only app session state client-side; avoid storing long-lived GitHub PATs.
- Preserve existing sync behavior once an authenticated Octokit-compatible client is available.

### Error Recovery Slice

- For `403 Resource not accessible by personal access token`, keep the current PAT repair link.
- For GitHub App auth, show:
  - "Gitty is not installed on this repository"
  - CTA: "Add repository access in GitHub"
  - short explanation: "You can select only this repo."

## Acceptance Criteria

1. User can authenticate through GitHub without manually creating or pasting a PAT.
2. User can grant Gitty access to selected repositories through GitHub's native UI.
3. Repository list only shows repositories available to the current Gitty installation/account.
4. Sync works for an authorized repository using GitHub App/OAuth-derived credentials.
5. If a selected repo is not authorized, Gitty shows a specific recovery screen with a GitHub settings/install link.
6. Existing PAT users are not broken; PAT remains available as an advanced fallback during transition.
7. Token/session storage no longer requires keeping a long-lived PAT in local app storage for the primary flow.
8. Branch protection handling remains separate from auth handling.

## Implementation Notes

- Current auth entry point: `src/features/auth/components/AuthForm.tsx`.
- Current GitHub client creation: `src/services/github/auth-service.ts` and `src/services/github/octokit-provider.ts`.
- Current sync error classification: `src/services/github/sync-service.ts`.
- Current PAT-specific recovery UI: `src/features/sync/components/SyncErrorSheet.tsx`.
- Existing multi-account story: `_bmad-output/implementation-artifacts/11-1-multi-github-account-support.md`.

## Open Questions

1. Do we want a small backend/token broker, or should Gitty stay fully static/PWA for now?
2. Is GitHub App installation the primary model, or OAuth app first with PAT fallback?
3. Which hosting path should own the auth callback: GitHub Pages, Vercel, or another tiny worker?
4. Should Gitty request access to all repos by default, or recommend selected repos only?

## Validation Step

Before implementing, ask 3-5 current/likely users:

"Would you be more willing to try Gitty if it used GitHub's normal install/sign-in flow instead of asking for a Personal Access Token?"

Decision threshold: build this if PAT setup is mentioned as a blocker by at least 2 users, or if one non-technical but target-fit builder fails PAT setup unaided.
