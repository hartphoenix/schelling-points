---
status: done
priority: p1
issue_id: "007"
tags: [ui, game-flow]
dependencies: []
---

# Lobby Countdown Invisible to Players

## Problem Statement

When all players ready up, the server sends `LOBBY_COUNTDOWN` with `secsLeft`. The client reducer returns `state` unchanged with a `// TODO: start countdown animation`. Players see no visual feedback that the game is about to start -- the view suddenly jumps from Lobby to Guesses.

## Findings

- `src/client.tsx:26-28` -- LOBBY_COUNTDOWN handler is a no-op
- `src/server/play.ts:232-234` -- server correctly sends countdown
- `config.LOBBY_COUNTDOWN_SECS = 3` -- only 3 seconds, but still jarring with zero feedback

## Proposed Solutions

### Option 1: Add secsLeft to Lobby view

**Approach:** Add optional `secsLeft?: number` to the LOBBY View type. When LOBBY_COUNTDOWN arrives, update the view with `secsLeft`. Render it in the Lobby component as a countdown overlay.

**Effort:** 30 minutes

**Risk:** Low

## Affected files

- `src/client/types.ts:8` -- add `secsLeft?: number` to LOBBY view
- `src/client.tsx:26-28` -- update state with countdown
- `src/client/Lobby.tsx` -- render countdown when secsLeft is present

## Acceptance Criteria

- [ ] Players see a countdown (3, 2, 1) before the game starts
