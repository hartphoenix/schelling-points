# Scoring Dashboard

Local dashboard for playtesting embedding-based scoring algorithms for the Schelling Points word game. Enter a category and simulated player responses, then see scores and a 2D scatter plot.

## Prerequisites

### ollama

Install ollama if you don't have it:

```bash
brew install ollama
```

Start the server:

```bash
ollama serve
```

Pull the embedding model:

```bash
ollama pull nomic-embed-text
```

Verify it's working:

```bash
curl http://localhost:11434/api/embeddings -d '{"model":"nomic-embed-text","prompt":"hello"}'
```

You should see a JSON response with a 768-element `embedding` array.

## Install & Run

```bash
cd scoring-sandbox
bun install
bun run dev
```

Open http://localhost:5173 in your browser.

## Scoring Algorithms

All three modes use two reference points computed from embeddings:

- **Category embedding** — the prompt itself (e.g. "animals") run through the embedding model
- **Player centroid** — the element-wise average of all player response embeddings

### Schelling Point

```
score = similarity(response, centroid)
```

Rewards mind-reading — how well did you guess what the group would guess? Responses closest to the average of all answers score highest.

### Bullseye

```
score = similarity(response, category)
```

Rewards accuracy — how semantically close is your response to the category prompt? The "best answer" wins regardless of what others said.

### Dark Horse

```
score = similarity(response, category) × (1 − similarity(response, centroid))
```

Rewards originality that's still on-topic. You need to be relevant to the category (first term) but different from what everyone else said (second term). A high score means you found a unique angle that still fits.

## How It Works

1. You enter a category and 4–8 player responses
2. Each text is sent to ollama's `nomic-embed-text` model, which returns a 768-dimensional vector
3. Cosine similarity between vectors measures semantic relatedness (1 = identical meaning, 0 = unrelated)
4. All three scores are computed from these similarities
5. PCA projects the 768-dim vectors down to 2D for the scatter plot
