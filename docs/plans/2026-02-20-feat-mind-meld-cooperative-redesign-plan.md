---
title: "feat: Mind Meld — Cooperative Game Redesign"
type: feat
status: active
date: 2026-02-20
brainstorm: docs/brainstorms/mind-meld-spec.md
branch: hart/mind-meld
---

# Mind Meld — Cooperative Game Redesign

## CRITICAL BUILD RULES

> **NO PULL REQUESTS until the entire build + review phase is complete.**
>
> Working agents: **DO NOT** open PRs. Do not run `gh pr create`. Do not
> push to any branch other than `hart/mind-meld`. All work happens on the
> `hart/mind-meld` feature branch. PRs will be opened **only after**
> `/workflows:review` completes across all phases.
>
> **This is a hard constraint, not a suggestion. Violating this rule
> invalidates the work.**

---

## Overview

Redesign Schelling Points from a competitive individual-scoring game into
a cooperative "Mind Meld" game. Players submit words to a shared prompt.
The group's semantic centroid is computed and resolved to the nearest real
English word, which becomes the next prompt. The group wins when everyone
submits the same word. Soft loss after 20 rounds with option to continue.

**Source spec:** `docs/brainstorms/mind-meld-spec.md`

---

## Architecture Impact

This is a **full redesign** of the core game loop, not an additional game
mode. All changes happen in-place — the competitive scoring flow is
replaced by the cooperative Mind Meld flow.

**What changes:**
- Game loop: 3-phase (LOBBY → GUESSES → SCORES) becomes 4-phase
  (LOBBY → GUESSES → REVEAL → repeat | CONTINUE | GAME_END)
- Scoring: still computes embeddings + centroid, but adds nearest-word
  resolution and meld detection. Individual scores computed silently,
  not displayed.
- Wire protocol: SCORE_STATE → REVEAL_STATE, GUESS_STATE gains `prompt`,
  new messages GAME_END and CONTINUE_PROMPT
- Config: 20 rounds (was 10), 10s guess timer (was 25), 3s reveal timer
  (was 25)
- New infrastructure: vocab embedding cache, Porter stemmer

**What stays:**
- Lobby flow (unchanged)
- WebSocket architecture (broadcast + unicast)
- Embedding pipeline (Ollama + nomic-embed-text)
- Scatter plot visualization (positions)
- `cosineSimilarity()`, `centroid()`, `fetchEmbeddings()`
- Player management, reconnection, lounge

**Key files affected:**

| File | Impact |
|------|--------|
| `src/config.ts` | Modified — new constants, renamed constants |
| `src/types.ts` | Modified — wire protocol changes |
| `src/server/types.ts` | Modified — Phase union, Game fields |
| `src/server/play.ts` | Modified — phase transitions, message handlers |
| `src/server/scoring.ts` | Modified — ScoringResult, vocab integration |
| `src/client.tsx` | Modified — reducer for new message types |
| `src/client/types.ts` | Modified — View type updates |
| `src/client/Guesses.tsx` | Modified — prompt display |
| `src/client/Scores.tsx` | Replaced by Reveal.tsx |
| `src/server/vocab.ts` | **New** — vocab loading + nearest-word lookup |
| `src/server/stemmer.ts` | **New** — Porter stemmer |
| `src/client/Reveal.tsx` | **New** — centroid reveal screen |
| `src/client/GameEnd.tsx` | **New** — meld celebration / continue prompt |
| `scripts/build-vocab-embeddings.ts` | **New** — one-time build script |

---

## Spec Gaps & Resolutions

Issues identified during SpecFlow analysis that the brainstorm doesn't
fully address:

### 1. Zero valid submissions

**Gap:** All players repeat the prompt or don't submit. No embeddings to
compute, no centroid.

**Resolution:** Treat identically to scoring failure — keep current
prompt, don't burn a round, log server-side. The game retries with the
same prompt.

### 2. Centroid resolves to the prompt word itself

**Gap:** The nearest word in the 10k vocab could be the prompt itself.

**Resolution:** Accept it. The "again" indicator communicates the repeat.
Filtering the prompt from nearestWord results adds complexity for a rare
edge case. Players will naturally diverge on the next round.

### 3. SCORES_READY → REVEAL_READY

**Gap:** The spec renames SCORE_STATE → REVEAL_STATE but doesn't mention
the client → server SCORES_READY message.

**Resolution:** Rename to `REVEAL_READY` for consistency. Update both
`ToServerMessage` type and the handler in `play.ts`.

### 4. RoundScore.category field

**Gap:** The `RoundScore` interface stores `category: string`. In Mind
Meld, rounds after round 1 have no category — they have a prompt word.

**Resolution:** Rename the field to `prompt` in `RoundScore`. Store the
prompt word (category text for round 1, centroid word for subsequent
rounds). Internal-only change, no wire protocol impact.

### 5. Round indexing

**Gap:** Code uses 0-indexed rounds (0–9). Spec describes "round 20" in
1-indexed user-facing terms.

**Resolution:** Keep 0-indexed internally. The round-20 check is
`round + 1 >= MAX_ROUNDS` (same pattern as current `round + 1 >= ROUNDS_PER_GAME`
on play.ts:333). Wire protocol sends `round` (0-indexed) and
`totalRounds` (20). Client displays `round + 1`.

### 6. ScatterPlot reuse

**Gap:** The `ScatterPlot` component is currently defined inside
`Scores.tsx`. The new Reveal component needs it too.

**Resolution:** Extract `ScatterPlot` to `src/client/components/ScatterPlot.tsx`
during Phase 5 (Client UI), then import into Reveal.tsx.

### 7. Scoring infrastructure resilience

**Gap:** If Ollama is completely down, the scoring failure fallback
retries indefinitely (same prompt each round, timer expires, scoring
fails, repeat forever).

**Resolution:** Add a max-retry counter per round. After 3 consecutive
scoring failures on the same round, end the game gracefully — send
GAME_END with `melded: false` and transition to LOBBY. Add
`MAX_SCORING_RETRIES = 3` to config.ts (Phase 2).

