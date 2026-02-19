import * as React from 'react'
import * as t from './types'
import { Box } from './mail'

type Props = {
  mailbox: Box
  playerId: t.PlayerId
  mood: t.Mood
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
}

export function Lounge({ mailbox, playerId, mood, otherPlayers }: Props) {
  const savedName = localStorage.getItem('playerName') ?? ''
  const [playerName, setPlayerName] = React.useState(savedName)
  const [joined, setJoined] = React.useState(false)

  function handleJoin() {
    if (!playerName.trim()) return
    localStorage.setItem('playerName', playerName)
    mailbox.send({ type: 'JOIN_LOUNGE', playerId, playerName, mood })
    setJoined(true)
  }

  function handleNewGame() {
    mailbox.send({ type: 'NEW_GAME', playerId })
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
      {/* TODO: mood picker — sends SET_PLAYER_INFO */}
    </div>
  )
}