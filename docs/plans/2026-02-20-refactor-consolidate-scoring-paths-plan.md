---
title: "refactor: Consolidate scoring logic into single code path"
type: refactor
status: completed
date: 2026-02-20
---

# refactor: Consolidate scoring logic into single code path

## Problem

Scoring currently lives inline in the `onTickGame` GUESSES timer handler (`play.ts:85-134`). The GUESS message handler (`play.ts:299-309`) has a TODO to trigger early scoring when all players have submitted, but no scoring code — just `guesses.set()` + broadcast.

This means:
1. Players who all submit early still wait for the timer to expire
2. When early-scoring is added, the inline scoring block would need to be duplicated (or extracted)

## Proposed Solution

Extract the scoring+transition block into a standalone `async function scoreRound(game, gameId)` and call it from both triggers.

### `src/server/play.ts`

**Extract `scoreRound()`** from the inline block at lines 93-131:

```typescript
async function scoreRound(gameId: t.GameId, game: t.Game) {
  const phase = game.phase
  if (phase.type !== 'GUESSES') return
  if (game.scoringInProgress) return

  const { guesses, category, round } = phase
  game.scoringInProgress = true

  let scores: Map<t.PlayerId, number>
  let positions: Map<t.PlayerId, [number, number]>
  try {
    const result = await scoring.scoreGuesses(guesses)
    scores = result.scores
    positions = result.positions
  } catch (err) {
    console.error('scoring failed, awarding 0s:', err)
    scores = new Map()
    positions = new Map()
  }

  game.phase = {
    type: 'SCORES',
    round,
    category,
    secsLeft: config.SCORE_SECS,
    isReady: new Set(),
    scores,
    positions,
    guesses,
  }

  const guessesAndScores: [t.PlayerId, string, number][] =
    [...guesses.entries()].map(([id, guess]) => [id, guess, scores.get(id) ?? 0])
  game.previousScores.push({ category, guessesAndScores })
  for (const player of game.players) {
    const guess = guesses.get(player.id) ?? ''
    const score = scores.get(player.id) ?? 0
    player.previousScoresAndGuesses.push([score, guess])
  }

  game.scoringInProgress = false
  game.broadcast(currentGameState(gameId, game))
}
```

**Timer handler** (`onTickGame` GUESSES case) becomes:

```typescript
case 'GUESSES': {
  if (game.scoringInProgress) break
  phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)
  if (phase.secsLeft === 0) {
    scoreRound(gameId, game)
  }
  break
}
```

**GUESS message handler** becomes:

```typescript
case 'GUESS': {
  const game = state.games.get(message.gameId)
  if (!game || game.phase.type !== 'GUESSES') {
    console.warn('GUESS: game not found or not in GUESSES phase', message.gameId)
    break
  }
  game.phase.guesses.set(message.playerId, message.guess)
  game.broadcast(currentGameState(message.gameId, game))

  // All live players submitted → score immediately
  const livePlayerIds = game.players
    .filter(p => p.webSocket.readyState === WebSocket.OPEN)
    .map(p => p.id)
  const allGuessed = livePlayerIds.length > 0
    && livePlayerIds.every(id => game.phase.type === 'GUESSES' && game.phase.guesses.has(id))
  if (allGuessed) {
    scoreRound(message.gameId, game)
  }
  break
}
```

## Acceptance Criteria

- [x] `scoreRound()` extracted as standalone function in `play.ts`
- [x] Timer expiration calls `scoreRound()` — behavior unchanged
- [x] GUESS handler calls `scoreRound()` when all live players have submitted
- [x] `scoringInProgress` guard prevents double-scoring if timer fires during async scoring
- [x] `previousScores` and `previousScoresAndGuesses` updated identically in both paths
- [x] Existing `scoring.test.ts` still passes
- [x] New test: submitting all guesses before timer triggers SCORES phase immediately

## Context

- Related: #27, #65, brainstorm `docs/brainstorms/2026-02-20-scoring-algorithm-brainstorm.md`
- Gotcha from `docs/solutions/integration-issues/guesses-lost-phase-transition.md`: phase transitions can silently drop fields — the `guesses` field must be threaded into SCORES phase (already done in current code, `scoreRound` preserves this)
- The "all live players" check mirrors the existing pattern at `play.ts:289-294` (SCORES ready-up)

## References

- `src/server/play.ts:85-134` — current inline scoring block
- `src/server/play.ts:299-309` — GUESS handler with TODO
- `src/server/play.ts:289-294` — existing "all ready" pattern to mirror
- `src/server/scoring.ts` — `scoreGuesses()` function (unchanged)
