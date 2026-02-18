import * as ws from 'ws'
import * as config from '../config'
import * as t from './types'
import * as util from './util'

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
    for (let [gameId, game] of state.games) {
        onTickGame(gameId, game, timeSecs, deltaSecs)
    }
}

function onTickGame(gameId: t.GameId, game: t.Game, timeSecs: number, deltaSecs: number) {
    const phase = game.phase
    switch(phase.type) {
        case 'LOBBY':
            if (phase.timeLeft === undefined) {
                break
            }

            // We are counting down
            phase.timeLeft = Math.max(0, phase.timeLeft - deltaSecs)

            if (phase.timeLeft === 0) {
                // TODO: Choose category
                const category = 'animals'

                game.phase = {
                    type: 'GUESSES',
                    round: 0,
                    category,
                    timeLeft: config.GUESS_SECS,
                    guesses: new Map,
                }
                game.broadcast({
                    type: 'GUESS_STATE',
                    gameId,
                    category,
                    hasGuessed: game.players.map(info => [info.id, false]),
                    secsLeft: config.GUESS_SECS,
                })
            }
            break

        case 'GUESSES':
            phase.timeLeft = Math.max(0, phase.timeLeft - deltaSecs)

            if (phase.timeLeft === 0) {
                // TODO: Calculate scores
                const scores = new Map<t.PlayerId, number>()

                game.phase = {
                    type: 'SCORES',
                    round: 0,
                    category: phase.category,
                    timeLeft: config.SCORE_SECS,
                    scores,
                }
                game.broadcast({
                    type: 'SCORE_STATE',
                    gameId,
                    // TODO: Hook up
                    category: phase.category,
                    playerScores: [...scores.entries()],
                })
            }
            break

        case 'SCORES':
            phase.timeLeft = Math.max(0, phase.timeLeft - deltaSecs)

            if (phase.timeLeft === 0) {
                const round = phase.round + 1

                // Game over
                if (round === config.ROUNDS_PER_GAME) {
                    game.phase = {
                        type: 'LOBBY',
                        timeLeft: undefined,
                        isReady: new Set,
                    }
                    game.broadcast({
                        type: 'LOBBY_STATE',
                        gameId,
                        isReady: game.players.map(info => [info.id, false]),
                    })

                // Next round
                } else {
                    // TODO: Choose category
                    const category = 'animals'

                    // TODO: Make a function so this is not duplicated above
                    game.phase = {
                        type: 'GUESSES',
                        round,
                        category,
                        timeLeft: config.GUESS_SECS,
                        guesses: new Map,
                    }
                    game.broadcast({
                        type: 'GUESS_STATE',
                        gameId,
                        category,
                        hasGuessed: game.players.map(info => [info.id, false]),
                        secsLeft: config.GUESS_SECS,
                    })
                }
            }

            break
    }
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
            state.games.set(state.nameChooser.choose(state.games.has), new t.Game)
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
            break
    }
}
