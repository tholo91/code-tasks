# Gitty — a mobile repo inbox for AI coding

Capture coding ideas on the go. Keep them in the repo.

Gitty is an offline-first PWA for rough coding thoughts that are repo-relevant but not ready to become issues or agent work. It saves locally first and syncs plain Markdown to a dedicated GitHub branch when a connection is available.

**Live app:** [tholo91.github.io/code-tasks](https://tholo91.github.io/code-tasks/)

## The loop

1. **Capture** — choose a repository and save the thought on your phone.
2. **Sync** — Gitty writes `captured-ideas-{username}.md` to `gitty/{username}` by default.
3. **Pick up** — ask your coding agent: “Check my Gitty inbox.” The agent lists Inbox items and waits for a selection.
4. **Return** — a selected capture can become **Filed** or **Done**. Done requires a valid HTTPS proof link.

Gitty never asks an agent to execute captures automatically, and normal agent chats should not mention the inbox.

## Trust model

- Free and open source
- Offline-first local capture
- No Gitty user database
- Fine-grained GitHub PAT stored encrypted on the device
- Repository access limited by the PAT; `Contents: Read and write` is required
- Per-user capture branch and file; `[skip ci]` is enabled by default for new connections

## Agent Connect

After the first successful capture sync, Gitty can prepare `gitty/connect-{username}` from the repository's default branch. It preserves existing `AGENTS.md` and `CLAUDE.md` content and adds one managed Gitty block with the exact capture branch and file path.

Gitty shows the block before writing it, then opens a GitHub Compare page. “Coding agent connected” is shown only after the block is detected on the default branch.

The managed block recognizes explicit requests such as `Check my Gitty inbox`, `/gitty`, and `/captured-ideas`.

See [Gitty Inbox Protocol](./docs/Gitty-Inbox-Protocol.md) and [Sync Model](./docs/Sync-Model.md).

## Local development

Prerequisites: Node 20+ and a fine-grained GitHub PAT for testing.

```bash
git clone https://github.com/tholo91/code-tasks
cd code-tasks
npm install
npm run dev
```

## Stack

React 19 · Vite 7 · TypeScript · Zustand · Tailwind CSS 4 · Octokit · Capacitor 8 · Vitest

## Contributing

Open an issue or a focused pull request against `main`. Run `npm test` and `npm run build` before submitting.
