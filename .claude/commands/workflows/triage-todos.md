---
title: Review Triage — Agent Spawned by Review Orchestrator
date: 2026-02-18
category: workflow-patterns
tags:
  - triage
  - code-review
  - agent-workflow
  - todo-management
problem_type: workflow-optimization
components:
  - code-review
  - todo-management
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

## Discovery

Schelling Points codebase review, 2026-02-18. Six parallel review agents
produced 20 findings. The review orchestrator was able to accurately judge which
findings it could resolve autonomously (13) and which needed human decisions
(7). That judgment was correct across the board — the agent-resolved items all
had one right answer, and the human-needed items all had legitimate trade-offs.

This means the judgment is reliable enough to formalize as a step.

## Solution

**Not a separate skill.** The review orchestrator (`/workflows:review`) should
spawn a triage agent as its final step, after all reviewing agents complete and
todos are created. The triage agent reads all findings, classifies them, and
routes them.

### Where it fits in the review workflow

```
Review Orchestrator
├── Phase 1: Parallel review agents (existing)
├── Phase 2: Findings synthesis + todo creation (existing)
└── Phase 3: Triage agent (NEW)
    ├── Reads all created todos
    ├── Classifies each as agent-resolvable or human-needed
    ├── Moves to todos/agent/ or todos/user/
    └── Files GitHub issues for todos/user/ items
```

### Triage agent prompt (for the orchestrator to spawn)

The orchestrator spawns a fresh agent after all reviewers finish:

> Read all todo files in `.claude/todos/`. For each finding, classify it:
>
> **Agent-resolvable** (all must be true):
> - One correct answer derivable from code context, language rules, or repo conventions
> - No product behavior, UX flow, or architecture shape is being decided
> - A wrong fix would be an obvious bug, not a defensible design choice
>
> **Human-needed** (any is true):
> - Fix requires choosing between multiple legitimate options
> - Decision affects user-facing behavior or product feel
> - "Right" answer depends on intent the codebase doesn't encode
> - Finding involves removing/keeping code whose purpose is unclear
>
> For each finding, write a one-line summary to `todos/agent/` or `todos/user/`.
> For `todos/user/` items, file GitHub issues and add them to the project board.

### Directory convention

```
todos/
├── agent/    # Agent works these autonomously via /workflows:work
└── user/     # Human reviews these; linked to GitHub issues
```

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

- **Agent attempts design decisions.** If "which is better?" → `todos/user/`.
- **Agent deletes ambiguous code.** Dead code might be scaffolding → `todos/user/`.
- **Human reviews obvious bugs by hand.** That's what `todos/agent/` is for.
- **Issues filed without triage.** Creates noise; triage first, then file.

## Session Context

### What was fixed (agent-resolvable, 13 items)

All in working tree — `api.ts` JSON.parse + socket binding, `server.ts`
startTicking call, `play.ts` Map.has binding + round counter + scoping +
guards + naming, `client.tsx` countdown + member change filtering,
`client/types.ts` localStorage persistence, `client/Lobby.tsx` countdown
display, `client/Lounge.tsx` localStorage save, `types.ts` playerName typing.

### What was filed (human-needed, 7 items → GitHub issues #27–#33)

Scoring algorithm, category selection, game creation flow, scores view UX,
disconnect handling, dead code triage, wire format decision. All on project
board at `github.com/users/thrialectics/projects/1` in Backlog.

### Human observations

- System boundary failures are silent — TypeScript casts mask runtime mismatches
- Placeholder values cement into production logic without test coverage
- No test harness exists; all validation is manual (growth edge)
- Deliberate "collaborate now, code later" pattern: ship fixes, defer design
