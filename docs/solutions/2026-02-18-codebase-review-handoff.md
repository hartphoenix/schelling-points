# Codebase Review Handoff — 2026-02-18

## What Happened

Full codebase review of Schelling Points (multiplayer WebSocket guessing game). 6 parallel review agents ran against the entire codebase. 20 findings were triaged, 13 fixed in-session, 7 filed as GitHub issues (#27-#33) for human decisions.

## Architecture Snapshot

```
Client (React + useReducer)  <-- WebSocket -->  Server (Express + express-ws)
     src/client/                                      src/server/
     types.ts  (View, State)                          types.ts  (Phase, Game, State)
     mail.ts   (WebSocket Box)                        play.ts   (tick loop, message handler)
     Lounge → Lobby → Guesses → Scores               api.ts    (WS/REST/static handlers)
```

- All game state lives in-memory on the server (`State` class with `Map<GameId, Game>`)
- Client is a state machine driven by `useReducer` over `ToClientMessage` from the server
- Shared types in `src/types.ts` define the wire protocol (`ToServerMessage` / `ToClientMessage`)
- Server tick loop (`setInterval` at 100ms) drives phase transitions via timers

## Bug Patterns Found

### 1. Missing serialization boundary
`api.ts` cast a raw WebSocket `Buffer` directly to `ToServerMessage` without `JSON.parse`. Every message silently failed. **Pattern:** Always parse at system boundaries, never trust a cast across I/O.

### 2. Unbound method reference
`state.games.has` was passed as a callback, losing its `this` binding. Crashed at runtime. **Pattern:** Arrow functions or `.bind()` when passing methods as callbacks.

### 3. Hardcoded placeholder values in phase transitions
`round: 0` was hardcoded instead of `phase.round` when transitioning GUESSES→SCORES. Caused infinite games. **Pattern:** When copying fields between phase objects, derive from the source — don't use literals.

### 4. Shared switch-case scope
All cases in `onClientMessage` shared a single scope, forcing unique variable names (`game`, `lobbyGame`, `scoreGame`). Fixed with block braces `{}` on every case.

### 5. Silent error swallowing
9 guard clauses had empty `// TODO:` comments. No logging meant debugging was impossible. All now have `console.warn` with context.

### 6. Client state clobbering
`MEMBER_CHANGE` was used for both lounge and game contexts (distinguished by `gameId`), but client ignored the `gameId` and blindly overwrote `otherPlayers`. Fixed by filtering on current view context.

### 7. Missing function call
`play.startTicking()` was exported but never called. The entire game timer system was inert.

## Naming Convention Established

- **Server internal state:** `name` (short, on `PlayerInfo` and `LoungeInfo`)
- **Wire protocol:** `playerName` (explicit, on all `ToServerMessage` variants)
- Translation happens at the boundary in `play.ts` (e.g., `name: message.playerName`)

## What's Fixed (13 items)

All in working tree, not yet committed:
- `api.ts`: JSON.parse + playerId-to-socket binding + close handler
- `server.ts`: startTicking call
- `play.ts`: Map.has binding, round counter, broadcastLoungeChange scoping, min-2-player guard, countdown cancel, block-scoped cases, newGuessPhase helper, memberChangeMessage method, console.warn on all guards, LoungeInfo.name standardization
- `client.tsx`: LOBBY_COUNTDOWN wired, MEMBER_CHANGE filtered by gameId
- `client/types.ts`: localStorage persistence for playerId/playerName, secsLeft on LOBBY view
- `client/Lobby.tsx`: countdown display, secsLeft prop
- `client/Lounge.tsx`: localStorage save on join, fixed SET_MOOD comment to SET_PLAYER_INFO
- `types.ts`: SUBSCRIBE_GAME.playerName typed as PlayerName

## What Needs Human Decisions (7 GitHub issues)

| Issue | Decision |
|-------|----------|
| #27 | Scoring algorithm (formula, normalization, no-answer handling) |
| #28 | Category list and selection method |
| #29 | Game creation flow (auto-subscribe? game discovery?) |
| #30 | Scores view UX (guess reveal, game-over, timer) |
| #31 | Disconnect handling (grace period? reconnection?) |
| #32 | Dead code triage (what's scaffolding vs truly dead) |
| #33 | Tuple vs object wire format |

## Still Unimplemented (blocked on human decisions)

- Scoring (`play.ts:61` — still `new Map()`)
- Categories (`play.ts:50,86` — still `'animals'`)
- Guess reveal (SCORE_STATE doesn't include guesses)
- Cumulative scoring across rounds
- Game-over screen
- Disconnect cleanup
- Mood picker UI

## Key Files by Change Frequency

These are the files that get touched most during feature work:
- `src/server/play.ts` — game logic hub, will grow significantly with scoring/categories
- `src/types.ts` — wire protocol, changes here ripple to both client and server
- `src/client.tsx` — reducer, needs updating for every new message type
- `src/server/types.ts` — Phase/Game/State, changes with every server feature

## Repo Conventions Observed

- `bun` runtime
- No test suite yet
- Flat file structure (no deep nesting)
- Todo tracking in `.claude/todos/` with YAML frontmatter
- GitHub project board at `github.com/users/thrialectics/projects/1`
- `scoring-sandbox/` directory exists — unclear if it should inform scoring implementation
