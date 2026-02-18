import { useState, type JSX } from "react"
import { Box } from "./mail"
import * as t from "./types"

export const Lounge = ({ state }: { state: t.State }): JSX.Element => {
  const [playerName, setPlayerName] = useState('')
  const [joined, setJoined] = useState(false)

  function handleJoin() {
    if (!playerName.trim()) return
    state.mailbox.send({ type: 'JOIN_LOUNGE', playerId: state.playerId, playerName })
    setJoined(true)
    {/* need to ensure server handles player join & state updates view */ }
  }

  function handleNewGame() {
    state.mailbox.send({ type: 'NEW_GAME' })
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
        {state.otherPlayers.map(([id, name, mood]) => (
          <li key={id}>{mood} {name}</li>
        ))}
      </ul>
      <button onClick={handleNewGame}>New Game</button>
      {/* TODO: mood picker — sends SET_MOOD */}
    </div>
  )
}
