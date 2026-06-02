# Story 12.1: AI-Native Developer Research Plan v1

Status: draft

> **Core promise:** Before Gitty doubles down on any of its strategic directions (AI-native Git UX, branch-confidence assistant, deployment-visibility layer, AI orchestration), we will have a concrete, falsifiable research plan that lets 5 real conversations produce *directional signal* — not vibes, not confirmation bias.

> **This story produces a plan, not findings.** Findings come from the conversations Thomas runs in parallel. The plan is the kill-or-keep guardrail for those conversations.

> **Scope guard:** This story is intentionally downsized from the original 10-section research-program prompt. Sections 5–10 of the original prompt (Workflow Mapping Framework, Opportunity Identification, Product Direction Evaluation, Research Output Format, MVP Experiment Recommendations, Final Strategic Assessment) are deferred until N ≥ 5 conversations are complete. They require data to be useful and would be premature here.

## Story

As Thomas (solo founder of Gitty),
I want a one-page research plan with 3 falsifiable hypotheses, a Mom-Test-compliant interview guide, and a list of 10 named recruitment candidates,
so that the next 5 conversations with AI-native developers produce signal that can kill or keep specific Gitty product directions — not just generic "this is interesting" feedback.

## Acceptance Criteria

1. **[Single deliverable file]** A new markdown file exists at `research/ai-native-devs-plan-v1.md`. This is the only artifact this story produces. No code changes are made by this story.

2. **[Max 3 hypotheses, each falsifiable]** The plan contains exactly 3 hypotheses (no more). Each hypothesis follows the structure:
   - **H[n]:** One-sentence behavioral claim about AI-native developers
   - **Why it matters:** One sentence connecting it to a specific Gitty product direction (task manager / Git companion / orchestration layer / deployment confidence / AI-context memory)
   - **Validates if:** A concrete observable signal across N=5 conversations (e.g. "≥3 of 5 participants describe an unprompted moment of branch confusion in the last 7 days")
   - **Kills if:** A concrete observable signal that would force rejection (e.g. "≤1 of 5 participants can name a single time AI agents made them lose track of branch state")

3. **[Hypotheses are pre-committed to product directions]** Each of the 3 hypotheses must be tied to a *different* one of the 7 candidate Gitty directions from the prompt context. The plan explicitly states: if H1 is killed, we stop pursuing Direction X; if H1 is validated, Direction X earns one quick-spec for prototyping. No fuzziness.

4. **[Interview guide is one page max]** A section titled `Interview Guide (15 min)` contains:
   - 2 warmup questions (build rapport, not project-related)
   - 3 workflow-walkthrough prompts that elicit *past behavior in the last 7 days* (Mom Test compliant — no "would you use" / "do you think" / "could you imagine")
   - 3 probing follow-ups designed to surface frustration moments
   - 2 contradiction-detection prompts (e.g. "you said X earlier — can you show me the last time that happened?")
   - 1 "show me your terminal/IDE/GitHub right now" request
   - The entire guide must fit on one screen of a printed page (~25 lines of bullets).

5. **[Mom Test constraint stated explicitly]** A short callout in the interview guide section: `Rule: Ask about last week, not next month. If a question can be answered with "I would" or "I think", rewrite it.` This rule is enforced — at least 6 of the 10+ questions in the guide reference a concrete past timeframe ("last time", "yesterday", "this morning", "in the last 7 days").

6. **[Recruitment list with 10 named candidates]** A table with 10 specific people Thomas can reach in the next 7 days. Columns: `Name / Handle | Channel (LinkedIn / X / personal) | Why they fit | Bias category`. At least 2 of the 10 must be marked as *outside Thomas's primary network bubble* (i.e. NOT DACH no-code/agency contacts, NOT ex-VisualMakers, NOT his LinkedIn first-degree — e.g. devs found via Cursor Discord, Claude Code Discord, Hacker News, r/LocalLLaMA, indie founder communities).

7. **[Bias acknowledgment paragraph]** A `Known sampling bias` paragraph (≤4 sentences) explicitly names: (a) the over-representation of Thomas's bubble, (b) selection bias toward devs who reply to DMs, (c) skew toward founders/indies vs. enterprise devs, (d) language/geography skew. This paragraph is required — the plan does not pretend to generalize.

