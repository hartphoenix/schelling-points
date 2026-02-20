---
title: "chore: Restructure /startwork spec to surface all conflicts"
date: 2026-02-20
category: workflow-spec-gaps
tags:
  - startwork
  - conflict-detection
  - workflow
  - kanban
  - blocking-conditions
  - spec-rewrite
  - data-flow
problem_type: spec-gap
components_affected:
  - .claude/commands/startwork.md
pr: 119
severity: medium
review_deltas:
  - "Component label detection layer removed (no component labels exist yet)"
  - "Semantic overlap flags as 'possible conflict' (not 'lower confidence')"
  - "/startwork #N runs Detect only on the specified issue, not all candidates"
---

# Restructure /startwork to Surface All Conflicts

## Problem Statement

The `/startwork` command spec had gaps that let it recommend work conflicting with active tasks. A user running `/startwork` could be pointed at an issue whose scope overlapped with a teammate's in-progress PR, or that depended on an unresolved human-decision issue, with no warning. The command appeared to work correctly — it returned a ranked candidate — but the ranking was based on incomplete data, so the user had no way to know they were walking into a conflict until they collided with it during development.

Specific symptoms:

- A user picks up an issue that overlaps with an in-progress PR by another team member, leading to merge conflicts or duplicated effort.
- A user starts work on an issue that depends on an open `human-decision` issue, building on assumptions that haven't been resolved yet.
- A user sees no flags or warnings on any candidate, giving false confidence that the path is clear.

## Root Cause

The old spec's Step 1 (Environment check) only fetched items in Ready and Backlog columns from the project board. It never queried In Progress, In Review, or open PRs. This meant the command had **no reference data** to compare candidates against. Conflict detection was referenced later in the spec but was structurally impossible because the data it needed was never gathered.

Four specific gaps:

1. **Missing data** — The fetch scope was too narrow. In Progress, In Review, and open PRs were never queried, so there was no active-work dataset to check against.
2. **No ranking impact** — Even if conflicts had been detected, the ranking logic had no demotion rule. Flagged items would appear at the same position as clean items.
3. **Missing inline definitions** — Blocking condition types (dependency, conflict, decision, review, external) were referenced but defined in a separate plan doc, not in the startwork spec itself. The spec was not self-contained.
4. **Undefined flag format** — The spec mentioned "flags" but never defined what they looked like, making consistent presentation impossible.

## Investigation

