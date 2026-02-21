import * as React from 'react'
import * as t from './types'
import { Box } from './mail'
import { MoodPicker } from './MoodPicker'
import { PlayerRing } from './PlayerRing'
import { InstructionsPopover } from './InstructionsPopover'
import { playerColor } from './playerColor'

type Props = {
  mailbox: Box
  playerId: t.PlayerId
  mood: t.Mood
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][]
}

export function Lounge({ mailbox, playerId, mood, otherPlayers }: Props) {
  const savedName = localStorage.getItem('playerName') ?? ''
  const [playerName, setPlayerName] = React.useState(savedName)
  const [joined, setJoined] = React.useState(false)
  const [currentMood, setCurrentMood] = React.useState(
    (localStorage.getItem('mood') as t.Mood) ?? mood
  )

  function handleJoin() {
    if (!playerName.trim()) return
    localStorage.setItem('playerName', playerName)
    mailbox.send({ type: 'JOIN_LOUNGE', playerId, playerName, mood: currentMood })
    setJoined(true)
  }

  function handleNewGame() {
    mailbox.send({ type: 'NEW_GAME', playerId })
  }

  function handleMoodChange(newMood: t.Mood) {
    setCurrentMood(newMood)
    localStorage.setItem('mood', newMood)
    if (joined) {
      mailbox.send({ type: 'SET_PLAYER_INFO', playerId, playerName, mood: newMood })
    }
  }

  if (!joined) {
    return (
      <div className="screen lounge">
        <div className="screen-topbar">
          <span />
          <InstructionsPopover autoShow />
        </div>
        <div className="title-block">
          <h1 className="title">The Schelling Point</h1>
          <p className="subtitle">Do you & your friends think alike?</p>
        </div>
        <PlayerRing />
        <div className="screen-footer">
          <input className="input"
            type="text"
            placeholder="Your name"
            maxLength={20}
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button className="btn" onClick={handleJoin}>Join Lounge</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen lounge">
      <div className="screen-topbar">
        <button className="btn-back">‹</button>
        <InstructionsPopover />
      </div>
      <div className="screen-header">
        <div className="title-block">
          <h1 className="title">Lobby</h1>
          <p className="subtitle">Do you & your friends think alike?</p>
        </div>
      </div>
      <PlayerRing players={otherPlayers} />
      <div className="screen-footer">
        <p>{otherPlayers.length + 1} players joined</p>
        <MoodPicker currentMood={currentMood} onSelect={handleMoodChange} />
        <button className="btn" onClick={handleNewGame}>New Game</button>
      </div>
    </div>
  )
}