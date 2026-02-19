---
status: done
priority: p2
issue_id: "011"
tags: [code-quality, server]
dependencies: []
---

# Switch Cases Need Block Scope + Duplicated Phase Init

## Problem Statement

`onClientMessage` switch cases share scope, forcing unique variable names (`game`, `lobbyGame`, `scoreGame`). The GUESSES phase initialization code is also duplicated in two places in `onTickGame` (lines 45-51 and 92-100, with a TODO acknowledging it).

## Findings

- `src/server/play.ts:111-248` -- switch cases without `{}` blocks
- `src/server/play.ts:45-51, 92-100` -- `// TODO: Make a function so this is not duplicated above`
- MEMBER_CHANGE broadcast constructed manually in 3 places (play.ts:132-136, 203-207, types.ts:78-84)

## Proposed Solutions

### Option 1: Add block braces + extract helpers

**Approach:** Wrap each case in `{}`. Extract `newGuessPhase(round, category)` helper. Add `Game.memberChangeMessage(gameId)` method.

**Effort:** 30 minutes

**Risk:** Low

## Affected files

- `src/server/play.ts` -- block scopes, extract helper
- `src/server/types.ts` -- add memberChangeMessage to Game class

## Acceptance Criteria

- [ ] Each switch case has its own block scope
- [ ] GUESSES phase init not duplicated
- [ ] MEMBER_CHANGE construction not duplicated
