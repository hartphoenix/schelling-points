interface InputPanelProps {
  category: string
  onCategoryChange: (value: string) => void
  responses: string[]
  onResponsesChange: (responses: string[]) => void
  onCompute: () => void
  canCompute: boolean
  isLoading: boolean
}

export default function InputPanel({
  category,
  onCategoryChange,
  responses,
  onResponsesChange,
  onCompute,
  canCompute,
  isLoading,
}: InputPanelProps) {
  const nonEmptyCount = responses.filter((r) => r.trim()).length

  function updateResponse(index: number, value: string) {
    const next = [...responses]
    next[index] = value
    onResponsesChange(next)
  }

  function addResponse() {
    if (responses.length < 8) {
      onResponsesChange([...responses, ''])
    }
  }

  function removeResponse(index: number) {
    if (responses.length > 4) {
      onResponsesChange(responses.filter((_, i) => i !== index))
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <label>
          <strong>Category:</strong>
          <input
            type="text"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            placeholder='e.g. "animals"'
            style={{ marginLeft: 8, padding: '4px 8px', width: 300 }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <strong>Responses:</strong>
        <span style={{ marginLeft: 8, color: nonEmptyCount < 4 ? '#c00' : '#666' }}>
          {nonEmptyCount}/4 min
        </span>
        {responses.map((resp, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ width: 20, textAlign: 'right', color: '#999' }}>{i + 1}.</span>
            <input
              type="text"
              value={resp}
              onChange={(e) => updateResponse(i, e.target.value)}
              placeholder={`Response ${i + 1}`}
              style={{ padding: '4px 8px', width: 300 }}
            />
            {responses.length > 4 && (
              <button onClick={() => removeResponse(i)} style={{ padding: '2px 8px' }}>
                ×
              </button>
            )}
          </div>
        ))}
        {responses.length < 8 && (
          <button onClick={addResponse} style={{ marginTop: 4, padding: '2px 12px' }}>
            + Add response
          </button>
        )}
      </div>

      <button
        onClick={onCompute}
        disabled={!canCompute || isLoading}
        style={{ padding: '8px 24px', fontWeight: 'bold' }}
      >
        {isLoading ? 'Computing...' : 'Compute'}
      </button>
    </div>
  )
}
