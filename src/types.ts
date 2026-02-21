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
  | { type: 'REVEAL_READY', gameId: GameId, playerId: PlayerId, isReady: boolean }
  | { type: 'GUESS', gameId: GameId, playerId: PlayerId, guess: string }
  | { type: 'CONTINUE_VOTE', gameId: GameId, playerId: PlayerId, continuePlay: boolean }

export type ToClientMessage =
  | { type: 'LOUNGE', loungingPlayers: [PlayerId, PlayerName, Mood][] }
  | { type: 'MEMBER_CHANGE', gameId?: GameId, allPlayers: [PlayerId, PlayerName, Mood][] }
  | { type: 'LOBBY_STATE', gameId: GameId, isReady: [PlayerId, boolean][] }
  | { type: 'LOBBY_COUNTDOWN', gameId: GameId, secsLeft: number }
  | { type: 'GUESS_STATE', gameId: GameId, prompt: string, hasGuessed: [PlayerId, boolean][], secsLeft: number, round: number, totalRounds: number }
  | { type: 'REVEAL_STATE', gameId: GameId, centroidWord: string, centroidIsRepeat: boolean, positions: [PlayerId, number, number][], guesses: [PlayerId, string][], melded: boolean, round: number, totalRounds: number, secsLeft: number, isReady: [PlayerId, boolean][] }
  | { type: 'GAME_END', gameId: GameId, melded: boolean, meldRound: number | null, centroidHistory: string[], playerHistory: [string, string][] }
  | { type: 'CONTINUE_PROMPT', gameId: GameId, centroidHistory: string[], playerHistory: [string, string][] }
  | { type: 'SCORING', gameId: GameId }
  | { type: 'NO_SUCH_GAME', gameId: GameId }
