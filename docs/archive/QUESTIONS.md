# Open Questions

Answers needed before development starts. Fill in your answers below each question.

---

## Structure

**Q1: What should the task file be named?**
Options: `captured-ideas.md` / `tasks.md` / user-configurable per repo

> Answer:

---

**Q2: One file per repo, or multiple named lists?**
e.g. strictly one `captured-ideas.md`, or allow `backlog.md`, `sprint.md` etc. per repo?
Multiple lists add navigation complexity — does that fit "powerful by simplicity"?

> Answer:

---

**Q3: How should task order work?**
- Option A: Drag-and-drop order = file order (WYSIWYG — what you see is what's in the file)
- Option B: File is always newest-first; drag order is stored as a hidden metadata field

> Answer:

---

## Sync & GitHub

**Q4: Conflict resolution — what happens when two devices edit before either pushes?**
- Option A: Last write wins (force-push, simple but lossy)
- Option B: Show a diff, let the user manually pick
- Option C: Auto-merge by task ID (complex but seamless)

> Answer:

---

**Q5: FAB push scope — per repo or global?**
- Option A: FAB only appears on the current repo view; pushes that repo only
- Option B: A global indicator shows total unpushed repos; one tap pushes all

> Answer:

---

## Task Format

**Q6: AI agent prompt — visible or hidden?**
- Option A: HTML comment `<!-- AI: This is a list of raw ideas... -->` — invisible in rendered Markdown, clean on GitHub
- Option B: Visible blockquote at the top of the file

> Answer:

---

**Q7: Priority format in the Markdown file?**
- Option A: Inline field (as in the README example): `Priority: high`
- Option B: YAML frontmatter block per task (more structured, slightly more verbose)

> Answer:

---

## Repo & Project Creation

**Q8: When creating a new repo from the app, should it default to public or private?**

> Answer:

---

**Q9: Any specific initial content in a newly created repo beyond the AI prompt?**
e.g. a welcome task, a README, nothing?

> Answer:

---

## UX

**Q10: Should there be a way to reorder or group repos beyond starring?**
e.g. folders/workspaces, or is starred + recency sorting enough?

> Answer:
