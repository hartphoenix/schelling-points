---
status: done
priority: p2
issue_id: "014"
tags: [naming, consistency]
dependencies: []
---

# playerName vs name Inconsistency Across Boundaries

## Problem Statement

Server's `PlayerInfo` uses `name`, `LoungeInfo` uses `playerName`, wire messages use `playerName`. This causes translation code at every boundary and will trip up anyone assuming field names match.

## Findings

- `src/server/types.ts:8` -- `PlayerInfo.name`
- `src/server/types.ts:51` -- `LoungeInfo.playerName`
- `src/types.ts:7-10` -- wire messages use `playerName`
- `src/server/play.ts:165,189` -- manual translation `name: loungeInfo.playerName`
- `src/types.ts:10` -- SUBSCRIBE_GAME uses `playerName: string` (raw string, not `PlayerName` alias)

## Proposed Solutions

### Option 1: Standardize on one name

**Approach:** Pick `playerName` everywhere (more specific in context with gameId/playerId). Update `PlayerInfo.name` to `PlayerInfo.playerName`.

**Effort:** 30 minutes

**Risk:** Low

## Affected files

- `src/server/types.ts:8` -- rename field
- `src/server/play.ts` -- update all references
- `src/types.ts:10` -- use `PlayerName` type alias

## Acceptance Criteria

- [ ] Single consistent name used across all boundaries
