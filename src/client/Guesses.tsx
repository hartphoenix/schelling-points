import * as React from 'react'
import * as t from './types'
import { Box } from './mail'
import { Timer } from './components/timer'

const colors = [                                                              
    '--pink', '--pink-light',                                                 
    '--coral', '--coral-light',                                                 
    '--gold', '--gold-light',                                                   
    '--green', '--green-light',                                                 
    '--teal', '--teal-light',                                                   
    '--blue', '--blue-light',                                                   
    '--cyan', '--cyan-light',                                                   
    '--lavender', '--lavender-light',
    '--purple', '--purple-light',
  ]

function GuessInput(props: { onSubmit: (guess: string) => void }) {
  const [guess, setGuess] = React.useState('')

  return (
    <div className="screen-footer">
      <input
        className="input"
        placeholder="guess here..."
        type="text"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
      />
      <button className="btn" onClick={() => guess && props.onSubmit(guess)}>
        Lock In
      </button>
    </div>
  )
}

function PlayerProgress(props: { hasGuessed: [string, boolean][] }) {
  const lockedIn = props.hasGuessed.filter(([_, done]) => done).length
  const total = props.hasGuessed.length

  return <div className="player-progress"> 
            <p>{lockedIn} of {total} locked in</p>
            <div className="player-progress-dots">
              {props.hasGuessed.map(([id, done], i) => ( 
                <div                                                                      
                  key={id}
                  className="player-progress-dot"
                  style={{
                    background: `var(${colors[i % colors.length]})`,
                    opacity: done ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
         </div>
}

type Props = {
  mailbox: Box
  playerId: t.PlayerId
  gameId: t.GameId
  category: string
  secsLeft: number
  hasGuessed: [t.PlayerId, boolean][]
  round: number
  totalRounds: number
}

export function Guesses({ mailbox, playerId, gameId, category, secsLeft, hasGuessed, round, totalRounds }: Props) {
  function handleSubmit(guess: string) {
    mailbox.send({
      type: 'GUESS',
      gameId,
      playerId,
      guess,
    })
  }

  return (
    <div className="screen guesses">
      <div className="screen-topbar">
        <button className="btn-back">‹</button>
        {/*add leave function for btn-back and instructions popover button*/}
        <div className="timer">
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" />
          </svg>
          <Timer secsLeft={secsLeft} />
        </div>
      </div>
      <div className="screen-header">
        <h2>Communicate Without Speaking</h2>
        <h1>Round {round + 1} of {totalRounds}</h1>
        {/*should add the game id feature here */}
      </div>
      <div className="category-display">
        <h1>{category}</h1>
      </div>
      <div className="screen-footer">
        <PlayerProgress hasGuessed={hasGuessed} />
        <GuessInput onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
