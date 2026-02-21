import { readFileSync } from 'fs'
import { join } from 'path'
import { cosineSimilarity } from './scoring'

export interface Vocab {
  words: string[]
  vectors: number[][]
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
  return { words: data.words, vectors: data.vectors }
}

/** Find the word in vocab whose embedding is closest to the given centroid vector. */
export function nearestWord(centroidVec: number[], vocab: Vocab): string {
  let bestWord = vocab.words[0]
  let bestSim = -Infinity
  for (let i = 0; i < vocab.words.length; i++) {
    const sim = cosineSimilarity(centroidVec, vocab.vectors[i])
    if (sim > bestSim) {
      bestSim = sim
      bestWord = vocab.words[i]
    }
  }
  return bestWord
}
