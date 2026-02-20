---
status: complete
priority: p1
issue_id: "005"
tags: [server, game-flow]
dependencies: []
---

# NEW_GAME Doesn't Send GameId Back to Creator

## Problem Statement

When a player clicks "New Game" in the Lounge, the server creates the game and broadcasts a lounge change, but never tells the creator what game was created. The client has no way to navigate to the new game or send a SUBSCRIBE_GAME message because it doesn't know the gameId.

## Findings

- `src/server/play.ts:154-173` -- NEW_GAME handler creates game, does `state.broadcastLoungeChange()` but no unicast to creator
- Creator is added to `game.players` but the creator's client is never sent LOBBY_STATE or any message containing the gameId
- The client stays in the Lounge view after clicking "New Game"

## Proposed Solutions

### Option 1: Auto-subscribe the creator

**Approach:** After creating the game, unicast `currentGameState(gameId, newGame)` plus a `MEMBER_CHANGE` to the creator, and remove them from the lounge. This mirrors what SUBSCRIBE_GAME does.

**Effort:** 30 minutes

**Risk:** Low

## Affected files

- `src/server/play.ts:154-173` -- add unicast after game creation

## Acceptance Criteria

- [ ] After creating a game, the creator sees the Lobby view
- [ ] The gameId is visible to the creator
