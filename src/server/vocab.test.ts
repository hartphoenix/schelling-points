import { describe, it, expect } from 'vitest'
import { nearestWord, type Vocab } from './vocab'

describe('nearestWord', () => {
  // Mock vocab with simple 3D vectors
  const vocab: Vocab = {
    words: ['cat', 'dog', 'fish'],
    vectors: [
      [1, 0, 0],   // cat — points along x-axis
      [0, 1, 0],   // dog — points along y-axis
      [0, 0, 1],   // fish — points along z-axis
    ],
    globalCentroid: [1/3, 1/3, 1/3],
  }

  it('returns exact match for identical vector', () => {
    expect(nearestWord([1, 0, 0], vocab)).toBe('cat')
  })

  it('returns closest word for nearby vector', () => {
    // Mostly x-axis with a little y — should be closest to cat
    expect(nearestWord([0.9, 0.1, 0], vocab)).toBe('cat')
  })

  it('returns correct word for each axis-aligned vector', () => {
    expect(nearestWord([0, 1, 0], vocab)).toBe('dog')
    expect(nearestWord([0, 0, 1], vocab)).toBe('fish')
  })

  it('picks highest similarity when centroid is between words', () => {
    // Equidistant between dog and fish — but slightly more dog
    expect(nearestWord([0, 0.6, 0.4], vocab)).toBe('dog')
  })

  it('handles single-word vocab', () => {
    const singleVocab: Vocab = { words: ['only'], vectors: [[1, 0, 0]], globalCentroid: [1, 0, 0] }
    expect(nearestWord([0, 1, 0], singleVocab)).toBe('only')
  })
})
