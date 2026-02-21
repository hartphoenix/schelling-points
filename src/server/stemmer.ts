import { stemmer } from 'stemmer'

/** Normalize and stem a word for meld comparison. */
export function stem(word: string): string {
  return stemmer(word.trim().toLowerCase())
}
