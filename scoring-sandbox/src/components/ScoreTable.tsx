import type { ScoringMode, PlayerResult } from '../types'

interface ScoreTableProps {
  players: PlayerResult[]
  activeMode: ScoringMode
}

const modeKey: Record<ScoringMode, keyof PlayerResult> = {
  schelling: 'schellingScore',
  bullseye: 'bullseyeScore',
  darkHorse: 'darkHorseScore',
}

const columnHeaders: { key: keyof PlayerResult; label: string; mode: ScoringMode }[] = [
  { key: 'schellingScore', label: 'Schelling', mode: 'schelling' },
  { key: 'bullseyeScore', label: 'Bullseye', mode: 'bullseye' },
  { key: 'darkHorseScore', label: 'Dark Horse', mode: 'darkHorse' },
]

export default function ScoreTable({ players, activeMode }: ScoreTableProps) {
  const sortKey = modeKey[activeMode]
  const sorted = [...players].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th style={thStyle}>#</th>
          <th style={{ ...thStyle, textAlign: 'left' }}>Response</th>
          {columnHeaders.map(({ key, label, mode }) => (
            <th
              key={key}
              style={{
                ...thStyle,
                fontWeight: mode === activeMode ? 'bold' : 'normal',
                background: mode === activeMode ? '#e8e8ff' : 'transparent',
              }}
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((player) => (
          <tr key={player.index}>
            <td style={tdStyle}>{player.index}</td>
            <td style={{ ...tdStyle, textAlign: 'left' }}>{player.text}</td>
            {columnHeaders.map(({ key, mode }) => (
              <td
                key={key}
                style={{
                  ...tdStyle,
                  fontWeight: mode === activeMode ? 'bold' : 'normal',
                  background: mode === activeMode ? '#f4f4ff' : 'transparent',
                }}
              >
                {(player[key] as number).toFixed(3)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '2px solid #ccc',
  textAlign: 'right',
}

const tdStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderBottom: '1px solid #eee',
  textAlign: 'right',
}
