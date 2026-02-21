import { readFileSync } from 'fs'
import { join } from 'path'
import * as config from '../config'
import { cosineSimilarity, centroid } from './math'
import { stem } from './stemmer'

export interface Vocab {
  words: string[]
  vectors: number[][]
  globalCentroid: number[]
}

const VOCAB_PATH = join(import.meta.dirname ?? __dirname, '../../data/vocab-embeddings.json')

/** Load pre-built vocab embeddings from disk. Throws with instructions if file missing. */
export function loadVocab(): Vocab {
  let raw: string
  try {
    raw = readFileSync(VOCAB_PATH, 'utf-8')
  } catch {
    throw new Error(
      `Vocab embeddings not found at ${VOCAB_PATH}.\n` +
      `Run: bun run scripts/build-vocab-embeddings.ts`
    )
  }
  const data = JSON.parse(raw) as { model: string; words: string[]; vectors: number[][] }
  const globalCentroid = centroid(data.vectors)
  return { words: data.words, vectors: data.vectors, globalCentroid }
}

/**
 * Find the vocab word whose embedding is closest to the given centroid vector,
 * with penalties to avoid degenerate results:
 * - Excludes input words (via stemming) so player guesses aren't echoed back
 * - Penalizes proximity to the global center to avoid generic catch-all words
 * - Penalizes high-frequency words to prefer specific over hypernym results
 */
export function nearestWord(
  centroidVec: number[],
  vocab: Vocab,
  inputWords: string[] = []
): string {
  const inputStems = new Set(inputWords.map(stem))

  let bestWord = ''
  let bestScore = -Infinity

  for (let i = 0; i < vocab.words.length; i++) {
    // Fix 1: skip input words (stem-matched to catch plurals, verb forms, etc.)
    if (inputStems.has(stem(vocab.words[i]))) continue

    const simToCentroid = cosineSimilarity(centroidVec, vocab.vectors[i])

    // Fix 2: penalize proximity to global center of embedding space
    const simToGlobal = cosineSimilarity(vocab.globalCentroid, vocab.vectors[i])

    // Fix 3: penalize high-frequency words (low index = common)
    const normalizedRank = vocab.words.length > 1 ? i / (vocab.words.length - 1) : 0
    const frequencyPenalty = 1 - normalizedRank

    const score = simToCentroid
      - config.GLOBAL_CENTER_PENALTY * simToGlobal
      - config.FREQUENCY_PENALTY * frequencyPenalty

    if (score > bestScore) {
      bestScore = score
      bestWord = vocab.words[i]
    }
  }

  return bestWord || vocab.words[0]
}
