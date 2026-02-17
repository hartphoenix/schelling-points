import * as ws from 'ws'
export * from '../types'
import * as names from './names'
import * as t from '../types'

export interface PlayerInfo {
    id: t.PlayerId,
    name: t.PlayerName,
    webSocket: ws.WebSocket,
    previousScoresAndGuesses: [number, string][],
    currentGuess?: string,
}

export interface Game {
    players: PlayerInfo[],
    category?: string
}

export function newGame(): Game {
    return { players: [], category: undefined }
}

export interface State {
    nameChooser: names.Chooser,
    lounge: Map<t.PlayerId, [t.PlayerName, t.Mood]>,
    games: Map<t.GameId, Game>,
}

export function initialState(nameChooser: names.Chooser): State {
    return { nameChooser, lounge: new Map(), games: new Map() }
}
