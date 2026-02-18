export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

/** Element-wise mean of vectors (player responses only — excludes category) */
export function centroid(vectors: number[][]): number[] {
  const dim = vectors[0].length
  const result = new Array<number>(dim).fill(0)
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += vec[i]
    }
  }
  for (let i = 0; i < dim; i++) {
    result[i] /= vectors.length
  }
  return result
}

export interface RawScores {
  schellingScore: number
  bullseyeScore: number
  darkHorseScore: number
}

export interface ScoreResult {
  scores: RawScores[]
  centroid: number[]
}

/** Compute all three mode scores for each response, and return the centroid vector */
export function computeScores(
  categoryEmbedding: number[],
  responseEmbeddings: number[][],
): ScoreResult {
  const cent = centroid(responseEmbeddings)

  const scores = responseEmbeddings.map((embed) => {
    const simToCategory = cosineSimilarity(embed, categoryEmbedding)
    const simToCentroid = cosineSimilarity(embed, cent)

    return {
      schellingScore: simToCentroid,
      bullseyeScore: simToCategory,
      darkHorseScore: simToCategory * (1 - simToCentroid),
    }
  })

  return { scores, centroid: cent }
}