8. **[DM template included]** A copy-pastable LinkedIn / X DM template (~3 sentences) is included verbatim in the plan, ready to send. Template must follow the Mom Test framing ("learning, not pitching"). Reuses the template Bob already drafted in the SM conversation if Thomas wants — but the story writer is free to refine.

9. **[Synthesis trigger defined]** The plan states: `After 5 conversations are logged, write a 1-page synthesis at research/ai-native-devs-findings-v1.md addressing each hypothesis with the validate/kill criterion. Do not synthesize earlier — premature pattern-matching is the risk.`

10. **[Out-of-scope list, explicit]** A final section `Deferred to v2 (after N≥5 data)` lists by name the 6 sections cut from the original prompt: Workflow Mapping Framework, Opportunity Identification, Product Direction Evaluation, Research Output Format, MVP Experiment Recommendations, Final Strategic Assessment. Each gets one sentence on what data would unlock writing it.

11. **[Title signals iteration]** The plan's H1 title is `AI-Native Developer Research Plan v1` — the `v1` is mandatory. The plan acknowledges it will be revised after each batch of conversations.

12. **[No code changes]** This story does not touch `src/`, does not modify any TypeScript, does not change `package.json`, does not bump version. Only one new file under `research/`.

## Tasks / Subtasks

- [ ] **T1: Create the `research/` directory and skeleton file** (AC: 1, 11)
  - [ ] T1.1: Verify `research/` does not exist yet. If it does, place the new file beside any existing artifacts.
  - [ ] T1.2: Create `research/ai-native-devs-plan-v1.md` with H1 title `AI-Native Developer Research Plan v1` and a single subtitle line stating the purpose (one sentence).

- [ ] **T2: Write the 3 hypotheses** (AC: 2, 3)
  - [ ] T2.1: Draft 3 candidate hypotheses. Each must tie to a *different* one of the 7 directions: AI-native Git UX, AI workflow orchestration, branch confidence assistant, deployment visibility layer, async AI task coordination, GitHub-native memory layer, AI coding companion.
  - [ ] T2.2: For each hypothesis, write the `Validates if` and `Kills if` criteria as specific count thresholds across N=5 (e.g. "≥3 of 5", "≤1 of 5"). No "many" / "most" / "some" — concrete fractions only.
  - [ ] T2.3: Stress-test each kill-criterion: "If this evidence came in, would I actually drop the direction?" If the answer is no, the criterion is not falsifiable — rewrite.
  - [ ] T2.4: Add a one-line mapping table at the top of the hypotheses section: `H1 → Direction X | H2 → Direction Y | H3 → Direction Z`.

- [ ] **T3: Write the 15-minute interview guide** (AC: 4, 5)
  - [ ] T3.1: Draft the Mom Test rule callout at the top of the guide section.
  - [ ] T3.2: Write 2 warmup questions. No project mentions, no Gitty mentions.
  - [ ] T3.3: Write 3 workflow-walkthrough prompts anchored in *last 7 days*. Examples to lift from: "Walk me through the last time an AI agent made a commit you didn't expect", "Show me the last branch your AI agent touched — when did you last look at the diff?", "Tell me about the last time you weren't sure if a sync had succeeded."
  - [ ] T3.4: Write 3 probing follow-ups designed to surface emotional / frustration triggers without leading. Each probe references something the participant just said ("you said X — what happened next?").
  - [ ] T3.5: Write 2 contradiction-detection prompts. Pattern: ask the same workflow from a different angle later in the call; flag discrepancies.
  - [ ] T3.6: Write the "show me" request as a single line with a concrete artifact (terminal / IDE / GitHub PR view).
  - [ ] T3.7: Verify the guide fits on one printed page (~25 lines of bullets, including subheaders). Cut ruthlessly if it doesn't.
  - [ ] T3.8: Verify ≥6 of the questions reference a concrete past timeframe.

- [ ] **T4: Build the 10-person recruitment list** (AC: 6)
  - [ ] T4.1: Create a markdown table with columns `Name / Handle | Channel | Why they fit | Bias category`.
  - [ ] T4.2: Populate with 10 specific people. At least 2 must be flagged `outside-bubble`. Use real names/handles where possible — placeholders like "anon Cursor Discord user" only if no specific candidate is identified yet.
  - [ ] T4.3: For each row, write the *why they fit* in ≤10 words — what specific AI-coding behavior makes them relevant.
  - [ ] T4.4: Verify the list is reachable in the next 7 days. Anyone Thomas couldn't realistically DM this week should be flagged or replaced.

