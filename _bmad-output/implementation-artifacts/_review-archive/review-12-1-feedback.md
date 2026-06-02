# Party Mode Review — Story 12-1: AI-Native Developer Research Program

Date: 2026-05-12

## John (PM)
- "Done" is undefined. A 10-section research program has no clear AC — it can balloon indefinitely. Define a hard deliverable (e.g. one markdown findings doc, N=5 conversations) or it never closes.
- Conflicts with Thomas's shipping-mindset directive: this looks like a *planning artifact masquerading as work*. Risk of productive procrastination. The actual validation lever is the outreach happening in parallel — not the document.
- ROI question: who reads the output? If it's only Thomas, a lightweight notes file beats a 10-section deliverable.
- Recommend: scope to a *research plan* (sections 1–4) now, defer 5–10 until after first 5 conversations are done.

## Sally (UX Researcher)
- 10 sections is over-engineered for an N=5–10 study by a solo founder. Sections 5 (Workflow Mapping Framework) and 7 (Product Direction Evaluation) are post-hoc — write them *after* data exists, not before.
- Interview Guide (section 4) is the only artifact that *must* exist before talking to people. Prioritize it.
- Recruitment risk: "AI-native devs Thomas can reach" = his Twitter/LinkedIn bubble. Document the bias explicitly; don't pretend it's representative.
- Interview-craft pitfalls: avoid "Would you use Gitty?" — ask about *last week's actual workflow*. Mom Test rules apply. Bake this into the guide as a constraint.
- Cut hypotheses (section 1) to max 3 falsifiable statements. More than that and you'll confirmation-bias your way through.

## Winston (Architect)
- This is not a story. Stories produce code; this produces docs. Forcing it into the story template misuses BMAD.
- Better artifact: a `research/` planning doc, or a **quick-spec** for the *research plan itself* + a follow-up story for "act on findings." Splitting prevents Epic 12 from becoming a black hole.
- Strategic fit is real — Epic 8/9/10/11 are all *assumptions* that this research would validate or kill. So the research has high leverage. But that makes timing critical: do it *before* finishing those epics or the research becomes rationalization.
- Recommend: park this under a discovery track outside the sprint backlog, not as story 12-1.

## Quinn (QA / Research Integrity)
- No falsifiability bar stated. Each hypothesis needs a kill-criterion ("if <X> of <N> participants say <Y>, hypothesis is rejected").
- N=5 is fine for directional signal but not for "product direction evaluation" (section 7) — that framing oversells the evidence. Rename to "directional read."
- Selection bias: Thomas's network skews toward no-code / agency / DACH. Need 2+ participants *outside* that bubble or findings won't generalize.
- Contradiction detection: pre-register what *disconfirming* evidence would look like. Otherwise everything becomes a "yes."

## Amelia (Dev / Solo Execution)
- Solo founder + 10 sections + recruiting + interviewing + synthesis = 2–4 weeks of non-shipping work. Unrealistic alongside heyspeak's "10 customer conversations" priority and Epic 8/9/10/11 in flight.
- Cheapest viable cut: (1) 3 hypotheses, (2) 1-page interview guide, (3) shared notes doc per call, (4) one synthesis pass after 5 calls. That's it.
- Defer: MVP experiment recommendations, final strategic assessment, workflow mapping framework — all post-data.
- Smallest useful version: a single markdown file `research/ai-native-devs-plan.md` with hypotheses + interview guide. Ship in 1 sitting.

## Consolidated Recommendations for Story Writer
1. **Downsize**: Story 12-1 should produce only a *research plan* (hypotheses + interview guide + recruitment list), not execute the research. Execution belongs in a follow-up story or runs informally alongside outreach.
2. **Reframe AC** around document deliverables, not code. Make "done" a single committed markdown file with explicit, falsifiable hypotheses.
3. **Cap hypotheses at 3**, each with a written kill-criterion.
4. **Force one Mom-Test constraint** into the interview guide (past behavior, not future intent).
5. **Acknowledge bias** in the recruitment section — name the bubble.
6. **Consider quick-spec instead of full story** — this is closer to a discovery artifact than a BMAD story.

## Suggested cut-line (MVP version of story)
- **Keep:** Hypotheses (max 3, falsifiable), Target Segments (1 paragraph), Interview Guide (1 page, Mom Test-compliant), Recruitment list (10 named candidates).
- **Cut/defer:** Workflow Mapping Framework, Product Direction Evaluation, Research Output Format, MVP Experiment Recommendations, Final Strategic Assessment — all require data first.
- **Reframe:** Title from "Research Program" to "Research Plan v1" — signals it's a starting point, not a deliverable suite.
