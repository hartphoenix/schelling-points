/**
 * One-time script to build vocab embeddings from the 10k word list.
 * Requires Ollama running with nomic-embed-text model.
 *
 * Usage: bun run scripts/build-vocab-embeddings.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const WORD_LIST_PATH = join(import.meta.dirname ?? __dirname, '../data/google-10000-english-no-swears.txt')
const OUTPUT_PATH = join(import.meta.dirname ?? __dirname, '../data/vocab-embeddings.json')
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434'
const MODEL = 'nomic-embed-text'
const BATCH_SIZE = 500

async function main() {
  // Read and filter word list
  const raw = readFileSync(WORD_LIST_PATH, 'utf-8')
  const words = raw.split('\n').map(w => w.trim()).filter(w => w.length > 0)
  console.log(`Loaded ${words.length} words`)

  const allVectors: number[][] = []

  // Batch through Ollama embed API
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE)
    console.log(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(words.length / BATCH_SIZE)} (${batch.length} words)...`)

    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: batch }),
    })

    if (!res.ok) {
      throw new Error(`Ollama embed failed: ${res.status} ${res.statusText}`)
    }

    const json = await res.json() as { embeddings: number[][] }
    allVectors.push(...json.embeddings)
  }

  // Write output
  const output = { model: MODEL, words, vectors: allVectors }
  writeFileSync(OUTPUT_PATH, JSON.stringify(output))
  console.log(`Written ${words.length} embeddings to ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Failed to build vocab embeddings:', err)
  process.exit(1)
})
