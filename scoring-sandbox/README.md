# Scoring Dashboard

Local dashboard for playtesting embedding-based scoring algorithms for the Schelling Points word game. Enter a category and simulated player responses, then see scores across three modes with scatter and radial visualizations. Includes tuning sliders for the Dark Horse formula and optional dual-prompt A/B comparison.

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
score = sim(response, category)^n × (1 − sim(response, centroid))
      where sim(response, category) >= floor, otherwise score = 0
```

Rewards originality that's still on-topic. You need to be relevant to the category (first term) but different from what everyone else said (second term). A high score means you found a unique angle that still fits.

Two tuning parameters are available after computing scores (in the collapsible **Tuning** panel):

- **Exponent** (1.0–4.0, default 1.0) — raises the category similarity to a power, amplifying the gap between "related to" (~0.6) and "member of" (~0.85). Higher values reward answers that are clearly in the category.
- **Floor** (0.0–0.6, default 0.0) — hard cutoff for category similarity. Answers below the floor get a Dark Horse score of 0. Useful for filtering out vaguely related answers.

Slider changes re-score instantly using cached embeddings (no refetch needed).

## Dual Prompt Comparison

The optional **Compare with** field lets you enter a second category prompt (e.g. "a specific U.S. president" vs "president"). When filled and computed:

- **Score table** gains 3 extra columns (orange) showing prompt B scores alongside prompt A (blue)
- **Scatter plot** gets a Prompt A / Prompt B toggle that switches the entire 2D projection (each prompt has its own PCA fit since the category embedding shifts the axes)
- **Radial plot** shows two dots per player — blue (A) and orange (B) — at the same angle, plus an orange dashed centroid reference circle

When prompt B is empty, everything works exactly as before.

## How It Works

1. You enter a category and 4–8 player responses
2. Each text is sent to ollama's `nomic-embed-text` model, which returns a 768-dimensional vector
3. Cosine similarity between vectors measures semantic relatedness (1 = identical meaning, 0 = unrelated)
4. All three scores are computed from these similarities
5. PCA projects the 768-dim vectors down to 2D for the scatter plot
6. If a second prompt is provided, steps 2–5 repeat against the B category embedding
