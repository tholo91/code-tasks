---
created: 2026-07-07T20:49:21.080Z
title: Harden sync conflict paths
area: sync
files:
  - src/services/github/sync-service.ts:115
  - src/services/github/sync-service.ts:174
  - src/services/github/sync-service.ts:704
  - src/features/sync/components/SyncConflictSheet.tsx:72
  - src/features/sync/components/SyncConflictBanner.tsx:24
---

## Problem

The Fable audit correctly flagged a remaining trust issue around the legacy `syncPendingTasks` path. The primary FAB path now uses `syncAllRepoTasks()` and already surfaces mid-push 409 conflicts instead of clobbering remote agent edits. But `syncPendingTasks()` still routes through `commitTasks()`, which retries 409 by re-fetching the latest SHA and writing the same local content.

Today that path is mainly used by explicit "Keep local" conflict actions, where overwriting remote is expected. The problem is that the function name and export still look like a safe sync API. That ambiguity undermines the sync trust story before OSS launch.

## Solution

Make the semantics explicit. Either remove `syncPendingTasks()` from normal sync usage entirely, or pass conflict intent into `commitTasks()` so 409 retry only happens after the user has chosen "Keep local". Add one test proving `syncPendingTasks()` without force intent returns a conflict on mid-push 409, and another proving "Keep local" still overwrites remote intentionally.
