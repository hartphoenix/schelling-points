import * as React from 'react'
import * as t from './types'
import { Box } from './mail'
import { Timer } from './components/timer'

function GuessInput(props: { onSubmit: (guess: string) => void }) {
  const [guess, setGuess] = React.useState('')

  return (
    <div>
      <input
        type="text"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
      />
      <button onClick={() => guess && props.onSubmit(guess)}>
        Submit
      </button>
    </div>
  )
}

function PlayerProgress(props: { hasGuessed: [string, boolean][] }) {
  const lockedIn = props.hasGuessed.filter(([_, done]) => done).length
  const total = props.hasGuessed.length

  return <div>{lockedIn} of {total} locked in</div>
}

type Props = {
  mailbox: Box
  playerId: t.PlayerId
  gameId: t.GameId
  category: string
  secsLeft: number
  hasGuessed: [t.PlayerId, boolean][]
}

export function Guesses({ mailbox, playerId, gameId, category, secsLeft, hasGuessed }: Props) {
  function handleSubmit(guess: string) {
    mailbox.send({
      type: 'GUESS',
      gameId,
      playerId,
      guess,
    })
  }

  return (
    <div>
      <Timer secsLeft={secsLeft} />s
      <h1>{category}</h1>
      <GuessInput onSubmit={handleSubmit} />
      <PlayerProgress hasGuessed={hasGuessed} />
    </div>
  )
}
