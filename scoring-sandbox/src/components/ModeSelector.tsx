import type { ScoringMode } from '../types'

const modes: { value: ScoringMode; label: string }[] = [
  { value: 'schelling', label: 'Schelling Point' },
  { value: 'bullseye', label: 'Bullseye' },
  { value: 'darkHorse', label: 'Dark Horse' },
]

interface ModeSelectorProps {
  activeMode: ScoringMode
  onModeChange: (mode: ScoringMode) => void
}

export default function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <strong>Scoring Mode:</strong>
      {modes.map(({ value, label }) => (
        <label key={value} style={{ cursor: 'pointer' }}>
          <input
            type="radio"
            name="scoringMode"
            value={value}
            checked={activeMode === value}
            onChange={() => onModeChange(value)}
          />{' '}
          {label}
        </label>
      ))}
    </div>
  )
}
