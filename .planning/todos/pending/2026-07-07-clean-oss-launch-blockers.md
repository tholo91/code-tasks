---
created: 2026-07-07T20:49:21.080Z
title: Clean OSS launch blockers
area: general
files:
  - LICENSE
  - package.json:3
  - captured-ideas-tholo91.md:77
  - src/services/github/sync-service.ts:197
  - src/services/github/sync-service.ts:213
---

## Problem

The repo is not OSS-ready from a trust/readiness perspective. There is no license file, `package.json` is still marked private, the public captured ideas file contains legacy mojibake, and sync code contains Thomas-specific German repo-name heuristics (`bremen-`, `spiesser`, `brief-nach-berlin`, `rauchfrei`).

None of these are large engineering problems, but together they make the project look private, fragile, or overly tailored to one founder's machine and repos.

## Solution

Add an explicit license before any public OSS push. Decide whether `private: true` should stay because this is an app, not an npm package, and document that decision if it stays. Heal the mojibake in `captured-ideas-tholo91.md`. Replace hardcoded repo-name language detection with a real repo setting, a browser/user-language default, or a neutral English default for generated agent-front-door copy.
