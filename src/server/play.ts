import WebSocket from 'ws'
import * as config from '../config'
import * as t from './types'
import * as util from './util'

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function fillQueue(queue: number[], difficulty: 'easy' | 'medium' | 'hard', allCategories: t.Category[]): void {
  const matching = allCategories.filter(c => c.difficulty === difficulty)
  const shuffled = shuffle(matching.map(c => c.id))
  queue.push(...shuffled)
}

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
    onTickGame(gameId, game, timeSecs, deltaSecs, state.categories)
  }
}

function transitionToScores(
  gameId: t.GameId,
  game: t.Game,
  phase: Extract<t.Phase, { type: 'GUESSES' }>,
  scores: Map<t.PlayerId, number>,
) {
  game.phase = {
    type: 'SCORES',
    round: phase.round,
    category: phase.category,
    secsLeft: config.SCORE_SECS,
    isReady: new Set<string>(),
    scores,
    guesses: phase.guesses,
  }
  game.broadcast(currentGameState(gameId, game))
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

function pickCategory(round: number, game: t.Game, allCategories: t.Category[]): string {
  const difficulty = config.DIFFICULTY_SCHEDULE[round]
  const queue = game.categoryQueues[difficulty]

  if (queue.length === 0) {
    fillQueue(queue, difficulty, allCategories)
  }

  const categoryId = queue.shift()!
  const category = allCategories.find(c => c.id === categoryId)!
  return category.prompt
}

export function onTickGame(gameId: t.GameId, game: t.Game, timeSecs: number, deltaSecs: number, categories: t.Category[]) {
  const phase = game.phase
  switch (phase.type) {
    case 'LOBBY': {
      if (phase.secsLeft === undefined) break

      phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)

      if (phase.secsLeft === 0) {
        const category = pickCategory(0, game, categories)
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
        transitionToScores(gameId, game, phase, scores)
      }
      break
    }

    case 'SCORES': {
      phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)
      // TODO: need skip-ahead logic if all players are ready
      if (phase.secsLeft === 0) {
        goToNextRound(gameId, game, categories)
      }
      break
    }
  }
}

export function onClientMessage(state: t.State, message: t.ToServerMessage, webSocket: WebSocket) {
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
      })
      newGame.broadcast(currentGameState(gameId, newGame))

      state.games.set(gameId, newGame)
      state.broadcastLoungeChange()
      break
    }

    case 'SUBSCRIBE_GAME': {
      const game = state.games.get(message.gameId)
      if (!game) {
        console.warn('SUBSCRIBE_GAME: game not found', message.gameId)
        state.lounge.set(message.playerId, {
          name: message.playerName,
          mood: message.mood,
          webSocket,
        })
        state.broadcastLoungeChange()
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
        console.warn('LOBBY_READY: game not found or not in LOBBY phase', message.gameId)
        break
      }

      const lobby = game.phase

      if (message.isReady) lobby.isReady.add(message.playerId)
      else lobby.isReady.delete(message.playerId)

      game.broadcast(currentGameState(message.gameId, game))

      const livePlayerIds = game.players
        .filter(info => info.webSocket.readyState === WebSocket.OPEN)
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
      const game = state.games.get(message.gameId)
      if (!game || game.phase.type !== 'SCORES') {
        console.warn('SCORES_READY: game not found or not in SCORES phase', message.gameId)
        break
      }

      const phase = game.phase

      if (message.isReady) phase.isReady.add(message.playerId)
      else phase.isReady.delete(message.playerId)

      game.broadcast(currentGameState(message.gameId, game))

      const livePlayerIds = game.players
        .filter(info => info.webSocket.readyState === WebSocket.OPEN)
        .map(info => info.id)
      const allReady = 0 < livePlayerIds.length && livePlayerIds.every(id => phase.isReady.has(id))
      if (allReady) {
        goToNextRound(message.gameId, game, state.categories)
      }
      break
    }

    case 'GUESS': {
      const game = state.games.get(message.gameId)
      if (!game || game.phase.type !== 'GUESSES') {
        console.warn('GUESS: game not found or not in GUESSES phase', message.gameId)
        break
      }
      game.phase.guesses.set(message.playerId, message.guess)

      const livePlayerIds = game.players
        .filter(info => info.webSocket.readyState === WebSocket.OPEN)
        .map(info => info.id)
      const allGuessed = livePlayerIds.every(id => game.phase.type === 'GUESSES' && game.phase.guesses.has(id))

      if (allGuessed) {
        // TODO: Calculate scores
        const scores = new Map<t.PlayerId, number>()
        transitionToScores(message.gameId, game, game.phase, scores)
      } else {
        game.broadcast(currentGameState(message.gameId, game))
      }
      break
    }
  }
}

function goToNextRound(gameId: t.GameId, game: t.Game, categories: t.Category[]) {
  if (game.phase.type !== 'SCORES') {
    return
  }

  const round = game.phase.round + 1

  if (round === config.ROUNDS_PER_GAME) {
    game.phase = { type: 'LOBBY', secsLeft: undefined, isReady: new Set }
  } else {
    const category = pickCategory(round, game, categories)
    game.phase = newGuessPhase(round, category)
  }

  game.broadcast(currentGameState(gameId, game))
}

export function currentGameState(gameId: t.GameId, game: t.Game): t.ToClientMessage {
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
        guesses: [...phase.guesses.entries()],
        isReady: game.players.map(info => [info.id, phase.isReady.has(info.id)]),
        secsLeft: phase.secsLeft,
      }
    }
  }
}
