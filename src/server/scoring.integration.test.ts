import { describe, it, expect, beforeAll } from 'vitest'
import { fetchEmbeddings, cosineSimilarity, scoreGuesses } from './scoring'
import * as config from '../config'

let ollamaAvailable = false

beforeAll(async () => {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 2000)
    const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal })
    if (res.ok) {
      const data = await res.json() as { models: { name: string }[] }
      ollamaAvailable = data.models?.some(m => m.name.startsWith('nomic-embed-text')) ?? false
    }
  } catch {}
  if (!ollamaAvailable) console.warn('Ollama unavailable — skipping integration tests')
})

describe.runIf(() => ollamaAvailable)('scoring integration', { timeout: 30_000 }, () => {
  const embeddingCache = new Map<string, number[]>()

  const cachedWords = [
    'cat', 'kitten', 'kitty', 'dog', 'puppy', 'fish',
    'airplane', 'rocket', 'bicycle',
    'happiness', 'joy',
    'red', 'scarlet',
    'democracy', 'photosynthesis', 'sushi',
    'pizza', 'hamburger',
  ]

  beforeAll(async () => {
    const embeddings = await fetchEmbeddings(cachedWords)
    for (let i = 0; i < cachedWords.length; i++) {
      embeddingCache.set(cachedWords[i], embeddings[i])
    }
  })

  function cached(word: string): number[] {
    const v = embeddingCache.get(word)
    if (!v) throw new Error(`"${word}" not in embedding cache`)
    return v
  }

  function sim(a: string, b: string): number {
    return cosineSimilarity(cached(a), cached(b))
  }

  // --- 1. Embedding sanity ---

  describe('embedding sanity', () => {
    it('returns 768-dimensional vectors', () => {
      expect(cached('cat').length).toBe(768)
    })

    it('is deterministic (same input → same output)', async () => {
      const [fresh] = await fetchEmbeddings(['cat'])
      expect(fresh).toEqual(cached('cat'))
    })

    it('returns nonzero magnitude', () => {
      const mag = Math.sqrt(cached('cat').reduce((s, v) => s + v * v, 0))
      expect(mag).toBeGreaterThan(0)
    })

    it('returns embedding count matching input count', async () => {
      const result = await fetchEmbeddings(['a', 'b', 'c'])
      expect(result.length).toBe(3)
    })
  })

  // --- 2. Pairwise similarity ordering ---

  describe('pairwise similarity ordering', () => {
    it('cat/kitten > cat/airplane', () => {
      expect(sim('cat', 'kitten')).toBeGreaterThan(sim('cat', 'airplane'))
    })

    it('dog/puppy > dog/rocket', () => {
      expect(sim('dog', 'puppy')).toBeGreaterThan(sim('dog', 'rocket'))
    })

    it('happiness/joy > happiness/bicycle', () => {
      expect(sim('happiness', 'joy')).toBeGreaterThan(sim('happiness', 'bicycle'))
    })

    it('red/scarlet > red/democracy', () => {
      expect(sim('red', 'scarlet')).toBeGreaterThan(sim('red', 'democracy'))
    })
  })

  // --- 3. Similarity range calibration ---

  describe('similarity range calibration', () => {
    it('same-domain pairs have meaningful similarity (> 0.5)', () => {
      expect(sim('cat', 'dog')).toBeGreaterThan(0.5)
      expect(sim('pizza', 'hamburger')).toBeGreaterThan(0.5)
    })

    it('unrelated pairs have lower similarity than same-domain pairs', () => {
      expect(sim('cat', 'dog')).toBeGreaterThan(sim('cat', 'democracy'))
    })

    it('diagnostic: pairwise animal similarities (todo #004 calibration)', () => {
      const animals = ['cat', 'kitten', 'kitty', 'dog', 'puppy', 'fish']
      const rows: Record<string, Record<string, string>> = {}
      for (const a of animals) {
        rows[a] = {}
        for (const b of animals) {
          rows[a][b] = sim(a, b).toFixed(3)
        }
      }
      console.table(rows)
    })
  })

  // --- 4. Full scoreGuesses scenarios ---

  describe('scoreGuesses scenarios', () => {
    it('animals round: outlier (airplane) scores ≤ 3', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'cat'], ['p2', 'dog'], ['p3', 'fish'], ['p4', 'airplane'],
      ])
      const { scores } = await scoreGuesses(guesses)
      const outlier = scores.get('p4')!
      const animalAvg = (scores.get('p1')! + scores.get('p2')! + scores.get('p3')!) / 3
      expect(outlier).toBeLessThanOrEqual(3)
      expect(animalAvg - outlier).toBeGreaterThanOrEqual(2)
    })

    it('identical answers get identical scores', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'cat'], ['p2', 'cat'], ['p3', 'dog'],
      ])
      const { scores } = await scoreGuesses(guesses)
      expect(scores.get('p1')).toBe(scores.get('p2'))
    })

    it('majority cluster scores higher than minority outlier', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'cat'], ['p2', 'dog'], ['p3', 'fish'], ['p4', 'pizza'],
      ])
      const { scores } = await scoreGuesses(guesses)
      const animalAvg = (scores.get('p1')! + scores.get('p2')! + scores.get('p3')!) / 3
      expect(animalAvg).toBeGreaterThan(scores.get('p4')!)
    })

    it('tight cluster (cat/kitten/kitty) → all scores ≥ 7', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'cat'], ['p2', 'kitten'], ['p3', 'kitty'],
      ])
      const { scores } = await scoreGuesses(guesses)
      for (const [, score] of scores) {
        expect(score).toBeGreaterThanOrEqual(7)
      }
    })

    it('divergent set → average score < 5', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'cat'], ['p2', 'democracy'], ['p3', 'photosynthesis'], ['p4', 'sushi'],
      ])
      const { scores } = await scoreGuesses(guesses)
      const avg = [...scores.values()].reduce((s, v) => s + v, 0) / scores.size
      expect(avg).toBeLessThan(5)
    })

    it('solo player gets BASE_MAX_SCORE', async () => {
      const guesses = new Map<string, string>([['p1', 'cat']])
      const { scores } = await scoreGuesses(guesses)
      expect(scores.get('p1')).toBe(config.BASE_MAX_SCORE)
    })

    it('two-player synonyms (happy/joy) → both ≥ 8', async () => {
      const guesses = new Map<string, string>([['p1', 'happiness'], ['p2', 'joy']])
      const { scores } = await scoreGuesses(guesses)
      expect(scores.get('p1')!).toBeGreaterThanOrEqual(8)
      expect(scores.get('p2')!).toBeGreaterThanOrEqual(8)
    })

    it('larger game (6 players) → scores in range, outlier lowest', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'cat'], ['p2', 'dog'], ['p3', 'kitten'],
        ['p4', 'puppy'], ['p5', 'fish'], ['p6', 'rocket'],
      ])
      const { scores } = await scoreGuesses(guesses)
      for (const [, score] of scores) {
        expect(score).toBeGreaterThanOrEqual(1)
        expect(score).toBeLessThanOrEqual(10)
      }
      const rocketScore = scores.get('p6')!
      const otherScores = ['p1', 'p2', 'p3', 'p4', 'p5'].map(id => scores.get(id)!)
      expect(rocketScore).toBeLessThanOrEqual(Math.min(...otherScores))
    })
  })

  // --- 5. Score bounds ---

  describe('score bounds', () => {
    it('all scores are integers in [1, 10] for diverse inputs', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'cat'], ['p2', 'airplane'], ['p3', 'happiness'], ['p4', 'red'],
      ])
      const { scores } = await scoreGuesses(guesses)
      for (const [, score] of scores) {
        expect(Number.isInteger(score)).toBe(true)
        expect(score).toBeGreaterThanOrEqual(1)
        expect(score).toBeLessThanOrEqual(10)
      }
    })

    it('non-submitters get 0', async () => {
      const guesses = new Map<string, string>([['p1', 'cat'], ['p2', ''], ['p3', 'dog']])
      const { scores } = await scoreGuesses(guesses)
      expect(scores.get('p2')).toBe(0)
    })
  })

  // --- 6. Edge cases ---

  describe('edge cases', () => {
    it('whitespace trimming: " cat " scores same as "cat"', async () => {
      const guessesA = new Map<string, string>([['p1', ' cat '], ['p2', 'dog']])
      const guessesB = new Map<string, string>([['p1', 'cat'], ['p2', 'dog']])
      const a = await scoreGuesses(guessesA)
      const b = await scoreGuesses(guessesB)
      expect(a.scores.get('p1')).toBe(b.scores.get('p1'))
    })

    it('emoji and unicode do not crash', async () => {
      const guesses = new Map<string, string>([['p1', '🐱'], ['p2', 'café']])
      await expect(scoreGuesses(guesses)).resolves.toBeDefined()
    })

    it('long phrases embed without error', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'the quick brown fox jumps over the lazy dog'],
        ['p2', 'cat'],
      ])
      await expect(scoreGuesses(guesses)).resolves.toBeDefined()
    })

    it('special characters and numbers do not crash', async () => {
      const guesses = new Map<string, string>([['p1', '123'], ['p2', '!@#$%']])
      await expect(scoreGuesses(guesses)).resolves.toBeDefined()
    })

    it('typos near real words still embed', async () => {
      const guesses = new Map<string, string>([['p1', 'kittn'], ['p2', 'cat']])
      await expect(scoreGuesses(guesses)).resolves.toBeDefined()
    })
  })

  // --- 7. Positions ---

  describe('positions', () => {
    it('all submitters get positions', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'cat'], ['p2', 'dog'], ['p3', ''],
      ])
      const { positions } = await scoreGuesses(guesses)
      expect(positions.has('p1')).toBe(true)
      expect(positions.has('p2')).toBe(true)
      expect(positions.has('p3')).toBe(false)
    })

    it('outlier has larger distance from origin than cluster members', async () => {
      const guesses = new Map<string, string>([
        ['p1', 'cat'], ['p2', 'kitten'], ['p3', 'kitty'], ['p4', 'airplane'],
      ])
      const { positions } = await scoreGuesses(guesses)
      const dist = (id: string) => {
        const [x, y] = positions.get(id)!
        return Math.sqrt(x * x + y * y)
      }
      expect(dist('p4')).toBeGreaterThan(dist('p1'))
      expect(dist('p4')).toBeGreaterThan(dist('p2'))
      expect(dist('p4')).toBeGreaterThan(dist('p3'))
    })
  })
})
