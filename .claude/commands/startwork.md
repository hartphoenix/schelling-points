# Start Work

Pre-work checks before beginning any task. Surfaces conflicts with
active work so the human can make an informed choice.

## Usage

`/startwork` — pick the highest-priority available task from the board
`/startwork #<issue-number>` — start a specific issue

## Protocol

### 1. Gather

Fetch all data needed for conflict detection and ranking.

1. Pull latest main (`git pull origin main`)
2. Fetch board items in Ready, Backlog, In Progress, and In Review
   (`gh project item-list 1 --owner thrialectics --format json`)
3. Fetch open PRs
   (`gh pr list --json number,title,headRefName,files,author`)
4. Scan `.claude/todos/agent/` for stale working files (created >24h
   ago) and surface them for verification
5. Classify fetched items:
   - **Candidates** — items in Ready and Backlog (these get ranked)
   - **Active work** — items in In Progress and In Review, plus open
     PRs (reference data for conflict detection)

If GitHub is unreachable, warn and continue from local branch state.
If a query partially fails (e.g., PR fetch succeeds but board fails),
warn which data source is missing and proceed with available data —
note that conflict detection may be incomplete.

If there are no candidates in Ready or Backlog, say so and stop.

### 2. Detect

Check each candidate against active work for blocking conditions.
This step runs for ALL candidates — including when a specific issue
number is provided via `/startwork #N`.

For each candidate, check for these conditions:

| Type | Definition | How to detect |
|------|-----------|---------------|
| dependency | Upstream issue this task depends on is still open | Parse candidate's `### Dependencies` section for `Depends on #N`; check if #N is still open |
| conflict | Another PR or In Progress task overlaps in scope | See overlap detection below |
| decision | Unresolved `human-decision` issue that this task presupposes | Search open issues with `human-decision` label; flag if candidate's scope overlaps |
| review | An upstream PR referenced in dependencies is not yet merged | Parse candidate's `### Dependencies` for PR references; check if still open |
| external | Blocker outside team control | Check candidate's labels for `blocked`; check body for external dependency mentions |

**Distinguishing `dependency` from `review`:** `dependency` = an open
*issue* (work not yet done). `review` = an open *PR* (work done, not
yet merged). Both can appear on the same candidate.

**Overlap detection for `conflict`** — use a layered approach:

1. **Labels** — candidate and an active item share a component label
   (anything that isn't a type, triage, or priority label)
2. **PR files** — an open PR's changed files overlap with files the
   candidate likely touches (from description or related PRs)
3. **Semantic** — titles or descriptions suggest overlapping scope

Output: a per-candidate list of flags, each with type, related
issue/PR number, assignee (if any), and a brief description.

### 3. Rank

Rank all candidates (Ready + Backlog) using these priority tiers.
Ready items surface above Backlog items at the same tier. Within a
tier, prefer items that also rank well in lower tiers.

1. **Urgency** — `p1-critical` and `p2-important` first, regardless
   of assignee
2. **Assigned to current user** — user's tasks above unassigned or
   others' work
3. **Unblocks other work** — items referenced in another issue's
   `### Dependencies` section surface higher; check for issues with
   the `blocked` label that reference these items
4. **MVP-critical path** — foundational structure the product needs
   (core game loop, essential UI flows, shared infrastructure) above
   nice-to-have improvements

**Then demote:** Any candidate with one or more flags from Detect
ranks below all clean (unflagged) candidates at the same priority
tier. Within the demoted group, preserve the original tier ordering.

If a specific issue was provided via `/startwork #N`, skip ranking
and proceed directly to Present (step 4) to show its flags.

### 4. Present

Show the top candidates as an ordered list. For each item, show:

- Why it ranks where it does (tier + assignment)
- Any flags from Detect, one line per flag with link:

```
[conflict] #42 (In Progress, Ulysse) — overlapping scope in scoring logic
[dependency] #38 (open) — scoring algorithm not yet decided
[decision] #51 (human-decision) — UX flow for timer display unresolved
[review] #44 (PR, waiting on review) — shared types refactor
[external] blocked — waiting on API key from vendor
```

If any data source was unavailable during Gather, note it:

```
Note: PR data unavailable — conflict detection may be incomplete.
```

Let the user choose.

### 5. Validate

After the user picks a task, run these checks on the selected item:

- **Blocking conditions** — if flagged, surface the specific flags
  and ask whether to proceed anyway or pick a different task.
- **WIP limit** — count "In Progress" items for the assignee. If at
  or above their limit (from CLAUDE.md team table), warn and ask for
  confirmation.

### 6. Activate

Update the board item status to "In Progress". Create or checkout the
feature branch using the `<person>/<short-description>` convention.

### 7. Summary

Print what's being worked on, the branch name, and any flags that
were acknowledged during Validate.
