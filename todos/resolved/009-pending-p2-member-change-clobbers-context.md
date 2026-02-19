---
status: done
priority: p2
issue_id: "009"
tags: [bug, client, naming]
dependencies: []
---

# MEMBER_CHANGE Ignores gameId -- Lounge/Game Lists Clobber Each Other

## Problem Statement

`MEMBER_CHANGE` is used for both lounge and game membership, distinguished by `gameId` being undefined vs present. But the client reducer ignores `gameId` and blindly overwrites `otherPlayers`. A lounge change while in a game (or vice versa) will silently replace the player list.

Additionally, `otherPlayers` is misleading -- it contains ALL players including the current user.

## Findings

- `src/client.tsx:14-15` -- ignores `message.gameId`, always overwrites
- `src/server/types.ts:78-84` -- lounge sends `MEMBER_CHANGE` with `gameId: undefined`
- The `LOUNGE` message type exists in `src/types.ts:15` but server never sends it
- `otherPlayers` name is inaccurate -- includes current player

## Proposed Solutions

### Option 1: Separate LOUNGE and MEMBER_CHANGE

**Approach:** Use the existing `LOUNGE` message type for lounge broadcasts. Make `MEMBER_CHANGE.gameId` required. Client reducer filters by context.

**Effort:** 1 hour

**Risk:** Low

## Affected files

- `src/server/types.ts:78-84` -- send LOUNGE instead of MEMBER_CHANGE for lounge
- `src/types.ts:16` -- make MEMBER_CHANGE.gameId required
- `src/client.tsx:14-15` -- handle LOUNGE and MEMBER_CHANGE separately
- Consider renaming `otherPlayers` to `allPlayers`

## Acceptance Criteria

- [ ] Lounge updates don't clobber game player lists
- [ ] Game updates don't clobber lounge player lists
