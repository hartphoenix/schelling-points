export const ROUNDS_PER_GAME = 10
export const LOBBY_COUNTDOWN_SECS = 3
export const GUESS_SECS = 25
export const GUESS_COUNTDOWN_SECS = 10
export const SCORE_SECS = 25
export const SCORE_COUNTDOWN_SECS = 5
export const DIFFICULTY_SCHEDULE: ('easy' | 'medium' | 'hard') [] = [
    'easy', 'easy', 'medium', 'easy', 'medium',
    'hard', 'easy', 'medium', 'hard', 'medium',
]

export const BASE_MAX_SCORE = 10
export const SIMILARITY_FLOOR = 0.5
export const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434'
export const EMBEDDING_MODEL = 'nomic-embed-text'
export const EMBEDDING_TIMEOUT_MS = 10_000
export const EMBEDDING_RETRIES = 2