### 8. Timer values are playtesting targets

**Note:** 10s guess / 3s reveal are starting points, not final values.
The game designer flagged that 3s reveal may be too tight for players to
process the centroid word + scatter plot. All values live in `config.ts`
for easy tuning after playtesting. Working agents should implement the
spec values; tuning happens post-build.

---

## Decision Points

### Stemmer: implement vs. package

The spec says "Implement Porter stemmer in its own module." Porter
stemmer is ~200 lines of rule-based string manipulation with 5 steps
and many edge cases. Getting it wrong means valid melds are silently
missed.

**Options:**
1. **Use `stemmer` npm package** (recommended) — 2KB, well-tested
   Porter2 implementation. Install with `bun add stemmer`. Wrap in
   `src/server/stemmer.ts` for a clean interface.
2. **Implement from scratch** — educational value, but correctness risk.
   Would need thorough test coverage of edge cases.

**Recommendation:** Option 1. "Keep dependencies minimal until there's a
real reason" — correctness of a non-trivial algorithm IS a real reason.
The module still gets its own file with a clean interface for meld
comparison.

**Decision: Option 1 (stemmer package).** Implemented in Phase 1 —
`src/server/stemmer.ts` wraps `stemmer@2.0.1` (Porter2).

---

## Implementation Phases

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5
Infra        Scoring      Core Loop    CONTINUE     Client UI
(new files)  (modify)     (modify)     (add-on)     (frontend)
```

Each phase = one `/workflows:work` pass. Each phase must compile and
pass existing tests before the next phase begins.

> **Reminder to working agents:** DO NOT open PRs. All commits go to
> `hart/mind-meld`. No `gh pr create`. No pushing to other branches.

---

### Phase 1: Infrastructure & Utilities

**Scope:** New files only. Zero modifications to existing code.

**Files to create:**
- `data/google-10000-english-no-swears.txt` — vendor the word list
  (download from `https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt`)
- `scripts/build-vocab-embeddings.ts` — one-time Bun script
- `src/server/vocab.ts` — `loadVocab()`, `nearestWord()`
- `src/server/stemmer.ts` — stemmer wrapper (package or from-scratch per decision above)
- `src/server/vocab.test.ts` — unit tests
- `src/server/stemmer.test.ts` — unit tests

**Files to modify:**
- `.gitignore` — add `data/vocab-embeddings.json`

#### Sub-tasks

1. **Download word list**
   ```bash
   curl -o data/google-10000-english-no-swears.txt \
     https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt
   ```

2. **Build script** (`scripts/build-vocab-embeddings.ts`)
   - Read word list file, filter empty lines
   - Batch words (500 per request) through Ollama `/api/embed`
   - Use same `nomic-embed-text` model from config
   - Write output to `data/vocab-embeddings.json`:
     ```json
     { "model": "nomic-embed-text", "words": [...], "vectors": [[...], ...] }
     ```
   - Run with `bun run scripts/build-vocab-embeddings.ts`
   - Expected: ~30MB output, ~5-15s on M-series Mac

3. **Vocab module** (`src/server/vocab.ts`)
   ```ts
   interface Vocab { words: string[]; vectors: number[][] }
   function loadVocab(): Vocab    // throws with instructions if file missing
   function nearestWord(centroidVec: number[], vocab: Vocab): string
   ```
   - `nearestWord` uses `cosineSimilarity` from `scoring.ts`
   - Returns word with highest similarity to input vector

4. **Stemmer module** (`src/server/stemmer.ts`)
   - Export: `function stem(word: string): string`
   - Applies: `trim()` → `toLowerCase()` → Porter stem
   - If using package: `import { stemmer } from 'stemmer'` wrapped in
     the `stem()` function

5. **Tests**
   - `vocab.test.ts`: test `nearestWord` with mock vectors (don't need
     real embeddings — just verify it returns the word with highest
     cosine similarity)
   - `stemmer.test.ts`: test common cases — plurals (dogs→dog),
     gerunds (running→run), identity (cat→cat)

6. **`.gitignore`** — add `data/vocab-embeddings.json`

#### Acceptance Criteria

- [x] Word list file exists at `data/google-10000-english-no-swears.txt`
- [x] Build script runs successfully (requires Ollama + nomic-embed-text)
- [x] `loadVocab()` loads JSON, throws clear error if file missing
- [x] `nearestWord()` returns correct word for known vectors
- [x] `stem()` handles common English word forms
- [x] All new tests pass (`bun test`)
- [x] `data/vocab-embeddings.json` in `.gitignore`
- [x] No existing code modified

#### Agent Instructions

- **DO NOT** open a PR. Commit to `hart/mind-meld` only.
- Run `bun test` to verify tests pass before committing.
- The build script is a developer tool — it doesn't need to be
  production-quality, just correct and clear.

---

### Phase 2: Scoring Pipeline & Config

**Scope:** Modify scoring to produce centroidWord. Add meld detection
and prompt repetition filtering. Update game config.

**Dependencies:** Phase 1 (vocab.ts, stemmer.ts)

**Files to modify:**
- `src/config.ts` — new/renamed constants
- `src/server/scoring.ts` — ScoringResult, scoreGuesses signature

**Files to create:**
- `src/server/meld.ts` — meld detection + prompt filtering
- `src/server/meld.test.ts` — tests

#### Sub-tasks

1. **Config changes** (`src/config.ts`)
   ```ts
   // Rename/update:
   export const MAX_ROUNDS = 20           // was ROUNDS_PER_GAME = 10
   export const GUESS_SECS = 10           // was 25
   export const REVEAL_SECS = 3           // was SCORE_SECS = 25
   export const MAX_SCORING_RETRIES = 3   // NEW — end game after this many consecutive failures
   // Keep LOBBY_COUNTDOWN_SECS = 3 unchanged
   // Remove DIFFICULTY_SCHEDULE (no longer used)
   // Keep ROUNDS_PER_GAME temporarily as alias if needed for compilation,
   //   but prefer updating all references to MAX_ROUNDS
   ```

2. **ScoringResult update** (`src/server/scoring.ts`)
   ```ts
   export interface ScoringResult {
     scores: Map<PlayerId, number>
     positions: Map<PlayerId, [number, number]>
     centroidWord: string              // NEW
   }
   ```
   - `scoreGuesses` gains a `vocab: Vocab` parameter
   - After computing `cent` (centroid vector), call
     `nearestWord(cent, vocab)` to get centroidWord
   - Return centroidWord in the result
   - Handle edge cases: 0 entries → centroidWord = '' (caller handles);
     1 entry → centroidWord = that word itself (no centroid needed)
   - **Keep `similarityToScore()`** in code (spec says don't delete)

3. **Meld detection** (`src/server/meld.ts`)
   ```ts
   import { stem } from './stemmer'

   export function filterPromptRepetitions(
     guesses: Map<PlayerId, string>,
     prompt: string
   ): Map<PlayerId, string>
   // Returns guesses with prompt-repeaters removed.
   // Uses stem() to compare: stem(guess) === stem(prompt) → filtered out.

   export function detectMeld(validGuesses: Map<PlayerId, string>): boolean
   // Returns true if: validGuesses.size >= 2 AND all stemmed forms identical.
   ```

4. **Tests** (`src/server/meld.test.ts`)
   - `filterPromptRepetitions`: filters "blue" when prompt is "blue",
     filters "Blues" (case), filters "blued" (stem match), keeps "red"
   - `detectMeld`: true for ["dog", "dogs"], true for ["Running", "running"],
     false for ["cat", "dog"], false for single submission, false for empty

5. **Update references** — search codebase for `ROUNDS_PER_GAME`,
   `SCORE_SECS`, and update to `MAX_ROUNDS`, `REVEAL_SECS`. Update
   `play.ts` references (these will be further modified in Phase 3, but
   rename now so compilation works).

#### Acceptance Criteria

- [x] `ScoringResult` includes `centroidWord: string`
- [x] `scoreGuesses()` accepts `vocab` param and returns centroidWord
- [x] `filterPromptRepetitions()` correctly filters prompt-matching guesses
- [x] `detectMeld()` correctly detects when all stemmed submissions match
- [x] Config updated: `MAX_ROUNDS=20`, `GUESS_SECS=10`, `REVEAL_SECS=3`
- [x] All references to old constant names updated
- [x] All tests pass (`bun test`)
- [x] Project compiles (`bun run build` or `bunx tsc --noEmit`)

#### Phase 2 → Phase 3 Bridge: Vocab Parameter

Phase 2 changes `scoreGuesses` to accept `vocab`. But the call site in
`play.ts` (`scoreRound`, line 293) doesn't have a vocab instance yet —
`State.vocab` is added in Phase 3.

**Solution:** Make `vocab` an optional parameter in Phase 2:
```ts
export async function scoreGuesses(
  guesses: Map<PlayerId, string>,
  vocab?: Vocab
): Promise<ScoringResult>
```

When `vocab` is undefined, skip `nearestWord` and return
`centroidWord: ''`. This keeps play.ts compiling in Phase 2 (no change
to the call site needed). Phase 3 always passes `state.vocab`, so the
optional path becomes dead code — but it's harmless and avoids a
compilation gap between phases.

#### Agent Instructions

- **DO NOT** open a PR. Commit to `hart/mind-meld` only.
- When updating `play.ts` references to config constants, make the
  minimum changes needed for compilation. Phase 3 will restructure
  the game logic.
- **DO NOT** modify the `scoreRound` call site in `play.ts` to pass
  vocab. Leave it calling `scoreGuesses(guesses)` — the optional
  parameter means it still compiles. Phase 3 handles the vocab
  plumbing.

---

### Phase 3: Core Server Game Loop

**Scope:** Wire protocol changes. Phase transitions. Centroid-as-prompt
cycling. Meld win condition. GAME_END. Scoring failure fallback.

This is the largest phase. Work through sub-tasks in order.

**Dependencies:** Phase 2 (scoring with centroidWord, meld detection, config)

**Files to modify:**
- `src/types.ts` — wire protocol (ToServerMessage, ToClientMessage)
- `src/server/types.ts` — Phase union, Game class, RoundScore
- `src/server/play.ts` — phase transitions, handlers, tick loop
- `src/server.ts` — load vocab at startup, pass to play functions

**Files to create/modify:**
- `src/server/play.test.ts` — update existing tests for new flow

#### Sub-tasks

##### 3a. Wire Protocol Types (`src/types.ts`)

Update `ToClientMessage`:
```ts
// REMOVE:
| { type: 'SCORE_STATE', ... }

