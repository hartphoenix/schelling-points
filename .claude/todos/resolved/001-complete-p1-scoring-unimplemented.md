---
status: complete
priority: p1
issue_id: "001"
tags: [core-mechanics, game-logic]
dependencies: []
---

# Implement Scoring System

## Problem Statement

The scoring system is completely unimplemented. When the guess timer expires, an empty `Map<PlayerId, number>()` is created and sent to all clients. Every player sees 0 points every round. The game's core mechanic -- Schelling focal point matching -- produces no observable consequence.

## Findings

- `src/server/play.ts:60-61` -- `// TODO: Calculate scores` with empty scores map
- `Game.previousScores` (`src/server/types.ts:28`) and `PlayerInfo.previousScoresAndGuesses` (`src/server/types.ts:11`) are scaffolded but never populated
- `RoundScore` type (`src/server/types.ts:20-23`) exists but is unused
- The Scores component (`src/client/Scores.tsx`) correctly renders whatever scores arrive -- it just always receives zeros

## Proposed Solutions

### Option 1: Simple Match Scoring

**Approach:** Players who submit the same guess (case-insensitive, trimmed) each get +1 point per match. If 3 players all say "dog", each gets 2 points (one per match).

**Pros:**
- Simple to implement and understand
- Natural Schelling Point incentive (pick the most common answer)

**Cons:**
- Doesn't differentiate between 2-way and 5-way matches

**Effort:** 1-2 hours

**Risk:** Low

## Affected files

- `src/server/play.ts:59-61` -- implement score calculation
- `src/server/play.ts:92-100` -- accumulate round history

## Acceptance Criteria

- [ ] Players who submit matching guesses receive points
- [ ] Scores are sent to clients and displayed
- [ ] Guesses are normalized (trim, lowercase) before comparison
