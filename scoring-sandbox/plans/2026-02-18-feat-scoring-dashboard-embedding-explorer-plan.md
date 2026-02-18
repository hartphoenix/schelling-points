---
title: "feat: Scoring Dashboard — Embedding-Based Scoring Explorer"
type: feat
status: completed
date: 2026-02-18
source: scoring-sandbox/plans/scoring-dashboard-brief.md
pr: https://github.com/hartphoenix/schelling-points/pull/5
---

# Scoring Dashboard — Embedding-Based Scoring Explorer

## Overview

A single-page local dashboard for playtesting and tuning embedding-based scoring algorithms for the Schelling Points word game. Users enter a category and simulated player responses, then see scores computed from semantic similarity (via local ollama embeddings) displayed in a sortable table and 2D scatter plot.

This is a design tool, not production code. Functional layout, no styling polish.

## Problem Statement / Motivation

The Schelling Points game needs three scoring modes (Schelling Point, Bullseye, Dark Horse) that behave intuitively and feel fair to players. These modes use embedding-based cosine similarity in ways that are hard to reason about without visualizing. This dashboard lets us:

- Test scoring formulas with real embeddings before wiring them into the game
- Visually confirm that semantic relationships map to expected scores
- Tune mode behavior by experimenting with different categories and response sets

## Proposed Solution

Self-contained Vite + React + TypeScript app inside `scoring-sandbox/`. Calls local ollama for embeddings via Vite dev proxy. Computes all scores client-side. Displays results in a table (sortable by active mode) and a 2D PCA scatter plot (Recharts).

## Technical Approach

### Architecture

```
scoring-sandbox/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── plans/                         # existing — briefs + this plan
│   ├── scoring-dashboard-brief.md
│   └── 2026-02-18-feat-scoring-dashboard-embedding-explorer-plan.md
└── src/
    ├── main.tsx                   # React entry point
    ├── App.tsx                    # Main app component, state management
    ├── types.ts                   # Shared types (ScoringMode, PlayerResult, etc.)
    ├── components/
    │   ├── InputPanel.tsx         # Category input + response fields + compute button
    │   ├── ScoreTable.tsx         # Results table with mode-based highlighting/sorting
    │   ├── ScatterPlot.tsx        # 2D PCA projection via Recharts
    │   └── ModeSelector.tsx       # Scoring mode toggle
    └── lib/
        ├── embeddings.ts          # ollama API calls via proxy
        ├── scoring.ts             # Cosine similarity, centroid, score formulas
        └── projection.ts          # PCA → 2D coordinates
```

### State Design

Simple `useState` in `App.tsx` — no useReducer needed for this scope.

```typescript
// types.ts
type ScoringMode = 'schelling' | 'bullseye' | 'darkHorse'

type ComputeStatus = 'idle' | 'loading' | 'success' | 'error'

interface PlayerResult {
  index: number           // stable ID (1-N), solves duplicate-label problem
  text: string
  schellingScore: number  // similarity(response, centroid)
  bullseyeScore: number   // similarity(response, category)
  darkHorseScore: number  // similarity(response, category) × (1 - similarity(response, centroid))
  x: number               // PCA-projected x coordinate
  y: number               // PCA-projected y coordinate
}

interface ComputeResult {
  players: PlayerResult[]
  categoryPoint: { text: string; x: number; y: number }
}
```

**Key state:**
- `category: string` — category prompt input
- `responses: string[]` — player response inputs (starts at 6, min 4, max 8)
- `activeMode: ScoringMode` — which mode is highlighted/sorted (default: `'schelling'`)
- `status: ComputeStatus` — compute button state machine
- `error: string | null` — error message for display
- `result: ComputeResult | null` — computed scores + projection data (cleared on input change)

### Compute Flow

1. **Validate** — category non-empty, at least 4 non-empty responses (trim whitespace)
2. **Fetch embeddings** — `Promise.all` for category + all non-empty responses via `/api/embeddings` proxy
3. **Validate embeddings** — check no zero-magnitude vectors returned, check for error responses from ollama
4. **Compute scores** — cosine similarities → all three mode scores for each response
5. **Project to 2D** — PCA on all embeddings (category + responses) → x,y coordinates
6. **Set result** — store in state, mark status as `'success'`

