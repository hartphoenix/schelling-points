# Join Game by ID input in Lounge

Extracted from #29 (game creation flow). The P1 bug is fixed — creators
now auto-join their game. But there's no way for other players to join
by typing a game ID.

## Decision (from #29 comments, Julianna + team)

Games should be **unlisted** (no public game list). Players join via:
1. QR code (done — #22)
2. Shared URL (done — PR #45)
3. **"Join Game" button → game ID input field** (not implemented)

The input should be forgiving: ignore spaces, hyphens, underscores,
capitalization — just match on the letters.

## Files

- `src/client/Lounge.tsx` — add "Join Game" button + input
- `src/server/play.ts` — SUBSCRIBE_GAME handler already exists

## Origin

- Issue #29 (now closed), decision #3
- Priority: p2-important