// ADD:
| { type: 'GUESS_STATE', gameId: GameId, prompt: string, hasGuessed: [...], secsLeft, round, totalRounds }
  // ^ replace `category: string` with `prompt: string`

| { type: 'REVEAL_STATE', gameId: GameId, centroidWord: string, centroidIsRepeat: boolean,
    positions: [PlayerId, number, number][], guesses: [PlayerId, string][],
    melded: boolean, round: number, totalRounds: number, secsLeft: number,
    isReady: [PlayerId, boolean][] }
  // ^ replaces SCORE_STATE. No playerScores field.

| { type: 'GAME_END', gameId: GameId, melded: boolean, meldRound: number | null,
    centroidHistory: string[], playerHistory: [string, string][] }
  // ^ unicast per player. playerHistory = [playerGuess, centroidWord] per round.

| { type: 'CONTINUE_PROMPT', gameId: GameId, centroidHistory: string[],
    playerHistory: [string, string][] }
  // ^ unicast per player at round 20.
```

Update `ToServerMessage`:
```ts
// REMOVE:
| { type: 'SCORES_READY', ... }

// ADD:
| { type: 'REVEAL_READY', gameId: GameId, playerId: PlayerId, isReady: boolean }
  // ^ replaces SCORES_READY

| { type: 'CONTINUE_VOTE', gameId: GameId, playerId: PlayerId, continuePlay: boolean }
  // ^ new: player votes to keep going or leave at round 20
