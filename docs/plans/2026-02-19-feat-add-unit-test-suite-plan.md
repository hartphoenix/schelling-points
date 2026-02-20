---
title: "feat: Add unit test suite for server game logic"
type: feat
status: active
date: 2026-02-19
brainstorm: docs/brainstorms/2026-02-19-testing-strategy-brainstorm.md
---

# Add Unit Test Suite for Server Game Logic

## Overview

Add a Vitest test suite covering the server-side game state machine and WebSocket message handling. Two test layers: phase transition tests (tick logic) and message flow tests (onClientMessage). Goal is confidence to ship scoring, category selection, and other features without breaking the game loop.

## Proposed Solution

Install Vitest, export `onTickGame` from `play.ts`, create test helpers (FakeWebSocket, test state factories), then write ~17 tests across two files.

## Technical Considerations

**`onTickGame` is private.** The core game logic function can't be tested without either exporting it or testing through `startTicking` + fake timers. Exporting it is a one-line change and the clear winner — fake timers would make tests brittle and slow.

**`ws.WebSocket.OPEN` is a static constant (value 1).** Mock WebSockets just need `readyState: 1` and a `send` spy.

**`Chooser` reads files in constructor.** For State construction in tests, mock the Chooser with `{ choose: () => 'test-game' }`.

**`util.nowSecs()` is called in `startTicking`.** Not relevant since we're testing `onTickGame` directly.

**No tsconfig.json in root.** Vitest with Vite defaults handles this. May want to add one later but not needed now.

## Implementation Steps

### Step 1: Install Vitest, add test script

```bash
bun add -d vitest
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

No `vitest.config.ts` needed — Vitest picks up `vite.config.ts`. Server tests don't need jsdom.

### Step 2: Export `onTickGame` from `play.ts`

Change `function onTickGame(...)` to `export function onTickGame(...)` on line 40 of `src/server/play.ts`. One word added, zero behavior change.

Also export `currentGameState` (line 234) — useful for verifying broadcast payloads in tests.

### Step 3: Create test helpers — `src/server/test-helpers.ts`

```typescript
import * as ws from 'ws'
import * as t from './types'

export class FakeWebSocket {
  readyState = ws.WebSocket.OPEN
  sent: t.ToClientMessage[] = []
  send(data: string) { this.sent.push(JSON.parse(data)) }
}

export function fakeSocket(): FakeWebSocket & ws.WebSocket {
  return new FakeWebSocket() as any
}

export function testState(): t.State {
  const mockChooser = { choose: () => 'test-game' } as any
  return new t.State(mockChooser, [
    { id: 1, prompt: 'Animals', difficulty: 'easy' as const },
  ])
}

export function gameWithPlayers(n: number) {
  const game = new t.Game()
  const sockets: FakeWebSocket[] = []
  for (let i = 0; i < n; i++) {
    const sock = fakeSocket()
    sockets.push(sock as any)
    game.players.push({
      id: `player-${i}`,
      name: `Player ${i}`,
      mood: '😀',
      webSocket: sock as any,
      previousScoresAndGuesses: [],
      currentGuess: undefined,
    })
  }
  return { game, sockets }
}
```

### Step 4: Phase transition tests — `src/server/play.test.ts`

Tests for `onTickGame`:

| # | Test | Setup | Assert |
|---|------|-------|--------|
| 1 | LOBBY countdown decrements | `phase.secsLeft = 2` | `secsLeft` decreased |
| 2 | LOBBY countdown hits 0 → GUESSES | `phase.secsLeft = 0.05`, delta covers it | `phase.type === 'GUESSES'` |
| 3 | LOBBY no countdown stays put | `phase.secsLeft = undefined` | phase unchanged |
| 4 | GUESSES timer decrements | `phase.secsLeft = 10` | `secsLeft` decreased |
| 5 | GUESSES timer hits 0 → SCORES | `phase.secsLeft = 0.05` | `phase.type === 'SCORES'` |
| 6 | SCORES timer decrements | `phase.secsLeft = 10` | `secsLeft` decreased |
| 7 | SCORES timer hits 0, more rounds → GUESSES | `round = 0, secsLeft = 0.05` | `phase.type === 'GUESSES'`, `phase.round === 1` |
| 8 | SCORES timer hits 0, last round → LOBBY | `round = 9, secsLeft = 0.05` | `phase.type === 'LOBBY'` |
| 9 | Phase transitions broadcast to players | any transition | `socket.sent.length > 0` |

### Step 5: Message flow tests — `src/server/messages.test.ts`

Tests for `onClientMessage`:

| # | Test | Message | Assert |
|---|------|---------|--------|
| 1 | JOIN_LOUNGE adds to lounge | `JOIN_LOUNGE` | `state.lounge.has(playerId)` |
| 2 | NEW_GAME creates game | `NEW_GAME` | `state.games.size === 1` |
| 3 | SUBSCRIBE_GAME joins existing game | `SUBSCRIBE_GAME` | game has 2 players |
| 4 | SUBSCRIBE_GAME reconnects existing player | same playerId twice | player count still 1, webSocket updated |
| 5 | READY all ready starts countdown | 2 players both READY | `phase.secsLeft !== undefined` |
| 6 | READY un-ready cancels countdown | ready then un-ready | `phase.secsLeft === undefined` |
| 7 | READY single player can't start | 1 player READY | `phase.secsLeft === undefined` |
| 8 | GUESS records guess | `GUESS` | `phase.guesses.has(playerId)` |

## Acceptance Criteria

- [ ] `bun run test` runs and passes
- [ ] Phase transition tests cover all 3 phase types and their edge cases
- [ ] Message flow tests cover all 6 message types
- [ ] No production code changes beyond exporting 2 functions
- [ ] Tests run in < 2 seconds

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add vitest dep + test scripts |
| `src/server/play.ts` | Export `onTickGame` and `currentGameState` |
| `src/server/test-helpers.ts` | **New** — FakeWebSocket + factory functions |
| `src/server/play.test.ts` | **New** — 9 phase transition tests |
| `src/server/messages.test.ts` | **New** — 8 message flow tests |

## References

- Brainstorm: `docs/brainstorms/2026-02-19-testing-strategy-brainstorm.md`
- scoring-sandbox test patterns: `scoring-sandbox/src/lib/scoring.test.ts`
- Game state machine: `src/server/play.ts:40-95`
- Message handler: `src/server/play.ts:97-231`
- Server types: `src/server/types.ts`
