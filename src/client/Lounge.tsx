import * as React from 'react'
import * as t from './types'
import { Box } from './mail'

type Props = {
  mailbox: Box
  playerId: t.PlayerId
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
}

export function Lounge({ mailbox, playerId, otherPlayers }: Props) {
  const [playerName, setPlayerName] = React.useState('')
  const [joined, setJoined] = React.useState(false)

  function handleJoin() {
    if (!playerName.trim()) return
    mailbox.send({ type: 'JOIN_LOUNGE', playerId, playerName })
    setJoined(true)
  }

  function handleNewGame() {
    mailbox.send({ type: 'NEW_GAME' })
  }

  if (!joined) {
    return (
      <div className="lounge">
        <h1>Schelling Points</h1>
        <input
          type="text"
          placeholder="Your name"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <button onClick={handleJoin}>Join</button>
      </div>
    )
  }

  return (
    <div className="lounge">
      <h1>Lounge</h1>
      <ul>
        {otherPlayers.map(([id, name, mood]) => (
          <li key={id}>{mood} {name}</li>
        ))}
      </ul>
      <button onClick={handleNewGame}>New Game</button>
      {/* TODO: mood picker — sends SET_MOOD */}
    </div>
  )
}