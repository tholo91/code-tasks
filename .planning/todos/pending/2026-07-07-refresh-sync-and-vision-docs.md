---
created: 2026-07-07T20:49:21.080Z
title: Refresh sync and vision docs
area: docs
files:
  - docs/Sync-Model.md:5
  - docs/Sync-Model.md:16
  - docs/vision.md:15
  - docs/vision.md:74
  - README.md:71
  - docs/Markdown-Format.md
---

## Problem

Several docs describe an older product model: single `captured-ideas.md`, heading-based task format, last-write-wins merge behavior, and pushes to main. The current implementation uses user-scoped files, managed markers, checkbox tasks, stable `ct:` anchors, branch-aware sync, conflict gates, and agent front-door instructions.

For contributors and AI agents, stale docs are not harmless. They create wrong implementation plans and make the sync model look less trustworthy than it is.

## Solution

Update or archive stale docs before OSS promotion. `docs/Sync-Model.md` should describe the real conflict model and branch behavior. `docs/vision.md` should either become an archived early vision doc or be rewritten to match the current app. `docs/Markdown-Format.md` should be treated as the canonical parser/serializer contract and cross-linked from the README.
