import type { PlayerResult, ScoringMode } from '../types'

const modeKey: Record<ScoringMode, keyof PlayerResult> = {
  schelling: 'schellingScore',
  bullseye: 'bullseyeScore',
  darkHorse: 'darkHorseScore',
}

const modeKeyB: Record<ScoringMode, keyof PlayerResult> = {
  schelling: 'schellingScoreB',
  bullseye: 'bullseyeScoreB',
  darkHorse: 'darkHorseScoreB',
}

interface RadialPlotProps {
  players: PlayerResult[]
  activeMode: ScoringMode
  centroidScores: { schelling: number; bullseye: number; darkHorse: number }
  centroidScoresB?: { schelling: number; bullseye: number; darkHorse: number }
}

function truncate(text: string, max = 20) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

const SIZE = 400
const CENTER = SIZE / 2
const RADIUS = SIZE / 2 - 40 // leave room for labels

export default function RadialPlot({ players, activeMode, centroidScores, centroidScoresB }: RadialPlotProps) {
  const key = modeKey[activeMode]
  const keyB = modeKeyB[activeMode]
  const isDual = players[0]?.schellingScoreB !== undefined

  const centroidScore = centroidScores[activeMode]
  const centroidRadius = (1 - centroidScore) * RADIUS

  const centroidRadiusB = centroidScoresB
    ? (1 - centroidScoresB[activeMode]) * RADIUS
    : 0

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

        {/* Centroid reference circle — green dashed (A) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={centroidRadius}
          fill="none"
          stroke="#22883e"
          strokeWidth={1.5}
          strokeDasharray="6 3"
        />

        {/* Centroid reference circle — orange dashed (B) */}
        {centroidScoresB && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={centroidRadiusB}
            fill="none"
            stroke="#cc8833"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
        )}

        {/* Response points */}
        {players.map((p, i) => {
          const score = p[key] as number
          const dist = (1 - score) * RADIUS
          const angle = (2 * Math.PI * i) / players.length - Math.PI / 2 // start from top
          const x = CENTER + dist * Math.cos(angle)
          const y = CENTER + dist * Math.sin(angle)

          // B dot (same angle, different distance)
          const scoreB = isDual ? (p[keyB] as number) : undefined
          const distB = scoreB !== undefined ? (1 - scoreB) * RADIUS : 0
          const xB = CENTER + distB * Math.cos(angle)
          const yB = CENTER + distB * Math.sin(angle)

          // Place label slightly further out from the furthest dot
          const labelDist = Math.max(dist, isDual ? distB : 0) + 14
          const lx = CENTER + labelDist * Math.cos(angle)
          const ly = CENTER + labelDist * Math.sin(angle)

          return (
            <g key={p.index}>
              <circle cx={x} cy={y} r={5} fill="#4466cc" />
              {isDual && scoreB !== undefined && (
                <circle cx={xB} cy={yB} r={5} fill="#cc8833" />
              )}
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
        {isDual ? (
          <>
            <span style={{ color: '#4466cc' }}>● Responses (A)</span>
            {' · '}
            <span style={{ color: '#cc8833' }}>● Responses (B)</span>
            {' · '}
            <span style={{ color: '#22883e' }}>- - Centroid (A)</span>
            {' · '}
            <span style={{ color: '#cc8833' }}>- - Centroid (B)</span>
            {' · '}
            <span>Center = 1.0, edge = 0.0</span>
          </>
        ) : (
          <>
            <span style={{ color: '#4466cc' }}>● Responses</span>
            {' · '}
            <span style={{ color: '#22883e' }}>- - Centroid</span>
            {' · '}
            <span>Center = score 1.0, edge = score 0.0</span>
          </>
        )}
      </div>
    </div>
  )
}
