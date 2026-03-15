# Story 1.4: GitHub Pages Deployment & CI/CD

Status: done

## Story

As a Developer (Thomas),
I want the app to be automatically built and deployed to GitHub Pages on every push to `main`,
so that the latest version of Gitty is always publicly accessible at a stable URL — making it installable as a PWA on any device.

## Acceptance Criteria

1. **Given** code is pushed to the `main` branch
   **When** the GitHub Actions workflow runs
   **Then** the app is built (`npm run build`) and deployed to GitHub Pages automatically

2. **Given** the app is deployed
   **When** a user visits `https://tholo91.github.io/code-tasks/`
   **Then** the app loads correctly with all assets (JS, CSS, icons) resolving at the `/code-tasks/` base path

3. **Given** the app is deployed
   **When** a user visits the URL on mobile (iOS Safari or Android Chrome)
   **Then** the browser shows an "Add to Home Screen" / "Install App" prompt (PWA installable)

4. **Given** the app is deployed
   **When** the Service Worker is registered
   **Then** the PWA passes the Lighthouse PWA installability checks (manifest valid, SW registered, HTTPS)

5. **Given** a deployment is triggered
   **When** the build fails (TypeScript errors, lint errors)
   **Then** the workflow fails and nothing is deployed to Pages

## Tasks / Subtasks

- [x] Task 1: Set Vite base URL for GitHub Pages (AC: #2)
  - [x] Add `base: '/code-tasks/'` to `vite.config.ts`
  - [x] Update PWA manifest `start_url` to `/code-tasks/` and `scope` to `/code-tasks/`

- [x] Task 2: Create GitHub Actions deployment workflow (AC: #1, #5)
  - [x] Create `.github/workflows/deploy.yml`
  - [x] Configure workflow: trigger on push to `main`, run `npm ci`, `npm run build`, deploy `dist/` to Pages
  - [x] Use `actions/upload-pages-artifact` + `actions/deploy-pages` (official GitHub Pages actions)
  - [x] Set correct permissions: `contents: read`, `pages: write`, `id-token: write`

- [x] Task 3: Configure GitHub Pages in repo settings (AC: #2, #3)
  - [x] Enable GitHub Pages via Settings → Pages → Source: "GitHub Actions"
  - [x] Verify deployment URL is `https://tholo91.github.io/code-tasks/`

- [ ] Task 4: Verify PWA installability (AC: #3, #4)
  - [ ] Open deployed URL in Chrome DevTools → Lighthouse → PWA audit
  - [ ] Confirm manifest, SW, and HTTPS checks pass
  - [ ] Test "Add to Home Screen" on a real mobile device (or emulator)

- [ ] Task 5: Handle SPA routing (AC: #2)
  - [ ] Add a `404.html` that redirects to `index.html` for client-side routing compatibility on GitHub Pages

## Dev Notes

### Critical: Vite Base URL

GitHub Pages serves the app at a subdirectory path (`/code-tasks/`), not the root. Without setting `base`, all asset paths will be broken (404s for JS/CSS/icons).

**Required change in `vite.config.ts`:**
```ts
export default defineConfig({
  base: '/code-tasks/',   // ← ADD THIS
  plugins: [...]
})
```

**Required change in VitePWA manifest (inside `vite.config.ts`):**
```ts
manifest: {
  start_url: '/code-tasks/',  // was '/'
  scope: '/code-tasks/',      // was '/'
  // ... rest unchanged
}
```

### GitHub Actions Workflow Structure

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### SPA 404 Redirect Workaround

GitHub Pages doesn't support SPA routing (serving `index.html` for all paths). Create `public/404.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    // Redirect to index with path preserved as query param
    var path = window.location.pathname.replace('/code-tasks', '');
    window.location.href = '/code-tasks/?/' + path.slice(1);
  </script>
</head>
</html>
```

And add a snippet in `index.html` `<head>` to unwrap the redirect:
```html
<script>
  (function(){var r=window.location.search.slice(1);if(r.startsWith('/')){history.replaceState(null,null,'/code-tasks'+r+''+window.location.hash);}})();
</script>
```

> **Note:** This SPA redirect hack is only needed if the app uses client-side routing with path-based URLs. If the app currently uses hash-based routing or is single-page with no deep links, skip this task.

### Project Structure Notes

- `vite.config.ts` — add `base` at the top level of `defineConfig`
- `.github/workflows/deploy.yml` — new file (create `.github/` and `workflows/` directories)
- `public/404.html` — new file (only if SPA routing is needed)
- No changes to `src/` code required for deployment itself

### What NOT to Touch

- Do not change `capacitor.config.ts` — Capacitor uses `dist/` directly, not GitHub Pages
- Do not change the Workbox `runtimeCaching` config — GitHub API calls remain `NetworkOnly`
- Do not add `homepage` to `package.json` — Vite uses `base` in config, not npm homepage

### Environment & Secrets

No secrets are required for GitHub Pages deployment via the official Actions. The workflow uses OIDC token authentication automatically.

### References

- Vite base config: [Source: vite.config.ts]
- PWA manifest (start_url/scope): [Source: vite.config.ts — VitePWA manifest section]
- Build script `tsc -b && vite build`: [Source: package.json#scripts.build]
- GitHub repo: `tholo91/code-tasks` → Pages URL: `https://tholo91.github.io/code-tasks/`
- Architecture — deployment patterns: [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- GitHub Actions Pages docs: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `eslint-plugin-react-hooks@7.0.1` does not support ESLint v10 (peer dep range caps at v9). Fixed by adding `.npmrc` with `legacy-peer-deps=true` — this allows `npm ci` on GitHub Actions to install without conflict.
- The `deploy` job in `deploy.yml` required its own `permissions` block (`pages: write`, `id-token: write`) in addition to the top-level block; without it the job silently lacked deploy rights.
- Task 4 (PWA installability verification on device) and Task 5 (SPA 404 routing) remain pending — these require manual testing on a real device. SPA routing is not yet needed as the app uses no client-side path routing.

### File List

- `vite.config.ts` (modified — add `base`, update PWA `start_url`/`scope`)
- `.github/workflows/deploy.yml` (new, later patched: added `permissions` to `deploy` job)
- `.npmrc` (new — `legacy-peer-deps=true` to resolve ESLint v10 peer dep conflict in CI)
