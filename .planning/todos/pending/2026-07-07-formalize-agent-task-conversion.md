---
created: 2026-07-07T20:49:21.080Z
title: Formalize agent task conversion
area: planning
files:
  - src/features/sync/utils/markdown-templates.ts:31
  - .claude/commands/captured-ideas.md:97
  - captured-ideas-tholo91.md:50
  - captured-ideas-tholo91.md:122
---

## Problem

The agent workflow already works organically: captured items become BMAD stories, quick specs, or implementation notes, then get marked processed. But the contract is not explicit enough. The AI header says trivial tasks may be executed and non-trivial tasks should become a story or quick spec, while the Claude slash command detects frameworks. Those pieces should be aligned into one clear conversion rule.

Without a formal contract, different agents may either over-execute loose phone captures or leave them as stale backlog entries.

## Solution

Define the conversion contract in the AI-ready header and slash command: trivial, bounded tasks can be implemented directly; non-trivial captures should be converted into the repo's planning framework first (BMAD story, GSD phase/todo, plain spec, GitHub issue), then the capture should be marked processed with a short link or note to the created artifact. Keep this framework-agnostic and avoid making Claude the assumed default.
