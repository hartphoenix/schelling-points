# Startwork Conflict Surfacing

**Date:** 2026-02-20
**Status:** Complete
**Scope:** Improve `/startwork` to surface all conflicts while keeping humans in charge

## Problem

The `/startwork` command has gaps that cause it to recommend issues
conflicting with active work:

1. **Missing data** — Step 1 only fetches Ready and Backlog items.
   In Progress, In Review, and open PRs are never queried, so there's
   no reference data for conflict detection.
2. **No ranking impact** — Conflicts are supposed to be flagged but
   never affect where an item appears in the ranked list.
3. **Late WIP check** — WIP limits are only checked after selection.
   (Evaluated and kept as-is — see Key Decisions.)
4. **Missing definitions** — Blocking conditions are referenced but
   defined in a separate plan doc, not inline.

## What We're Building

A restructured `/startwork` spec that:

- Fetches all active work (board + open PRs) upfront
- Detects all five blocking condition types against active work
- Demotes conflicted items in the ranking (below clean items at the
  same priority tier) but never hides them
- Shows one-line flags with links to related issues/PRs
- Keeps the human fully in charge of the final decision

This is a **spec-only change** to `.claude/commands/startwork.md`.
No code changes.

## Why This Approach

The current spec was designed as a soft gate but has implementation
gaps that prevent it from being informative. The fix is structural:
reorganize the spec steps to match the actual data flow so nothing
falls through the cracks.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Gate type | Soft (inform, don't prevent) | Humans decide well with good info |
| Rank impact | Demote conflicted items | Nudge toward clean work without hiding options |
| Data sources | Board (Ready through In Review) + open PRs | Catches both board-tracked work and code in flight |
| Blocking conditions | Inline in startwork.md | Self-contained spec, no cross-file lookups |
| WIP check timing | Post-selection only | Keep simple; WIP is a personal capacity concern, not a conflict |
| Flag format | One-line summary with links | Scannable, actionable, not verbose |
| Spec structure | Restructured flow | Steps match data flow: fetch → detect → rank → present → validate → go |

## Restructured Flow (High-Level)

The current spec has 7 steps. The restructured version reorders them
to match the actual data flow:

### Current flow (gaps marked)
1. Environment check (fetches Ready + Backlog only) **[GAP: missing active work]**
2. Rank & Screen (screens but lacks data) **[GAP: no demotion logic]**
3. Present the Task (flags mentioned but undefined) **[GAP: no flag format]**
4. Validate Selection (blocking + WIP checks)
5. Move to In Progress
6. Set Up Branch
7. Summary

### Proposed flow
1. **Gather** — Pull latest main. Fetch board items in Ready, Backlog,
   In Progress, and In Review (not Done). Fetch open PRs. Scan stale
   agent files.
2. **Detect** — For each Ready/Backlog candidate, check against active
   work for all five blocking conditions. Build a conflict map.
3. **Rank** — Apply priority tiers (urgency → assigned → unblocks →
   MVP-critical). Then demote: items with active conflicts rank below
   clean items at the same tier.
4. **Present** — Show ranked candidates with one-line flags and links.
   Let the user choose.
5. **Validate** — Check blocking conditions and WIP limit on the
   selected item. Warn and confirm.
6. **Activate** — Move to In Progress, create/checkout branch.
7. **Summary** — Print task, branch, and any active warnings.

### Blocking Conditions (to be inlined)

| Type | Definition | Detection source |
|------|-----------|-----------------|
| dependency | Upstream issue still open | Issue body `### Dependencies` section |
| conflict | Another PR or In Progress task touches same files/domain | Open PRs + In Progress board items |
| decision | Unresolved `human-decision` issue that this task presupposes | Issues with `human-decision` label |
| review | Upstream PR not yet merged | Open PRs referenced in dependencies |
| external | Blocker outside team's control | Issue labels or body text |

> **Note for planning:** Define how file/domain overlap is determined
> for `conflict` detection — labels, file paths from PRs, semantic
> match on issue titles, or some combination.

### Flag Format

One-line per flag, with link:
```
[conflict] #42 (In Progress, Ulysse) — overlapping scope in scoring logic
[dependency] #38 (open) — scoring algorithm not yet decided
[decision] #51 (human-decision) — UX flow for timer display unresolved
```

## Open Questions

None — all design decisions resolved.

## Next Steps

`/workflows:plan` to produce the updated startwork.md spec.
