import * as t from './types'
import * as util from './util'
import * as ws from 'ws'

export function startTicking(
    startingState: t.State,
    tickMilliseconds: number,
) {
    const state = startingState
    let timeSecs = util.nowSecs()
    let deltaSecs = 0

    const tick = () => {
        const now = util.nowSecs()
        deltaSecs = now - timeSecs
        timeSecs = now
        onTick(state, timeSecs, deltaSecs)
    }

    setInterval(tick, tickMilliseconds);
}

function onTick(state: t.State, timeSecs: number, deltaSecs: number) {
}

export function onClientMessage(state: t.State, message: t.ToServerMessage, webSocket: ws.WebSocket) {
    switch(message.type) {
        case 'JOIN_LOUNGE':
            state.lounge.set(message.playerId, [message.playerName, '😀'])
            break

        case 'SET_MOOD':
            const nameAndMood = state.lounge.get(message.playerId)
            // TODO: Error
            if (!nameAndMood) {
                return
            }

            state.lounge.set(message.playerId, [message.playerName, message.mood])
            break

        case 'NEW_GAME':
            state.games.set(state.nameChooser.choose(state.games.has), t.newGame())
            break

        case 'SUBSCRIBE_GAME':
            const game = state.games.get(message.gameId)
            // TODO: Error on missing
            if (!game) {
                return
            }

            const alreadyPlayer = game.players.find(playerInfo => playerInfo.id === message.playerId)
            if (alreadyPlayer) {
                alreadyPlayer.webSocket = webSocket
            } else {
                game.players.push({
                    id: message.playerId,
                    name: message.playerName,
                    webSocket,
                    previousScoresAndGuesses: [],
                    currentGuess: undefined,
                })
            }
            break

        case 'GUESS':
    }
}
