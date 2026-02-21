import * as t from '../types'
import { playerColor } from '../playerColor'

export const PLOT_SIZE = 300
export const PLOT_CENTER = PLOT_SIZE / 2
export const PLOT_RADIUS = PLOT_SIZE / 2 - 30

export function ScatterPlot({ positions, playerId, nameOf, guesses }: {
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
              fill={`var(${playerColor(id).primary})`} />
            <text x={svgX} y={svgY - 10}
              fontSize={11} fill="var(--cream)" textAnchor="middle"
              fontFamily="DM Sans, sans-serif" fontWeight={700}
              letterSpacing="0.1em" opacity="0" >
              {label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