```

##### 3b. Server Types (`src/server/types.ts`)

Update `Phase` union:
```ts
export type Phase =
  | { type: 'LOBBY', secsLeft?: number, isReady: Set<PlayerId> }
  | { type: 'GUESSES', round: number, prompt: string, secsLeft: number,
      guesses: Map<PlayerId, string> }
    // ^ `category` → `prompt`
  | { type: 'REVEAL', round: number, prompt: string, isReady: Set<PlayerId>,
      secsLeft: number, scores: Map<PlayerId, number>,
      positions: Map<PlayerId, [number, number]>,
      guesses: Map<PlayerId, string>, centroidWord: string,
      melded: boolean }
    // ^ was SCORES. Gains centroidWord, melded. Keeps scores (computed but not sent).
    // NOTE: centroidIsRepeat is NOT stored here — compute fresh in
    // currentGameState() via game.centroidHistory.slice(0,-1).includes(centroidWord)
  | { type: 'CONTINUE', isLeaving: Set<PlayerId>, isContinuing: Set<PlayerId> }
    // ^ new: round 20 voting phase
```

Update `Game` class:
```ts
class Game {
  // Existing fields (keep):
  players: PlayerInfo[]
  phase: Phase
  previousScores: RoundScore[]
  scoringInProgress: boolean

  // Remove:
  categoryQueues  // no longer needed (single random category)

  // Add:
  centroidHistory: string[]    // centroid word per completed round
  currentPrompt: string        // current round's prompt word
  scoringRetries: number       // consecutive scoring failures on current round (reset on success)

  // Existing methods (keep): unicast, broadcast, memberChangeMessage
}
```

Update `RoundScore`:
```ts
export interface RoundScore {
  prompt: string              // was `category`
  guessesAndScores: [PlayerId, string, number][]
}
```

##### 3c. Category Simplification + newGuessPhase Rename

In `play.ts`, replace `pickCategory()` with simple random selection:
```ts
function pickRandomPrompt(categories: Category[]): string {
  const idx = Math.floor(Math.random() * categories.length)
  return categories[idx].prompt
}
```
Used only for round 1. Remove `fillQueue`, `DIFFICULTY_SCHEDULE` usage,
and `game.categoryQueues`.

Rename `newGuessPhase(round, category)` → `newGuessPhase(round, prompt)`:
```ts
function newGuessPhase(round: number, prompt: string): Phase {
  return {
    type: 'GUESSES', round, prompt,
    secsLeft: config.GUESS_SECS, guesses: new Map(),
  }
}
```
Phase 4 calls `newGuessPhase(round, game.currentPrompt)` — this
signature must be stable.

##### 3d. Core Round Cycling

Modify `play.ts` phase transitions:

1. **LOBBY → GUESSES:** Pick random category prompt for round 1. Set
   `game.currentPrompt`. Initialize `game.centroidHistory = []`.
   Initialize `game.scoringRetries = 0`.

2. **GUESSES timer/all-guessed → scoring** (in `scoreRound`):
   - Call `filterPromptRepetitions(guesses, game.currentPrompt)` to
     get `validGuesses`
   - **If `validGuesses.size === 0`:** all players repeated the prompt.
     Treat as scoring failure (see 3f) — do NOT call `scoreGuesses`.
   - Otherwise: pass `validGuesses` to `scoreGuesses(validGuesses, state.vocab)`
   - **Meld detection uses `validGuesses`** (after filtering), not the
     original guesses. A player who repeated the prompt does not block
     a meld if everyone else converged.

3. **Scoring complete → REVEAL** (strict ordering in `scoreRound`):
   ```
   a. Get centroidWord from ScoringResult
   b. Push centroidWord to game.centroidHistory  ← BEFORE storing round results
   c. Call detectMeld(validGuesses) → melded
   d. Store round results in previousScores and player.previousScoresAndGuesses
   e. Reset game.scoringRetries = 0
   f. Transition to REVEAL phase
   ```
   This ordering ensures `centroidHistory[i]` aligns with
   `previousScoresAndGuesses[i]` when building playerHistory later.
   **`centroidIsRepeat`** is NOT stored on the Phase object — compute
   it fresh when building REVEAL_STATE in `currentGameState`:
   `game.centroidHistory.slice(0, -1).includes(centroidWord)`

4. **REVEAL timer/all-ready → next round** (in `goToNextRound`):
   - If `melded`: call `endGame(gameId, game, state, true, round)` (see 3e)
   - If `round + 1 >= MAX_ROUNDS` and not melded: end the game too
     (Phase 4 changes this to enter CONTINUE phase instead)
   - Otherwise: set `game.currentPrompt = phase.centroidWord`, start
     next GUESSES phase with `round + 1`

##### 3e. Game End Helpers (Extract as Reusable Functions)

**Phase 4 reuses these helpers.** Extract them as named functions in
`play.ts`, not inline code.

```ts
function buildPlayerHistory(
  player: PlayerInfo,
  game: Game
): [string, string][] {
  return player.previousScoresAndGuesses.map(([_score, guess], i) =>
    [guess, game.centroidHistory[i] ?? ''])
}

