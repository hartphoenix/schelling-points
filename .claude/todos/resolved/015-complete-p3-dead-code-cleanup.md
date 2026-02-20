---
status: complete
priority: p3
issue_id: "015"
tags: [cleanup, dead-code]
dependencies: []
---

# Dead Code and Unused Scaffolding

## Problem Statement

Several types, fields, and functions are defined but never used. They add cognitive load without contributing functionality.

## Findings

- `src/types.ts:23-25` -- `Response` type never imported or used anywhere
- `src/server/api.ts:17-18` -- `addRest()` is empty
- `src/config.ts:4,6` -- `GUESS_COUNTDOWN_SECS` and `SCORE_COUNTDOWN_SECS` never referenced
- `src/server/types.ts:12` -- `PlayerInfo.currentGuess` initialized to undefined, never written
- `src/server/types.ts:11` -- `PlayerInfo.previousScoresAndGuesses` initialized empty, never populated
- `src/server/types.ts:20-23` -- `RoundScore` type unused
- `src/server/types.ts:28` -- `Game.previousScores` never populated
- `src/client/types.ts:13` -- `audioPlayer` in state, never used by any component
- `src/client/audio.ts` -- entire module unused (howler dependency pulled for nothing)

## Proposed Solutions

### Option 1: Remove what's dead, keep what's scaffolding

**Approach:** Remove `Response`, `currentGuess`, `addRest`. Keep `previousScoresAndGuesses`, `RoundScore`, `previousScores`, and `audioPlayer` if scoring/audio are coming soon -- but add TODO comments explaining intent.

**Effort:** 15 minutes

**Risk:** None

## Acceptance Criteria

- [ ] No unused exports without a clear TODO explaining future intent
