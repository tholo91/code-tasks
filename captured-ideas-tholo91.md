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
> - You may add notes or context below the `managed-end` marker — they will not be overwritten

---

<!-- code-tasks:managed-start -->

- [ ] **Creating an important task** ([Created: 2026-03-17]) (Priority: 🔴 Important)
  When creating an important task and clicking on the new important icon while the keyboard is showing, the keyboard should not snap down and stay visible to not break ux. // Also the two way sync does not work: i have just tried to create 3 new tasks, clicked on "sync", it did the sync and when reoping the app it asked me to pull an update (from main? i wish i had a little modal/popup to show me the differences and when what diff was made, so to check if i am further ahead on mobile or in the actualy repository) and then it overwrote the markdown on my phone, erasing those 3 new tasks i had created.

- [ ] **Pull to refresh** ([Created: 2026-03-17]) (Priority: 🔴 Important)
  When pulling down, the repository should check if the markdown file is in sync and give a little feedback

- [x] **Change the ai agent instruction** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-17] [Processed by: Claude]
  The ai agent working with this captured-ideas.md should know that he can check off tasks that he has finished and add to their description "checked by Claude/Gemini) — Done in Story 8-9 (AI agent header update) and Story 8-11 (added parseable `[Processed by: AgentName]` tag format to the header instructions).

- [x] **List view scrolling** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Completed: 2026-03-17] [Processed by: Claude]
  I think one should always know, in what repository one is, so that should be stuck/visible with a nice UI at the top — Done in Story 8-1 (sticky header with repo name and priority visual).

- [x] **Bottom sheet** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-17] [Processed by: Claude]
  Clicking outside of a bottom sheet should close it (so save a task as it is right now or about the switch of repository). Makes sense? — Done in Story 8-4 (AC#5: tapping backdrop closes the sheet).

- [ ] **Changing the instruction secrion of the repository** ([Created: 2026-03-17]) (Priority: 🔴 Important)
  Maybe in the settings section of each repository, one should be able to modify the instruction for the ai agent, this can be super useful for a personal use case

- [ ] **UUIDs** ([Created: 2026-03-17]) (Priority: ⚪ Normal)
  Should we create random uuids for each tasks, to track when they might be edited or renamed? Why or why not? Also, shoudl we incorporate times and not just date stamps?

- [ ] **Roadmap** ([Created: 2026-03-17]) (Priority: ⚪ Normal)
  Speech to tasks, a Transcript will be created and one can automatically convert it to tasks (while keeping the Transcript as a 2026-MM-DD-transcript.md)

- [ ] **After Sync with main..** ([Created: 2026-03-17]) (Priority: ⚪ Normal)
  When reopening, there is this sticky  toasty notification to import the newest repository changes, that might overwrite the status quo. We should need better handling: updating the tasks we have (or deleting them when they have been deleted in the repository)

- [ ] **About this app** ([Created: 2026-03-17]) (Priority: ⚪ Normal)
  In the settings there should be a third option like a Readme of the app "story of Gitty"? That should be the Readme or a how to or how I invented the idea

- [ ] **Moving an open task to another repository** ([Created: 2026-03-17]) (Priority: ⚪ Normal)
  - There should be an option to close the bottom sheet, right now there isn't that option

- [x] **UI improvements** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Completed: 2026-03-17] [Processed by: Claude]
  When clicking enter In the description, it should jump to the description field — Done in Story 8-4 (AC#4: Enter in title moves focus to Notes field).

- [ ] **an edit in captured-ideas.md should not trigger a publish github site** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Updated: 2026-03-17]
  It seems as if every push actually triggers a rebuild of the page, is there a way to fix that?


## Completed

- [x] **X items pending (upper right)** ([Created: 2026-03-17]) (Priority: ⚪ Normal) [Updated: 2026-03-17] [Completed: 2026-03-17]
  This I think can also go away, since the refresh button shows that as well. Maybe the refresh button should show a little popup first what happened (so like the commit message?)

- [x] **List View UI** ([Created: 2026-03-17]) (Priority: 🔴 Important) [Updated: 2026-03-17] [Completed: 2026-03-17]
  Find Ich gut, sollte aber nÃ¤her an Things sein / Screenshots oder pencil.dev?

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