- [ ] **T5: Write the bias acknowledgment paragraph** (AC: 7)
  - [ ] T5.1: Draft ≤4 sentences naming the four biases listed in AC7. Plain language, no hedging.
  - [ ] T5.2: Place this paragraph immediately AFTER the recruitment list so it's read in context.

- [ ] **T6: Include the DM outreach template** (AC: 8)
  - [ ] T6.1: Write a ~3-sentence DM template. Follows Mom Test framing — "learning, not pitching". Asks for 15 min, not a meeting series.
  - [ ] T6.2: Provide one personalization slot example (`[Name]`, `[specific thing they posted about]`).
  - [ ] T6.3: Place under a subsection `Outreach template (copy-paste)` so it's grab-and-go.

- [ ] **T7: Write the synthesis trigger + out-of-scope sections** (AC: 9, 10)
  - [ ] T7.1: Add the synthesis trigger as a callout block. State the target file path (`research/ai-native-devs-findings-v1.md`) and the N=5 threshold.
  - [ ] T7.2: Write the `Deferred to v2 (after N≥5 data)` section. List all 6 deferred items by name with one sentence each on what data unlocks them.

- [ ] **T8: Self-review pass against ACs** (AC: all)
  - [ ] T8.1: Walk through each AC1–AC12 and tick that the plan satisfies it. Note any gaps in a `Plan known issues` footer for revision.
  - [ ] T8.2: Run the Mom Test rule one more time across the entire interview guide. Rewrite any "would" / "could" / "do you think" question.
  - [ ] T8.3: Verify total file length is reasonable for a v1 research plan (target: 1–2 pages printed, ≤300 lines of markdown).

- [ ] **T9: Mark the source idea processed** (after merge)
  - [ ] T9.1: If `captured-ideas-tholo91.md` contains the research-program prompt as an open item, mark it processed: `- [x] **AI-native dev research program prompt** ... [Processed by: Claude] → Planned: Story 12-1 (AI-Native Developer Research Plan v1)`.

## Dev Notes

### What "dev" means for this story

This is a content-writing story, not a code story. The "dev agent" here is whoever (Thomas, Claude, or a sub-agent) writes the markdown file. There is no test suite to run, no build to ship, no deployment. The Definition of Done is the file existing and satisfying the ACs.

### Why this story exists in BMAD format at all

Reviewed in party mode 2026-05-12. Multiple reviewers (Winston, John) flagged that this is technically a *discovery artifact*, not a feature story, and could live as a quick-spec or a planning doc instead. Thomas chose to write it as a story anyway, with the explicit caveat that he is running outreach in parallel and views this story as a guardrail document — not a gate.

The story format was retained because:
- Sprint-status.yaml provides a single index of all in-flight work
- BMAD's AC framework is well-suited to a "did we hit the constraints?" check on a research plan
- Future stories can reference `12-1` as the source of validated/killed hypotheses

### Coordination with Thomas's parallel outreach

Thomas is sending DMs to AI-native devs while this story is being written. That's intentional and correct. The conversations he books in the next 7 days will use *whatever* interview guide he has — the v1 plan from this story improves the guide quality but does not block conversations.

If the conversations happen before this plan is finalized: that's fine. The plan still serves as a synthesis framework when Thomas reviews his notes.

### Scope guard — what this story is NOT

- NOT the execution of the research (no interviews are conducted by this story)
- NOT the findings synthesis (deferred to a follow-up story or quick-spec after N≥5)
- NOT a product-direction decision (deferred until data exists)
- NOT a 10-section deliverable suite (sections 5–10 of the original prompt are explicitly deferred)
- NOT a code change (zero `src/` modifications)

### Anti-pattern callouts (informed by party-mode review)

1. **Productive procrastination risk:** Thomas's standing instructions explicitly warn against this. The story is scoped to prevent it — a one-page plan is shipped in one sitting, not a 10-section research program over weeks. If the writer feels tempted to expand, cut instead.

