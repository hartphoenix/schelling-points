export type ScoringMode = 'schelling' | 'bullseye' | 'darkHorse'

export type ComputeStatus = 'idle' | 'loading' | 'success' | 'error'

export interface DarkHorseParams {
  exponent: number
  floor: number
}

export interface PlayerResult {
  index: number
  text: string
  schellingScore: number
  bullseyeScore: number
  darkHorseScore: number
  x: number
  y: number
  // Prompt B scores — present only when a second category prompt is provided
  schellingScoreB?: number
  bullseyeScoreB?: number
  darkHorseScoreB?: number
}

export interface ComputeResult {
  players: PlayerResult[]
  categoryPoint: { text: string; x: number; y: number }
  centroidPoint: { x: number; y: number }
  centroidScores: {
    schelling: number
    bullseye: number
    darkHorse: number
  }
  // Present only when a second category prompt is provided
  promptB?: {
    categoryPoint: { text: string; x: number; y: number }
    centroidPoint: { x: number; y: number }
    centroidScores: { schelling: number; bullseye: number; darkHorse: number }
    playerCoords: { x: number; y: number }[]
  }
}

export type ViewMode = 'scatter' | 'radial'
