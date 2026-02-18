import * as t from './types'
import { Box } from './mail'

type Props = {
  mailbox: Box
  playerId: t.PlayerId
  gameId: t.GameId
  isReady: [t.PlayerId, boolean][]
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
}

export function Lobby({ mailbox, playerId, gameId, isReady, otherPlayers }: Props) {
  // Build a name lookup from otherPlayers
  const nameOf = new Map(otherPlayers.map(([id, name]) => [id, name]))

  function handleToggleReady() {
    // BLOCKED: no TOGGLE_READY message type yet
    console.warn('TOGGLE_READY not yet in types.ts')
  }

  return (
    <div className="lobby">
      <h2>Game: {gameId}</h2>
      <ul>
        {isReady.map(([id, ready]) => (
          <li key={id}>
            {nameOf.get(id) ?? id} — {ready ? 'Ready' : 'Waiting'}
          </li>
        ))}
      </ul>
      <button onClick={handleToggleReady}>
        {isReady.find(([id]) => id === playerId)?.[1] ? 'Unready' : 'Ready'}
      </button>
      {/* TODO: QR code + copy URL for sharing */}
    </div>
  )
} 