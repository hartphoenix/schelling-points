import { useState, useCallback, useEffect, useRef } from 'react'
import type { ScoringMode, ComputeStatus, ComputeResult, PlayerResult, ViewMode } from './types'
import { fetchEmbedding, checkOllamaStatus } from './lib/embeddings'
import type { OllamaStatus } from './lib/embeddings'
import { computeScores, cosineSimilarity } from './lib/scoring'
import { projectTo2D } from './lib/projection'
import InputPanel from './components/InputPanel'
import ModeSelector from './components/ModeSelector'
import TuningPanel from './components/TuningPanel'
import ScoreTable from './components/ScoreTable'
import ScatterPlot from './components/ScatterPlot'
import RadialPlot from './components/RadialPlot'

interface CachedEmbeddings {
  category: number[]
  responses: number[][]
  categoryB?: number[]
}

export default function App() {
  const [category, setCategory] = useState('')
  const [categoryB, setCategoryB] = useState('')
  const [responses, setResponses] = useState<string[]>(['', '', '', '', '', ''])
  const [activeMode, setActiveMode] = useState<ScoringMode>('schelling')
  const [status, setStatus] = useState<ComputeStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ComputeResult | null>(null)
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('checking')
  const [viewMode, setViewMode] = useState<ViewMode>('scatter')
  const [darkHorseExponent, setDarkHorseExponent] = useState(1.0)
  const [darkHorseFloor, setDarkHorseFloor] = useState(0.0)
  const [activePrompt, setActivePrompt] = useState<'A' | 'B'>('A')

  const embeddingsRef = useRef<CachedEmbeddings | null>(null)

  // Check ollama connection on mount
  useEffect(() => {
    checkOllamaStatus().then(setOllamaStatus)
  }, [])

  const nonEmptyResponses = responses.filter((r) => r.trim())
  const canCompute = category.trim().length > 0 && nonEmptyResponses.length >= 4

  // Clear results when inputs change
  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value)
    setResult(null)
    setStatus('idle')
    setError(null)
    embeddingsRef.current = null
  }, [])

  const handleCategoryBChange = useCallback((value: string) => {
    setCategoryB(value)
    setResult(null)
    setStatus('idle')
    setError(null)
    setActivePrompt('A')
    embeddingsRef.current = null
  }, [])

  const handleResponsesChange = useCallback((next: string[]) => {
    setResponses(next)
    setResult(null)
    setStatus('idle')
    setError(null)
    embeddingsRef.current = null
  }, [])

  // Re-score using cached embeddings (pure math, <1ms, no fetch)
  function reScore(exponent: number, floor: number) {
    const cached = embeddingsRef.current
    if (!cached || !result) return

    const dhParams = { exponent, floor }
    const { scores } = computeScores(cached.category, cached.responses, dhParams)

    // Keep positions, update A scores only
    const updatedPlayers: PlayerResult[] = result.players.map((p, i) => ({
      ...p,
      ...scores[i],
    }))

    // Re-score prompt B if cached
    if (cached.categoryB && result.promptB) {
      const { scores: scoresB } = computeScores(cached.categoryB, cached.responses, dhParams)
      for (let i = 0; i < updatedPlayers.length; i++) {
        updatedPlayers[i] = {
          ...updatedPlayers[i],
          schellingScoreB: scoresB[i].schellingScore,
          bullseyeScoreB: scoresB[i].bullseyeScore,
          darkHorseScoreB: scoresB[i].darkHorseScore,
        }
      }
    }

    // centroidScores unchanged — not affected by DH params
    setResult({ ...result, players: updatedPlayers })
  }

  function handleExponentChange(n: number) {
    setDarkHorseExponent(n)
    reScore(n, darkHorseFloor)
  }

  function handleFloorChange(t: number) {
    setDarkHorseFloor(t)
    reScore(darkHorseExponent, t)
  }

  async function handleCompute() {
    setStatus('loading')
    setError(null)
    setResult(null)

    try {
      const trimmedCategory = category.trim()
      const trimmedCategoryB = categoryB.trim()
      const trimmedResponses = responses.filter((r) => r.trim()).map((r) => r.trim())

      // Fetch all embeddings in parallel
      const fetchPromises = [
        fetchEmbedding(trimmedCategory),
        ...trimmedResponses.map((r) => fetchEmbedding(r)),
      ]
      if (trimmedCategoryB) {
        fetchPromises.push(fetchEmbedding(trimmedCategoryB))
      }
      const allFetched = await Promise.all(fetchPromises)

      const categoryEmbedding = allFetched[0]
      const responseEmbeddings = allFetched.slice(1, 1 + trimmedResponses.length)
      const categoryBEmbedding = trimmedCategoryB
        ? allFetched[1 + trimmedResponses.length]
        : undefined

      // Cache embeddings for re-score on slider changes
      embeddingsRef.current = {
        category: categoryEmbedding,
        responses: responseEmbeddings,
        categoryB: categoryBEmbedding,
      }

      const dhParams = { exponent: darkHorseExponent, floor: darkHorseFloor }

      // Compute prompt-A scores
      const { scores, centroid: centroidVector } = computeScores(
        categoryEmbedding,
        responseEmbeddings,
        dhParams,
      )

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

      // Build players
      const players: PlayerResult[] = trimmedResponses.map((text, i) => ({
        index: i + 1,
        text,
        ...scores[i],
        x: points[i + 1].x, // +1 because category is at index 0
        y: points[i + 1].y,
      }))

      // Prompt B processing
      let promptB: ComputeResult['promptB'] = undefined
      if (categoryBEmbedding) {
        const { scores: scoresB, centroid: centroidVectorB } = computeScores(
          categoryBEmbedding,
          responseEmbeddings,
          dhParams,
        )

        // Separate PCA fit for B projection (category embedding shifts the axes)
        const allEmbeddingsB = [categoryBEmbedding, ...responseEmbeddings]
        const { points: pointsB, project: projectB } = projectTo2D(allEmbeddingsB)
        const [centroidPointB] = projectB([centroidVectorB])

        const centroidScoresB = {
          schelling: cosineSimilarity(centroidVectorB, centroidVectorB),
          bullseye: cosineSimilarity(centroidVectorB, categoryBEmbedding),
          darkHorse: cosineSimilarity(centroidVectorB, categoryBEmbedding)
                     * (1 - cosineSimilarity(centroidVectorB, centroidVectorB)),
        }

        // Merge B scores into players
        for (let i = 0; i < players.length; i++) {
          players[i] = {
            ...players[i],
            schellingScoreB: scoresB[i].schellingScore,
            bullseyeScoreB: scoresB[i].bullseyeScore,
            darkHorseScoreB: scoresB[i].darkHorseScore,
          }
        }

        promptB = {
          categoryPoint: { text: trimmedCategoryB, x: pointsB[0].x, y: pointsB[0].y },
          centroidPoint: centroidPointB,
          centroidScores: centroidScoresB,
          playerCoords: trimmedResponses.map((_, i) => ({
            x: pointsB[i + 1].x,
            y: pointsB[i + 1].y,
          })),
        }
      }

      setResult({
        players,
        categoryPoint: { text: trimmedCategory, x: points[0].x, y: points[0].y },
        centroidPoint,
        centroidScores,
        promptB,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>Scoring Dashboard</h1>
        <span style={{
          fontSize: 12,
          padding: '2px 8px',
          borderRadius: 4,
          background: ollamaStatus === 'connected' ? '#e6f4ea' : ollamaStatus === 'disconnected' ? '#fce8e6' : '#f0f0f0',
          color: ollamaStatus === 'connected' ? '#1a7f37' : ollamaStatus === 'disconnected' ? '#c00' : '#666',
        }}>
          {ollamaStatus === 'checking' ? 'Checking ollama…'
           : ollamaStatus === 'connected' ? 'ollama connected'
           : 'ollama disconnected'}
        </span>
      </div>

      <InputPanel
        category={category}
        onCategoryChange={handleCategoryChange}
        categoryB={categoryB}
        onCategoryBChange={handleCategoryBChange}
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

          <TuningPanel
            exponent={darkHorseExponent}
            onExponentChange={handleExponentChange}
            floor={darkHorseFloor}
            onFloorChange={handleFloorChange}
          />

          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px' }}>
              <ScoreTable players={result.players} activeMode={activeMode} />
            </div>
            <div style={{ flex: '1 1 400px' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 8 }}>
                {(['scatter', 'radial'] as const).map((mode) => (
                  <label key={mode} style={{ cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="radio"
                      name="viewMode"
                      value={mode}
                      checked={viewMode === mode}
                      onChange={() => setViewMode(mode)}
                    />{' '}
                    {mode === 'scatter' ? 'Scatter' : 'Radial'}
                  </label>
                ))}
              </div>
              {/* A/B prompt toggle — only when dual prompt and scatter view */}
              {result.promptB && viewMode === 'scatter' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 8 }}>
                  {(['A', 'B'] as const).map((p) => (
                    <label key={p} style={{ cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="radio"
                        name="activePrompt"
                        value={p}
                        checked={activePrompt === p}
                        onChange={() => setActivePrompt(p)}
                      />{' '}
                      Prompt {p}
                    </label>
                  ))}
                </div>
              )}
              {viewMode === 'scatter' ? (
                <ScatterPlot
                  players={result.players}
                  categoryPoint={result.categoryPoint}
                  centroidPoint={result.centroidPoint}
                  activeMode={activeMode}
                  promptBData={result.promptB}
                  activePrompt={activePrompt}
                />
              ) : (
                <RadialPlot
                  players={result.players}
                  activeMode={activeMode}
                  centroidScores={result.centroidScores}
                  centroidScoresB={result.promptB?.centroidScores}
                />
              )}
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
