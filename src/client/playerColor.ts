export type ColorPair = { primary: string; secondary: string }

const PALETTE = [
  '--pink', '--pink-light',
  '--coral', '--coral-light',
  '--gold', '--gold-light',
  '--green', '--green-light',
  '--teal', '--teal-light',
  '--blue', '--blue-light',
  '--cyan', '--cyan-light',
  '--lavender', '--lavender-light',
  '--purple', '--purple-light',
] as const // length = 18

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function playerColor(playerId: string): ColorPair {
  const h = hash(playerId)
  const primaryIndex = h % 18
  const offset = ((h >>> 8) % 17) + 1
  const secondaryIndex = (primaryIndex + offset) % 18
  return {
    primary: PALETTE[primaryIndex],
    secondary: PALETTE[secondaryIndex],
  }
}
