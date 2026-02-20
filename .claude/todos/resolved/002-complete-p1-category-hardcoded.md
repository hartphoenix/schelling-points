---
status: complete
priority: p1
issue_id: "002"
tags: [core-mechanics, game-logic]
dependencies: []
---

# Implement Category Selection

## Problem Statement

Category is hardcoded to `'animals'` for every round of every game. The TODO appears twice in `src/server/play.ts` (lines 42 and 90). Playing 10 rounds of "animals" breaks the core loop -- varied categories are what create interesting Schelling Point challenges.

## Findings

- `src/server/play.ts:42-43` -- first occurrence (lobby countdown -> guesses)
- `src/server/play.ts:90-91` -- second occurrence (score phase -> next round)
- No category list exists anywhere in the codebase yet

## Proposed Solutions

### Option 1: Static Category List

**Approach:** Define an array of categories in config or a separate file. Shuffle or rotate through them per round, avoiding repeats within a game.

**Effort:** 30 minutes

**Risk:** Low

## Affected files

- `src/config.ts` or new `src/server/categories.ts` -- category list
- `src/server/play.ts:42-43, 90-91` -- replace hardcoded value

## Acceptance Criteria

- [ ] Each round uses a different category
- [ ] Categories don't repeat within a single game