function endGame(
  gameId: GameId,
  game: Game,
  state: State,
  melded: boolean,
  meldRound?: number
) {
  // 1. Unicast GAME_END to each player
  for (const player of game.players) {
    game.unicast(player.id, {
      type: 'GAME_END',
      gameId,
      melded,
      meldRound: melded ? (meldRound ?? null) : null,
      centroidHistory: [...game.centroidHistory],
      playerHistory: buildPlayerHistory(player, game),
    })
  }

  // 2. Move all players to lounge (server-side, so they're
  //    in a valid state even if they disconnect before tapping
  //    "Back to Lounge")
  for (const player of game.players) {
    state.lounge.set(player.id, {
      name: player.name,
      mood: player.mood,
      webSocket: player.webSocket,
    })
  }

  // 3. Delete the game from state.games
  state.games.delete(gameId)

  // 4. Broadcast lounge change (existing loungers see new players)
  state.broadcastLoungeChange()

  // DO NOT broadcast LOBBY_STATE — players are viewing the
  // GAME_END screen. They transition to LOUNGE when they tap
  // "Back to Lounge" (which sends JOIN_LOUNGE).
}
```

**Why delete the game instead of transitioning to LOBBY:**
The client reducer processes messages in order. If we sent GAME_END
then LOBBY_STATE, the LOBBY_STATE would overwrite the GAME_END
celebration screen. Deleting the game and moving players to lounge
avoids this race. The GAME_END screen has a "Back to Lounge" button
that sends JOIN_LOUNGE when tapped.

##### 3e-ii. JOIN_LOUNGE Response

The current `JOIN_LOUNGE` handler in `play.ts` adds the player to
the lounge but **never sends a LOUNGE message back to that player**.
This means the client has no way to transition from GAME_END view to
LOUNGE view via a server message.

**Fix:** After adding the player to the lounge, unicast a LOUNGE
message to them:
```ts
case 'JOIN_LOUNGE': {
  state.lounge.set(message.playerId, { ... })
  // Send LOUNGE to the joining player so their reducer
  // transitions to LOUNGE view
  webSocket.send(JSON.stringify({
    type: 'LOUNGE',
    loungingPlayers: [...state.lounge.entries()].map(
      ([id, info]) => [id, info.name, info.mood]
    ),
  }))
  state.broadcastLoungeChange()
  break
}
```

This is needed for the GAME_END → "Back to Lounge" → LOUNGE flow.
Without it, the client can send JOIN_LOUNGE but never receives a
message that changes its view.

##### 3f. Scoring Failure Fallback

In `scoreRound`, on catch (or when `validGuesses.size === 0`):
- Keep `game.currentPrompt` unchanged
- Do NOT push to `centroidHistory`
- Do NOT push to `previousScores` or `player.previousScoresAndGuesses`
- Increment `game.scoringRetries`
- **If `game.scoringRetries >= MAX_SCORING_RETRIES` (3):** end the game
  gracefully — send GAME_END with `melded: false`, transition to LOBBY.
  This prevents infinite retry loops when Ollama is down.
- **Otherwise:** transition back to a fresh GUESSES phase with the same
  `round` number and same `prompt`. Reset `secsLeft` to `GUESS_SECS`
  (timer restarts). Clear `guesses` (new empty Map — players re-submit).
  Log the error server-side with context (round, retry count).

```ts
// Explicit retry:
game.phase = {
  type: 'GUESSES',
  round: phase.round,        // same round number
  prompt: game.currentPrompt, // same prompt
  secsLeft: config.GUESS_SECS, // fresh timer
  guesses: new Map(),         // players re-submit
}
game.scoringRetries++
game.scoringInProgress = false
game.broadcast(currentGameState(gameId, game))
```

##### 3g. `currentGameState()` Updates

Update the `currentGameState` function to build new message shapes:
- GUESSES case: return `prompt` instead of `category`, use `MAX_ROUNDS`
- REVEAL case (was SCORES): return `REVEAL_STATE` with centroidWord,
  melded. Compute `centroidIsRepeat` fresh from
  `game.centroidHistory.slice(0, -1).includes(phase.centroidWord)`.
  Drop `playerScores` from the wire message.
- CONTINUE case: `currentGameState` should NOT be called during
  CONTINUE — that phase uses per-player unicast (CONTINUE_PROMPT).
  Add the case to the switch for exhaustiveness, returning a
  LOBBY_STATE as a safe fallback (for reconnecting clients who
  arrive during CONTINUE). Document this with a comment.

##### 3h. Vocab Loading at Startup

Store vocab on the `State` object — this matches the existing pattern
where `State` already holds `categories`. This keeps the dependency
explicit and testable (no module-level singletons).

In `src/server/types.ts`, add to `State`:
```ts
class State {
  // ... existing fields ...
  vocab: Vocab   // NEW — loaded once at startup
}
```

In `src/server.ts`, load vocab at startup and pass to State constructor:
```ts
import { loadVocab } from './server/vocab'
const vocab = loadVocab()
const state = new State(nameChooser, categories, vocab)
```

##### 3i. Parameter Threading in play.ts

`scoreRound` is called from two places:
1. `onTickGame` (timer expired) — currently has `categories` param
2. `onClientMessage` GUESS handler (all guessed) — has `state` directly

**Recommended approach:** Pass `state` to `onTickGame` instead of
individual fields. This gives `onTickGame` access to both
`state.categories` and `state.vocab`, and passes them through to
`scoreRound` and `goToNextRound`.

Current call chain:
```
onTick(state) → onTickGame(gameId, game, t, dt, categories)
  → scoreRound(gameId, game) — no access to vocab!
  → goToNextRound(gameId, game, categories)
```

New call chain:
```
onTick(state) → onTickGame(gameId, game, t, dt, state)
  → scoreRound(gameId, game, state) — accesses state.vocab
  → goToNextRound(gameId, game, state) — accesses state.categories
  → endGame(gameId, game, state, ...) — accesses state.lounge, state.games
