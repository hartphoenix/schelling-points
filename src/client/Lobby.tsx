import * as t from './types'
import * as React from 'react'
import { Box } from './mail'
import type { JSX } from 'react'
import { QRCode } from 'react-qrcode-logo'
import { Timer } from './components/timer'
import { PlayerRing } from './PlayerRing'
import { MoodPicker } from './MoodPicker'
import { InstructionsPopover } from './InstructionsPopover'
import { playerColor } from './playerColor'

type Props = {
  mailbox: Box
  playerId: t.PlayerId
  gameId: t.GameId
  isReady: [t.PlayerId, boolean][]
  secsLeft?: number
  mood: t.Mood
  playerName: t.PlayerName
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
}

export function Lobby({ mailbox, playerId, gameId, isReady, secsLeft, mood, playerName, otherPlayers }: Props) {
  const [currentMood, setCurrentMood] = React.useState(
    (localStorage.getItem('mood') as t.Mood) ?? mood
  )

  function handleMoodChange(newMood: t.Mood) {
    setCurrentMood(newMood)
    localStorage.setItem('mood', newMood)
    mailbox.send({ type: 'SET_PLAYER_INFO', gameId, playerId, playerName, mood: newMood })
  }

  function handleToggleReady() {
    const currentlyReady = isReady.find(([id]) => id === playerId)?.[1] ?? false
    mailbox.send({ type: 'LOBBY_READY', gameId, playerId, isReady: !currentlyReady })
  }

  function qrCodeButton(id: string): JSX.Element {
    const gameUrl = `${window.location.origin}/game/${id}`
    return (<>
      <button className="btn-icon" popoverTarget="qr-popover">
        <svg className="icon" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round">
          <rect x="2" y="2" width="8" height="8" rx="1"/>
          <rect x="14" y="2" width="8" height="8" rx="1"/>
          <rect x="2" y="14" width="8" height="8" rx="1"/>
          <rect x="14" y="14" width="4" height="4" rx="1"/>
          <line x1="22" y1="14" x2="22" y2="18"/>
          <line x1="18" y1="22" x2="22" y2="22"/>
        </svg>
      </button>
      <div id="qr-popover" popover="auto">
        <QRCode
          value={gameUrl}
          size={180}
          qrStyle="dots"
          bgColor="transparent"
          fgColor="#eae0d0"
          eyeRadius={8}
          eyeColor="#3abba5"
          quietZone={8}
          ecLevel="M"
        />
      </div>
    </>)
  }

  function copyUrlButton(id: string): JSX.Element {
    const gameUrl = `${window.location.origin}/game/${id}`
    return (<>
      <button className="btn-icon" popoverTarget="copy-popover" onClick={() => navigator.clipboard.writeText(gameUrl)}>
        <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none"         
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"               
          strokeLinejoin="round">                                                    
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/>             
          <polyline points="16 6 12 2 8 6"/>                                
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>
      <div id="copy-popover" popover="auto">
        copied!
      </div>
    </>)
  }

  return (
    <div className="screen lobby">
      <div className="screen-topbar">
        <button className="btn-back">‹</button>
        <InstructionsPopover autoShow={!localStorage.getItem('schelling-instructions-seen')} />
      </div>
      <div className="screen-header">
        <h1>Lobby</h1>
        <h2>Your Game is: {gameId} 
          {copyUrlButton(gameId)}
          {qrCodeButton(gameId)}
        </h2>
      </div>
      <PlayerRing players={otherPlayers} isReady={isReady} />
      <p>{otherPlayers.length} players joined</p>
      {secsLeft !== undefined
        && <p>Starting in <Timer secsLeft={secsLeft} />...</p>}
      <div className="screen-footer">
        <MoodPicker currentMood={currentMood} onSelect={handleMoodChange} />
        <button className="btn" onClick={handleToggleReady}>
          {isReady.find(([id]) => id === playerId)?.[1] ? 'Unready' : 'Ready'}
        </button>
      </div>
    </div>
  )
} 