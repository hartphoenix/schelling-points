import { describe, it, expect, vi } from 'vitest'
import { cosineSimilarity, centroid, similarityToScore, scoreGuesses } from './scoring'
import * as config from '../config'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns 0 when either vector is zero', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })
})

describe('centroid', () => {
  it('computes element-wise mean', () => {
    expect(centroid([[2, 4, 6], [4, 6, 8]])).toEqual([3, 5, 7])
  })

  it('returns the vector itself for a single input', () => {
    expect(centroid([[1, 2, 3]])).toEqual([1, 2, 3])
  })
})

describe('similarityToScore', () => {
  it('maps SIMILARITY_FLOOR to 1', () => {
    expect(similarityToScore(config.SIMILARITY_FLOOR)).toBe(1)
  })

  it('maps 1.0 to BASE_MAX_SCORE', () => {
    expect(similarityToScore(1.0)).toBe(config.BASE_MAX_SCORE)
  })

  it('maps below floor to 1', () => {
    expect(similarityToScore(config.SIMILARITY_FLOOR - 0.1)).toBe(1)
  })

  it('maps midpoint correctly', () => {
    const mid = (1 + config.SIMILARITY_FLOOR) / 2
    const normalized = (mid - config.SIMILARITY_FLOOR) / (1 - config.SIMILARITY_FLOOR)
    const curved = Math.pow(normalized, config.SCORE_CURVE_POWER)
    expect(similarityToScore(mid)).toBe(Math.round(1 + curved * (config.BASE_MAX_SCORE - 1)))
  })
})

describe('scoreGuesses', () => {
  const mockFetch = (embeddings: number[][]) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings }),
    }))
  }

  it('returns empty scores and positions for no guesses', async () => {
    const result = await scoreGuesses(new Map())
    expect(result.scores.size).toBe(0)
    expect(result.positions.size).toBe(0)
  })

  it('returns empty when all guesses are whitespace', async () => {
    const result = await scoreGuesses(new Map([['p1', '  '], ['p2', '']]))
    expect(result.scores.size).toBe(0)
    expect(result.positions.size).toBe(0)
  })

  it('gives single player BASE_MAX_SCORE at center position', async () => {
    const result = await scoreGuesses(new Map([['p1', 'hello']]))
    expect(result.scores.get('p1')).toBe(config.BASE_MAX_SCORE)
    expect(result.positions.get('p1')).toEqual([0, 0])
  })

  it('gives non-submitter score 0 with no position', async () => {
    mockFetch([[1, 0, 0]])
    const result = await scoreGuesses(new Map([['p1', 'hello'], ['p2', '']]))
    expect(result.scores.get('p2')).toBe(0)
    expect(result.positions.has('p2')).toBe(false)
  })

  it('gives identical embeddings BASE_MAX_SCORE each', async () => {
    mockFetch([[1, 0, 0], [1, 0, 0]])
    const result = await scoreGuesses(new Map([['p1', 'cat'], ['p2', 'cat']]))
    expect(result.scores.get('p1')).toBe(config.BASE_MAX_SCORE)
    expect(result.scores.get('p2')).toBe(config.BASE_MAX_SCORE)
  })

  it('gives outlier a lower score than closer player', async () => {
    mockFetch([[1, 0, 0], [1, 0, 0], [0, 1, 0]])
    const result = await scoreGuesses(new Map([['p1', 'cat'], ['p2', 'cat'], ['p3', 'zebra']]))
    expect(result.scores.get('p1')!).toBeGreaterThan(result.scores.get('p3')!)
  })

  it('returns positions for all filtered players', async () => {
    mockFetch([[1, 0, 0], [1, 0, 0], [0, 1, 0]])
    const result = await scoreGuesses(new Map([['p1', 'a'], ['p2', 'a'], ['p3', 'z']]))
    expect(result.positions.size).toBe(3)
    expect(result.positions.has('p1')).toBe(true)
    expect(result.positions.has('p2')).toBe(true)
    expect(result.positions.has('p3')).toBe(true)
  })

  it('positions have distances inversely proportional to similarity', async () => {
    mockFetch([[1, 0, 0], [0, 1, 0]])
    const result = await scoreGuesses(new Map([['p1', 'close'], ['p2', 'far']]))
    const [x1, y1] = result.positions.get('p1')!
    const [x2, y2] = result.positions.get('p2')!
    const dist1 = Math.sqrt(x1 * x1 + y1 * y1)
    const dist2 = Math.sqrt(x2 * x2 + y2 * y2)
    const score1 = result.scores.get('p1')!
    const score2 = result.scores.get('p2')!
    if (score1 > score2) {
      expect(dist1).toBeLessThan(dist2)
    } else if (score2 > score1) {
      expect(dist2).toBeLessThan(dist1)
    }
  })

  it('positions are within [-1, 1] range', async () => {
    mockFetch([[1, 0, 0], [0, 1, 0], [0, 0, 1]])
    const result = await scoreGuesses(new Map([['p1', 'a'], ['p2', 'b'], ['p3', 'c']]))
    for (const [, [x, y]] of result.positions) {
      expect(x).toBeGreaterThanOrEqual(-1)
      expect(x).toBeLessThanOrEqual(1)
      expect(y).toBeGreaterThanOrEqual(-1)
      expect(y).toBeLessThanOrEqual(1)
    }
  })
})