The brainstorm analyzed the current flow and identified where data was missing. Key decisions:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Gate type | Soft (inform, don't prevent) | Humans decide well with good information; hard gates create workarounds |
| Rank impact | Demote conflicted items below clean items at the same tier | Nudges toward clean work without hiding options |
| Data sources | Board columns Ready through In Review, plus open PRs | Catches both board-tracked work and code already in flight |
| Blocking conditions | Inline in startwork.md | Self-contained spec eliminates cross-file lookups that drift out of sync |
| WIP check timing | Post-selection only | WIP is a personal capacity concern, not a conflict — keep it simple |
| Flag format | One-line summary with type tag, issue/PR link, assignee, description | Scannable and actionable without being verbose |
| Spec structure | Restructure steps to match data flow | Steps aligned to data flow (fetch then detect then rank then present) ensure nothing falls through the cracks |

The investigation confirmed the root cause was structural: the spec's steps were ordered around a workflow narrative ("check environment, rank, present") rather than around data dependencies. Reorganizing around data flow — gather all data first, then process it — was the fix.

## Solution

The spec was rewritten as a 7-step pipeline where each step's inputs are guaranteed by the step before it: **Gather → Detect → Rank → Present → Validate → Activate → Summary**.

### Step 1: Gather

Fetches all data needed before any analysis begins:

1. Pull latest main
2. Fetch board items across four columns: Ready, Backlog, In Progress, In Review
3. Fetch open PRs with file-level detail
4. Scan `.claude/todos/agent/` for stale working files (>24h old)
5. Classify items into **Candidates** (Ready/Backlog) and **Active work** (In Progress, In Review, open PRs)

If there are no candidates in Ready or Backlog, say so and stop.

### Step 2: Detect

Checks each candidate against the active-work dataset for five blocking condition types:

| Type | Definition | Detection |
|------|-----------|-----------|
| `dependency` | Upstream issue this task depends on is still open | Parse `### Dependencies` for `Depends on #N`; check if open |
| `conflict` | Another PR or In Progress task overlaps in scope | File-overlap from PR changed-files; semantic overlap flagged as "possible conflict" |
| `decision` | Unresolved `human-decision` issue this task presupposes | Search open `human-decision` issues for scope overlap |
| `review` | Upstream PR in dependencies not yet merged | Parse dependencies for PR refs; check if open |
| `external` | Blocker outside team control | Check for `blocked` label; check body for external mentions |

When `/startwork #N` is used, Detect runs **only** on the specified issue.

### Step 3: Rank

Priority tiers: urgency → assigned to current user → unblocks other work → MVP-critical path. Ready items above Backlog at the same tier.

**Demotion rule:** Any candidate with flags ranks below all clean candidates at the same priority tier.

When a specific issue was provided via `/startwork #N`, ranking is skipped.

### Step 4: Present

Ordered list with ranking rationale and flags:

```
[conflict] #42 (In Progress, Ulysse) — overlapping scope in scoring logic
[dependency] #38 (open) — scoring algorithm not yet decided
[decision] #51 (human-decision) — UX flow for timer display unresolved
[review] #44 (PR, waiting on review) — shared types refactor
[external] blocked — waiting on API key from vendor
```

### Step 5: Validate

After user selects a task: surface any flags and ask whether to proceed, then check WIP limits.

### Step 6: Activate

Move board item to In Progress, create/checkout feature branch.

### Step 7: Summary

Print task, branch name, acknowledged flags.

## What Changed During Review

### 1. Component label detection layer removed

**Plan said:** Three-layer overlap detection (component labels, PR files, semantic).
**Final spec:** Two layers only (PR files, semantic). The project doesn't use component labels yet — including a layer that relies on nonexistent metadata would produce zero signal. Can be added back if the team adopts component labels.

### 2. Semantic overlap flags as "possible conflict"

**Plan said:** Flag with "lower confidence."
**Final spec:** Flag as "possible conflict" with preference for file-based signals. "Lower confidence" is an internal assessment that doesn't translate to actionable UX. "Possible conflict" is self-documenting.

### 3. `/startwork #N` runs Detect only on the specified issue

**Plan said:** Run Detect for ALL candidates including direct issue references.
**Final spec:** Detect only the specified issue. When a user passes a specific issue number, they've already decided what to work on. Running detection on every candidate wastes time and produces noise.

## Prevention Strategies

### Data-flow-first spec design

For any spec that involves making decisions based on multiple data sources, order steps by when data becomes available, not by when the user interacts with it:

**Gather (all inputs) → Detect (cross-reference) → Rank (process) → Present (output) → Validate (confirm) → Activate (side-effects)**

Practical check: draw the data dependency arrows. For each step, list what inputs it needs. If a step requires data that is not yet fetched, the spec has an ordering bug.

### Name the reference data explicitly

The old spec said "fetch Ready and Backlog items" — what it wanted to act on, but not what it needed to reason about. The new spec explicitly names "Active work" as reference data. If a spec does not name its reference data, that is a red flag.

### Self-contained specs

Any spec that an agent executes autonomously must be self-contained. If a term is used in a decision step, it must be defined in the same file. Test: if this file is the only file in context, can every step be executed?

### Recognizing silent failures

Missing input looks like clean output. If a detection step can return "nothing found" for both "checked and found nothing" and "did not check," the spec has an observability gap. Every detection step should distinguish between "clean" and "skipped."

## Signals This Pattern Is Recurring

- A step references data it never fetches (verbs like "check," "compare," "detect" with no prior gather step)
- Decision steps run before all data sources are consulted
- Definitions live in a different file from execution steps
- Zero-result outputs are ambiguous between "checked, found nothing" and "did not check"
- The spec describes a user experience rather than a data pipeline

## Session Observations

### Human observations during implementation

- Hart noticed that `/startwork` was recommending issues conflicting with in-progress work, which triggered the entire rewrite.
- A live `/startwork` run revealed 14 orphaned issues missing from the project board entirely — issues created via GitHub UI never got added because no auto-add automation existed.
- The initial "Start Work Gate" in CLAUDE.md was too strict, prohibiting Claude from doing any work without checking the kanban board. Softened to a reminder.
- A team member forgot to check the board and duplicated work on a component, validating the need for conflict surfacing.

### Errors encountered

- Issue #65 (Scoring MVP) was marked "Ready" despite depending on unresolved design decisions in #27. Fixed by adding dependency link and `blocked` label.
- Issue #57 stayed "In Review" after its PR merged — PR body didn't include `Closes #57`, so GitHub didn't auto-close it.
- Multiple missing bidirectional dependency links discovered during audit.

### Workflow friction

- Brainstorm/plan documents drifted from the final merged state (three review changes never back-propagated). Mitigation: delete ephemeral docs after merge.
- The startwork command evolved across 3 PRs in one day (#84, #91, #119), suggesting the original design was under-specified.
- CLAUDE.md became overloaded with workflow-specific detail; fixed by slimming to universal content and relocating detail into skill files.

### Unresolved concerns

- GitHub Projects "Auto-add issues" automation not yet enabled (requires Marianne to configure).
- Semantic overlap detection has no precision threshold — may produce noisy false positives in practice.
- WIP check timing kept post-selection deliberately, but whether this causes confusion is untested.
- Issue #27 (scoring algorithm) blocks #32, #65, and #90 — the project's biggest single bottleneck with no resolution timeline.

## Related Documentation

- [Codebase Review Handoff](../2026-02-18-codebase-review-handoff.md) — architecture snapshot and team conventions
- Source of truth: [.claude/commands/startwork.md](../../.claude/commands/startwork.md)
