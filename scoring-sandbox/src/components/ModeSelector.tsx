import type { ScoringMode } from '../types'

const modes: { value: ScoringMode; label: string; description: string }[] = [
  { value: 'schelling', label: 'Schelling Point', description: 'Closest to group consensus' },
  { value: 'bullseye', label: 'Bullseye', description: 'Closest to category meaning' },
  { value: 'darkHorse', label: 'Dark Horse', description: 'On-topic but unique' },
]

interface ModeSelectorProps {
  activeMode: ScoringMode
  onModeChange: (mode: ScoringMode) => void
}

export default function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <strong>Scoring Mode:</strong>
      {modes.map(({ value, label, description }) => (
        <label key={value} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
          <span>
            <input
              type="radio"
              name="scoringMode"
              value={value}
              checked={activeMode === value}
              onChange={() => onModeChange(value)}
            />{' '}
            {label}
          </span>
          <span style={{ fontSize: 11, color: '#666', marginLeft: 20 }}>{description}</span>
        </label>
      ))}
    </div>
  )
}
