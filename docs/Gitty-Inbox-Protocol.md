# Gitty Inbox Protocol v1

This internal protocol defines the Markdown contract between Gitty and coding agents. It is not yet marketed as a public standard or CLI.

## Discovery

Agents remain silent during normal work. They inspect Gitty only after an explicit request such as `Check my Gitty inbox`, `/gitty`, or `/captured-ideas`.

On request, the agent fetches the exact capture branch, reads the exact user-scoped file, lists Inbox items compactly, and waits for the user to select one. Captures are never executed automatically.

## Lifecycle

- **Inbox** — no `Gitty` receipt exists.
- **Filed** — deliberately transferred to a story, issue, or plan.
- **Done** — verified implementation with a valid HTTPS proof URL.

## Task fields

- Stable identity: `<!-- ct:{uuid} -->`
- Phone revision: `[Capture revision: {uuid}]`
- Lifecycle: `[Gitty: Filed]` or `[Gitty: Done]`
- Timestamp: `[Handled: {ISO-8601}]`
- Agent: `[Processed by: {name}]`
- Proof: `[Proof: https://...]`

Seen receipts are not part of v1. Legacy Seen fields are ignored and disappear the next time Gitty writes the file.

Filed and Done receipts are accepted only when the remote capture revision equals the current local capture revision. Done without HTTPS proof remains Inbox.
