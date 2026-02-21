import * as React from 'react'
import * as t from './types'
import { playerColor } from './playerColor'

type Props = {
  players?: [t.PlayerId, t.PlayerName, t.Mood][]
  isReady?: [t.PlayerId, boolean][]
}

const COLORS = [
  '--pink', '--coral', '--gold', '--green', '--teal',
  '--blue', '--cyan', '--lavender', '--purple',
]

const CONTAINER_SIZE = 340
const CENTER = CONTAINER_SIZE / 2
// radii matching the CSS ring borders: 100%, 85%, 70%, 50%
const RING_RADII = [170, 144, 119, 85]
// stagger starting angle per ring so nodes don't line up
const RING_ANGLE_OFFSETS = [0, Math.PI / 4, Math.PI / 6, Math.PI / 3]
const PLAYER_NODE_SIZE = 32
const DOT_SIZE = 8

// start at 12 o'clock (-π/2) and space evenly around the circle
function getNodePosition(index: number, total: number, size: number, radius: number, ringIndex: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2 + RING_ANGLE_OFFSETS[ringIndex]
  return {
    left: CENTER + radius * Math.cos(angle) - size / 2,
    top:  CENTER + radius * Math.sin(angle) - size / 2,
  }
}

export function PlayerRing({ players, isReady }: Props) {
  const previousPlayerIds = React.useRef<Set<string>>(new Set())
  const readySet = new Set(isReady?.filter(([, ready]) => ready).map(([id]) => id))

  React.useEffect(() => {
    if (players) previousPlayerIds.current = new Set(players.map(([id]) => id))
  }, [players])

  // distribute players across 4 rings round-robin:
  // player 0 → ring 0, player 1 → ring 1, ..., player 4 → ring 0, etc.
  const buckets: (typeof players)[] = [[], [], [], []]
  players?.forEach((player, idx) => buckets[idx % 4].push(player))

  function renderPlayerNode(
    [id, name, mood]: [t.PlayerId, t.PlayerName, t.Mood],
    posInRing: number, totalInRing: number, ringIndex: number,
  ) {
    const color = `var(${playerColor(id).primary})`
    const ready = readySet.has(id)
    const isNew = !previousPlayerIds.current.has(id)
    const classes = [
      'ring-node',
      'ring-node-avatar',
      isNew && 'ring-node-enter',
      ready && 'ring-node-ready',
    ].filter(Boolean).join(' ')

    return (
      <div
        key={id}
        className={classes}
        title={`${name} ${mood}`}
        style={{
          width: PLAYER_NODE_SIZE, height: PLAYER_NODE_SIZE,
          background: color, color,
          opacity: ready ? 1 : 0.4,
          ...getNodePosition(posInRing, totalInRing, PLAYER_NODE_SIZE, RING_RADII[ringIndex], ringIndex),
        }}
      >
        {name.charAt(0).toUpperCase()}
        <span className="ring-node-mood">{mood}</span>
      </div>
    )
  }

  // decorative dots use the same round-robin distribution
  const decorativeBuckets: { color: string }[][] = [[], [], [], []]
  COLORS.forEach((colorName, idx) => decorativeBuckets[idx % 4].push({ color: `var(${colorName})` }))

  return (
    <div className="ring-container">
      <div className="ring">
        {players
          ? buckets.map((bucket, ringIndex) =>
              bucket.map((player, posInRing) =>
                renderPlayerNode(player, posInRing, bucket.length, ringIndex)
              )
            )
          : decorativeBuckets.map((bucket, ringIndex) =>
              bucket.map((dot, posInRing) => (
                <div key={`${ringIndex}-${posInRing}`} className="ring-node" style={{
                  width: DOT_SIZE, height: DOT_SIZE,
                  background: dot.color, color: dot.color,
                  ...getNodePosition(posInRing, bucket.length, DOT_SIZE, RING_RADII[ringIndex], ringIndex),
                }} />
              ))
            )
        }
        <div className="ring-mid-outer" />
        <div className="ring-inner" />
        <div className="ring-mid-inner" />
      </div>
      <div className="ring-glow" />
    </div>
  )
}