On any failure: set status to `'error'`, set error message, clear result.

### Error Handling (Minimum Viable)

This is a dev tool, so error handling is functional, not polished:

| Error | Detection | Display |
|-------|-----------|---------|
| ollama not running | `fetch` throws network error | "Cannot reach ollama. Run `ollama serve` on port 11434." |
| Model not installed | ollama returns `{ "error": "..." }` | "Model not found. Run `ollama pull nomic-embed-text`." |
| Empty category | Pre-submit validation | Disable Compute button, inline hint |
| Too few responses | Pre-submit validation | Disable Compute button, show count (e.g. "1/4 min") |
| Zero-magnitude embedding | Check after fetch | "Invalid embedding for '[text]'. Try different input." |
| Partial API failure | `Promise.all` rejects | "Embedding failed. Check ollama and retry." |

### Input Changes

When any input changes after a successful Compute, clear the result. The user re-clicks Compute to see updated scores.

## Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^2.15.0",
    "ml-pca": "^4.1.1"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

**Package manager:** `bun` (per workspace conventions — creates `bun.lock`)

**Math libraries:**
- `ml-pca` for PCA projection (deterministic, simple API)
- Cosine similarity hand-rolled (~5 lines, no library needed)

**Chart library:**
- `recharts` for the scatter plot (simple API, fast to implement, Claude knows it well)

## Acceptance Criteria

### Functional Requirements

- [x] Category text field accepts free text input
- [x] 6 response fields on load, add/remove buttons, enforced 4-8 range
- [x] Compute button fetches embeddings from local ollama and computes all three scores
- [x] Output table shows all responses with Schelling, Bullseye, and Dark Horse scores (3 decimal places)
- [x] Active mode column is visually highlighted (bold header + background)
- [x] Table rows sorted descending by active mode score
- [x] Mode selector switches active mode — table re-ranks without recomputation
- [x] 2D scatter plot shows category point (distinct shape/color) and all response points with text labels
- [x] Semantically similar responses cluster visually near each other on the plot

### Error & State Requirements

- [x] Loading state: Compute button disabled + spinner/text during API calls
- [x] Error state: specific messages for ollama-not-running and model-not-found
- [x] Empty initial state: placeholder text instead of empty table/plot
- [x] Input change: clear results when inputs are modified after Compute
- [x] Validation: Compute disabled until category + 4 responses are non-empty

### Technical Requirements

- [x] All files inside `scoring-sandbox/` — no edits to parent project (exception: root `.gitignore` updated to exclude `scoring-sandbox/node_modules/` and `scoring-sandbox/dist/`)
- [x] Vite proxy at `/api/embeddings` → `http://localhost:11434/api/embeddings` with `changeOrigin: true`
- [x] No routing, no backend, no persistence, no auth
- [x] Runs with `bun install && bun run dev` from `scoring-sandbox/`

## Implementation Phases

### Phase 1: Scaffolding + Embedding Service

**Files:** `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/types.ts`, `src/lib/embeddings.ts`

- [x] `vite.config.ts` — Initialize Vite + React plugin + proxy config for `/api/embeddings`
- [x] `package.json` — Dependencies, dev script
- [x] `tsconfig.json` — Standard React/Vite TypeScript config
- [x] `index.html` — Entry HTML with `<div id="root">`
- [x] `src/main.tsx` — React DOM render entry
- [x] `src/types.ts` — Type definitions (ScoringMode, ComputeStatus, PlayerResult, ComputeResult)
- [x] `src/lib/embeddings.ts` — `fetchEmbedding(text: string): Promise<number[]>` calling proxy endpoint
- [x] Smoke test: `bun run dev` serves the page, embedding call returns a 768-dim array

### Phase 2: Math Utilities

**Files:** `src/lib/scoring.ts`, `src/lib/projection.ts`

- [x] `src/lib/scoring.ts` — `cosineSimilarity(a, b)`, `centroid(vectors)` (player responses only — excludes category embedding), `computeScores(categoryEmbedding, responseEmbeddings)` returning all three mode scores per response
- [x] `src/lib/projection.ts` — `projectTo2D(embeddings)` using ml-pca, returns `{x, y}[]`
- [x] Unit-testable: pure functions, no API calls

