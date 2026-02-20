---
title: "feat: Implement embedding-based scoring algorithm"
type: feat
status: active
date: 2026-02-20
---

# feat: Implement embedding-based scoring algorithm

## Overview

Wire up the scoring algorithm so the game's core mechanic actually produces scores. Players' guesses are embedded via `nomic-embed-text` (local ollama), scored by cosine similarity to the centroid (the Schelling point), and lerped to 0–`MAX_SCORE`.

Brainstorm: `docs/brainstorms/2026-02-20-scoring-algorithm-brainstorm.md`
Closes: #27, #65

## Problem Statement

Scoring is completely stubbed. `play.ts:88` creates `new Map<PlayerId, number>()` — every player sees 0 points every round. The game's namesake mechanic produces no observable consequence.

## Proposed Solution

Port the proven embedding + cosine-similarity approach from `scoring-sandbox/` into the game server. Single scoring mode (Schelling Point) for MVP.

### Data Flow

```
Player guesses (Map<PlayerId, string>)
  → trim().toLowerCase()
  → embed via ollama POST /api/embed (nomic-embed-text)
  → compute centroid of all embeddings
  → cosine similarity of each embedding to centroid
  → lerp from SIMILARITY_FLOOR..1.0 → 0..MAX_SCORE
  → Map<PlayerId, number>
```

## Technical Approach

### New file: `src/server/scoring.ts`

Extracted scoring module with clean interfaces. Ported from `scoring-sandbox/src/lib/embeddings.ts` and `scoring-sandbox/src/lib/scoring.ts`.

```typescript
// src/server/scoring.ts

// Fetch embedding vector from local ollama
async function fetchEmbedding(text: string): Promise<number[]>

// Compute element-wise mean of vectors
function centroid(vectors: number[][]): number[]

// Standard cosine similarity
function cosineSimilarity(a: number[], b: number[]): number

// Main entry point — called from play.ts
async function scoreGuesses(
  guesses: Map<PlayerId, string>
): Promise<Map<PlayerId, number>>
```

`scoreGuesses` does:
1. Filter out non-submitters (they get score 0, excluded from centroid)
2. Normalize: `trim().toLowerCase()`
3. Embed all guesses concurrently via `Promise.all`
4. Compute centroid
5. Compute cosine similarity to centroid for each
6. Call `similarityToScore(similarity)` → integer 0–`MAX_SCORE`

### Score function: `similarityToScore`

```typescript
// Lerp from SIMILARITY_FLOOR..1.0 → 0..MAX_SCORE
function similarityToScore(similarity: number): number {
  const clamped = Math.max(0, (similarity - SIMILARITY_FLOOR) / (1 - SIMILARITY_FLOOR))
  return Math.round(clamped * MAX_SCORE)
}
```

`SIMILARITY_FLOOR` and `MAX_SCORE` go in `config.ts`.

### Modify: `src/config.ts`

Add:
```typescript
export const MAX_SCORE = 100
export const SIMILARITY_FLOOR = 0.5
export const OLLAMA_URL = 'http://localhost:11434'
export const EMBEDDING_MODEL = 'nomic-embed-text'
export const EMBEDDING_TIMEOUT_MS = 8000
export const EMBEDDING_RETRIES = 2
```

### Modify: `src/server/play.ts` (~line 88)

Replace stub:
```typescript
// Before
const scores = new Map<t.PlayerId, number>()

// After
const scores = await scoreGuesses(game.phase.guesses)
```

This makes the phase transition async. The tick loop fires every 100ms, so guard against re-entry: add a `scoringInProgress` flag to the game object. When GUESSES timer expires, set the flag before awaiting `scoreGuesses()`. The tick handler skips the GUESSES→SCORES transition while the flag is set. Clear the flag after scores are computed and the phase is set to SCORES.

### Modify: `src/types.ts` — SCORE_STATE message

Add `guesses` to the wire protocol so the client can display them:
```typescript
type: 'SCORE_STATE',
// ... existing fields
playerScores: [PlayerId, number][],
guesses: [PlayerId, string][],    // NEW
```

### Modify: `src/server/play.ts` (~line 326–336) — message construction

Include guesses in the SCORE_STATE message. Guesses need to survive the phase transition — either:
- (a) Store guesses on the SCORES phase type, or
- (b) Read from `game.previousScores` after saving the round

Option (a) is simpler: add `guesses: Map<PlayerId, string>` to the SCORES phase in `src/server/types.ts`.

### Modify: `src/server/types.ts` — SCORES phase

```typescript
type Phase = {
  type: 'SCORES',
  round: number,
  category: string,
  isReady: Set<PlayerId>,
  secsLeft: number,
  scores: Map<PlayerId, number>,
  guesses: Map<PlayerId, string>,  // NEW — carried from GUESSES phase
}
```

### Cumulative scoring

After computing round scores, populate:
1. `game.previousScores.push({ category, guessesAndScores })` — full round record
2. Each player's `playerInfo.previousScoresAndGuesses.push([score, guess])` — per-player history

### Error handling: ollama failure

1. Embed all guesses concurrently with `Promise.all`
2. If a fetch fails, retry up to `EMBEDDING_RETRIES` times with exponential backoff
3. If all retries exhausted, log the error and transition to SCORES with all scores 0. The round is lost but the game continues.

## Acceptance Criteria

- [ ] Guesses are embedded via local ollama and scored by cosine similarity to centroid
- [ ] Non-submitters get score 0 and are excluded from centroid calculation
- [ ] Scores are integers 0–`MAX_SCORE` (100), lerped from `SIMILARITY_FLOOR`
- [ ] `MAX_SCORE`, `SIMILARITY_FLOOR`, ollama config are constants in `config.ts`
- [ ] `scoreGuesses()` has a clean interface: takes guesses Map, returns scores Map
- [ ] `similarityToScore()` is a pure function: takes similarity float, returns integer
- [ ] Guesses are carried into SCORES phase and sent to client in SCORE_STATE
- [ ] Cumulative scores populate `previousScoresAndGuesses` and `game.previousScores`
- [ ] Ollama failures retry with backoff, then error gracefully
- [ ] Unit tests for: `cosineSimilarity`, `centroid`, `similarityToScore`, `scoreGuesses` (with mocked embeddings)

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| `onTickGame` may not handle async scoring | Check tick loop; may need to gate phase transition on scoring completion |
| Ollama not running in dev/prod | Clear error message; document setup in README |
| #57 (guesses lost bug) overlaps with guesses-in-SCORES-phase change | Coordinate — this plan may fix #57 as a side effect |
| Embedding latency adds delay between GUESSES→SCORES | `Promise.all` keeps it fast (~200–500ms for 6 players); timeout at 8s |

## References

- Brainstorm: `docs/brainstorms/2026-02-20-scoring-algorithm-brainstorm.md`
- Scoring sandbox: `scoring-sandbox/src/lib/scoring.ts`, `scoring-sandbox/src/lib/embeddings.ts`
- Stub location: `src/server/play.ts:88-89`
- Phase types: `src/server/types.ts:21-29`
- Client display: `src/client/Scores.tsx`
- Issues: #27, #65, related #57
