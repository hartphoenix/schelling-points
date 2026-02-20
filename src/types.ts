export type PlayerName = string
export type PlayerId = string
export type GameId = string
export type Mood = '😀' | '😐' | '😞'

export type ToServerMessage =
  | { type: 'JOIN_LOUNGE', playerId: PlayerId, playerName: PlayerName, mood: Mood }
  | { type: 'SET_PLAYER_INFO', gameId?: GameId, playerId: PlayerId, playerName: PlayerName, mood: Mood }
  | { type: 'NEW_GAME', playerId: PlayerId }
  | { type: 'SUBSCRIBE_GAME', gameId: GameId, playerId: PlayerId, playerName: PlayerName, mood: Mood }
  | { type: 'LOBBY_READY', gameId: GameId, playerId: PlayerId, isReady: boolean }
  | { type: 'SCORES_READY', gameId: GameId, playerId: PlayerId, isReady: boolean }
  | { type: 'GUESS', gameId: GameId, playerId: PlayerId, guess: string }

export type ToClientMessage =
  | { type: 'LOUNGE', loungingPlayers: [PlayerId, PlayerName, Mood][] }
  | { type: 'MEMBER_CHANGE', gameId?: GameId, allPlayers: [PlayerId, PlayerName, Mood][] }
  | { type: 'LOBBY_STATE', gameId: GameId, isReady: [PlayerId, boolean][] }
  | { type: 'LOBBY_COUNTDOWN', gameId: GameId, secsLeft: number }
  | { type: 'GUESS_STATE', gameId: GameId, category: string, hasGuessed: [PlayerId, boolean][], secsLeft: number }
  | { type: 'SCORE_STATE', gameId: GameId, category: string, playerScores: [PlayerId, number][], guesses: [PlayerId, string][], isReady: [PlayerId, boolean][], secsLeft: number }
  | { type: 'NO_SUCH_GAME', gameId: GameId }

export type Response =
  | { type: 'SUCCESS', result: any }
  | { type: 'ERROR', error: string }
