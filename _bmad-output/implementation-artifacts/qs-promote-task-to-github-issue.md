# Quick Spec: Promote Captured Task to GitHub Issue

Status: draft

## Problem

Gitty's current strength is that captured ideas land directly in the repository as `captured-ideas-{username}.md`, where AI agents can read them without any GitHub API access. That is the right default for fast mobile capture.

Some captured ideas eventually become real implementation work, bug reports, or public feedback items. For those, GitHub Issues are useful because they provide comments, labels, assignees, milestones, and PR auto-closing. Today the user has to manually copy a Gitty task into GitHub Issues, which breaks the mobile-to-agent workflow.

## Recommended Direction

Keep Markdown capture as the default source of fast ideas. Add an optional "Create GitHub Issue" action on a task detail screen so a user can promote a mature task into a GitHub-native work item.

This should enrich Gitty's repo-local workflow, not replace it.

## User Benefits

1. **Fast capture stays fast**
   Raw ideas still go into the repo-local Markdown file, so AI agents with only checkout access can read them.

2. **Bigger tasks get GitHub-native affordances**
   Once an idea is worth discussion or implementation tracking, it can use labels, comments, assignees, and PR links.

3. **Less manual copy-paste**
   The mobile app can format the issue body, include task metadata, and link back to the original Gitty capture.

4. **Clearer boundary for AI agents**
   The Markdown file remains the inbox. GitHub Issues become promoted, deliberate work items for agents that have GitHub access.

5. **No forced migration**
   Users who only want repo-local AI handoff do not need Issues, extra permissions, or a new mental model.

## Product Scope

### MVP Slice

- Add a secondary action in `TaskDetailSheet`: "Create GitHub Issue".
- Use the selected repo and current GitHub auth to create an issue via GitHub API.
- Pre-fill:
  - title from task title
  - body from task body plus Gitty metadata
  - optional label such as `gitty`
- Store the returned issue number and URL on the task.
- Show the linked issue in task detail after creation.
- Keep the task in `captured-ideas-{username}.md`; do not delete it or move it automatically.

### Out of Scope for MVP

- Replacing Markdown sync with GitHub Issues.
- Two-way issue sync.
- Auto-closing Gitty tasks when GitHub Issues close.
- Project boards, milestones, assignees, or label management UI.
- Creating issues automatically for every capture.

## Acceptance Criteria

1. Given a task exists in a selected GitHub repo, when the user opens task detail, then a secondary "Create GitHub Issue" action is available.

2. Given the user taps "Create GitHub Issue", when GitHub issue creation succeeds, then Gitty creates an issue in the selected repo with the task title as the issue title and the task body plus Gitty metadata as the issue body.

3. Given the issue is created, when the task detail is shown again, then the task displays a linked issue state with the issue number and URL.

4. Given a task already has a linked issue number or URL, when the user opens task detail, then Gitty shows "Open GitHub Issue" instead of "Create GitHub Issue" to avoid duplicates.

5. Given issue creation fails because the token lacks Issues permission or repository access, when the API returns an auth/permission error, then Gitty shows a clear recovery message and does not mark the task as linked.

6. Given issue creation fails because GitHub Issues are disabled for the repo, when the API returns the relevant error, then Gitty explains that Issues are not enabled for this repository.

7. Given the task is later synced to Markdown, when Gitty renders `captured-ideas-{username}.md`, then the task includes a compact "GitHub Issue: #123" reference in the task body or metadata.

8. Given an AI agent reads the captured ideas file without GitHub API access, when it sees a linked issue reference, then it can still understand that the task was promoted and can ask the user whether to work from the Markdown task or the GitHub Issue.

## Implementation Notes

- Current task model already has `githubIssueNumber: number | null` in `src/types/task.ts`; verify whether this field was originally intended for issue sync and reuse it if still appropriate.
- Consider adding `githubIssueUrl: string | null` if URL construction is not reliable from repo + issue number alone.
- Issue creation belongs in the GitHub service layer, likely near `src/services/github/sync-service.ts` or a new `src/services/github/issue-service.ts`.
- UI entry point should be `src/features/capture/components/TaskDetailSheet.tsx`, not the task card list. Promotion should be deliberate.
- The issue body should include:
  - original task body
  - source: "Created from Gitty"
  - captured date
  - priority if important
  - repo-local file reference if useful
- Do not make issue creation part of normal sync. This is an explicit user action.

## Open Questions

1. Does the current PAT flow already request enough permissions to create Issues, or do we need a permission upgrade path?
2. Should the MVP create a `gitty` label automatically, or skip labels to avoid permission and API edge cases?
3. Should "Create GitHub Issue" be shown only for important tasks, or for all tasks?
4. Should linked issue metadata live only in local task state, or also in the Markdown file to survive device changes?
5. How should this interact with a future GitHub App / OAuth auth flow?

## Validation Step

Before implementation, show the concept to 3 likely users:

"Would you want every mobile capture to stay as a private repo-local note first, with a button to promote selected tasks into GitHub Issues when they become real work?"

Build this if at least 2 users recognize the distinction immediately and say they would use promotion for bigger tasks. If users mostly want a simple GitHub Issues client, treat that as a separate product direction instead of changing Gitty's default workflow.
