---
status: done
priority: p2
issue_id: "018"
tags: [game-logic, server]
dependencies: []
---

# Single Player Can Start Countdown + Countdown Never Cancels

## Problem Statement

Two related lobby countdown bugs:
1. A single player clicking "Ready" starts the countdown because `Array.every()` on a one-element array returns true. A Schelling Point game with one person is not a game.
2. Once the countdown starts, un-readying doesn't cancel it. `lobby.secsLeft` stays set and the game starts anyway.

## Findings

- `src/server/play.ts:229-235` -- no minimum player count check
- `src/server/play.ts:214-237` -- no countdown cancellation when a player un-readies

## Proposed Solutions

### Option 1: Min player count + cancel on un-ready

**Approach:** Add `livePlayerIds.length >= 2` check. After ready set update, if `lobby.secsLeft !== undefined` and not all ready, reset `lobby.secsLeft = undefined`.

**Effort:** Small

**Risk:** Low

## Affected files

- `src/server/play.ts:229-237` -- add both guards

## Acceptance Criteria

- [ ] Game requires at least 2 players to start countdown
- [ ] Un-readying during countdown cancels it
