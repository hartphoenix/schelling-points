import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts'
import type { ComputeResult, PlayerResult, ScoringMode } from '../types'

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

interface ScatterPlotProps {
  players: PlayerResult[]
  categoryPoint: { text: string; x: number; y: number }
  centroidPoint: { x: number; y: number }
  activeMode: ScoringMode
  promptBData?: ComputeResult['promptB']
  activePrompt: 'A' | 'B'
}

function truncate(text: string, max = 20) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

/** Map a score (0–1) to a point radius (4–16px) */
function scoreToSize(score: number): number {
  return 4 + score * 12
}

export default function ScatterPlot({ players, categoryPoint, centroidPoint, activeMode, promptBData, activePrompt }: ScatterPlotProps) {
  const useB = activePrompt === 'B' && !!promptBData
  const key = useB ? modeKeyB[activeMode] : modeKey[activeMode]

  const responseData = players.map((p, i) => {
    const coords = useB ? promptBData!.playerCoords[i] : { x: p.x, y: p.y }
    return {
      x: coords.x,
      y: coords.y,
      label: truncate(p.text),
      size: scoreToSize((p[key] as number) ?? 0),
    }
  })

  const activeCategoryPoint = useB ? promptBData!.categoryPoint : categoryPoint
  const activeCentroidPoint = useB ? promptBData!.centroidPoint : centroidPoint

  const categoryData = [{ x: activeCategoryPoint.x, y: activeCategoryPoint.y, label: activeCategoryPoint.text }]
  const centroidData = [{ x: activeCentroidPoint.x, y: activeCentroidPoint.y, label: 'Centroid' }]

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>2D Projection</h3>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" tick={false} name="x" />
          <YAxis type="number" dataKey="y" tick={false} name="y" />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null
              const data = payload[0].payload as { label: string }
              return (
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #ccc',
                    padding: '4px 8px',
                    fontSize: 12,
                  }}
                >
                  {data.label}
                </div>
              )
            }}
          />

          {/* Response points — blue circles, sized by active mode score */}
          <Scatter name="Responses" data={responseData} fill="#4466cc" shape="circle">
            {responseData.map((entry, i) => (
              <Cell key={i} r={entry.size} />
            ))}
            <LabelList dataKey="label" position="top" fontSize={11} fill="#333" />
          </Scatter>

          {/* Category point — red diamond */}
          <Scatter name="Category" data={categoryData} fill="#cc3333" shape="diamond">
            <LabelList dataKey="label" position="top" fontSize={11} fill="#cc3333" />
          </Scatter>

          {/* Centroid — green circle */}
          <Scatter name="Centroid" data={centroidData} fill="#22883e" shape="circle">
            <LabelList dataKey="label" position="top" fontSize={11} fill="#22883e" />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
        <span style={{ color: '#cc3333' }}>◆ Category</span>
        {' · '}
        <span style={{ color: '#4466cc' }}>● Responses</span>
        {' · '}
        <span style={{ color: '#22883e' }}>● Centroid</span>
      </div>
    </div>
  )
}
