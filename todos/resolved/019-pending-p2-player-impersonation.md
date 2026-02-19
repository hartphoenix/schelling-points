---
status: done
priority: p2
issue_id: "019"
tags: [security, server]
dependencies: []
---

# Player Impersonation -- playerId is Client-Supplied and Untrusted

## Problem Statement

The client generates its own `playerId` via `crypto.randomUUID()` and sends it in every message. The server never validates that a WebSocket connection "owns" that playerId. Any client can send messages with another player's ID to ready/unready them, submit guesses on their behalf, or hijack their WebSocket reference.

## Findings

- `src/client/types.ts:33` -- client generates its own ID
- `src/server/play.ts:110-248` -- server trusts whatever playerId arrives
- No WebSocket-to-player binding exists

## Proposed Solutions

### Option 1: Bind playerId to WebSocket on first message

**Approach:** On JOIN_LOUNGE, record a `Map<WebSocket, PlayerId>` binding. Reject subsequent messages where `message.playerId` doesn't match the bound ID for that socket.

**Effort:** 1 hour

**Risk:** Low

## Affected files

- `src/server/api.ts` -- track binding
- `src/server/play.ts` -- validate playerId against bound socket

## Acceptance Criteria

- [ ] A WebSocket can only act as one player
- [ ] Messages with mismatched playerId are rejected
