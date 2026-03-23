<!-- code-tasks:ai-ready-header -->
# Captured Ideas — tholo91

> **Instructions for AI Agents:**
> This file is managed by [code-tasks](https://github.com/tholo91/code-tasks).
> The task list between the `managed-start` and `managed-end` markers below
> is auto-generated on each sync. Do not manually edit tasks between the
> markers — changes will be overwritten on the next push.
>
> - Tasks use Markdown checkboxes (`- [ ]` / `- [x]`)
> - Priority: 🔴 Important or ⚪ Normal
> - Mark tasks as done (`- [x]`) after processing, add `[Processed by: YourAgentName]` to the task line, and optionally append notes to the task body
> - Do NOT delete or remove tasks from this file — only the mobile app manages task lifecycle
> - You may add notes or context below the `managed-end` marker — they will not be overwritten

---

<!-- code-tasks:managed-start -->

## Completed

- [x] **Create a list of all notifications to simplify  and cluster them** ([Created: 2026-03-20]) (Priority: ⚪ Normal) [Completed: 2026-03-20] [Processed by: Claude]
  I feel like they are repetitive and in parts similar - maybe fewer notifications or logs when the last one came? After I sync to main and reopen the app I get one - how/why? → Planned: Story 9-8 (Notification Simplification & Clustering)

- [x] **Man kann Veränderungen seit dem letzten Mal rückgängig machen** ([Created: 2026-03-20]) (Priority: ⚪ Normal) [Completed: 2026-03-20] [Processed by: Claude]
  Wenn man bspw. Einen task aufmacht und zwei mal auf "important" klickt, ist ja eigentlich nichts verändert. Man soll nun also quasi durch hold des snc Buttons (ohne text select) den sync abbrechen → Planned: Story 9-9 (Undo Sync Changes / Hold-to-Cancel)

- [x] **Feature: urgency score? Now, later?** ([Created: 2026-03-20]) (Priority: ⚪ Normal) [Updated: 2026-03-23] [Completed: 2026-03-20] [Processed by: Claude]
  Wochenende importance tags, wichtig fÃ¼r ai agent

- [x] **Eventuell Claude.md erstellen / anweisen?** ([Created: 2026-03-20]) (Priority: 🔴 Important) [Updated: 2026-03-20] [Completed: 2026-03-20] [Processed by: Claude]
  Captured-ideas-<username>.md soll darin erwÃ¤hnt werden, bzw. Claude.md erstellen, damit Claude automatisch nach neuen tasks sucht → Done: CLAUDE.md updated 2026-03-22

- [x] **an edit in captured-ideas.md should not trigger a publish github site** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Updated: 2026-03-20] [Completed: 2026-03-20]
  It seems as if every push actually triggers a rebuild of the page, is there a way to fix that? ÃÂ¢ÃÂÃÂ Planned: Story 9-5 (Skip CI on sync commits)

- [x] **Letzte Reviews machen** ([Created: 2026-03-20]) (Priority: 🔴 Important) [Updated: 2026-03-20] [Completed: 2026-03-20]
  Sind die Stories alle durch? Ein redesign vom task Detail oder beim create scheint nicht verÃÂ¤ndert, der list view aber schon
Icon ist nicht im Header 
Umlaute klappen nicht? Aber dafür pull to refresh 
Pull to refresh müsste prominenter erscheinen und zwar direkt über dem list view (also würde das gepullte hinter der header leiste erscheinen)

- [x] **Push to branch instead of main** ([Created: 2026-03-20]) (Priority: 🔴 Important) [Completed: 2026-03-20]
  When a repo has branch protection, Gitty should ask the user once and then create a new branch and push there instead of showing "can't sync". Remember the preference per repo. ÃÂ¢ÃÂÃÂ Planned: Story 9-4

- [x] **Safe Haven: Archive tab** ([Created: 2026-03-20]) (Priority: 🔴 Important) [Completed: 2026-03-20]
  Tasks deleted remotely should go to a dedicated Archive tab, not just get an [Archived] prefix. Nothing should ever be lost on the phone. The app should be a safe haven for tasks. ÃÂ¢ÃÂÃÂ Planned: Stories 9-1 + 9-2

- [x] **Skip CI on sync commits** ([Created: 2026-03-20]) (Priority: ⚪ Normal) [Completed: 2026-03-20]
  Sync commits should not trigger GitHub Pages, Vercel, or other CI/CD rebuilds. Add [skip ci] to commit messages. ÃÂ¢ÃÂÃÂ Planned: Quick spec 9-5

- [x] **Bottom navigation with tabs** ([Created: 2026-03-20]) (Priority: 🔴 Important) [Completed: 2026-03-20]
  Instead of everything in one view, have a bottom tab bar with: Tasks, Completed, Archive. Repos stay as the header chip overlay, Settings stays as a sheet. ÃÂ¢ÃÂÃÂ Planned: Story 9-1

- [x] **Roadmap** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-20]
  Speech to tasks, a Transcript will be created and one can automatically convert it to tasks (while keeping the Transcript as a 2026-MM-DD-transcript.md)

- [x] **Moving an open task to another repository** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Updated: 2026-03-20] [Completed: 2026-03-20]
  - There should be an option to close the bottom sheet, right now there isn't that option ÃÂ¢ÃÂÃÂ Planned: Story 9-6 (Move Task to Another Repo)

