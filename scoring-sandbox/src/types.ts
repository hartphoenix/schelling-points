export type ScoringMode = 'schelling' | 'bullseye' | 'darkHorse'

export type ComputeStatus = 'idle' | 'loading' | 'success' | 'error'

export interface PlayerResult {
  index: number
  text: string
  schellingScore: number
  bullseyeScore: number
  darkHorseScore: number
  x: number
  y: number
}

export interface ComputeResult {
  players: PlayerResult[]
  categoryPoint: { text: string; x: number; y: number }
}
