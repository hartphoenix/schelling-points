---
status: complete
priority: p1
issue_id: "008"
tags: [ui, game-flow]
dependencies: []
---

# Scores View Missing Timer, Round Number, and Guess Reveal

## Problem Statement

The Scores view drops `secsLeft` from the SCORE_STATE message, shows no round number, no timer, no "Next Round"/"Game Over" indicator, and doesn't reveal what anyone guessed. Players are left staring at a score table with no context until the view abruptly changes.

## Findings

- `src/client.tsx:24` -- `onMessage` for SCORE_STATE drops `secsLeft`
- `src/client/types.ts:10` -- SCORES View has no `secsLeft` or `round` field
- `src/client/Scores.tsx:32` -- `{/* TODO: "Next Round" / "Game Over" -- needs server message */}`
- Server sends `secsLeft` in SCORE_STATE (`src/server/play.ts:282`) but client ignores it
- Server tracks `phase.round` but never includes it in messages to client
- No guess reveal: SCORE_STATE sends scores only, not the actual guesses

## Proposed Solutions

### Option 1: Wire through secsLeft and round

**Approach:** Add `secsLeft` and `round` to SCORE_STATE message type, client View, and Scores component. Add a Timer. Show "Round X of 10" and "Next Round" / "Game Over" text.

**Effort:** 1 hour

**Risk:** Low

## Affected files

- `src/types.ts:20` -- add `round` to SCORE_STATE
- `src/client/types.ts:10` -- add `secsLeft`, `round` to SCORES View
- `src/client.tsx:24` -- capture secsLeft and round
- `src/client/Scores.tsx` -- render timer, round, guess reveal

## Acceptance Criteria

- [ ] Scores view shows a countdown timer
- [ ] Round number is displayed ("Round 1 of 10")
- [ ] View indicates whether next round or game over is coming
