import { describe, it, expect } from 'vitest'
import { filterPromptRepetitions, detectMeld } from './meld'

describe('filterPromptRepetitions', () => {
  it('filters exact match of prompt', () => {
    const guesses = new Map([['p1', 'blue'], ['p2', 'red']])
    const result = filterPromptRepetitions(guesses, 'blue')
    expect(result.size).toBe(1)
    expect(result.has('p1')).toBe(false)
    expect(result.get('p2')).toBe('red')
  })

  it('filters case-insensitive match', () => {
    const guesses = new Map([['p1', 'Blues'], ['p2', 'red']])
    const result = filterPromptRepetitions(guesses, 'blue')
    expect(result.size).toBe(1)
    expect(result.has('p1')).toBe(false)
  })

  it('filters stem match (e.g. "blues" matches "blue")', () => {
    const guesses = new Map([['p1', 'blues'], ['p2', 'red']])
    const result = filterPromptRepetitions(guesses, 'blue')
    // "blue" stems to "blue", "blues" stems to "blue" (Porter2)
    expect(result.has('p1')).toBe(false)
    expect(result.get('p2')).toBe('red')
  })

  it('keeps guesses that do not match prompt', () => {
    const guesses = new Map([['p1', 'red'], ['p2', 'green']])
    const result = filterPromptRepetitions(guesses, 'blue')
    expect(result.size).toBe(2)
  })

  it('returns empty map when all guesses match prompt', () => {
    const guesses = new Map([['p1', 'blue'], ['p2', 'Blue']])
    const result = filterPromptRepetitions(guesses, 'blue')
    expect(result.size).toBe(0)
  })
})

describe('detectMeld', () => {
  it('returns true when all stemmed forms match (plurals)', () => {
    const guesses = new Map([['p1', 'dog'], ['p2', 'dogs']])
    expect(detectMeld(guesses)).toBe(true)
  })

  it('returns true when all stemmed forms match (case)', () => {
    const guesses = new Map([['p1', 'Running'], ['p2', 'running']])
    expect(detectMeld(guesses)).toBe(true)
  })

  it('returns false when stemmed forms differ', () => {
    const guesses = new Map([['p1', 'cat'], ['p2', 'dog']])
    expect(detectMeld(guesses)).toBe(false)
  })

  it('returns false for single submission', () => {
    const guesses = new Map([['p1', 'cat']])
    expect(detectMeld(guesses)).toBe(false)
  })

  it('returns false for empty map', () => {
    const guesses = new Map<string, string>()
    expect(detectMeld(guesses)).toBe(false)
  })

  it('returns true for 3+ players with same stem', () => {
    const guesses = new Map([['p1', 'run'], ['p2', 'runs'], ['p3', 'running']])
    expect(detectMeld(guesses)).toBe(true)
  })
})
