import * as t from './types'
import * as React from 'react'
import { Timer } from './components/timer'
import { playerColor } from './playerColor'

type Props = {
  gameId: t.GameId
  playerId: t.PlayerId
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

function RoundTopbar({ round, totalRounds, secsLeft }: {
  round: number
  totalRounds: number
  secsLeft?: number
}) {
  return (
    <div className="screen-topbar">
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

function GameOverFooter({ standings }: {
  standings: { name: string, score: number }[]
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
      <button className="btn">Back to Lounge</button>
    </div>
  )
}

export function Scores({ gameId, playerId, mailbox, scores, category, otherPlayers, isReady, secsLeft, round, totalRounds, guesses }: Props) {
  const nameOf = new Map(otherPlayers.map(([id, name]) => [id, name]))

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
      <RoundTopbar round={round} totalRounds={totalRounds} secsLeft={secsLeft} />
      <CategoryHeader category={category} />
      <div className="visualization-placeholder" />
      <MyResult guess={myGuess} score={myScore} />
      <AllResultsDropdown results={allResults} />
      {isGameOver
        ? <GameOverFooter standings={standings} />
        : <ReadyFooter isReady={amReady} onToggle={handleToggleReady} />
      }
    </div>
  )
}