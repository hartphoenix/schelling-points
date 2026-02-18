import { describe, it, expect } from 'vitest'
import { projectTo2D } from './projection'

describe('projectTo2D', () => {
  it('returns points and project function', () => {
    const embeddings = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
    ]
    const result = projectTo2D(embeddings)
    expect(result.points).toHaveLength(3)
    expect(typeof result.project).toBe('function')
    for (const point of result.points) {
      expect(point).toHaveProperty('x')
      expect(point).toHaveProperty('y')
    }
  })

  it('project() projects extra points through the same PCA model', () => {
    const embeddings = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
    ]
    const { project } = projectTo2D(embeddings)
    const [extra] = project([[0.5, 0.5, 0, 0]])
    expect(extra).toHaveProperty('x')
    expect(extra).toHaveProperty('y')
  })

  it('returns origins for single point', () => {
    const result = projectTo2D([[1, 2, 3]])
    expect(result.points).toEqual([{ x: 0, y: 0 }])
  })
})
