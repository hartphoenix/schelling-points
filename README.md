# Schelling Points

A Jackbox TV-like mobile word game. Given a category (e.g. cities, animals, types of vehicles), all players privately submit the item they think everyone else will pick. When all answers are in, results are revealed with scores based on semantic clustering.

## Team

| Name | Role |
|------|------|
| Hart | Systems Integrator |
| Marianne | Fullstack Dev, PM |
| Julianna | UX, Designer |
| Ulysse | Lead Developer |

## Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Express + TypeScript
- **Real-time:** WebSockets
- **Embeddings:** ollama (nomic-embed-text)

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd schelling-points

# Frontend
cd client
npm install
npm run dev

# Backend (separate terminal)
cd server
npm install
npm run dev
```

### ollama setup (for embedding/scoring)

```bash
# Install ollama: https://ollama.com
ollama pull nomic-embed-text
ollama serve
```

## Project Resources

- [PRD (Google Doc)](https://docs.google.com/document/d/1-gBdLX_rmUn9tei-9SdhpRLjdsBPu-pRGoFlUgs9CZ8/edit?usp=sharing)
- [Project Plan (Google Doc)](https://docs.google.com/document/d/1A3cnThhzoS-p949CCqM3iIiiB9DNU-KHbNKfaTPFrgQ/edit?usp=sharing)
- [Miro Board](https://miro.com/welcomeonboard/R3VzR0pydFFmdnBKbEtIaWw1aG1ab0xJeUw4bjlwS2I4b09HejBONHN1QUhWRUdUMEcyNnZDWkxUT2pzT0pUK3NTaXBwaXhBUWVrMExTY3ZpaXNjd0wyNTV4d2I1MmZIWGJ1azByQVBacy90Y21SWUFHTXBCdzVmYm0xY3Q4ckNNakdSWkpBejJWRjJhRnhhb1UwcS9BPT0hdjE=?share_link_id=124847578544)

## Branch Strategy

- `main` is protected — all changes via PR with 1 required review
- Create feature branches for your work (e.g. `feature/lobby-ui`, `feature/embedding-pipeline`)
- PRs merge into `main`

## Timeline

| Day | Goal |
|-----|------|
| Tue | PRD finalized, API contract agreed, architecture locked, repos scaffolded |
| Wed | Core game loop — category, input, scoring, results (single-player) |
| Thu | Multiplayer — room/lobby, game state machine, real-time sync |
| Fri | Integration, playtesting, polish, edge cases |
| Sat | Deploy + demo |
