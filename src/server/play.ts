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
            if (phase.secsLeft === undefined) {
                break
            }

            // We are counting down
            phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)

            if (phase.secsLeft === 0) {
                // TODO: Choose category
                const category = 'animals'

                game.phase = {
                    type: 'GUESSES',
                    round: 0,
                    category,
                    secsLeft: config.GUESS_SECS,
                    guesses: new Map,
                }
                game.broadcast(currentGameState(gameId, game))
            }
            break

        case 'GUESSES':
            phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)

            if (phase.secsLeft === 0) {
                // TODO: Calculate scores
                const scores = new Map<t.PlayerId, number>()

                game.phase = {
                    type: 'SCORES',
                    round: 0,
                    category: phase.category,
                    secsLeft: config.SCORE_SECS,
                    scores,
                }
                game.broadcast(currentGameState(gameId, game))
            }
            break

        case 'SCORES':
            phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)

            if (phase.secsLeft === 0) {
                const round = phase.round + 1

                // Game over
                if (round === config.ROUNDS_PER_GAME) {
                    game.phase = {
                        type: 'LOBBY',
                        secsLeft: undefined,
                        isReady: new Set,
                    }

                // Next round
                } else {
                    // TODO: Choose category
                    const category = 'animals'

                    // TODO: Make a function so this is not duplicated above
                    game.phase = {
                        type: 'GUESSES',
                        round,
                        category,
                        secsLeft: config.GUESS_SECS,
                        guesses: new Map,
                    }
                }

                game.broadcast(currentGameState(gameId, game))
            }

            break
    }
}

export function onClientMessage(state: t.State, message: t.ToServerMessage, webSocket: ws.WebSocket) {
    switch(message.type) {
        case 'JOIN_LOUNGE':
            state.lounge.set(message.playerId, {
                playerName: message.playerName,
                mood: message.mood,
                webSocket,
            })
            state.broadcastLoungeChange()
            break

        case 'SET_PLAYER_INFO':
            if (message.gameId) {
                const game = state.games.get(message.gameId)
                // TODO: Log error
                if (!game) {
                    break
                }

                for (let info of game.players) {
                    if (info.id === message.playerId) {
                        info.mood = message.mood
                        game.broadcast({
                            type: 'MEMBER_CHANGE',
                            gameId: message.gameId,
                            allPlayers: game.players.map(info => [info.id, info.name, info.mood]),
                        })
                        break
                    }
                }

            } else {
                const loungeInfo = state.lounge.get(message.playerId)
                if (!loungeInfo) {
                    // TODO: Log error
                    break
                }
                loungeInfo.playerName = message.playerName
                loungeInfo.mood = message.mood
            }

            state.broadcastLoungeChange()
            break

        case 'NEW_GAME':
            const loungeInfo = state.lounge.get(message.playerId)
            if (!loungeInfo) {
                // TODO: Log error
                break
            }

            const gameId = state.nameChooser.choose(state.games.has)
            const newGame = new t.Game
            newGame.players.push({
                id: message.playerId,
                name: loungeInfo.playerName,
                mood: loungeInfo.mood,
                webSocket,
                previousScoresAndGuesses: [],
                currentGuess: undefined,
            })

            state.games.set(gameId, newGame)
            state.broadcastLoungeChange()
            break

        case 'SUBSCRIBE_GAME':
            const game = state.games.get(message.gameId)
            if (!game) {
                // TODO: Log error
                break
            }

            const alreadyPlayer = game.players.find(playerInfo => playerInfo.id === message.playerId)
            if (alreadyPlayer) {
                alreadyPlayer.webSocket = webSocket
            } else {
                game.players.push({
                    id: message.playerId,
                    name: message.playerName,
                    // TODO: Should we log error?
                    mood: state.lounge.get(message.playerId)?.mood || '😀',
                    webSocket,
                    previousScoresAndGuesses: [],
                    currentGuess: undefined,
                })
            }

            game.unicast(
                message.playerId,
                currentGameState(message.gameId, game)
            )

            game.broadcast({
                type: 'MEMBER_CHANGE',
                gameId: message.gameId,
                allPlayers: game.players.map(info => [info.id, info.name, info.mood]),
            })

            // In case they were in the lounge
            state.lounge.delete(message.playerId)
            state.broadcastLoungeChange()
            break

        case 'READY':
            const lobbyGame = state.games.get(message.gameId)
            if (!lobbyGame || lobbyGame.phase.type !== 'LOBBY') {
                // TODO: Log error
                break
            }

            if (message.isReady) lobbyGame.phase.isReady.add(message.playerId)
            else                 lobbyGame.phase.isReady.delete(message.playerId)

            // Send ready updates first
            lobbyGame.broadcast(currentGameState(message.gameId, lobbyGame))

            const livePlayerIds = lobbyGame.players
                .filter(info => info.webSocket.readyState === ws.WebSocket.OPEN)
                .map(info => info.id)
            if (livePlayerIds.every(id => lobbyGame.phase.isReady.has(id))) {
                lobbyGame.phase.secsLeft = config.LOBBY_COUNTDOWN_SECS
                lobbyGame.broadcast(currentGameState(message.gameId, lobbyGame))
            }

            break

        case 'GUESS':
            const scoreGame = state.games.get(message.gameId)
            if (!scoreGame || scoreGame.phase.type !== 'GUESSES') {
                // TODO: Log error
                break
            }
            scoreGame.phase.guesses.set(message.playerId, message.guess)
            scoreGame.broadcast(currentGameState(message.gameId, scoreGame))
            break
    }
}

function currentGameState(gameId: t.GameId, game: t.Game): t.ToClientMessage {
    switch(game.phase.type) {
        case 'LOBBY':
            return game.phase.secsLeft === undefined
                ? {
                    type: 'LOBBY_STATE',
                    gameId,
                    isReady: game.players.map(info => [info.id, game.phase.isReady.has(info.id)])
                }
                : {
                    type: 'LOBBY_COUNTDOWN',
                    gameId,
                    secsLeft: game.phase.secsLeft
                }
        case 'GUESSES':
            return {
                type: 'GUESS_STATE',
                gameId,
                category: game.phase.category,
                hasGuessed: game.players.map(info => [info.id, game.phase.guesses.has(info.id)]),
                secsLeft: game.phase.secsLeft
            }
        case 'SCORES':
            return {
                type: 'SCORE_STATE',
                gameId,
                category: game.phase.category,
                playerScores: [...game.phase.scores.entries()],
                secsLeft: game.phase.secsLeft,
            }
    }
}
