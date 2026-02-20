---
status: complete
priority: p2
issue_id: "013"
tags: [server, reliability]
dependencies: []
---

# No WebSocket Disconnect Handling

## Problem Statement

There are no `close` or `error` event handlers on WebSocket connections. Disconnected players remain in the lounge map and game player arrays with stale WebSocket references. The `readyState` checks in broadcast/unicast prevent crashes, but disconnected players are never cleaned up -- they'll appear in player lists forever and block "all ready" checks.

## Findings

- `src/server/api.ts:10-14` -- only `message` handler, no `close`/`error`
- `src/server/types.ts:33-37, 69-71` -- TODO comments on stale socket handling
- `src/server/play.ts:229-232` -- ready check filters by open sockets, but disconnected players remain in isReady set
- No mechanism to remove players from games or lounge on disconnect

## Proposed Solutions

### Option 1: Add close handler that cleans up state

**Approach:** On WebSocket `close`, find the player in lounge/games and remove them. Broadcast updated player lists.

**Effort:** 1-2 hours

**Risk:** Medium -- need to handle edge cases (mid-game disconnect, last player leaving)

## Affected files

- `src/server/api.ts` -- add close handler
- `src/server/types.ts` -- add removal methods to State/Game

## Acceptance Criteria

- [ ] Disconnected players are removed from player lists
- [ ] Remaining players see updated member lists
