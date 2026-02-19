---
status: done
priority: p2
issue_id: "012"
tags: [bug, server]
dependencies: []
---

# SET_PLAYER_INFO Always Broadcasts Lounge Change, Even for In-Game Updates

## Problem Statement

When `SET_PLAYER_INFO` is handled with a `gameId` (player is in a game), the code broadcasts to the game, then falls through and calls `state.broadcastLoungeChange()` even though no lounge data changed. The `break` on line 137 breaks the inner `for` loop, not the `case`.

## Findings

- `src/server/play.ts:121-152` -- `broadcastLoungeChange()` on line 151 runs unconditionally
- The `break` on line 137 exits the `for` loop, not the switch case

## Proposed Solutions

### Option 1: Move broadcastLoungeChange into else branch

**Approach:** Only call `broadcastLoungeChange()` when the lounge actually changed (the `else` branch).

**Effort:** 5 minutes

**Risk:** None

## Affected files

- `src/server/play.ts:151` -- move into else branch or add early return

## Acceptance Criteria

- [ ] In-game mood changes don't trigger unnecessary lounge broadcasts
