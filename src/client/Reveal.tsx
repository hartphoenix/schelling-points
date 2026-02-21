import * as React from 'react'
import * as t from './types'
import { Box } from './mail'
import { Timer } from './components/timer'
import { ScatterPlot } from './components/ScatterPlot'

type Props = {
  gameId: t.GameId
  playerId: t.PlayerId
  playerName: t.PlayerName
  mood: t.Mood
  mailbox: Box
  centroidWord: string
  centroidIsRepeat: boolean
  positions: [t.PlayerId, number, number][]
  guesses: [t.PlayerId, string][]
  melded: boolean
  round: number
  totalRounds: number
  secsLeft?: number
  isReady: [t.PlayerId, boolean][]
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
}

export function Reveal({ gameId, playerId, playerName, mailbox, centroidWord, centroidIsRepeat, positions, guesses, melded, round, totalRounds, secsLeft, isReady, otherPlayers }: Props) {
  const totalDuration = React.useRef(secsLeft).current

  const nameOf = new Map(otherPlayers.map(([id, name]) => [id, name]))
  nameOf.set(playerId, playerName)

  const myGuess = guesses.find(([id]) => id === playerId)?.[1]
  const amReady = isReady.find(([id]) => id === playerId)?.[1] ?? false

  function handleToggleReady() {
    mailbox.send({ type: 'REVEAL_READY', gameId, playerId, isReady: !amReady })
  }

  const roundLabel = round + 1 > totalRounds
    ? `Round ${round + 1}`
    : `Round ${round + 1} of ${totalRounds}`

  return (
    <div className="screen reveal">
      <div className="screen-topbar">
        <span />
        {secsLeft !== undefined
          ? <div className="timer" style={{ '--timer-duration': `${totalDuration}s` } as React.CSSProperties}>
              <svg viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" />
              </svg>
              <Timer secsLeft={secsLeft} />
            </div>
          : <span />
        }
      </div>

      <div className="screen-header">
        <h2>{roundLabel}</h2>
        <h1>{centroidWord}</h1>
        {centroidIsRepeat && <h2>(again)</h2>}
        {melded && <p className="meld-indicator">Mind Meld!</p>}
      </div>

      <div className="reveal-content">
        {positions.length > 0 && (
          <ScatterPlot positions={positions} playerId={playerId} nameOf={nameOf} guesses={guesses} />
        )}

        <div className="my-guess">
          <p>You said: {myGuess ? `"${myGuess}"` : '—'}</p>
        </div>
      </div>

      <div className="screen-footer">
        <button className="btn" onClick={handleToggleReady}>
          {amReady ? 'Waiting...' : 'Ready'}
        </button>
      </div>
    </div>
  )
}
