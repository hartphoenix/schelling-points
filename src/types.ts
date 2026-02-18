export type PlayerName = string
export type PlayerId = string
export type GameId = string
export type Mood = '😀' | '😐' | '😞'

export type ToServerMessage =
  | { type: 'JOIN_LOUNGE', playerId: PlayerId, playerName: PlayerName }
  | { type: 'SET_MOOD', playerId: PlayerId, playerName: PlayerName, mood: Mood }
  | { type: 'NEW_GAME' }
  | { type: 'SUBSCRIBE_GAME', gameId: GameId, playerId: PlayerId, playerName: string }
  | { type: 'READY', gameId: GameId, isReady: boolean }
  | { type: 'GUESS', gameId: GameId, playerId: PlayerId, guess: string }

export type ToClientMessage =
  | { type: 'LOUNGE', loungingPlayers: [PlayerId, PlayerName, Mood][] }
  | { type: 'MEMBER_CHANGE', gameId: GameId, allPlayers: [PlayerId, PlayerName, Mood][] }
  | { type: 'LOBBY_STATE', gameId: GameId, isReady: [PlayerId, boolean][] }
  | { type: 'LOBBY_COUNTDOWN', gameId: GameId }
  | { type: 'GUESS_STATE', gameId: GameId, category: string, hasGuessed: [PlayerId, boolean][], secsLeft: number }
  | { type: 'SCORE_STATE', gameId: GameId, category: string, playerScores: [PlayerId, number][] }
  | { type: 'NO_SUCH_GAME', gameId: GameId }

export type Response =
  | { type: 'SUCCESS', result: any }
  | { type: 'ERROR', error: string }
