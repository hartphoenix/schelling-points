---
status: done
priority: p1
issue_id: "006"
tags: [bug, server]
dependencies: []
---

# Map.has Passed Without Binding -- Runtime Crash

## Problem Statement

`state.games.has` is passed as a bare function reference, losing its `this` binding. This will throw `TypeError: Method Map.prototype.has called on incompatible receiver` when anyone creates a game.

## Findings

- `src/server/play.ts:161` -- `state.nameChooser.choose(state.games.has)`
- `src/server/names.ts:20-24` -- `choose()` calls `isDuplicate(name)` which invokes the unbound `has`

## Proposed Solutions

### Option 1: Arrow function wrapper

**Approach:** `state.nameChooser.choose((id) => state.games.has(id))`

**Effort:** 1 minute

**Risk:** None

## Affected files

- `src/server/play.ts:161` -- fix the binding

## Acceptance Criteria

- [ ] Game creation doesn't crash
