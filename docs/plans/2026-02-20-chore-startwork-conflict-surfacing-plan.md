---
title: "chore: Restructure startwork to surface all conflicts"
type: chore
status: completed
date: 2026-02-20
brainstorm: docs/brainstorms/2026-02-20-startwork-conflict-surfacing-brainstorm.md
---

# chore: Restructure startwork to surface all conflicts

## Overview

Rewrite `.claude/commands/startwork.md` to fix gaps in conflict
detection and surfacing. The current spec fetches only Ready/Backlog
items, so it can't detect conflicts with active work. The restructured
spec fetches all active work upfront, detects all five blocking
condition types, demotes conflicted items in ranking, and shows
one-line flags with links.

Soft gate throughout — inform the human, never prevent.

## Problem Statement

See brainstorm: `docs/brainstorms/2026-02-20-startwork-conflict-surfacing-brainstorm.md`

Four gaps: missing data fetch, no ranking impact, missing inline
definitions, and undefined flag format.

## Proposed Solution

Replace the current 7-step spec with a restructured 7-step spec whose
steps match the actual data flow: gather → detect → rank → present →
validate → activate → summary.

### File to change

`.claude/commands/startwork.md` (full rewrite, ~120–150 lines)

### Step-by-step spec content

#### Step 1: Gather

**What changes:** Expand the data fetch from 2 columns to 4 columns
plus open PRs.

```
1. Pull latest main (`git pull origin main`)
2. Fetch board items in Ready, Backlog, In Progress, and In Review
   (`gh project item-list 1 --owner thrialectics --format json`)
3. Fetch open PRs (`gh pr list --json number,title,headRefName,files,author`)
4. Scan `.claude/todos/agent/` for stale working files (>24h) and
   surface for verification
5. Classify fetched items:
   - **Candidates** — items in Ready and Backlog (these get ranked)
   - **Active work** — items in In Progress and In Review, plus open
     PRs (these are reference data for conflict detection)
```

**Fallback:** If GitHub is unreachable, warn and continue from local
state. If a query partially fails (e.g., PR fetch fails but board
succeeds), warn which data source is missing and proceed with
available data — note that conflict detection may be incomplete.

#### Step 2: Detect

**What changes:** New step. Runs for ALL candidates, including when a
specific issue number is provided via `/startwork #N`.

For each candidate, check against active work for these blocking
conditions:

| Type | Definition | How to detect |
|------|-----------|---------------|
| dependency | Upstream issue this task depends on is still open | Parse candidate's `### Dependencies` section for `Depends on #N`; check if #N is open |
| conflict | Another PR or In Progress task overlaps in scope | Match by: (1) shared labels that indicate component area (e.g., `scoring`, `lobby`), (2) PR changed-files overlap with files mentioned in or implied by the candidate, (3) semantic similarity of issue titles/descriptions |
| decision | Unresolved `human-decision` issue that this task presupposes | Search open issues with `human-decision` label; flag if candidate's scope overlaps |
| review | An upstream PR referenced in dependencies is not yet merged | Parse candidate's `### Dependencies` for PR references; check if open |
| external | Blocker outside team control | Check candidate's labels for `blocked`; check body for external dependency mentions |

**Distinguishing `dependency` from `review`:** `dependency` refers to
an open *issue* (work not yet done). `review` refers to an open *PR*
(work done but not yet merged). Both can appear on the same candidate.

**Overlap detection for `conflict`:** Use a layered approach:
1. **Labels** — if candidate and an active item share a component
   label (anything that isn't a type/triage/priority label), flag it
2. **PR files** — if an open PR's changed files overlap with files
   the candidate likely touches (from description or related PRs)
3. **Semantic** — if titles/descriptions suggest overlapping scope,
   flag with lower confidence

Output: a per-candidate list of flags, each with type, related
issue/PR number, assignee, and a brief description.

#### Step 3: Rank

**What changes:** Add demotion rule after existing priority tiers.

Rank all candidates (Ready + Backlog) using priority tiers:

1. **Urgency** — `p1-critical` and `p2-important` first
2. **Assigned to current user** — user's tasks above unassigned
3. **Unblocks other work** — items referenced in other issues'
   `### Dependencies` sections surface higher
4. **MVP-critical path** — foundational structure the product needs

Ready items surface above Backlog items at the same tier.

**Then demote:** Any candidate with one or more active flags ranks
below all clean (unflagged) candidates at the same priority tier.
Within the demoted group, preserve the original tier ordering.

#### Step 4: Present

**What changes:** Define flag format and presentation structure.

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

If any data source was unavailable (from Gather fallback), note it:
```
Note: PR data unavailable — conflict detection may be incomplete.
```

Let the user choose.

#### Step 5: Validate

**What changes:** None — keep existing behavior.

After the user picks a task:
- **Blocking conditions** — if flagged, surface the specific flags
  and ask whether to proceed or pick a different task
- **WIP limit** — count In Progress items for the assignee. If at or
  above their limit (from CLAUDE.md team table), warn and confirm.

#### Step 6: Activate

**What changes:** None — keep existing behavior.

Update board item status to In Progress. Create or checkout feature
branch using `<person>/<short-description>` convention.

#### Step 7: Summary

**What changes:** Include active flags in output.

Print: task being worked on, branch name, and any flags that were
acknowledged during Validate.

### SpecFlow gaps addressed

These gaps were identified during analysis and are resolved in the
spec above:

| Gap | Resolution |
|-----|-----------|
| `#N` shortcut bypasses Detect | Detect now runs for ALL candidates including direct issue references |
| Overlap detection undefined | Layered approach: labels → PR files → semantic match |
| `review` vs `dependency` overlap | Clarified: `dependency` = open issue, `review` = open PR |
| Partial data failure unhandled | Gather step specifies fallback: warn and proceed with available data |
| In Progress/In Review as candidates vs reference | Explicitly classified as "active work" (reference only) in Gather |

## Acceptance Criteria

- [x] `.claude/commands/startwork.md` is rewritten with 7 restructured steps
- [x] Blocking conditions are defined inline (not cross-referenced)
- [x] Gather step fetches Ready, Backlog, In Progress, In Review, and open PRs
- [x] Detect step runs for both ranked candidates and `/startwork #N`
- [x] Rank step includes demotion rule for flagged items
- [x] Present step uses one-line flag format with links
- [x] Fallback behavior specified for unreachable/partial GitHub data
- [x] Existing behavior preserved for Validate, Activate, Summary

## Context

- **Brainstorm:** `docs/brainstorms/2026-02-20-startwork-conflict-surfacing-brainstorm.md`
- **Current spec:** `.claude/commands/startwork.md`
- **Blocking conditions also referenced in:** `docs/plans/2026-02-20-chore-workflow-sync-hygiene-plan.md`

## References

- Board: `gh project item-list 1 --owner thrialectics --format json`
- Open PRs: `gh pr list --json number,title,headRefName,files,author`
- Team WIP limits: CLAUDE.md team table (Hart: 3, Marianne: 2, Julianna: 2, Ulysse: 3)
