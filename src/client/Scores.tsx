import * as t from './types'

type Props = {
  gameId: t.GameId
  scores: [t.PlayerId, number][]
  category: string
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
}

export function Scores({ gameId, scores, category, otherPlayers }: Props) {
  const nameOf = new Map(otherPlayers.map(([id, name]) => [id, name]))

  // Sort descending by score
  const sorted = [...scores].sort((a, b) => b[1] - a[1])

  return (
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
      {/* TODO: "Next Round" / "Game Over" — needs server message */}
    </div>
  )
}