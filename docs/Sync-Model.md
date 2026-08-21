# Sync Model

Gitty is local-first. The phone is the immediate source of truth while changes are queued; GitHub is the durable repository copy used by coding agents.

## Repository layout

- Default capture branch: `gitty/{username}`
- Capture file: `captured-ideas-{username}.md`
- Default commit suffix: `[skip ci]`
- Agent setup branch: `gitty/connect-{username}`

Each connected repository has independent delivery state, retry metadata, and deletion tombstones. Work in one repository cannot clear the outbox of another.

## Delivery states

- `local-only` — saved on the phone, with no remote copy yet
- `queued` — waiting for the debounce window or connectivity
- `syncing` — a single sync flight is active for the repository
- `in-repo` — the latest queued revision was committed
- `needs-attention` — retry or task-level conflict resolution is required

New repositories opt into automatic sync during setup. Existing repositories are asked once before automatic Git writes are enabled.

## Timing

- New capture: 2.5 seconds after completion
- Edit, reorder, completion, or deletion: 10 quiet seconds
- App background, resume, reconnect, and repository switch: immediate best-effort attempt
- Visible queued work: at most 30 seconds before an attempt

The sync button is a retry and details affordance, not the normal delivery mechanism.

## Merge and conflicts

Every task has a stable `ct` ID and a `Capture revision`. Gitty reads the remote file before writing and merges safe agent updates by task ID.

- A remote Filed or Done receipt is accepted only when its capture revision matches the phone.
- Done additionally requires a valid HTTPS proof URL.
- Remote notes are preserved when the phone has a pending edit.
- Deletions are represented as repository-specific tombstones until committed.
- A conflict is raised for the affected task when the same capture revision lineage diverged locally and remotely. There is no global “keep remote” operation that discards every pending local change.

## Authentication

Gitty currently uses a fine-grained personal access token. Users select the repositories themselves and grant `Contents: Read and write`. The token is encrypted on the device. Gitty has no user database and does not claim OAuth support.
