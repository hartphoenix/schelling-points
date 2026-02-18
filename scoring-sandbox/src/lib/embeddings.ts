export async function fetchEmbedding(text: string): Promise<number[]> {
  const res = await fetch('/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
  })

  if (!res.ok) {
    const body = await res.text()
    if (body.includes('model')) {
      throw new Error("Model not found. Run `ollama pull nomic-embed-text`.")
    }
    throw new Error('Embedding failed. Check ollama and retry.')
  }

  const data = await res.json()

  if (data.error) {
    if (data.error.includes('model')) {
      throw new Error("Model not found. Run `ollama pull nomic-embed-text`.")
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
