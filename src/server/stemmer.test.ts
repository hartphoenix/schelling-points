import { describe, it, expect } from 'vitest'
import { stem } from './stemmer'

describe('stem', () => {
  it('stems plurals (dogs → dog)', () => {
    expect(stem('dogs')).toBe(stem('dog'))
  })

  it('stems gerunds (running → run)', () => {
    expect(stem('running')).toBe(stem('run'))
  })

  it('leaves short words unchanged (cat → cat)', () => {
    expect(stem('cat')).toBe('cat')
  })

  it('is case-insensitive', () => {
    expect(stem('Running')).toBe(stem('running'))
  })

  it('trims whitespace', () => {
    expect(stem('  dog  ')).toBe(stem('dog'))
  })

  it('handles past tense (walked → walk)', () => {
    expect(stem('walked')).toBe(stem('walk'))
  })
})
