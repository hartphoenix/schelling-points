import * as ws from 'ws'
export * from '../types'
import * as names from './names'
import * as t from '../types'

export interface PlayerInfo {
    id: t.PlayerId,
    name: t.PlayerName,
    mood: t.Mood,
    webSocket: ws.WebSocket,
    previousScoresAndGuesses: [number, string][],
    currentGuess?: string,
}

export type Phase =
    | { type: 'LOBBY', secsLeft?: number, isReady: Set<t.PlayerId>, }
    | { type: 'GUESSES', round: number, category: string, secsLeft: number, guesses: Map<t.PlayerId, string> }
    | { type: 'SCORES', round: number, category: string, secsLeft: number, scores: Map<t.PlayerId, number> }

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

        player.webSocket.send(JSON.stringify(message))
    }

    broadcast(message: t.ToClientMessage) {
        for (let player of this.players) {
            this.unicast(player.id, message)
        }
    }
}

export interface LoungeInfo {
    playerName: t.PlayerName;
    mood: t.Mood;
    webSocket: ws.WebSocket;
}

export class State {
    nameChooser: names.Chooser
    lounge: Map<t.PlayerId, LoungeInfo>
    games: Map<t.GameId, Game>

    constructor(nameChooser: names.Chooser) {
        this.nameChooser = nameChooser
        this.lounge = new Map
        this.games = new Map
    }

    broadcastToLounge(message: t.ToClientMessage) {
        for (let loungeInfo of this.lounge.values()) {
            if (loungeInfo.webSocket.readyState !== ws.WebSocket.OPEN) {
                // TODO:
                continue
            }

            loungeInfo.webSocket.send(JSON.stringify(message))
        }
    }

    broadcastLoungeChange() {
        this.broadcastToLounge({
            type: 'MEMBER_CHANGE',
            gameId: undefined,
            allPlayers: [...this.lounge.entries()].map(([playerId, info]) => [playerId, info.playerName, info.mood])
        })
    }
}
