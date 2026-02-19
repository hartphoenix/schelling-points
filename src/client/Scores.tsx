import * as t from './types'

type Props = {
  gameId: t.GameId
  playerId: t.PlayerId
  mailbox: t.State["mailbox"]
  scores: [t.PlayerId, number][]
  category: string
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
  isReady: [string, boolean][]
  secsLeft: number | undefined
}

export function Scores({ gameId, playerId, mailbox, scores, category, otherPlayers, isReady, secsLeft }: Props) {
  const nameOf = new Map(otherPlayers.map(([id, name]) => [id, name]))

  // Sort descending by score
  const sorted = [...scores].sort((a, b) => b[1] - a[1])
  // This player's readiness state -- may become a local state variable for optimistic render
  const amReady = isReady.find(([id]) => id === playerId)?.[1]

  const handleToggleReady = () => {
    const currentlyReady = isReady.find(([id]) => id === playerId)?.[1] ?? false
    mailbox.send({ type: 'SCORES_READY', gameId, playerId, isReady: !currentlyReady })
    // TODO: may need optimistic render via useState
  }

  return (
    <>
      <div className="scores">
        <h2>Results: {category}</h2>
        <table>
          <thead>
            <tr><th>Player</th><th>Score</th></tr>
          </thead>
          <tbody>
            {sorted.map(([id, score]) => (
              <tr key={id}>
                <td>{nameOf.get(id) ?? id}</td>
                <td>{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        {secsLeft !== undefined
          && <p>Starting in {Math.ceil(secsLeft)}...</p>}
        <button className={amReady ? 'ready-btn' : 'unready-btn'} onClick={handleToggleReady}>
          {amReady ? 'Unready' : 'Ready'}
        </button>
      </div>
    </>
  )
}