```

This also enables `endGame` (3e) to access `state.lounge` and
`state.games` for cleanup. Update all function signatures accordingly.

#### Acceptance Criteria

- [ ] Project compiles with all new types
- [ ] Round cycling works: LOBBY → GUESSES → REVEAL → GUESSES → ...
- [ ] Centroid word becomes next round's prompt
- [ ] Meld detected → REVEAL plays → GAME_END unicast → LOBBY
- [ ] Round 20 without meld → GAME_END (Phase 4 changes this to CONTINUE)
- [ ] Scoring failure → retry same prompt, same round number
- [ ] Zero valid submissions → same as scoring failure
- [ ] `centroidHistory` tracks all centroid words
- [ ] `GAME_END` includes per-player history
- [ ] `centroidIsRepeat` correctly flags repeat words
- [ ] Old `SCORE_STATE` / `SCORES_READY` fully removed
- [ ] All tests pass

#### Agent Instructions

- **DO NOT** open a PR. Commit to `hart/mind-meld` only.
- This is the largest phase. Work through sub-tasks 3a → 3i in order.
  Commit after each sub-task if possible.
- When updating `currentGameState`, be careful with the switch
  exhaustiveness — all Phase types must be handled.
- For Phase 4's CONTINUE phase: at this point, just end the game at
  round 20 (call `endGame()`). Phase 4 changes this to enter CONTINUE.
- `endGame()` and `buildPlayerHistory()` must be extracted as named
  functions (not inline) — Phase 4 reuses them.
- `checkContinueVotes()` is defined in Phase 4 but references
  `endGame()` and `newGuessPhase()` from Phase 3. Ensure these are
  available (exported or in same module).
- `currentGameState` returns broadcast messages. GAME_END is unicast —
  handle in `endGame()` directly, not through `currentGameState`.
- Pass `state` through the call chain (`onTickGame`, `scoreRound`,
  `goToNextRound`) so all functions can access `state.vocab`,
  `state.categories`, `state.lounge`, and `state.games`.

---

### Phase 4: CONTINUE Phase (Round 20+ Continuation)

**Scope:** Add the round-20 voting mechanic. Players choose to keep
going or leave.

**Dependencies:** Phase 3 (core game loop must be working)

**Files to modify:**
- `src/server/play.ts` — CONTINUE transition, CONTINUE_VOTE handler,
  tick loop update. Export `checkContinueVotes` for api.ts.
- `src/server/api.ts` — disconnect handler for game players during
  CONTINUE phase
- `src/server/types.ts` — (CONTINUE phase type already defined in Phase 3)
- `src/types.ts` — (CONTINUE_VOTE, CONTINUE_PROMPT already defined in Phase 3)

**Provided by Phase 3 (must exist):**
- `endGame()` helper — for ending the game when <2 players remain
- `buildPlayerHistory()` helper — for building CONTINUE_PROMPT data
- `newGuessPhase(round, prompt)` — for starting round 21+
- `currentGameState()` — handles all Phase types including CONTINUE
- CONTINUE phase type in Phase union
- CONTINUE_VOTE and CONTINUE_PROMPT message types

#### Sub-tasks

1. **Round-20 transition** — In `goToNextRound`, change the round-20
   behavior from GAME_END to entering CONTINUE phase:
   ```ts
   if (round + 1 >= MAX_ROUNDS && !phase.melded) {
     game.phase = {
       type: 'CONTINUE',
       isLeaving: new Set(),
       isContinuing: new Set(),
     }
     // Unicast CONTINUE_PROMPT to each player
     for (const player of game.players) {
       const playerHistory = buildPlayerHistory(player, game)
       game.unicast(player.id, {
         type: 'CONTINUE_PROMPT',
         gameId,
         centroidHistory: game.centroidHistory,
         playerHistory,
       })
     }
   }
   ```

2. **CONTINUE_VOTE handler** — In `onClientMessage`, add case:
   ```ts
   case 'CONTINUE_VOTE': {
     const game = state.games.get(message.gameId)
     if (!game || game.phase.type !== 'CONTINUE') break

     if (message.continuePlay) {
       game.phase.isContinuing.add(message.playerId)
     } else {
       game.phase.isLeaving.add(message.playerId)
       // "I'm out" mechanic — move player from game to lounge:
       const player = game.players.find(p => p.id === message.playerId)
       if (player) {
         // 1. Remove from game.players
         game.players = game.players.filter(p => p.id !== message.playerId)
         // 2. Add to lounge
         state.lounge.set(message.playerId, {
           name: player.name,
           mood: player.mood,
           webSocket: player.webSocket,
         })
         // 3. Unicast LOUNGE to departing player (transitions their view)
         const loungeMsg: t.ToClientMessage = {
           type: 'LOUNGE',
           loungingPlayers: [...state.lounge.entries()].map(
             ([id, info]) => [id, info.name, info.mood]
           )
         }
         game.unicast(message.playerId, loungeMsg) // still has their socket
         // 4. Broadcast updates to lounge and remaining game players
         state.broadcastLoungeChange()
         game.broadcast(game.memberChangeMessage(message.gameId))
       }
     }

     // Check if all remaining players have voted
     // Note: "I'm out" players are already removed from game.players,
     // so liveIds only contains players still in the game.
     checkContinueVotes(message.gameId, game, state)
   }
   ```

   Extract vote evaluation into a helper so disconnect handler can
   reuse it:
   ```ts
   function checkContinueVotes(gameId, game, state) {
     if (game.phase.type !== 'CONTINUE') return
     const liveIds = game.players
       .filter(p => p.webSocket.readyState === WebSocket.OPEN)
       .map(p => p.id)
     const allVoted = liveIds.every(id =>
       game.phase.isContinuing.has(id))
     // Note: isLeaving players are already removed from game.players,
     // so we only check isContinuing membership for remaining players.

     if (allVoted && liveIds.length > 0) {
       if (game.phase.isContinuing.size >= 2) {
         // Continue — start round 21+ with last centroid as prompt
         const lastRound = game.centroidHistory.length - 1
         game.phase = newGuessPhase(lastRound + 1, game.currentPrompt)
         game.broadcast(currentGameState(gameId, game))
       } else {
         // Not enough players — game ends
         endGame(gameId, game, state, false)
         // endGame() deletes the game and moves players to lounge
       }
     }
   }
   ```

3. **Tick loop** — The CONTINUE phase has no timer. Add a no-op case
   in `onTickGame`:
   ```ts
   case 'CONTINUE':
     // No timer — waiting for player votes
     break
   ```

4. **Disconnect during CONTINUE** — The current WebSocket close handler
   in `api.ts` (line 26) only handles lounge players:
   ```ts
   webSocket.on('close', () => {
     // Currently only handles lounge cleanup
     if (state.lounge.has(boundId)) { ... }
   })
   ```

   **Add game-player disconnect handling for CONTINUE phase:**
   After the lounge check, search `state.games` for a game containing
   this player. If found and the game is in CONTINUE phase:
   - Remove the player from `game.players`
   - Add their ID to `game.phase.isLeaving`
   - Do NOT add them to lounge (they disconnected — no socket)
   - Call `checkContinueVotes(gameId, game, state)` to re-evaluate

   ```ts
   // In api.ts close handler, after lounge cleanup:
   for (const [gameId, game] of state.games) {
     const playerIdx = game.players.findIndex(p => p.id === boundId)
     if (playerIdx === -1) continue
     if (game.phase.type === 'CONTINUE') {
       game.players.splice(playerIdx, 1)
       game.phase.isLeaving.add(boundId)
       play.checkContinueVotes(gameId, game, state)
     }
     // Note: disconnect during other phases (GUESSES, REVEAL) is
     // handled by existing guard logic (readyState checks). No
     // special handling needed for MVP.
     break
   }
   ```

   This requires `checkContinueVotes` to be exported from `play.ts`.

#### Acceptance Criteria

- [ ] Round 20 (no meld) → CONTINUE phase, CONTINUE_PROMPT sent
- [ ] Player votes "Keep going" → tracked in `isContinuing`
- [ ] Player votes "I'm out" → removed from game, returned to lounge
- [ ] All voted + ≥2 continuing → round 21 starts
- [ ] All voted + <2 continuing → GAME_END
- [ ] Disconnect during CONTINUE → treated as leaving
- [ ] Lounge updates when players leave game
- [ ] No timer ticks during CONTINUE phase

#### Agent Instructions

- **DO NOT** open a PR. Commit to `hart/mind-meld` only.
- The CONTINUE_VOTE handler needs access to `state` (for lounge).
  `onClientMessage` already receives `state` — use it.
- Test the "I'm out" flow carefully: player removal, lounge addition,
  and broadcast updates must all happen atomically.
- The round number for continuation rounds (21+) should continue from
  where it left off. The MAX_ROUNDS constant is the soft limit, not
  a hard cap.

---

### Phase 5: Client UI

**Scope:** All frontend changes. Updated reducer, modified Guesses
screen, new Reveal and GameEnd components.

**Dependencies:** Phase 3 + Phase 4 (all server changes must be stable)

**Files to modify:**
- `src/client.tsx` — reducer for new message types, view routing
- `src/client/types.ts` — View type updates
- `src/client/Guesses.tsx` — prompt display, shorter timer

**Files to create:**
- `src/client/components/ScatterPlot.tsx` — extracted from Scores.tsx
- `src/client/Reveal.tsx` — centroid reveal screen
- `src/client/GameEnd.tsx` — meld celebration / continue prompt
- `static/styles/reveal.css` — reveal screen styles
- `static/styles/game-end.css` — game-end screen styles

**Files to remove/deprecate:**
- `src/client/Scores.tsx` — replaced by Reveal.tsx (can delete or
  leave as dead code for git history; prefer delete)

#### Sub-tasks

##### 5a. Extract ScatterPlot Component

Move `ScatterPlot` from `Scores.tsx` to `src/client/components/ScatterPlot.tsx`.
Keep the same props interface. Export as named export.

##### 5b. Client Types (`src/client/types.ts`)

Update `View` union:
```ts
export type View =
  | { type: 'LOUNGE' }
  | { type: 'LOBBY', gameId: string, isReady: [...], secsLeft?: number }
  | { type: 'GUESSES', gameId: string, hasGuessed: [...], prompt: string,
      secsLeft: number, guess?: string, round: number, totalRounds: number }
    // ^ `category` → `prompt`
  | { type: 'REVEAL', gameId: string, isReady: [...], secsLeft?: number,
      centroidWord: string, centroidIsRepeat: boolean,
      positions: [...], guesses: [...], melded: boolean,
      round: number, totalRounds: number }
    // ^ replaces SCORES view
  | { type: 'GAME_END', gameId: string, melded: boolean,
      meldRound: number | null, centroidHistory: string[],
      playerHistory: [string, string][] }
    // ^ new
  | { type: 'CONTINUE', gameId: string, centroidHistory: string[],
      playerHistory: [string, string][] }
    // ^ new
