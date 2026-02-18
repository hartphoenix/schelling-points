import { PCA } from 'ml-pca'

type Point2D = { x: number; y: number }

export interface ProjectionResult {
  points: Point2D[]
  /** Project additional points through the same fitted PCA model */
  project: (extra: number[][]) => Point2D[]
}

/** Project high-dimensional embeddings to 2D using PCA. Returns points + a project fn for extras. */
export function projectTo2D(embeddings: number[][]): ProjectionResult {
  if (embeddings.length < 2) {
    return {
      points: embeddings.map(() => ({ x: 0, y: 0 })),
      project: (extra) => extra.map(() => ({ x: 0, y: 0 })),
    }
  }

  const pca = new PCA(embeddings)
  const projected = pca.predict(embeddings, { nComponents: 2 })
  const data = projected.to2DArray()

  return {
    points: data.map((row) => ({ x: row[0], y: row[1] })),
    project: (extra) => {
      const extraProjected = pca.predict(extra, { nComponents: 2 })
      return extraProjected.to2DArray().map((row) => ({ x: row[0], y: row[1] }))
    },
  }
}
