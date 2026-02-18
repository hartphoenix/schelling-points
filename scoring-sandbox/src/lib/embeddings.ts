const MODEL = 'nomic-embed-text'
const MODEL_NOT_FOUND = `Model not found. Run \`ollama pull ${MODEL}\`.`

export async function fetchEmbedding(text: string): Promise<number[]> {
  const res = await fetch('/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: text }),
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(MODEL_NOT_FOUND)
    }
    throw new Error('Embedding failed. Check ollama and retry.')
  }

  const data = await res.json()

  if (data.error) {
    if (data.error.includes('model')) {
      throw new Error(MODEL_NOT_FOUND)
    }
    throw new Error(`Ollama error: ${data.error}`)
  }

  const embedding: number[] = data.embedding
  if (!embedding || embedding.length === 0) {
    throw new Error(`Invalid embedding for '${text}'. Try different input.`)
  }

  // Check for zero-magnitude vector
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  if (magnitude === 0) {
    throw new Error(`Invalid embedding for '${text}'. Try different input.`)
  }

  return embedding
}

export type OllamaStatus = 'checking' | 'connected' | 'disconnected'

/** Single check: is ollama running and does it have the embedding model? */
export async function checkOllamaStatus(): Promise<OllamaStatus> {
  try {
    const res = await fetch('/api/tags')
    if (!res.ok) return 'disconnected'
    const data = await res.json()
    const models: { name: string }[] = data.models ?? []
    const hasModel = models.some((m) => m.name.startsWith(MODEL))
    return hasModel ? 'connected' : 'disconnected'
  } catch {
    return 'disconnected'
  }
}
