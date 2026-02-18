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

export type Phase =
    | { type: 'LOBBY', timeLeft?: number, isReady: Set<t.PlayerId>, }
    | { type: 'GUESSES', round: number, category: string, timeLeft: number, guesses: Map<t.PlayerId, string> }
    | { type: 'SCORES', round: number, category: string, timeLeft: number, scores: Map<t.PlayerId, number> }

export interface RoundScore {
    category: string;
    guessesAndScores: [t.PlayerId, string, number][],
}

export class Game {
    players: PlayerInfo[] = []
    phase: Phase = { type: 'LOBBY', isReady: new Set() }
    previousScores: RoundScore[] = []

    unicast(playerId: t.PlayerId, message: t.ToClientMessage) {
        const player = this.players.find(info => info.id === playerId)
        if (!player) {
            // TODO:
            return
        } else if (player.webSocket.readyState !== ws.WebSocket.OPEN) {
            // TODO:
            return
        }

        player!.webSocket.send(JSON.stringify(message))
    }

    broadcast(message: t.ToClientMessage) {
        for (let player of this.players) {
            this.unicast(player.id, message)
        }
    }
}

export interface State {
    nameChooser: names.Chooser,
    lounge: Map<t.PlayerId, [t.PlayerName, t.Mood]>,
    games: Map<t.GameId, Game>,
}

export function initialState(nameChooser: names.Chooser): State {
    return { nameChooser, lounge: new Map(), games: new Map() }
}
