# Sync Model

`code-tasks` uses a sophisticated sync model that balances simplicity with robustness.

## Source of Truth
The primary source of truth is the GitHub repository. Each repository contains a `captured-ideas.md` (or `captured-ideas-{username}.md` in collaborative repos) file.

## Offline-First Architecture
1. **Local Storage**: Every user action (add, edit, reorder) is instantly saved to the device's local storage (IndexedDB).
2. **Push to Remote**: A Floating Action Button (FAB) appears when local changes are ahead of the remote repository. Tapping this FAB initiates a commit and push to the `main` branch.
3. **Pull from Remote**: On app startup or periodic refresh, the remote file is pulled and merged with any local changes.

## Conflict Resolution
To prevent merge conflicts in collaborative repositories, `code-tasks` defaults to a user-specific file naming convention: `captured-ideas-{username}.md`. This ensures that each user's ideas are kept separate while still living in the same repository.

### Handling Collisions
In the event that a single file is edited on two devices before a push:
- **Last Write Wins**: Simple property updates (title, priority) use the most recent edit time.
- **Append-Only**: Content changes and descriptions are appended to avoid data loss.
- **Merge Logic**: The app attempts to merge changes by task ID (based on the `## Heading`).

## Authentication
- **OAuth 2.0**: The app uses standard GitHub OAuth for authentication.
- **Scoped Permissions**: It requires only the `repo` scope to read and write the `captured-ideas.md` file.