### Phase 3: Input Panel + Compute Flow

**Files:** `src/components/InputPanel.tsx`, update `src/App.tsx`

- [x] `src/components/InputPanel.tsx` — Category input, dynamic response fields (add/remove, 4-8 range), Compute button with validation
- [x] `src/App.tsx` — Wire up state: inputs → validate → fetch embeddings → compute scores → project → store result
- [x] Compute status state machine: idle → loading → success/error
- [x] Clear results when inputs change after successful compute
- [x] Error display: catch and surface ollama/network/validation errors

### Phase 4: Output Table + Mode Selector

**Files:** `src/components/ScoreTable.tsx`, `src/components/ModeSelector.tsx`

- [x] `src/components/ModeSelector.tsx` — Radio buttons (3 options, all visible at once), default Schelling Point
- [x] `src/components/ScoreTable.tsx` — Columns: #, Response, Schelling, Bullseye, Dark Horse. Active column highlighted. Sorted by active mode descending. Scores to 3 decimal places.
- [x] Mode switch re-ranks table without recomputation

### Phase 5: Scatter Plot

**Files:** `src/components/ScatterPlot.tsx`

- [x] `src/components/ScatterPlot.tsx` — Recharts ScatterChart with labeled points
- [x] Category point: distinct color/shape (e.g. red diamond vs blue circles)
- [x] Response points: labeled with text (truncated to ~20 chars if long)
- [x] Axes unlabeled (projected dimensions aren't interpretable)
- [x] Static visualization — no interaction with mode selector

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chart library | Recharts | Fastest to implement, Claude writes it well, bundle size irrelevant for local tool |
| Dimensionality reduction | PCA via ml-pca | Deterministic, simpler than MDS, sufficient for 7-point visualization |
| Cosine similarity | Hand-rolled | 5 lines of code, no library dependency needed |
| State management | useState | Simple enough scope — no useReducer/Context warranted |
| Package manager | bun | Workspace convention |
| Parallel API calls | Promise.all | Faster than sequential; ollama handles concurrent requests fine |
| Duplicate responses | Allowed, indexed | Each response gets a stable index (1-N) shown in table and plot to distinguish duplicates |

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| ollama not running when testing | High | Specific error message with setup instructions |
| nomic-embed-text model not pulled | Medium | Detect ollama error response, show `ollama pull` command |
| PCA projection uninformative for very similar inputs | Low | Expected behavior for a design tool — user will see the cluster and understand |
| Recharts label overlap on scatter plot | Medium | Truncate labels; acceptable for a functional tool |

## Not In Scope

- Styling/polish (functional layout only)
- Persistence or export (no save/load)
- Deployment or auth
- Table-to-plot hover interaction
- Reset button (results clear on input change; full reset is manual for now)
- Test suite (pure math functions are unit-testable but not required for this tool)

## Testing Notes

Build and type-check pass. Runtime integration verified via scripted tests against live ollama:

- Vite dev server serves the page and proxies `/api/embeddings` correctly
- `nomic-embed-text` returns 768-dim embeddings for all test inputs
- Scoring formulas produce expected rankings (e.g. "dog" > "refrigerator" on Bullseye for category "animals")
- PCA projection clusters semantically similar responses closer together (dog↔cat distance < dog↔refrigerator distance)
- Error handling: ollama returns 404 for unknown models, detected correctly by `embeddings.ts`

Manual browser testing (entering inputs, clicking Compute, visual table/plot inspection) not yet performed.

## References

- Build brief: [scoring-dashboard-brief.md](scoring-sandbox/plans/scoring-dashboard-brief.md)
- ollama API: `POST /api/embeddings` with `{ "model": "nomic-embed-text", "prompt": "text" }` → returns `{ "embedding": [768 floats] }`
- Game PRD: [Schelling Points_ PRD.md](Schelling%20Points_%20PRD.md)
- Recharts docs: https://recharts.org/en-US/api/ScatterChart
- ml-pca: https://github.com/mljs/pca