2. **Confirmation bias risk:** Hypotheses without kill-criteria become rationalization. The `Kills if` requirement (AC2) is the guardrail. Any hypothesis that survives every conceivable evidence pattern is not falsifiable and must be rewritten.

3. **Bubble bias risk:** Thomas's network is DACH-heavy, no-code-heavy, ex-agency-heavy. AC6 requires ≥2 outside-bubble candidates; AC7 forces explicit acknowledgment. Don't hide the bias — name it.

4. **Mom Test violations:** "Would you use X?" / "Do you think Y is useful?" / "Could you see yourself...?" These all produce false positives. The interview guide must enforce *past-behavior questioning* (AC5). If the writer drafts a question that can be answered hypothetically, rewrite.

### Files to Touch

| File | Status | Changes |
|---|---|---|
| `research/ai-native-devs-plan-v1.md` | NEW | The entire deliverable for this story |
| `research/` | NEW (if not present) | Directory for the file |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | MODIFY | Add Epic 12 + story 12-1 entries |
| `captured-ideas-tholo91.md` | MODIFY (if applicable) | Mark source idea processed (T9) |

### Out of Scope (tracked for future stories)

- **Story 12-2 (or quick-spec): Execute 5 conversations** — Thomas runs the interviews using the v1 plan, logs notes per call.
- **Story 12-3 (or quick-spec): Synthesis v1** — write `research/ai-native-devs-findings-v1.md` against the 3 hypotheses' kill/validate criteria.
- **Story 12-4: Direction decision** — based on synthesis, kill or double down on specific directions. Produces a sprint-change-proposal if course correction is needed.
- **Quick-specs for any prototypes** the findings recommend (e.g. branch-state pill, sync-confidence indicator).

### References

- Original 10-section research-program prompt — in Thomas's chat with Bob (SM) on 2026-05-12. Source of the deferred sections list.
- Party Mode Review feedback: [_bmad-output/implementation-artifacts/_review-archive/review-12-1-feedback.md](_bmad-output/implementation-artifacts/_review-archive/review-12-1-feedback.md) — informed the cut-line and AC structure for this story
- Thomas's standing instructions on shipping mindset and validation (in his global CLAUDE.md): "Nudge toward validation constantly. The goal is not a perfect app — it's 10 real conversations with potential customers."
- *The Mom Test* by Rob Fitzpatrick — the framing rule for interview-question construction
- [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md) — current Gitty product framing, useful for understanding which directions the hypotheses map to

### Party Mode Review Notes (2026-05-12)

Reviewed by John (PM), Sally (UX Researcher), Winston (Architect), Quinn (QA), Amelia (Dev). Summary of concerns and how this story resolves them:

- **John:** "Done is undefined." Resolved via AC1 (single deliverable file) + AC11 (v1 in title signals iteration, not finality).
- **John:** Risk of productive procrastination. Resolved via scope-down (plan only, no execution) and explicit anti-pattern callout in Dev Notes.
- **Sally:** 10 sections over-engineered. Resolved via cutting to 4 components (hypotheses, guide, recruitment, bias acknowledgment) + explicit deferral list (AC10).
- **Sally:** Confirmation bias. Resolved via AC2 — every hypothesis must have a kill-criterion.
- **Sally:** Mom Test violations. Resolved via AC5 (rule stated in guide) + T8.2 (review pass enforces it).
- **Winston:** "This is not a story." Acknowledged in Dev Notes. Story format retained as a deliberate choice with explicit rationale.
- **Winston:** Strategic timing — research must happen before further Epic 8/9/10/11 work locks in assumptions. This is captured implicitly by placing the story as `draft` status (parallel to active sprint, not blocked by it).
- **Quinn:** No falsifiability bar. Resolved via AC2 explicit kill-criteria.
- **Quinn:** Selection bias. Resolved via AC6 (≥2 outside-bubble) + AC7 (explicit acknowledgment paragraph).
- **Amelia:** Scope realism — 10 sections is weeks of solo work. Resolved via cut to ~1 page deliverable shippable in 1 sitting.
- **Amelia:** Defer post-data sections. Resolved via AC10 explicit deferral list.

Full review at [_bmad-output/implementation-artifacts/_review-archive/review-12-1-feedback.md](_bmad-output/implementation-artifacts/_review-archive/review-12-1-feedback.md).

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### Change Log

### File List
