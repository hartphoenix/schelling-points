# Agent-Resolvable Todos

Items Claude can fix autonomously — deterministic correct answers, no product
judgment required. Worked via `/workflows:work`.

## From 2026-02-18 Codebase Review (all resolved)

| # | Finding | Status |
|---|---------|--------|
| 003 | WebSocket messages not parsed (`JSON.parse` missing) | done |
| 004 | Tick loop never started (`startTicking` not called) | done |
| 006 | `Map.has` unbound method reference | done |
| 007 | Lobby countdown not wired to client | done |
| 009 | `MEMBER_CHANGE` clobbers context (ignores `gameId`) | done |
| 010 | `playerName` not synced (localStorage persistence) | done |
| 011 | Switch-case shared scope | done |
| 012 | Unnecessary lounge broadcast scoping | done |
| 014 | `playerName` vs `name` inconsistency | done |
| 017 | Missing error logging on guard clauses | done |
| 018 | Single player can start game (min-2 guard) | done |
| 019 | Player impersonation (playerId bound to socket) | done |
| 020 | Round counter hardcoded to zero | done |

Detailed todo files: `.claude/todos/`
