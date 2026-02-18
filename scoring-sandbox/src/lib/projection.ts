import { PCA } from 'ml-pca'

/** Project high-dimensional embeddings to 2D using PCA. Returns {x, y}[] in same order as input. */
export function projectTo2D(embeddings: number[][]): { x: number; y: number }[] {
  if (embeddings.length < 2) {
    // PCA needs at least 2 points — return origin for single point
    return embeddings.map(() => ({ x: 0, y: 0 }))
  }

  const pca = new PCA(embeddings)
  const projected = pca.predict(embeddings, { nComponents: 2 })
  const data = projected.to2DArray()

  return data.map((row) => ({ x: row[0], y: row[1] }))
}
