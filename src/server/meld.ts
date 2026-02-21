import type { PlayerId } from '../types'
import { stem } from './stemmer'

/**
 * Remove guesses that are repetitions of the prompt (by stem comparison).
 * Returns a new Map with prompt-repeaters filtered out.
 */
export function filterPromptRepetitions(
  guesses: Map<PlayerId, string>,
  prompt: string
): Map<PlayerId, string> {
  const promptStem = stem(prompt)
  const filtered = new Map<PlayerId, string>()
  for (const [id, guess] of guesses) {
    if (stem(guess) !== promptStem) {
      filtered.set(id, guess)
    }
  }
  return filtered
}

/**
 * Returns true if all valid guesses have the same stemmed form
 * and there are at least 2 guesses (a meld requires multiple players).
 */
export function detectMeld(validGuesses: Map<PlayerId, string>): boolean {
  if (validGuesses.size < 2) return false
  const stems = new Set<string>()
  for (const [, guess] of validGuesses) {
    stems.add(stem(guess))
  }
  return stems.size === 1
}
