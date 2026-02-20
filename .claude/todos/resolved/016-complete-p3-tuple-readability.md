---
status: complete
priority: p3
issue_id: "016"
tags: [code-quality, types]
dependencies: []
---

# Tuple Wire Types Harder to Read Than Objects

## Problem Statement

Wire messages use positional tuples like `[PlayerId, PlayerName, Mood][]` and `[PlayerId, boolean][]`. Consumption sites require positional destructuring (`?.[1]`) that is hard to read. Two components (Lobby, Scores) independently build `nameOf` maps from the same tuple shape.

## Findings

- `src/types.ts:15-20` -- all wire arrays use tuples
- `src/client/Lobby.tsx:14,17` -- builds nameOf map, uses `?.[1]` for ready status
- `src/client/Scores.tsx:11` -- builds identical nameOf map

## Note

This is a genuine decision point. Tuples are slightly smaller on the wire, but the readability cost grows with each new consumer. At current project size (4 views), it's tolerable. Worth revisiting if you add more views.

## Acceptance Criteria

- [ ] Decided: keep tuples or switch to objects
