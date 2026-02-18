import { useState, useCallback } from 'react'
import type { ScoringMode, ComputeStatus, ComputeResult } from './types'
import { fetchEmbedding } from './lib/embeddings'
import { computeScores, cosineSimilarity } from './lib/scoring'
import { projectTo2D } from './lib/projection'
import InputPanel from './components/InputPanel'
import ModeSelector from './components/ModeSelector'
import ScoreTable from './components/ScoreTable'
import ScatterPlot from './components/ScatterPlot'

export default function App() {
  const [category, setCategory] = useState('')
  const [responses, setResponses] = useState<string[]>(['', '', '', '', '', ''])
  const [activeMode, setActiveMode] = useState<ScoringMode>('schelling')
  const [status, setStatus] = useState<ComputeStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ComputeResult | null>(null)

  const nonEmptyResponses = responses.filter((r) => r.trim())
  const canCompute = category.trim().length > 0 && nonEmptyResponses.length >= 4

  // Clear results when inputs change
  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value)
    setResult(null)
    setStatus('idle')
    setError(null)
  }, [])

  const handleResponsesChange = useCallback((next: string[]) => {
    setResponses(next)
    setResult(null)
    setStatus('idle')
    setError(null)
  }, [])

  async function handleCompute() {
    setStatus('loading')
    setError(null)
    setResult(null)

    try {
      const trimmedCategory = category.trim()
      const trimmedResponses = responses.filter((r) => r.trim()).map((r) => r.trim())

      // Fetch all embeddings in parallel
      const [categoryEmbedding, ...responseEmbeddings] = await Promise.all([
        fetchEmbedding(trimmedCategory),
        ...trimmedResponses.map((r) => fetchEmbedding(r)),
      ])

      // Compute scores — now returns centroid vector alongside per-response scores
      const { scores, centroid: centroidVector } = computeScores(categoryEmbedding, responseEmbeddings)

      // Project to 2D (category + all responses), then centroid separately
      const allEmbeddings = [categoryEmbedding, ...responseEmbeddings]
      const { points, project } = projectTo2D(allEmbeddings)
      const [centroidPoint] = project([centroidVector])

      // Centroid scores for radial reference circle
      const centroidScores = {
        schelling: cosineSimilarity(centroidVector, centroidVector), // always 1.0
        bullseye: cosineSimilarity(centroidVector, categoryEmbedding),
        darkHorse: cosineSimilarity(centroidVector, categoryEmbedding)
                   * (1 - cosineSimilarity(centroidVector, centroidVector)), // always 0.0
      }

      // Build result
      const players = trimmedResponses.map((text, i) => ({
        index: i + 1,
        text,
        ...scores[i],
        x: points[i + 1].x, // +1 because category is at index 0
        y: points[i + 1].y,
      }))

      setResult({
        players,
        categoryPoint: { text: trimmedCategory, x: points[0].x, y: points[0].y },
        centroidPoint,
        centroidScores,
      })
      setStatus('success')
    } catch (err) {
      const message =
        err instanceof TypeError && err.message.includes('fetch')
          ? 'Cannot reach ollama. Run `ollama serve` on port 11434.'
          : err instanceof Error
            ? err.message
            : 'Embedding failed. Check ollama and retry.'
      setError(message)
      setStatus('error')
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Scoring Dashboard</h1>

      <InputPanel
        category={category}
        onCategoryChange={handleCategoryChange}
        responses={responses}
        onResponsesChange={handleResponsesChange}
        onCompute={handleCompute}
        canCompute={canCompute}
        isLoading={status === 'loading'}
      />

      {error && (
        <p style={{ color: '#c00', marginTop: '1rem', fontFamily: 'monospace' }}>{error}</p>
      )}

      {result && (
        <>
          <hr style={{ margin: '1.5rem 0' }} />

          <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />

          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px' }}>
              <ScoreTable players={result.players} activeMode={activeMode} />
            </div>
            <div style={{ flex: '1 1 400px' }}>
              <ScatterPlot players={result.players} categoryPoint={result.categoryPoint} />
            </div>
          </div>
        </>
      )}

      {status === 'idle' && !result && (
        <p style={{ color: '#999', marginTop: '2rem' }}>
          Enter a category and at least 4 responses, then click Compute.
        </p>
      )}
    </div>
  )
}