```

##### 5c. Reducer Updates (`src/client.tsx`)

Add/modify reducer cases:
- `GUESS_STATE` → use `prompt` instead of `category`
- `REVEAL_STATE` → maps to `REVEAL` view (replaces `SCORE_STATE` handler)
- `GAME_END` → maps to `GAME_END` view
- `CONTINUE_PROMPT` → maps to `CONTINUE` view
- Remove `SCORE_STATE` handler

**GAME_END view stability.** After `endGame()` runs, the server sends:
1. `GAME_END` unicast → view becomes GAME_END ✅
2. `MEMBER_CHANGE` via `broadcastLoungeChange()` — this has
   `gameId: undefined`, and the MEMBER_CHANGE handler already checks
   `message.gameId !== viewGameId` → ignored ✅

No LOUNGE message is sent by `endGame()`, so the GAME_END view is
stable until the player taps "Back to Lounge" (which sends
JOIN_LOUNGE → server responds with LOUNGE → view becomes LOUNGE).
No special guard needed.

##### 5d. Guesses Screen (`src/client/Guesses.tsx`)

- Display `prompt` (from props) instead of `category`
- Remove category framing — the prompt is just a word displayed large
- Timer: unchanged (reads from props, config sets it to 10s)
- Input + submit button: unchanged
- **Round display past 20:** If `round + 1 > totalRounds`, show just
  "Round N" without "of X" (e.g., "Round 21" not "Round 21 of 20").
  Same logic applies in Reveal topbar.

##### 5e. Reveal Screen (`src/client/Reveal.tsx`)

Layout (follows existing `.screen` pattern):
```
┌─────────────────────┐
│ Round X of 20   3s  │  ← screen-topbar
├─────────────────────┤
│                     │
│     CENTROID WORD    │  ← large display, h1
│       (again)       │  ← if centroidIsRepeat
│                     │
│    ┌─ scatter ───┐  │
│    │    plot     │  │  ← ScatterPlot component
│    └─────────────┘  │
│                     │
│  You said: "blue"   │  ← filter guesses to local player
│                     │
│     [ Ready ]       │  ← ready-tap button
└─────────────────────┘
```

- Import `ScatterPlot` from extracted component
- `guesses` array arrives with all players' guesses — filter to show
  only `playerId`'s guess in "You said:" display
- No individual scores displayed
- Ready button sends `REVEAL_READY`
- If `melded`: show a subtle meld indicator (Phase 5 scope — doesn't
  need to be elaborate, the GameEnd screen handles celebration)

##### 5f. GameEnd Screen (`src/client/GameEnd.tsx`)

**On meld (`melded: true`):**
```
┌─────────────────────┐
│    MIND MELD!       │  ← celebration header
│  Round N            │
├─────────────────────┤
│  You Said │ Center  │  ← two-column history
│  ─────────┼──────── │
│  blue     │ sky     │
│  cloud    │ weather │
│  rain     │ rain    │  ← meld round highlighted
├─────────────────────┤
│  [ Back to Lounge ] │
└─────────────────────┘
```

**On continue (`type: 'CONTINUE'`):**
```
┌─────────────────────┐
│  Round 20 reached   │
├─────────────────────┤
│  You Said │ Center  │  ← same two-column history
│  ─────────┼──────── │
│  ...      │ ...     │
├─────────────────────┤
│ [Keep going] [I'm out] │
└─────────────────────┘
```

- "Keep going" sends `CONTINUE_VOTE` with `continuePlay: true`
- "I'm out" sends `CONTINUE_VOTE` with `continuePlay: false`
- After voting, show "Waiting for others..." state (disable buttons,
  show text indicator)
- If game continues (server sends new GUESS_STATE), reducer
  transitions to GUESSES view automatically
- If game ends (server sends GAME_END), reducer transitions to
  GAME_END view

**"Back to Lounge" flow** (on GameEnd screen):
The server has already moved the player to the lounge (in `endGame()`).
The "Back to Lounge" button sends `JOIN_LOUNGE`:
```ts
mailbox.send({ type: 'JOIN_LOUNGE', playerId, playerName, mood })
```
The server handles this (idempotent — player already in lounge) and
responds with a LOUNGE message (added in Phase 3, sub-task 3e-ii).
The reducer receives LOUNGE → view transitions to LOUNGE. Done.

##### 5g. Non-submission Display

- **Scatter plot:** Player absent (no dot) — already handled by
  positions not including them
- **Reveal:** "You said: —" if player's guess not in guesses array
- **Game-end history:** Blank or "—" for rounds with no submission

##### 5h. Cleanup

- Delete `Scores.tsx` (replaced by Reveal.tsx)
- Remove `scores.css` import if it existed (or repurpose for reveal)
- Remove any references to `SCORE_STATE` or `SCORES` view type in
  client code
- CSS: use existing design system classes (`.screen`, `.screen-topbar`,
  `.screen-header`, `.screen-footer`, `.btn`, `.title-block`). Add
  new CSS only for mind-meld-specific elements (centroid word display,
  history table, meld celebration).

#### Acceptance Criteria

- [ ] ScatterPlot extracted to reusable component
- [ ] Guesses screen shows prompt word (not category framing)
- [ ] Reveal screen shows centroid word, "again" indicator, scatter plot
- [ ] Reveal screen shows "You said: [guess]" (local player only)
- [ ] Ready-tap on Reveal sends REVEAL_READY
- [ ] GameEnd screen shows meld celebration with round count
- [ ] GameEnd screen shows centroid path + player history (two columns)
- [ ] Continue screen shows history + "Keep going" / "I'm out" buttons
- [ ] CONTINUE_VOTE sent on button tap
- [ ] Non-submissions display gracefully (dash/blank)
- [ ] No individual scores visible anywhere
- [ ] Scores.tsx removed, all SCORE_STATE references cleaned up
- [ ] Screens use existing CSS classes, minimal new CSS
- [ ] Project compiles, renders without errors

#### Agent Instructions

- **DO NOT** open a PR. Commit to `hart/mind-meld` only.
- Extract ScatterPlot FIRST (5a), then build Reveal using it.
- Follow existing component patterns: Props type at top, sub-components
  as functions in same file (unless shared), `.screen` layout structure.
- Use the player color system (`playerColor.ts`) for scatter plot dots.
- The `mailbox.send()` pattern is used for all client → server messages.
- Keep styling minimal and consistent with existing dark theme.

---

## Post-Build Process

After all 5 phases complete:

1. **Verify end-to-end:** Start server with `bun run dev`, open
   multiple browser tabs, play through a full game manually.
2. **Run `/workflows:review`** across all changes on `hart/mind-meld`.
3. **Address review findings** — fix issues, commit to same branch.
4. **Only then:** Open PR targeting `main`.

---

## References

- **Source spec:** [mind-meld-spec.md](docs/brainstorms/mind-meld-spec.md)
- **Architecture:** [codebase-review-handoff.md](docs/solutions/2026-02-18-codebase-review-handoff.md)
- **Key files:** `src/server/play.ts`, `src/types.ts`, `src/server/types.ts`,
  `src/server/scoring.ts`, `src/config.ts`, `src/client.tsx`
- **Word list source:** [google-10000-english](https://github.com/first20hours/google-10000-english)
