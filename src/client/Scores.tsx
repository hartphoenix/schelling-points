import * as t from './types'
import * as React from 'react'
import { Timer } from './components/timer'
import { playerColor } from './playerColor'
import { LeaveGameDialog } from './LeaveGameDialog'

type Props = {
  gameId: t.GameId
  playerId: t.PlayerId
  playerName: t.PlayerName
  mood: t.Mood
  mailbox: t.State["mailbox"]
  scores: [t.PlayerId, number][]
  positions?: [t.PlayerId, number, number][]
  category: string
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
  isReady: [string, boolean][]
  secsLeft: number | undefined
  round: number
  totalRounds: number
  guesses?: [t.PlayerId, string][]
}

function RoundTopbar({ round, totalRounds, secsLeft, onBack }: {
  round: number
  totalRounds: number
  secsLeft?: number
  onBack: () => void
}) {
  return (
    <div className="screen-topbar">
      <button className="btn-back" onClick={onBack}>‹</button>
      <span>Round {round + 1} of {totalRounds}</span>
      {secsLeft !== undefined
        ? <span><Timer secsLeft={secsLeft} />s</span>
        : <span />
      }
    </div>
  )
}

function CategoryHeader({ category }: { category: string }) {
  return (
    <div className="screen-header">
      <h1>{category}</h1>
    </div>
  )
}

function MyResult({ guess, score }: {
  guess?: string
  score?: number
}) {
  return (
    <div className="my-result">
      {guess !== undefined
        ? <p>Your guess: <strong>{guess}</strong></p>
        : <p>No guess submitted</p>
      }
      {score !== undefined
        ? <p className="my-score">+{score} pts</p>
        : null
      }
    </div>
  )
}

function AllResultsDropdown({ results }: {
  results: { name: string, guess: string, score: number, color: string }[]
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="all-results">
      <button
        className="dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '▲' : '▼'} All Results
      </button>
      {isOpen && (
        <ul className="results-list">
          {results.map((r, i) => (
            <li key={i}>
              <span className="player-dot" style={{background: `var(${r.color})`}} />
              {r.name}: "{r.guess}" - +{r.score} pts
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReadyFooter({ isReady, onToggle }: {
  isReady: boolean
  onToggle: () => void
}) {
  return (
    <div className="screen-footer">
      <button className="btn" onClick={onToggle}>
        {isReady ? 'Waiting...' : 'Ready'}
      </button>
    </div>
  )
}

function GameOverFooter({ standings, onBackToLounge }: {
  standings: { name: string, score: number }[]
  onBackToLounge: () => void
}) {
  return (
    <div className="screen-footer">
      <h2>Final Standings</h2>
      <ol className="standings-list">
        {standings.map((s, i) => (
          <li key={i}>
            {i === 0 ? '👑 ' : ''}{s.name} - {s.score} pts
          </li>
        ))}
      </ol>
      <button className="btn" onClick={onBackToLounge}>Back to Lounge</button>
    </div>
  )
}

const PLOT_SIZE = 300
const PLOT_CENTER = PLOT_SIZE / 2
const PLOT_RADIUS = PLOT_SIZE / 2 - 30

function ScatterPlot({ positions, playerId, nameOf, guesses }: {
  positions: [t.PlayerId, number, number][]
  playerId: t.PlayerId
  nameOf: Map<t.PlayerId, string>
  guesses?: [t.PlayerId, string][]
}) {
  const guessOf = new Map(guesses?.map(([id, g]) => [id, g]))
  const gridLines = [0.25, 0.5, 0.75].map(frac => frac * PLOT_RADIUS)

  return (
    <svg className="scatter-plot" viewBox={`0 0 ${PLOT_SIZE} ${PLOT_SIZE}`}>
      {gridLines.map(r => (
        <circle key={r} cx={PLOT_CENTER} cy={PLOT_CENTER} r={r}
          fill="none" stroke="#e0e0e0" strokeWidth={1} />
      ))}
      <circle cx={PLOT_CENTER} cy={PLOT_CENTER} r={PLOT_RADIUS}
        fill="none" stroke="#ccc" strokeWidth={1} />

      <circle cx={PLOT_CENTER} cy={PLOT_CENTER} r={3} fill="#999" />

      {positions.map(([id, x, y]) => {
        const svgX = PLOT_CENTER + x * PLOT_RADIUS
        const svgY = PLOT_CENTER + y * PLOT_RADIUS
        const isMe = id === playerId
        const name = nameOf.get(id) ?? id
        const guess = guessOf.get(id) ?? ''
        const label = guess ? `${name}: "${guess}"` : name

        return (
          <g key={id}>
            <circle cx={svgX} cy={svgY} r={isMe ? 6 : 4}
              fill={isMe ? '#ff6b35' : '#4466cc'} />
            <text x={svgX} y={svgY - 10}
              fontSize={11} fill="var(--cream)" textAnchor="middle"
              fontFamily="DM Sans, sans-serif" fontWeight={700}
              letterSpacing="0.1em">
              {label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function Scores({ gameId, playerId, playerName, mood, mailbox, scores, positions, category, otherPlayers, isReady, secsLeft, round, totalRounds, guesses }: Props) {
  const [showLeaveDialog, setShowLeaveDialog] = React.useState(false)

  function handleLeave() {
    mailbox.send({ type: 'LEAVE_GAME', gameId, playerId })
  }

  const nameOf = new Map(otherPlayers.map(([id, name]) => [id, name]))
  nameOf.set(playerId, playerName)

  //My data
  const myGuess = guesses?.find(([id]) => id === playerId)?.[1]
  const myScore = scores.find(([id]) => id === playerId)?.[1]

  // All results for the dropdown
  const allResults = scores.map(([id, score]) => ({
    name: nameOf.get(id) ?? id,
    guess: guesses?.find(([gId]) => gId === id)?.[1] ?? '-',
    score,
    color: playerColor(id).primary,
  })).sort((a, b) => b.score - a.score)

  // OLD CODE - Sort descending by score
  // const sorted = [...scores].sort((a, b) => b[1] - a[1])
  // OLD CODE - This player's readiness state -- may become a local state variable for optimistic render
  // const amReady = isReady.find(([id]) => id === playerId)?.[1]

  // Final standings for game-over
  // TODO: needs culumative scores, not just this round
  const isGameOver = round + 1 >= totalRounds
  const standings = allResults.map(r => ({ name: r.name, score: r.score }))

  const handleToggleReady = () => {
    const currentlyReady = isReady.find(([id]) => id === playerId)?.[1] ?? false
    mailbox.send({ type: 'SCORES_READY', gameId, playerId, isReady: !currentlyReady })
    // TODO: may need optimistic render via useState
  }
  const amReady = isReady.find(([id]) => id === playerId)?.[1] ?? false

  return (
    <div className="screen">
      <LeaveGameDialog
        open={showLeaveDialog}
        onConfirm={handleLeave}
        onCancel={() => setShowLeaveDialog(false)}
      />
      <RoundTopbar round={round} totalRounds={totalRounds} secsLeft={secsLeft} onBack={() => setShowLeaveDialog(true)} />
      <CategoryHeader category={category} />
      {positions && positions.length > 0
        ? <ScatterPlot positions={positions} playerId={playerId} nameOf={nameOf} guesses={guesses} />
        : <div className="visualization-placeholder" />
      }
      <MyResult guess={myGuess} score={myScore} />
      <AllResultsDropdown results={allResults} />
      {isGameOver
        ? <GameOverFooter standings={standings} onBackToLounge={handleLeave} />
        : <ReadyFooter isReady={amReady} onToggle={handleToggleReady} />
      }
    </div>
  )
}