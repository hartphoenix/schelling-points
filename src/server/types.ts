import WebSocket from 'ws'
export * from '../types'
import * as names from './names'
import * as t from '../types'
import type { Vocab } from './vocab'

export interface PlayerInfo {
  id: t.PlayerId,
  name: t.PlayerName,
  mood: t.Mood,
  webSocket: WebSocket,
  previousScoresAndGuesses: [number, string][],
}

export interface Category {
  id: number
  prompt: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export type Phase =
  | { type: 'LOBBY', secsLeft?: number, isReady: Set<t.PlayerId> }
  | { type: 'GUESSES', round: number, prompt: string, secsLeft: number, guesses: Map<t.PlayerId, string> }
  | { type: 'REVEAL', round: number, prompt: string, isReady: Set<t.PlayerId>, secsLeft: number, scores: Map<t.PlayerId, number>, positions: Map<t.PlayerId, [number, number]>, guesses: Map<t.PlayerId, string>, centroidWord: string, melded: boolean }
  | { type: 'CONTINUE', isLeaving: Set<t.PlayerId>, isContinuing: Set<t.PlayerId> }

export interface RoundScore {
  prompt: string;
  guessesAndScores: [t.PlayerId, string, number][],
}

export class Game {
  players: PlayerInfo[] = []
  phase: Phase = { type: 'LOBBY', isReady: new Set() }
  previousScores: RoundScore[] = []
  scoringInProgress = false
  centroidHistory: string[] = []
  currentPrompt = ''
  scoringRetries = 0

  unicast(playerId: t.PlayerId, message: t.ToClientMessage) {
    const player = this.players.find(info => info.id === playerId)
    if (!player) {
      console.warn('unicast: player not found', playerId)
      return
    } else if (player.webSocket.readyState !== WebSocket.OPEN) {
      console.warn('unicast: WebSocket not open', playerId)
      return
    }

    player.webSocket.send(JSON.stringify(message))
  }

  broadcast(message: t.ToClientMessage) {
    for (let player of this.players) {
      this.unicast(player.id, message)
    }
  }

  memberChangeMessage(gameId: t.GameId): t.ToClientMessage {
    return {
      type: 'MEMBER_CHANGE',
      gameId,
      allPlayers: this.players.map(info => [info.id, info.name, info.mood]),
    }
  }
}

export interface LoungeInfo {
  name: t.PlayerName;
  mood: t.Mood;
  webSocket: WebSocket;
}

export class State {
  nameChooser: names.Chooser
  lounge: Map<t.PlayerId, LoungeInfo>
  games: Map<t.GameId, Game>
  categories: Category[]
  vocab: Vocab

  constructor(nameChooser: names.Chooser, categories: Category[], vocab: Vocab) {
    this.nameChooser = nameChooser
    this.lounge = new Map
    this.games = new Map
    this.categories = categories
    this.vocab = vocab
  }

  broadcastToLounge(message: t.ToClientMessage) {
    for (let loungeInfo of this.lounge.values()) {
      if (loungeInfo.webSocket.readyState !== WebSocket.OPEN) {
        console.warn('broadcastToLounge: stale WebSocket, skipping')
        continue
      }

      loungeInfo.webSocket.send(JSON.stringify(message))
    }
  }

  broadcastLoungeChange() {
    this.broadcastToLounge({
      type: 'MEMBER_CHANGE',
      gameId: undefined,
      allPlayers: [...this.lounge.entries()].map(([playerId, info]) => [playerId, info.name, info.mood])
    })
  }
}
