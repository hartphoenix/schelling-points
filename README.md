# Schelling Points

A Jackbox-style mobile word game built around a question from game theory: given the same prompt, will a group of people converge on the same answer? Players submit one-word guesses to category prompts, and an embedding model scores how close each answer lands to the group's semantic center. If everyone guesses the same word — a Mind Meld — the game ends in collective triumph.

## Why this project

We wanted to build a game that creates genuine social moments — the kind where everyone laughs because three people independently said "penguin." The Schelling Point concept (a focal point people gravitate toward without coordination) gave us a scoring mechanic that rewards thinking *with* the group rather than outsmarting it. The technical challenge was making that invisible convergence visible: turning high-dimensional embedding vectors into a spatial layout players can read at a glance.

## What it does

- **Semantic scoring** — player guesses are embedded via Ollama (`nomic-embed-text`), scored by cosine similarity to the group centroid
- **Scatter plot reveal** — after each round, guesses appear positioned in 2D semantic space so players can see who clustered and who drifted
- **Centroid chaining** — the nearest vocab word to the centroid becomes the next round's prompt, creating emergent thematic threads
- **Mind Meld detection** — if all players submit the same word (by stem), the game ends with a meld celebration
- **Multi-round play** — up to 20 rounds with a continue vote, or until a Mind Meld
- **Lobby + QR join** — human-readable game IDs (e.g., "fuzzy-elephant") and QR codes for frictionless mobile join
- **WebSocket sync** — real-time state machine (lobby → guess → reveal → continue) broadcast to all connected players

## Architecture

```
Client (React 19 + TypeScript)              Server (Express 5 + express-ws)
├── client.tsx       main reducer,           ├── server.ts        entry, init
│                    router, socket          ├── api.ts           WS + static routes
├── Lounge.tsx       player entry, moods     ├── play.ts          state machine, tick loop
├── Lobby.tsx        ready state, countdown  ├── scoring.ts       embeddings, centroid,
├── Guesses.tsx      prompt, input, timer    │                    score mapping
├── Reveal.tsx       scatter plot, scores    ├── vocab.ts         nearest-word lookup
├── GameEnd.tsx      history, meld display   ├── meld.ts          stem-based meld detection
├── ScatterPlot.tsx  SVG 2D visualization    ├── math.ts          cosine similarity, centroid
└── mail.ts          WS client w/ outbox     └── categories.json  872 prompts
```

Each round: players submit guesses → server fetches embeddings → computes centroid and scores → finds nearest vocab word → broadcasts reveal state. Game state lives in memory (no database — sessions are ephemeral). A 10k-word vocab embedding index is pre-built at Docker image creation time so the game doesn't depend on Ollama at runtime for word lookups.

## Stack

React 19, TypeScript, Express 5, express-ws, Ollama (nomic-embed-text), Vite, Vitest, Docker, Bun

## Run locally

Requires [Ollama](https://ollama.com) running with `nomic-embed-text` pulled.

```bash
bun install
OLLAMA_URL=http://localhost:11434 bun run scripts/build-vocab-embeddings.ts   # one-time
bun run dev       # concurrent client + server dev
bun run test      # unit + integration tests
```

Or via Docker:

```bash
OLLAMA_URL=http://localhost:11434 bun run scripts/build-vocab-embeddings.ts
docker build -t schelling-points .
docker run -p 8000:8000 schelling-points
```

## Build history

Built by a 4-person team in 5 days (30 merged PRs). Key milestones:

1. Foundation — Express server, WebSocket protocol, React client shell
2. Core loop — category prompts, guess collection, embedding-based scoring
3. Multiplayer — lobby, ready state, real-time sync across players
4. Mind Meld — stem-based meld detection, centroid chaining across rounds
5. Polish — scatter plot visualization, QR join, mood avatars, mobile UX, Docker deployment

## Team

| Name | Role | GitHub |
|------|------|--------|
| [Ulysse](https://github.com/ulyssepence) | Lead developer | [@ulyssepence](https://github.com/ulyssepence) |
| [Julianna](https://github.com/jannar18) | UX designer | [@jannar18](https://github.com/jannar18) |
| [Marianne](https://github.com/thrialectics) | Fullstack dev, PM | [@thrialectics](https://github.com/thrialectics) |
| [Hart](https://github.com/hartphoenix) | System integrator | [@hartphoenix](https://github.com/hartphoenix) |
