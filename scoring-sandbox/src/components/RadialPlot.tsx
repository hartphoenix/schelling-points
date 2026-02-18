import type { PlayerResult, ScoringMode } from '../types'

const modeKey: Record<ScoringMode, keyof PlayerResult> = {
  schelling: 'schellingScore',
  bullseye: 'bullseyeScore',
  darkHorse: 'darkHorseScore',
}

interface RadialPlotProps {
  players: PlayerResult[]
  activeMode: ScoringMode
  centroidScores: { schelling: number; bullseye: number; darkHorse: number }
}

function truncate(text: string, max = 20) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

const SIZE = 400
const CENTER = SIZE / 2
const RADIUS = SIZE / 2 - 40 // leave room for labels

export default function RadialPlot({ players, activeMode, centroidScores }: RadialPlotProps) {
  const key = modeKey[activeMode]
  const centroidScore = centroidScores[activeMode]
  const centroidRadius = (1 - centroidScore) * RADIUS

  const gridLines = [0.25, 0.5, 0.75].map((frac) => frac * RADIUS)

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Radial View</h3>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" style={{ maxHeight: 400 }}>
        {/* Concentric gridlines */}
        {gridLines.map((r) => (
          <circle
            key={r}
            cx={CENTER}
            cy={CENTER}
            r={r}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth={1}
          />
        ))}
        {/* Outer boundary */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#ccc" strokeWidth={1} />

        {/* Centroid reference circle — green dashed */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={centroidRadius}
          fill="none"
          stroke="#22883e"
          strokeWidth={1.5}
          strokeDasharray="6 3"
        />

        {/* Response points */}
        {players.map((p, i) => {
          const score = p[key] as number
          const dist = (1 - score) * RADIUS
          const angle = (2 * Math.PI * i) / players.length - Math.PI / 2 // start from top
          const x = CENTER + dist * Math.cos(angle)
          const y = CENTER + dist * Math.sin(angle)

          // Place label slightly further out
          const labelDist = dist + 14
          const lx = CENTER + labelDist * Math.cos(angle)
          const ly = CENTER + labelDist * Math.sin(angle)

          return (
            <g key={p.index}>
              <circle cx={x} cy={y} r={5} fill="#4466cc" />
              <text
                x={lx}
                y={ly}
                fontSize={10}
                fill="#333"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {truncate(p.text)}
              </text>
            </g>
          )
        })}

        {/* Center dot */}
        <circle cx={CENTER} cy={CENTER} r={2} fill="#999" />
      </svg>

      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
        <span style={{ color: '#4466cc' }}>● Responses</span>
        {' · '}
        <span style={{ color: '#22883e' }}>- - Centroid</span>
        {' · '}
        <span>Center = score 1.0, edge = score 0.0</span>
      </div>
    </div>
  )
}
