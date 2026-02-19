import * as t from './types'
import { Box } from './mail'
import type { JSX } from 'react'
import { QRCode } from 'react-qrcode-logo'

type Props = {
  mailbox: Box
  playerId: t.PlayerId
  gameId: t.GameId
  isReady: [t.PlayerId, boolean][]
  secsLeft?: number
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
}

export function Lobby({ mailbox, playerId, gameId, isReady, secsLeft, otherPlayers }: Props) {
  // Build a name lookup from otherPlayers
  const nameOf = new Map(otherPlayers.map(([id, name]) => [id, name]))

  function handleToggleReady() {
    const currentlyReady = isReady.find(([id]) => id === playerId)?.[1] ?? false
    mailbox.send({ type: 'LOBBY_READY', gameId, playerId, isReady: !currentlyReady })
  }

  function qrCodeButton(id: string): JSX.Element {
    const gameUrl = `${window.location.origin}/game/${id}`
    return (<>
      <button popoverTarget="qr-popover">[QR code]</button>
      <div id="qr-popover" popover="auto">
        <QRCode
          value={gameUrl}
          size={180}
          qrStyle="dots"
          bgColor="transparent"
          fgColor="#E0E0E0"
          eyeRadius={8}
          eyeColor="#7C4DFF"
          quietZone={8}
          ecLevel="M"
        />
      </div>
    </>)
  }

  function copyUrlButton(id: string): JSX.Element {
    const gameUrl = `${window.location.origin}/game/${id}`
    navigator.clipboard.writeText(gameUrl)
    return (<>
      <button popoverTarget="copy-popover">[copy URL]</button>
      <div id="copy-popover" popover="auto">
        copied!
      </div>
    </>)
  }

  return (
    <div className="lobby">
      <h2>Game: {gameId}</h2>
      <ul>
        {isReady.map(([id, ready]) => (
          <li key={id}>
            {nameOf.get(id) ?? id} — {ready ? 'Ready' : 'Waiting'}
          </li>
        ))}
      </ul>
      {secsLeft !== undefined
        && <p>Starting in {Math.ceil(secsLeft)}...</p>}
      <button onClick={handleToggleReady}>
        {isReady.find(([id]) => id === playerId)?.[1] ? 'Unready' : 'Ready'}
      </button>
      {copyUrlButton(gameId)}
      {qrCodeButton(gameId)}
    </div>
  )
} 