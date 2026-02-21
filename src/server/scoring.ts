import * as config from '../config'
import type { PlayerId } from '../types'
import { cosineSimilarity, centroid } from './math'
import { nearestWord, type Vocab } from './vocab'

// Re-export so existing consumers (tests, play.ts) don't break
export { cosineSimilarity, centroid }

export interface ScoringResult {
  scores: Map<PlayerId, number>
  positions: Map<PlayerId, [number, number]>
  centroidWord: string
}

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434'

export async function fetchEmbeddings(texts: string[]): Promise<number[][]> {
  for (let attempt = 0; attempt <= config.EMBEDDING_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.EMBEDDING_TIMEOUT_MS)
    try {
      const res = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.EMBEDDING_MODEL, input: texts }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`ollama embed: ${res.status} ${res.statusText}`)
      const json = await res.json() as { embeddings: number[][] }
      return json.embeddings
    } catch (err) {
      clearTimeout(timeout)
      if (attempt === config.EMBEDDING_RETRIES) throw err
      await new Promise(r => setTimeout(r, 2 ** attempt * 500))
    }
  }
  throw new Error('unreachable')
}

export function similarityToScore(sim: number): number {
  return Math.round(1 + Math.max(0, (sim - config.SIMILARITY_FLOOR) / (1 - config.SIMILARITY_FLOOR)) * (config.BASE_MAX_SCORE - 1))
}

export async function scoreGuesses(guesses: Map<PlayerId, string>, vocab?: Vocab): Promise<ScoringResult> {
  const scores = new Map<PlayerId, number>()
  const positions = new Map<PlayerId, [number, number]>()
  const entries = [...guesses.entries()].filter(([, g]) => g.trim().length > 0)

  if (entries.length === 0) return { scores, positions, centroidWord: '' }

  if (entries.length === 1) {
    scores.set(entries[0][0], config.BASE_MAX_SCORE)
    positions.set(entries[0][0], [0, 0])
    for (const [id] of guesses) {
      if (!scores.has(id)) scores.set(id, 0)
    }
    return { scores, positions, centroidWord: entries[0][1].trim().toLowerCase() }
  }

  const normalized = entries.map(([id, g]) => [id, g.trim().toLowerCase()] as const)
  const embeddings = await fetchEmbeddings(normalized.map(([, g]) => g))
  const cent = centroid(embeddings)

  const centroidWord = vocab
    ? nearestWord(cent, vocab, normalized.map(([, g]) => g))
    : ''

  for (let i = 0; i < normalized.length; i++) {
    const [id] = normalized[i]
    const sim = cosineSimilarity(embeddings[i], cent)
    scores.set(id, similarityToScore(sim))

    const n = normalized.length
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const dist = 1 - sim
    positions.set(id, [dist * Math.cos(angle), dist * Math.sin(angle)])
  }

  for (const [id] of guesses) {
    if (!scores.has(id)) scores.set(id, 0)
  }

  return { scores, positions, centroidWord }
}
