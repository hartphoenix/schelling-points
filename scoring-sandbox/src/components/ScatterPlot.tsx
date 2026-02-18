import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import type { PlayerResult } from '../types'

interface ScatterPlotProps {
  players: PlayerResult[]
  categoryPoint: { text: string; x: number; y: number }
}

function truncate(text: string, max = 20) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export default function ScatterPlot({ players, categoryPoint }: ScatterPlotProps) {
  const responseData = players.map((p) => ({
    x: p.x,
    y: p.y,
    label: truncate(p.text),
  }))

  const categoryData = [{ x: categoryPoint.x, y: categoryPoint.y, label: categoryPoint.text }]

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

          {/* Response points — blue circles */}
          <Scatter name="Responses" data={responseData} fill="#4466cc" shape="circle">
            <LabelList dataKey="label" position="top" fontSize={11} fill="#333" />
          </Scatter>

          {/* Category point — red diamond */}
          <Scatter name="Category" data={categoryData} fill="#cc3333" shape="diamond">
            <LabelList dataKey="label" position="top" fontSize={11} fill="#cc3333" />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
        <span style={{ color: '#cc3333' }}>◆ Category</span>
        {' · '}
        <span style={{ color: '#4466cc' }}>● Responses</span>
      </div>
    </div>
  )
}
