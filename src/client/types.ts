export * from '../types'
import * as audio from './audio'
import * as mail from './mail'
import * as t from '../types'

export type View =
  | { type: 'LOUNGE' }
  | { type: 'LOBBY', gameId: string, isReady: [t.PlayerId, boolean][] }
  | { type: 'GUESSES', gameId: string, hasGuessed: [t.PlayerId, boolean][], category: string, secsLeft: number, guess?: string }
  | { type: 'SCORES', gameId: string, scores: [t.PlayerId, number][], category: string }

export type State = {
  audioPlayer: audio.Player,
  mailbox: mail.Box,
  view: View,
  otherPlayers: [t.PlayerId, t.PlayerName, t.Mood][],
  playerId: string,
  playerName: string,
}

export function initialState(): State {
  const audioPlayer = new audio.Player('/static')
  const websocketProtocol = document.location.protocol == 'http:' ? 'ws' : 'wss'
  const mailbox = new mail.Box(new WebSocket(`${websocketProtocol}://${window.location.host}/ws`))

  // TODO: Check local storage for existing playerId and playerName
  return {
    audioPlayer,
    mailbox,
    view: { type: 'LOUNGE' },
    otherPlayers: [],
    playerId: crypto.randomUUID(),
    playerName: '',
  }
}
