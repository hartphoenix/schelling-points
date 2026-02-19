---
status: done
priority: p2
issue_id: "017"
tags: [debugging, server]
dependencies: []
---

# Add console.warn to 9 Silent Error Guard Clauses

## Problem Statement

There are 9 locations across server code where errors are silently swallowed with empty `// TODO:` or `// TODO: Log error` comments. Debugging bad client messages or race conditions is nearly impossible without any logging.

## Findings

- `src/server/types.ts:33` -- unicast: player not found (empty TODO)
- `src/server/types.ts:36` -- unicast: WebSocket not open (empty TODO)
- `src/server/types.ts:70` -- broadcastToLounge: stale WebSocket (empty TODO)
- `src/server/play.ts:124` -- SET_PLAYER_INFO: game not found
- `src/server/play.ts:144` -- SET_PLAYER_INFO: loungeInfo not found
- `src/server/play.ts:157` -- NEW_GAME: loungeInfo not found
- `src/server/play.ts:179` -- SUBSCRIBE_GAME: game not found
- `src/server/play.ts:217` -- READY: game not found or wrong phase
- `src/server/play.ts:242` -- GUESS: game not found or wrong phase

## Proposed Solutions

### Option 1: Single pass adding console.warn

**Approach:** Replace each empty TODO with a `console.warn('context:', relevantIds)` call. ~20 minutes of work.

**Effort:** 20 minutes

**Risk:** None

## Acceptance Criteria

- [ ] All 9 locations log a warning with useful context
