---
title: "fix: Carry guesses through GUESSES → SCORES phase transition"
type: fix
status: completed
date: 2026-02-19
issue: "#57"
---

# fix: Carry guesses through GUESSES → SCORES phase transition

When the GUESSES phase timer expires, `play.ts:91` creates a fresh SCORES phase object and discards `phase.guesses`. The guesses are never forwarded to the client, so the Scores view can't show what anyone typed.

## Acceptance Criteria

- [x] Guesses appear in the Scores view after round ends
- [x] Each player sees their own guess and all other players' guesses
- [x] Wire type `SCORE_STATE` includes a `guesses` field
- [x] No regressions in round transitions or game-over flow

## Changes

### 1. Add `guesses` to SCORES phase — `src/server/types.ts:24`

Add `guesses: Map<PlayerId, string>` to the SCORES variant of `Phase`.

### 2. Carry guesses across transition — `src/server/play.ts:87-98`

When building the SCORES phase object, copy `phase.guesses` from the expiring GUESSES phase:

```typescript
game.phase = {
  type: 'SCORES',
  round: phase.round,
  category: phase.category,
  secsLeft: config.SCORE_SECS,
  isReady: new Set<string>(),
  scores,
  guesses: phase.guesses,  // ← carry forward
}
```

### 3. Add `guesses` to wire type — `src/types.ts:21`

Add `guesses: [PlayerId, string][]` to the `SCORE_STATE` message.

### 4. Serialize guesses in broadcast — `src/server/play.ts:326-336`

In `currentGameState`, SCORES case, add:

```typescript
guesses: [...phase.guesses.entries()],
```

### 5. Thread guesses through client — 3 files

| File | Change |
|------|--------|
| `src/client/types.ts:10` | Add `guesses: [PlayerId, string][]` to SCORES view |
| `src/client.tsx:42-43` | Pass `message.guesses` into the SCORES view |
| `src/client.tsx:115-125` | Pass `state.view.guesses` as `guesses` prop to `<Scores>` |

The `Scores.tsx` component already accepts and renders `guesses?: [PlayerId, string][]` — no changes needed there.

### 6. Clean up dead code — `src/server/types.ts:12`

Remove `currentGuess?: string` from `PlayerInfo`. It's never written to (the GUESS handler writes to `game.phase.guesses` instead). Also remove initialization sites in `play.ts` (lines 172, 205).

## References

- Issue: #57
- Scores component already handles guesses: `src/client/Scores.tsx:125-126`
- Related resolved todo: `.claude/todos/resolved/008-complete-p1-scores-no-timer-no-round.md`