- [x] **Pull to refresh** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Updated: 2026-03-20] [Completed: 2026-03-20]
  When pulling down, the repository should check if the markdown file is in sync and give a little feedback ÃÂ¢ÃÂÃÂ Planned: Story 9-3 (Pull-to-Refresh gesture)

- [x] **Creating an important task** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Completed: 2026-03-20] [Processed by: Claude]
  When creating an important task and clicking on the new important icon while the keyboard is showing, the keyboard should not snap down and stay visible to not break ux. // Also the two way sync does not work: i have just tried to create 3 new tasks, clicked on "sync", it did the sync and when reoping the app it asked me to pull an update (from main? i wish i had a little modal/popup to show me the differences and when what diff was made, so to check if i am further ahead on mobile or in the actualy repository) and then it overwrote the markdown on my phone, erasing those 3 new tasks i had created. ÃÂ¢ÃÂÃÂ Keyboard fix done in Story 8-4, sync overwrite fixed in Story 8-12 (additive import with diff summary).

- [x] **Changing the instruction secrion of the repository** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Completed: 2026-03-20] [Processed by: Claude]
  Maybe in the settings section of each repository, one should be able to modify the instruction for the ai agent, this can be super useful for a personal use case ÃÂ¢ÃÂÃÂ Covered by Story 8-7 (per-repo AI instructions, ready-for-dev).

- [x] **UUIDs** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-20] [Processed by: Claude]
  Should we create random uuids for each tasks, to track when they might be edited or renamed? Why or why not? Also, shoudl we incorporate times and not just date stamps? ÃÂ¢ÃÂÃÂ Already implemented: tasks have UUID v4 IDs locally. Markdown matching uses normalized titles by design (markdown format has no ID field). Working as intended.

- [x] **After Sync with main..** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-20] [Processed by: Claude]
  When reopening, there is this sticky  toasty notification to import the newest repository changes, that might overwrite the status quo. We should need better handling: updating the tasks we have (or deleting them when they have been deleted in the repository) ÃÂ¢ÃÂÃÂ Resolved by Story 8-12 (additive import with diff summary). Smart merge now preserves local tasks and shows diff before importing.

- [x] **About this app** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-20] [Processed by: Claude]
  In the settings there should be a third option like a Readme of the app "story of Gitty"? That should be the Readme or a how to or how I invented the idea ÃÂ¢ÃÂÃÂ Covered by Story 8-8 (About Gitty in Settings, ready-for-dev).

- [x] **Report an Issue / Give Feedback link** ([Created: 2026-03-20]) (Priority: ⚪ Normal) [Completed: 2026-03-20] [Processed by: Claude]
  In Settings or About Gitty, add a button that redirects users to the Gitty GitHub issues page to report bugs or give feedback. ÃÂ¢ÃÂÃÂ Incorporated into Story 8-8 (About Gitty).

- [x] **Change the ai agent instruction** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-17] [Processed by: Claude]
  The ai agent working with this captured-ideas.md should know that he can check off tasks that he has finished and add to their description "checked by Claude/Gemini) ÃÂ¢ÃÂÃÂ Done in Story 8-9 (AI agent header update) and Story 8-11 (added parseable `[Processed by: AgentName]` tag format to the header instructions).

- [x] **List view scrolling** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Completed: 2026-03-17] [Processed by: Claude]
  I think one should always know, in what repository one is, so that should be stuck/visible with a nice UI at the top ÃÂ¢ÃÂÃÂ Done in Story 8-1 (sticky header with repo name and priority visual).

- [x] **Bottom sheet** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-17] [Processed by: Claude]
  Clicking outside of a bottom sheet should close it (so save a task as it is right now or about the switch of repository). Makes sense? ÃÂ¢ÃÂÃÂ Done in Story 8-4 (AC#5: tapping backdrop closes the sheet).

- [x] **UI improvements** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-17] [Processed by: Claude]
  When clicking enter In the description, it should jump to the description field ÃÂ¢ÃÂÃÂ Done in Story 8-4 (AC#4: Enter in title moves focus to Notes field).

- [x] **X items pending (upper right)** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Updated: 2026-03-17] [Completed: 2026-03-17]
  This I think can also go away, since the refresh button shows that as well. Maybe the refresh button should show a little popup first what happened (so like the commit message?)

- [x] **List View UI** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Updated: 2026-03-17] [Completed: 2026-03-17]
  Find Ich gut, sollte aber nÃÂÃÂÃÂÃÂ¤her an Things sein / Screenshots oder pencil.dev?

- [x] **Starting new tasks (bottom sheet opens)** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Updated: 2026-03-17] [Completed: 2026-03-17]
  The input field (task name) should immediately be focused and it should expand the longer it gets, so allow a second line (but no line break, since this snps to the description, which works great)

- [x] **Completed tasks** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Updated: 2026-03-17] [Completed: 2026-03-17]
  It should be untoggled (closed) when opening the app. Also, how does the filtering or search work with completed tasks?

- [x] **Slide to delete fix** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Updated: 2026-03-17] [Completed: 2026-03-17]
  It looks a bit off. Maybe let's hide that for now and only show the "delete task" only in a detail view

- [x] **Make the page unzoomable** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Updated: 2026-03-17] [Completed: 2026-03-17]
  It seems to zoom in and out,the details view and maybe other popup or overlays do not have padding left or right. Please fix that.

- [x] **Roadmap Teaser in the list** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-17]
  Blocks screen partially, let's only make this viewable somewhere in one's profile?

<!-- code-tasks:managed-end -->
