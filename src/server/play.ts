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

function newGuessPhase(round: number, category: string): t.Phase {
  return {
    type: 'GUESSES',
    round,
    category,
    secsLeft: config.GUESS_SECS,
    guesses: new Map,
  }
}

function onTickGame(gameId: t.GameId, game: t.Game, timeSecs: number, deltaSecs: number) {
  const phase = game.phase
  switch (phase.type) {
    case 'LOBBY': {
      if (phase.secsLeft === undefined) break

      phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)

      if (phase.secsLeft === 0) {
        // TODO: Choose category
        const category = 'animals'
        game.phase = newGuessPhase(0, category)
        game.broadcast(currentGameState(gameId, game))
      }
      break
    }

    case 'GUESSES': {
      phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)

      if (phase.secsLeft === 0) {
        // TODO: Calculate scores
        const scores = new Map<t.PlayerId, number>()

        game.phase = {
          type: 'SCORES',
          round: phase.round,
          category: phase.category,
          secsLeft: config.SCORE_SECS,
          isReady: new Set<string>(),
          scores,
        }
        game.broadcast(currentGameState(gameId, game))
      }
      break
    }

    case 'SCORES': {
      phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)
      // TODO: need skip-ahead logic if all players are ready
      if (phase.secsLeft === 0) {
        const round = phase.round + 1

        if (round === config.ROUNDS_PER_GAME) {
          game.phase = { type: 'LOBBY', secsLeft: undefined, isReady: new Set }
        } else {
          // TODO: Choose category
          const category = 'animals'
          game.phase = newGuessPhase(round, category)
        }

        game.broadcast(currentGameState(gameId, game))
      }
      break
    }
  }
}

export function onClientMessage(state: t.State, message: t.ToServerMessage, webSocket: ws.WebSocket) {
  switch (message.type) {
    case 'JOIN_LOUNGE': {
      state.lounge.set(message.playerId, {
        name: message.playerName,
        mood: message.mood,
        webSocket,
      })
      state.broadcastLoungeChange()
      break
    }

    case 'SET_PLAYER_INFO': {
      if (message.gameId) {
        const game = state.games.get(message.gameId)
        if (!game) {
          console.warn('SET_PLAYER_INFO: game not found', message.gameId)
          break
        }

        for (const info of game.players) {
          if (info.id === message.playerId) {
            info.mood = message.mood
            game.broadcast(game.memberChangeMessage(message.gameId))
            break
          }
        }

      } else {
        const loungeInfo = state.lounge.get(message.playerId)
        if (!loungeInfo) {
          console.warn('SET_PLAYER_INFO: player not in lounge', message.playerId)
          break
        }
        loungeInfo.name = message.playerName
        loungeInfo.mood = message.mood
        state.broadcastLoungeChange()
      }

      break
    }

    case 'NEW_GAME': {
      const loungeInfo = state.lounge.get(message.playerId)
      if (!loungeInfo) {
        console.warn('NEW_GAME: player not in lounge', message.playerId)
        break
      }

      const gameId = state.nameChooser.choose(id => state.games.has(id))
      const newGame = new t.Game
      newGame.players.push({
        id: message.playerId,
        name: loungeInfo.name,
        mood: loungeInfo.mood,
        webSocket,
        previousScoresAndGuesses: [],
        currentGuess: undefined,
      })

      state.games.set(gameId, newGame)
      state.broadcastLoungeChange()
      break
    }

    case 'SUBSCRIBE_GAME': {
      const game = state.games.get(message.gameId)
      if (!game) {
        console.warn('SUBSCRIBE_GAME: game not found', message.gameId)
        break
      }

      const alreadyPlayer = game.players.find(playerInfo => playerInfo.id === message.playerId)
      if (alreadyPlayer) {
        alreadyPlayer.webSocket = webSocket
      } else {
        game.players.push({
          id: message.playerId,
          name: message.playerName,
          mood: state.lounge.get(message.playerId)?.mood || '😀',
          webSocket,
          previousScoresAndGuesses: [],
          currentGuess: undefined,
        })
      }

      game.unicast(message.playerId, currentGameState(message.gameId, game))
      game.broadcast(game.memberChangeMessage(message.gameId))

      // In case they were in the lounge
      state.lounge.delete(message.playerId)
      state.broadcastLoungeChange()
      break
    }

    case 'LOBBY_READY': {
      const game = state.games.get(message.gameId)
      if (!game || game.phase.type !== 'LOBBY') {
        console.warn('READY: game not found or not in LOBBY phase', message.gameId)
        break
      }

      const lobby = game.phase

      if (message.isReady) lobby.isReady.add(message.playerId)
      else lobby.isReady.delete(message.playerId)

      game.broadcast(currentGameState(message.gameId, game))

      const livePlayerIds = game.players
        .filter(info => info.webSocket.readyState === ws.WebSocket.OPEN)
        .map(info => info.id)
      const allReady = livePlayerIds.length >= 2 && livePlayerIds.every(id => lobby.isReady.has(id))
      if (allReady) {
        lobby.secsLeft = config.LOBBY_COUNTDOWN_SECS
        game.broadcast(currentGameState(message.gameId, game))
      } else if (lobby.secsLeft !== undefined) {
        lobby.secsLeft = undefined
        game.broadcast(currentGameState(message.gameId, game))
      }

      break
    }
    case 'SCORES_READY': {
      // TODO: similar to LOBBY_READY message flow
      break
    }

    case 'GUESS': {
      //TODO: if this is the final player to submit a guess, skip the clock & switch to scores
      const game = state.games.get(message.gameId)
      if (!game || game.phase.type !== 'GUESSES') {
        console.warn('GUESS: game not found or not in GUESSES phase', message.gameId)
        break
      }
      game.phase.guesses.set(message.playerId, message.guess)
      game.broadcast(currentGameState(message.gameId, game))
      break
    }
  }
}

function currentGameState(gameId: t.GameId, game: t.Game): t.ToClientMessage {
  switch (game.phase.type) {
    case 'LOBBY': {
      const lobby = game.phase
      return lobby.secsLeft === undefined
        ? {
          type: 'LOBBY_STATE',
          gameId,
          isReady: game.players.map(info => [info.id, lobby.isReady.has(info.id)])
        }
        : {
          type: 'LOBBY_COUNTDOWN',
          gameId,
          secsLeft: lobby.secsLeft
        }
    }
    case 'GUESSES': {
      const phase = game.phase
      return {
        type: 'GUESS_STATE',
        gameId,
        category: phase.category,
        hasGuessed: game.players.map(info => [info.id, phase.guesses.has(info.id)]),
        secsLeft: phase.secsLeft
      }
    }
    case 'SCORES': {
      const phase = game.phase
      return {
        type: 'SCORE_STATE',
        gameId,
        category: phase.category,
        playerScores: [...phase.scores.entries()],
        isReady: game.players.map(info => [info.id, phase.isReady.has(info.id)]),
        secsLeft: phase.secsLeft,
      }
    }
  }
}
