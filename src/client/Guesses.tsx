import * as React from 'react'
import * as t from './types'

function Timer(props: { secsLeft: number }) {
    return <div>{props.secsLeft}s</div>
}

function GuessInput(props: { onSubmit: (guess: string) => void }) {
    const [guess, setGuess] = React.useState('')

    return (
        <div>
            <input 
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
            />
            <button onClick={() => props.onSubmit(guess)}>
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

export function Guesses(props: { state: t.State }) {
    const view = props.state.view as t.View & { type: 'GUESSES' }

    function handleSubmit(guess: string) {
        props.state.mailbox.send({
            type: 'GUESS',
            gameId: view.gameId,
            playerId: props.state.playerId,
            guess,
        })
    }

    return (
        <div>
            <Timer secsLeft={view.secsLeft} />
            <h1>{view.category}</h1>
            <GuessInput onSubmit={handleSubmit} />
            <PlayerProgress hasGuessed={view.hasGuessed} />
        </div>
    )
}
