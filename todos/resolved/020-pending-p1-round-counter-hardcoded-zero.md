---
status: done
priority: p1
issue_id: "020"
tags: [game-logic, server, bug]
dependencies: []
---

# Round Counter Hardcoded to 0 in SCORES Phase -- Game Never Ends

## Problem Statement

When transitioning from GUESSES to SCORES phase, `round` is hardcoded to `0` instead of carrying forward `phase.round`. This means the game-over check (`phase.round + 1 === config.ROUNDS_PER_GAME`) always evaluates to `1 === 10`, which is false. The game loops infinitely past round 10.

## Findings

- `src/server/play.ts:65` -- `round: 0` should be `round: phase.round`
- `src/server/play.ts:81` -- game-over check uses `phase.round + 1 === config.ROUNDS_PER_GAME`, always false when round is 0

## Proposed Solutions

### Option 1: One-line fix

**Approach:** Change `round: 0` to `round: phase.round` on line 65.

**Effort:** 1 minute

**Risk:** None

## Affected files

- `src/server/play.ts:65` -- fix round assignment

## Acceptance Criteria

- [ ] SCORES phase carries correct round number from GUESSES phase
- [ ] Game ends after 10 rounds
