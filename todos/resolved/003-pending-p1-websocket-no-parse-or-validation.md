---
status: done
priority: p1
issue_id: "003"
tags: [security, server]
dependencies: []
---

# WebSocket Messages Not Parsed or Validated

## Problem Statement

The server casts raw WebSocket `data` directly to `ToServerMessage` without `JSON.parse()` or any validation. The `data` parameter is actually a `Buffer` at runtime, not a parsed object. This will cause runtime errors or silent corruption.

## Findings

- `src/server/api.ts:11-12` -- `data` typed as `object` but is actually `Buffer`; cast with `as t.ToServerMessage` without parsing
- `src/client/mail.ts:27` -- client side does `JSON.parse(event.data) as t.ToClientMessage` (at least parses, but no validation)
- No `default` case in `onClientMessage` switch -- unknown message types silently ignored
- Player impersonation possible: `playerId` is client-supplied and never verified against the WebSocket connection

## Proposed Solutions

### Option 1: Parse + Basic Type Check

**Approach:** `JSON.parse(data.toString())`, then verify `message.type` is a known value before processing. No external dependency needed.

**Pros:**
- Fixes the crash bug immediately
- Minimal code

**Cons:**
- Doesn't validate field types within each message variant

**Effort:** 30 minutes

**Risk:** Low

## Affected files

- `src/server/api.ts:11-12` -- add JSON.parse and validation
- `src/server/play.ts:110` -- add default case to switch

## Acceptance Criteria

- [ ] WebSocket data is JSON.parsed before processing
- [ ] Invalid messages are rejected gracefully (not crash)
- [ ] Unknown message types are logged
