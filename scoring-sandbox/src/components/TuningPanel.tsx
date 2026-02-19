import React from 'react'

interface TuningPanelProps {
  exponent: number
  onExponentChange: (n: number) => void
  floor: number
  onFloorChange: (t: number) => void
}

const helperStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#888',
  marginTop: 2,
  fontFamily: 'system-ui',
}

const sliderRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 4,
  fontFamily: 'system-ui',
}

const labelStyle: React.CSSProperties = {
  width: 70,
  fontWeight: 'bold',
  fontFamily: 'system-ui',
}

export default function TuningPanel({
  exponent,
  onExponentChange,
  floor,
  onFloorChange,
}: TuningPanelProps) {
  return (
    <details style={{ fontFamily: 'system-ui' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Tuning</summary>

      <div style={{ marginTop: '0.75rem' }}>
        {/* Exponent slider */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={sliderRow}>
            <span style={labelStyle}>Exponent</span>
            <input
              type="range"
              min={1.0}
              max={4.0}
              step={0.1}
              value={exponent}
              onInput={(e) =>
                onExponentChange(parseFloat((e.target as HTMLInputElement).value))
              }
            />
            <span style={{ minWidth: 30 }}>{exponent.toFixed(1)}</span>
          </div>
          <p style={helperStyle}>
            Higher = steeper gap between &lsquo;related&rsquo; and &lsquo;member of&rsquo;
          </p>
        </div>

        {/* Floor slider */}
        <div>
          <div style={sliderRow}>
            <span style={labelStyle}>Floor</span>
            <input
              type="range"
              min={0.0}
              max={0.6}
              step={0.05}
              value={floor}
              onInput={(e) =>
                onFloorChange(parseFloat((e.target as HTMLInputElement).value))
              }
            />
            <span style={{ minWidth: 30 }}>{floor.toFixed(2)}</span>
          </div>
          <p style={helperStyle}>
            Minimum category similarity &mdash; answers below this score 0
          </p>
        </div>
      </div>
    </details>
  )
}
