---
status: done
priority: p2
issue_id: "010"
tags: [client, state-management]
dependencies: []
---

# Player Name Only in Local State -- Not Persisted or Synced

## Problem Statement

The player's name is captured in `Lounge` component local state (`useState`), sent to the server via `JOIN_LOUNGE`, but never stored in the app-level `State`. `state.playerName` stays as `''` forever. Additionally, there's no localStorage persistence -- every page refresh generates a new identity.

## Findings

- `src/client/types.ts:27` -- `// TODO: Check local storage for existing playerId and playerName`
- `src/client/types.ts:18,34` -- `state.playerName` initialized to `''`, never updated
- `src/client/Lounge.tsx:13` -- name lives in local `useState`, lost on view change
- `src/client.tsx:37` -- `onMessage` reducer has no case that updates playerName

## Proposed Solutions

### Option 1: Persist to localStorage + update state

**Approach:** On join, save playerId and playerName to localStorage. On init, check localStorage first. Update app state when name is set.

**Effort:** 30 minutes

**Risk:** Low

## Affected files

- `src/client/types.ts:22-37` -- check localStorage in initialState
- `src/client.tsx` -- add mechanism to update playerName in state

## Acceptance Criteria

- [ ] Page refresh preserves player identity
- [ ] `state.playerName` reflects the actual player name
