# Name entry for players joining via link

Extracted from #29 (game creation flow). Players who arrive via shared
URL or QR code land directly in the game lobby, bypassing the Lounge
where name entry currently happens.

## Problem

The Lounge prompts for a player name before joining. But a direct link
to `/games/:gameId` skips the Lounge entirely. These players need to be
prompted for their name before they can join.

## Possible approaches

- Redirect to Lounge first, then into the game
- Inline name prompt in the Lobby view (if no name is set)
- Modal/overlay on first visit

## Files

- `src/client/Lounge.tsx` — current name entry flow
- `src/client/Lobby.tsx` — where link-joiners land
- React Router route config — may need a guard or redirect

## Origin

- Issue #29 (now closed), Julianna's comment
- Related to #51 (lobby onboarding)
- Priority: p2-important
