import * as React from 'react'
import * as t from './types'
import { Box } from './mail'

type BaseProps = {
  gameId: t.GameId
  playerId: t.PlayerId
  playerName: t.PlayerName
  mood: t.Mood
  mailbox: Box
  centroidHistory: string[]
  playerHistory: [string, string][]
}

type MeldProps = BaseProps & {
  isContinue?: false
  melded: boolean
  meldRound: number | null
}

type ContinueProps = BaseProps & {
  isContinue: true
  melded?: never
  meldRound?: never
}

type Props = MeldProps | ContinueProps

function HistoryTable({ playerHistory, centroidHistory, meldRound }: {
  playerHistory: [string, string][]
  centroidHistory: string[]
  meldRound?: number | null
}) {
  return (
    <div className="history-table">
      <div className="history-row history-header">
        <span>You Said</span>
        <span>Center</span>
      </div>
      {playerHistory.map(([guess, centroid], i) => {
        const isMeld = meldRound != null && i === meldRound
        return (
          <div
            key={i}
            className={`history-row ${isMeld ? 'history-meld' : ''}`}
          >
            {isMeld ? (
              <span className="history-meld-cell">{guess || '—'}</span>
            ) : (
              <>
                <span>{guess || '—'}</span>
                <span>{centroid || '—'}</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function GameEnd(props: Props) {
  const { gameId, playerId, playerName, mood, mailbox, centroidHistory, playerHistory } = props
  const [voted, setVoted] = React.useState(false)

  function handleBackToLounge() {
    mailbox.send({ type: 'JOIN_LOUNGE', playerId, playerName, mood })
  }

  function handleContinueVote(continuePlay: boolean) {
    mailbox.send({ type: 'CONTINUE_VOTE', gameId, playerId, continuePlay })
    setVoted(true)
  }

  // Continue prompt screen
  if (props.isContinue) {
    return (
      <div className="screen game-end">
        <div className="screen-header">
          <h1>Round 20 Reached</h1>
          <h2>Keep trying for a Mind Meld?</h2>
        </div>

        <HistoryTable playerHistory={playerHistory} centroidHistory={centroidHistory} />

        <div className="screen-footer">
          {voted ? (
            <p className="waiting-msg">Waiting for others...</p>
          ) : (
            <>
              <button className="btn" onClick={() => handleContinueVote(true)}>Keep Going</button>
              <button className="btn" onClick={() => handleContinueVote(false)}>I'm Out</button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Game end screen (meld or no-meld)
  const { melded, meldRound } = props

  return (
    <div className="screen game-end">
      <div className="screen-header">
        {melded
          ? <>
              <h1>Mind Meld!</h1>
              {meldRound != null && <h2>Round {meldRound + 1}</h2>}
            </>
          : <h1>Game Over</h1>
        }
      </div>

      <HistoryTable playerHistory={playerHistory} centroidHistory={centroidHistory} meldRound={meldRound} />

      <div className="screen-footer">
        <button className="btn" onClick={handleBackToLounge}>Back to Lounge</button>
      </div>
    </div>
  )
}
