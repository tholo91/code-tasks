---
name: 'captured-ideas'
description: "List unprocessed captures from this repo's captured-ideas-*.md file across all branches, grouped by priority"
---

You are listing the open captures from this Gitty-managed repo. Captures live in `captured-ideas-{username}.md` files that the Gitty app pushes, sometimes to `main`, sometimes to a per-user `gitty/{username}` branch. Your job is to find the freshest one, parse the unchecked items, and print a clean, prioritized brief.

Keep in mind: these captures are on-the-go sketches, typed quickly on a phone. They are loose thoughts, not polished specs. When an item is ambiguous, ask a clarifying question instead of interpreting it your way.

An optional argument may be passed: a GitHub username (for example `/captured-ideas tholo91`). If provided, use that user directly and skip the disambiguation step.

This command is strictly read-only. NEVER modify files, NEVER push, NEVER check out or create branches. Read remote content only via `git show origin/{branch}:{path}`. Use the Bash tool for every git operation below.

## Step 1: Fetch latest (with a fallback)

Run:

```
git fetch --all --quiet
```

Check the exit code explicitly. `--quiet` swallows the output, so the exit code is the only signal. If it is non-zero (no network, expired auth, or unreachable remote), do NOT abort. Prepend this exact warning line to your final output, then continue against whatever local refs already exist:

```
⚠️ Could not fetch latest, showing local cached version. Run 'git fetch' when connectivity is restored.
```

## Step 2: Discover candidate files across ALL branches (union by filename, then group by user)

Do this as an explicit union, not a single-branch lookup. A user's file may exist ONLY on someone else's-looking branch namespace, so you must scan every candidate branch and then collapse by username.

1. Enumerate candidate branches. List remote branches and keep only `origin/main` and every `origin/gitty/*` branch:

```
git branch -r
```

Filter the output to the lines matching `origin/main` or `origin/gitty/`. Ignore the `origin/HEAD -> ...` pointer line.

2. For EACH candidate branch, list the captured-ideas files it contains:

```
git ls-tree --name-only <branch> | grep '^captured-ideas-.*\.md$'
```

(Run this once per branch. A branch may have zero, one, or several matches.)

3. UNION all discovered `(branch, filename)` pairs across every branch. Then group them by the `{username}` portion of the filename (the part between `captured-ideas-` and `.md`). The result is one entry per username, each pointing at the list of branches where that user's file appears. A user whose file exists only on `origin/gitty/{someotheruser}` style branch MUST still appear here, because discovery is by filename across all branches, not by branch name.

## Step 3: Pick the user

- If a username argument was passed, select that user. If no file was found for them anywhere, say so plainly and stop.
- If exactly one username was discovered, use it.
- If zero usernames were discovered across all branches, print exactly:

```
No captured-ideas files found. Is this repo connected in the Gitty app?
```

Then point the user to the README section "Using Gitty with Claude Code" for how to connect a repo, and stop.

- If MORE THAN ONE username was discovered, do NOT guess. Print the list of users, one per line, numbered, and ask the user to pick one before you proceed. You ask; this command does not auto-select. Example:

```
Multiple users have captures in this repo. Which one?
  1. tholo91
  2. anotheruser
```

Wait for the user's choice, then continue with that user.

## Step 4: Pick the freshest branch for the chosen user (AC4)

Now that the user is fixed, decide which branch holds the freshest copy of THEIR file. The same file can exist on both `main` and `gitty/{user}`. For each branch where the user's file appears, get the last commit timestamp that touched that file:

```
git log -1 --format=%ct origin/<branch> -- captured-ideas-<username>.md
```

Pick the branch with the largest (most recent) timestamp. Note the relative time for the chosen branch (you can read it with `--format=%cr`). Remember the chosen `<branch>` and `captured-ideas-<username>.md` path for the next step.

## Step 5: Read and parse the managed block

Read the file content from the chosen branch (read-only, remote ref):

```
git show origin/<branch>:captured-ideas-<username>.md
```

Parse ONLY the unchecked `- [ ]` items that live between the markers `<!-- code-tasks:managed-start -->` and `<!-- code-tasks:managed-end -->`. Ignore anything outside those markers, ignore checked `- [x]` items, and ignore the `## Completed` section.

For each unchecked item, capture:
- The title (the bold text wrapped in `**...**`).
- The body (the indented lines below the title, if any).
- The priority: an item carries 🔴 (Important) or ⚪ (Normal). If an item has NO priority emoji (legacy or hand-edited), treat it as ⚪ Normal. Never drop an item and never error just because its priority marker is missing.

## Step 6: Detect the planning framework (read-only)

Before printing, figure out which planning framework this repo uses, so your per-item suggestions can route into the right workflow. Check for these indicators in the working tree (a simple `ls` / glob check is enough, no git commands needed):

- `.planning/` or `.gsd/` directory → **GSD**
- `_bmad/` or `_bmad-output/` directory → **BMAD**
- `.claude/skills/superpowers*` → **Superpowers**
- None of the above → no framework

Resolution:

- Exactly one match → use it. Include this line near the top of your output: `Detected framework: <name> — non-trivial items should be routed through its workflow (e.g. a story, spec, or phase).`
- Zero matches → no framework line, suggest plain implementation steps.
- MORE THAN ONE match, or you are unsure → do NOT guess. Ask the user once: `Which framework does this repo use for planning — GSD, BMAD, something else, or none?` Use the answer for your suggestions.

## Step 7: Output

If there are ZERO unchecked items, print exactly one line (do not exit silently):

```
No new captures for <username>. Most recent file: branch=<branch>, updated=<relative-time>.
```

Otherwise, print the items grouped by priority, 🔴 Important first, then ⚪ Normal. Preserve the original order within each group. Start with the freshness note line:

```
Found on branch `<branch>` (last updated <relative-time>)
```

For each item print:
- The title.
- The body (if present), trimmed.
- A one-line suggested approach. This is your own reasoning, one sentence, lightweight: how you would tackle it. If a framework was detected in Step 6, route non-trivial items into it (for example "turn into a BMAD story" or "add as a GSD phase"). Do not write a spec, do not implement, do not propose a full plan. Just a single practical next step.
- EXCEPTION for ambiguous items: captures are quick sketches typed on the go. If you cannot tell what an item actually means (unclear intent, scope, or wording), do NOT invent an approach. Instead print one concrete clarifying question, prefixed with `❓ Unclear:`. Example: `❓ Unclear: should this apply to all repos or only the current one?`

**Token guard:** if there are MORE THAN 10 unchecked items, generate a suggested approach for only the FIRST 5 items. List the remaining titles without a suggestion, then end with this line:

```
… and {N} more. Ask me to expand on any of them.
```

where `{N}` is the count of items beyond the first 5.

## Rules recap

- Read-only and idempotent: only `git fetch`, `git branch -r`, `git ls-tree`, `git log`, `git show`, and directory listing for framework detection. No writes, no pushes, no checkouts.
- Never invent captures. If a step finds nothing, say so with the exact copy above.
- Keep all copy plain: commas and periods, no em dashes.
