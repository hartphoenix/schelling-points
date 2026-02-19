import { describe, it, expect } from 'vitest'
import { cosineSimilarity, centroid, computeScores } from './scoring'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
  })

  it('returns 0 for zero vector', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })
})

describe('centroid', () => {
  it('computes element-wise mean', () => {
    const result = centroid([
      [2, 4, 6],
      [4, 6, 8],
    ])
    expect(result).toEqual([3, 5, 7])
  })

  it('returns the vector itself for a single input', () => {
    expect(centroid([[1, 2, 3]])).toEqual([1, 2, 3])
  })
})

describe('computeScores', () => {
  // Use simple unit-ish vectors for predictable results
  const category = [1, 0, 0]
  const responses = [
    [1, 0, 0],   // identical to category
    [0, 1, 0],   // orthogonal to category
    [0.7, 0.7, 0], // between
    [0.5, 0.5, 0], // same direction as above (different magnitude)
  ]

  it('returns scores array and centroid vector', () => {
    const result = computeScores(category, responses)
    expect(result.scores).toHaveLength(4)
    expect(result.centroid).toHaveLength(3)
  })

  it('bullseyeScore measures similarity to category', () => {
    const { scores } = computeScores(category, responses)
    // First response is identical to category → high bullseye
    expect(scores[0].bullseyeScore).toBeCloseTo(1)
    // Second response is orthogonal → zero bullseye
    expect(scores[1].bullseyeScore).toBeCloseTo(0)
  })

  it('darkHorseScore = bullseye * (1 - schelling)', () => {
    const { scores } = computeScores(category, responses)
    for (const r of scores) {
      expect(r.darkHorseScore).toBeCloseTo(
        r.bullseyeScore * (1 - r.schellingScore),
      )
    }
  })

  it('centroid is the element-wise mean of responses', () => {
    const { centroid: cent } = computeScores(category, responses)
    // Mean of [1,0,0], [0,1,0], [0.7,0.7,0], [0.5,0.5,0]
    expect(cent[0]).toBeCloseTo(0.55)
    expect(cent[1]).toBeCloseTo(0.55)
    expect(cent[2]).toBeCloseTo(0)
  })

  it('exponent amplification shrinks darkHorse for sub-1 bullseye scores', () => {
    // Custom vectors where responses diverge enough that simToCentroid < 1
    const cat = [1, 0, 0]
    const resps = [
      [1, 0, 0],     // bullseye = 1.0 (squaring 1 stays 1)
      [0, 0, 1],     // orthogonal spread
      [0.7, 0.7, 0], // bullseye ~0.71 (sub-1, squaring shrinks it)
      [0, 1, 0],     // orthogonal spread
    ]
    const defaultResult = computeScores(cat, resps)
    const expResult = computeScores(cat, resps, { exponent: 2, floor: 0 })
    // Response 2 has bullseye < 1 and simToCentroid < 1, so darkHorse is positive
    // Squaring the sub-1 bullseye shrinks darkHorse
    expect(defaultResult.scores[2].darkHorseScore).toBeGreaterThan(0)
    expect(expResult.scores[2].darkHorseScore).toBeLessThan(
      defaultResult.scores[2].darkHorseScore,
    )
  })

  it('floor cutoff zeroes out darkHorse for below-threshold answers', () => {
    const result = computeScores(category, responses, { exponent: 1, floor: 0.5 })
    // Response 1 ([0,1,0]) is orthogonal to category → bullseye ~0 → below floor
    expect(result.scores[1].darkHorseScore).toBe(0)
    // Response 0 ([1,0,0]) has bullseye = 1.0 → above floor → unaffected
    expect(result.scores[0].darkHorseScore).toBeGreaterThan(0)
  })

  it('explicit defaults produce identical results to no params', () => {
    const noParams = computeScores(category, responses)
    const explicitDefaults = computeScores(category, responses, { exponent: 1, floor: 0 })
    for (let i = 0; i < noParams.scores.length; i++) {
      expect(explicitDefaults.scores[i].darkHorseScore).toBeCloseTo(
        noParams.scores[i].darkHorseScore,
      )
    }
  })
})
