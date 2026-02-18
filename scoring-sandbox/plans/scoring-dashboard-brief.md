# Scoring Dashboard — Build Brief

## What we're building

A single-page local test dashboard for exploring embedding-based scoring modes. This is a design tool, not production code — it helps us playtest and tune scoring algorithms for a multiplayer word game before building them into the real game.

## The game concept (context only — we're not building the game here)

"Schelling Points" is a party word game. Players are given a category (e.g. "animals") and each privately submits a word they think others will also pick. Answers are scored based on semantic similarity using text embeddings. Different scoring modes reward different strategies (conformity, originality, accuracy).

## What the dashboard does

1. User types a **category prompt** (e.g. "animals") into a text field.
2. User types **4-8 simulated player responses** into separate text fields (e.g. "dog", "cat", "elephant", "refrigerator").
3. User selects a **scoring mode** from a dropdown/toggle.
4. On submit, the dashboard:
   - Sends each text (category + all responses) to a local embedding model
   - Computes cosine similarities and scores according to the selected mode
   - Displays an **output table**: each response with its score, similarity-to-category, and similarity-to-centroid
   - Displays a **2D plot** showing all responses and the category as labeled points in projected space

## Embedding service

ollama is already running locally. The API:

```
POST http://localhost:11434/api/embeddings
Content-Type: application/json

{ "model": "nomic-embed-text", "prompt": "golden retriever" }
```

Returns: `{ "embedding": [array of 768 floats] }`

One call per text input. For 1 category + 6 responses = 7 API calls.

## Math operations needed

**Cosine similarity** between two 768-dim vectors: dot product divided by product of magnitudes. Returns -1 to 1 (1 = identical direction, 0 = unrelated).

**Centroid**: element-wise mean of all player response vectors (not including the category). This represents the group's average position in semantic space.

**2D projection**: PCA or MDS to reduce 768-dim vectors to x,y coordinates for the plot. PCA is simpler; MDS better preserves pairwise distances for small point counts. Either is fine for this tool.

## Scoring modes

All modes use two reference points computed from the embeddings:
- **Category embedding**: the prompt itself embedded (e.g. "animals")
- **Player centroid**: average of all player response embeddings

| Mode | Formula | Rewards |
|------|---------|---------|
| Schelling Point | similarity(response, centroid) | Mind-reading — guess what the group guesses |
| Bullseye | similarity(response, category) | Best answer to the prompt |
| Dark Horse | similarity(response, category) × (1 - similarity(response, centroid)) | On-topic but unique |

Display all three scores in the output table regardless of which mode is "active" — the active mode determines which column is used for ranking/highlighting.

## UI components

1. **Category input**: single text field
2. **Response inputs**: 4-8 text fields (start with 6, allow adding/removing)
3. **Compute button**: triggers embedding calls + scoring
4. **Output table**: columns — Response, Schelling Score, Bullseye Score, Dark Horse Score. Active mode column highlighted. Rows sorted by active mode score descending.
5. **2D plot**: scatter plot with labeled points. Category point visually distinct (different color/shape). Player responses labeled with their text. Axes unlabeled (the projected dimensions aren't interpretable).
6. **Mode selector**: dropdown or toggle that switches which score column is highlighted and which determines sort order. Does not require recomputation — just re-ranks the same data.

## Tech constraints

- **Sandboxed Build.** All files and edits for the dashboard live inside the scoring-sandbox directory including configs. (Ask for any exceptions such as edits to schelling-points/.gitignore -- but the overall project should remain untouched by the dashboard build).
- **Single-page app.** No routing, no backend of its own — just a frontend that calls ollama directly via Vite dev server proxy.
- **CORS handling**: Configure `vite.config.ts` with a proxy rule that forwards `/api/embeddings` to `http://localhost:11434/api/embeddings`. Frontend calls the proxy path; Vite forwards to ollama. No CORS issues, no ollama config changes needed.
- **Local only.** No deployment, no auth, no persistence.
- **Stack**: TypeScript + React (Vite). Use a lightweight charting library for the scatter plot (e.g. recharts, visx, or plain canvas).
- **Math libraries**: `ml-distance` for cosine similarity, or hand-roll it (~5 lines). For PCA/MDS: `druid-js` or `ml-pca`.
- **No styling polish needed.** Functional layout, readable table, plot that shows labeled points. This is a tool, not a product.

## Definition of done

- Type a category and 6 responses, hit compute, see scores in a table and points on a plot.
- Switch scoring modes and see the ranking change without recomputation.
- Visually confirm that responses semantically close to the category appear near it on the plot, and scores reflect similarity relationships.
