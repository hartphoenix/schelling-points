---
title: Review Triage — Agent Spawned by Review Orchestrator
date: 2026-02-18
category: workflow-patterns
tags:
  - triage
  - code-review
  - agent-workflow
  - github-issues
problem_type: workflow-optimization
components:
  - code-review
  - github-issues
severity: enhancement
related:
  - docs/solutions/2026-02-18-codebase-review-handoff.md
  - .claude/commands/workflows/review.md
---

# Review Triage — Agent Spawned by Review Orchestrator

## Problem

A multi-agent code review produces a flat list of findings with priorities but
no ownership classification. Some findings have a single deterministic fix
(missing `JSON.parse`, unbound method). Others require product decisions
(scoring formula, UX flow). Without separating these, either:

- Agent work stalls waiting for human review of items that don't need it, or
- Agents make product decisions they have no basis for.

## Dedup Protocol

Before creating any new issue:

1. Search open issues: `gh issue list --search "<keywords>" --state open`
2. Search closed issues for recent duplicates: `gh issue list --search "<keywords>" --state closed --limit 5`
3. **If a match is found:** Present the match with a one-line rationale
   for why it overlaps. Wait for confirmation before commenting.
   (Prevents false-positive noise on unrelated issues.)
4. **If no match:** Proceed with issue creation.

## Solution

The review orchestrator (`/workflows:review`) runs triage as its final step
(Phase 6: Triage & Issue Routing). The triage step classifies each finding
and routes it to GitHub issues — with lightweight local working files for
agent-resolvable items only.

### Routing

For each finding:

1. **Search existing issues** — run dedup protocol above.
2. **Match found →** Confirm relevance, then append finding as comment
   on existing issue.
3. **No match + human-needed →** Create new GitHub issue using
   Assignment Protocol in CLAUDE.md.
4. **No match + agent-resolvable →** Create GitHub issue (labeled
   `agent-resolvable`) AND create lightweight working file:

   ```
   mkdir -p .claude/todos/agent
   ```

   File: `.claude/todos/agent/<issue-number>-<short-description>.md`
   Contents: description, file location, acceptance criteria. No YAML
   lifecycle, no status field. Delete after agent completes work.

## Decision Criteria — Detailed

### Agent-resolvable patterns

| Pattern | Example | Why deterministic |
|---------|---------|-------------------|
| Missing parse at I/O boundary | `Buffer` cast to typed object | Language rule: always parse across I/O |
| Unbound method reference | `map.has` loses `this` as callback | Language rule: bind or arrow-wrap |
| Hardcoded value instead of derived | `round: 0` instead of `phase.round` | Bug: derive from source |
| Shared scope in switch | Variables collide across cases | Convention: block braces on every case |
| Silent error swallowing | Empty guard clauses with `// TODO:` | Add `console.warn` with context |
| Missing function call | Exported but never invoked | Clear omission |
| Naming inconsistency | `name` vs `playerName` across layers | Establish convention, apply consistently |

### Human-needed patterns

| Pattern | Example | Why requires judgment |
|---------|---------|---------------------|
| Algorithm design | Scoring formula | Multiple legitimate approaches |
| Content decisions | Category list | Product/editorial judgment |
| UX flow | Game creation, discovery | User experience design |
| Policy decisions | Disconnect grace period | Product trade-offs |
| Dead code triage | Scaffolding vs truly dead | Requires knowing intent |
| Architecture trade-offs | Tuple vs object wire format | Legitimate competing values |

## Anti-Patterns

- **Agent attempts design decisions.** If "which is better?" → human-needed issue.
- **Agent deletes ambiguous code.** Dead code might be scaffolding → human-needed issue.
- **Human reviews obvious bugs by hand.** That's what agent-resolvable items are for.
- **Issues filed without triage.** Creates noise; triage first, then file.
- **Issues filed without dedup.** Creates duplicates; search first, then file.
