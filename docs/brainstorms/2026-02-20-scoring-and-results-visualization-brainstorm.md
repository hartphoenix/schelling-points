# Scoring + Results Visualization Brainstorm

**Date:** 2026-02-20
**Participants:** Hart (with Claude)
**Status:** In progress

## What We're Building

A scoring system and 2D results visualization for the Schelling Points game.
When the guessing phase ends, the server scores player answers using semantic
similarity (embeddings), then the client renders an animated 2D network graph
showing how answers clustered.

### Scope

**In scope (MVP):**
- Hybrid scoring algorithm: exact matches score highest, semantically similar
  answers get partial credit via embeddings (cosine similarity to centroid)
- 2D animated visualization on the results screen: player answers as colored
  nodes, positioned by PCA projection of embeddings. Nodes for similar answers
  cluster together. Connection lines between exact matches and high-similarity
  pairs (threshold TBD).
- Wire protocol changes to send scoring + position data to clients

**Out of scope (follow-up):**
- 3D point cloud visualization (prototype exists in `schelling-3d-results.html`)
- Cumulative scoring / leaderboard across rounds
- Fuzzy string matching (plurals, typos) beyond basic normalization

### Scoring Algorithm (from Issue #65)

Use **cosine similarity to the centroid** (the Schelling Point):

1. Embed all player guesses using Ollama / nomic-embed-text
2. Normalize guesses (`trim().toLowerCase()`) and group exact matches
3. Compute the centroid of all embeddings (average vector)
4. Base score = cosine similarity between player's embedding and the centroid (0.0–1.0)
5. Exact match bonus: if 2+ players submitted the same normalized string, multiply by group size

**Worked example** (5 players, prompt: "Something you'd bring to a desert island"):

| Player | Guess | Cosine to centroid | Exact match group | Score |
|--------|-------|-------------------|-------------------|-------|
| Anna | knife | 0.82 | 1 (unique) | 0.82 x 1 = 0.82 |
| Marcus | knife | 0.82 | 2 (matches Anna) | 0.82 x 2 = 1.64 |
| Priya | water | 0.65 | 1 (unique) | 0.65 x 1 = 0.65 |
| Jess | machete | 0.78 | 1 (unique) | 0.78 x 1 = 0.78 |
| Tom | guitar | 0.30 | 1 (unique) | 0.30 x 1 = 0.30 |

Anna and Marcus both said "knife" — their cosine scores are identical (same
embedding), and both get the 2x exact-match multiplier. Tom's outlier answer
is far from the centroid, low score. Jess said "machete" (semantically close
to "knife") and scores well on similarity but gets no exact-match bonus.

> **Note:** The exact bonus formula (multiplier vs additive, caps) is an open
> question. The example above uses a simple multiplier to illustrate the
> mechanic. Final tuning needs playtesting.

The same embeddings, projected to 2D via PCA, produce node positions for the
visualization. The centroid becomes the visual center of gravity. In the
example above, "knife" and "machete" would cluster together; "guitar" floats
far away.

## Why This Approach

- **Hybrid scoring** rewards both exact convergence (the "Schelling moment")
  and semantic proximity (being in the right neighborhood)
- **2D-first** ships faster, works well on mobile (primary platform), and the
  3D prototype is ready for a future upgrade
- **Embeddings serve double duty** — scoring data = visualization data, no
  extra computation needed for positioning
- **Centroid-based scoring** is elegant: the "Schelling Point" is literally
  the center of the answer cloud

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scoring formula | Cosine similarity to centroid + exact match bonus | Issue #65, team direction |
| Visualization | 2D network graph (MVP), 3D later | Ship fast, mobile-first |
| Normalization | `trim().toLowerCase()` for MVP | Keep it simple, revisit fuzzy matching later |
| No-answer handling | TBD | Needs team input |

## Approaches Explored

### Approach 1: Server-side scoring (recommended)

Server calls Ollama when guessing ends, computes embeddings + scores + 2D
positions, sends everything to clients in an extended `SCORE_STATE` message.

**Pros:**
- Authoritative scores — everyone sees the same result
- One set of embedding calls per round (not N x N)
- Clients stay thin — just render what they receive
- Server already owns the state machine and phase transitions

**Cons:**
- Server needs Ollama access (must be running/reachable)
- Adds latency to the GUESSES → SCORES transition (embedding calls)
- More complex server code

### Approach 2: Client-side scoring

Each client fetches embeddings from Ollama (through proxy) and computes its
own scores and visualization positions.

**Pros:**
- Simpler server changes
- Scoring-sandbox already does this pattern

**Cons:**
- Every client calls Ollama separately (wasteful)
- Scores could differ between clients
- No authoritative "official" score
- Exposes embedding API to clients

## Existing Work

| Asset | Location | Status |
|-------|----------|--------|
| 3D results prototype | `schelling-point docs/schelling-3d-results.html` | Complete (standalone HTML) |
| Title screen prototype | `schelling-point docs/schelling-title.html` | Complete (standalone HTML) |
| Moodboard | `schelling-point docs/moodboard.png` | Reference |
| Cloud point visual | `schelling-point docs/cloud point visual.png` | Reference / target aesthetic |
| Mobile wireframes | `schelling-point docs/mobile wireframe schelling point.pdf` | Reference |
| Scoring sandbox | `scoring-sandbox/` | Working 2D scatter + radial plots, PCA projection, Ollama embeddings |
| Scores component | `src/client/Scores.tsx` | Has `visualization-placeholder` div ready |
| Server scoring | `src/server/play.ts:88` | Stubbed (`// TODO: Calculate scores`, empty Map) |
| Scoring types | `src/server/types.ts` | `RoundScore`, `previousScoresAndGuesses` scaffolded but unused |

## Related Issues

- [#27 — Design scoring algorithm](https://github.com/hartphoenix/schelling-points/issues/27) (OPEN, p1-critical)
- [#30 — Scores view UX](https://github.com/hartphoenix/schelling-points/issues/30) (CLOSED)
- [#65 — Scoring MVP implementation](https://github.com/hartphoenix/schelling-points/issues/65) (OPEN, p1-critical, agent-resolvable)

## Automated Pipelines Context

AI accelerator approved CI/CD automation and AI agent workflows. Implementation
tasks from this brainstorm can be executed through the agent workflow pipeline.

## Open Questions

1. **Server-side vs client-side scoring** — Team needs to decide where
   embedding calls happen. Server-side is recommended (see Approaches above)
   but has infra implications (Ollama must be reachable from the server).

2. **No-answer handling** — What happens when a player doesn't submit a guess?
   Options: zero score, excluded from centroid calculation, or penalty.

3. **Exact match bonus** — How much bonus for exact string matches vs semantic
   similarity? e.g., exact match = 100 points, similarity = 0-80 points?

4. **Embedding latency** — Ollama embedding calls take time. Is a brief
   "calculating scores..." loading state acceptable between GUESSES and SCORES?

5. **2D visualization style** — Animated SVG (lightweight, crisp) vs Canvas
   (better for particle effects, closer to the 3D prototype aesthetic)?
   Should it have the dust particles / glow effects from the prototype, or
   keep it clean and simple for MVP?
