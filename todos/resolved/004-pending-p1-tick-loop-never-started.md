---
status: done
priority: p1
issue_id: "004"
tags: [server, core-mechanics]
dependencies: []
---

# Tick Loop Never Started -- Game Phases Won't Advance

## Problem Statement

`startTicking()` is exported from `src/server/play.ts` but never called anywhere. The tick loop is responsible for advancing game phases (counting down timers, transitioning LOBBY -> GUESSES -> SCORES -> next round). Without it, games will get stuck after the lobby countdown starts.

## Findings

- `src/server/play.ts:6-22` -- `startTicking` exported but not imported/called
- `src/server.ts` -- imports `api` and `names` but not `play`
- The entire phase timer system (lobby countdown, guess timer, score timer) depends on the tick loop

## Proposed Solutions

### Option 1: Call startTicking in server.ts

**Approach:** Import `play` in `server.ts` and call `play.startTicking(state, 100)` after setup.

**Effort:** 5 minutes

**Risk:** Low

## Affected files

- `src/server.ts` -- add import and call to `startTicking`

## Acceptance Criteria

- [ ] Game timers count down and phases advance automatically
