import WebSocket from 'ws'
import * as config from '../config'
import * as t from './types'
import * as util from './util'
import * as scoring from './scoring'
import { filterPromptRepetitions, detectMeld } from './meld'

function pickRandomPrompt(categories: t.Category[]): string {
  const idx = Math.floor(Math.random() * categories.length)
  return categories[idx].prompt
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
    onTickGame(gameId, game, timeSecs, deltaSecs, state)
  }
}

export function newGuessPhase(round: number, prompt: string): t.Phase {
  return {
    type: 'GUESSES',
    round,
    prompt,
    secsLeft: config.GUESS_SECS,
    guesses: new Map,
  }
}


export function onTickGame(gameId: t.GameId, game: t.Game, timeSecs: number, deltaSecs: number, state: t.State) {
  const phase = game.phase
  switch (phase.type) {
    case 'LOBBY': {
      if (phase.secsLeft === undefined) break

      phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)

      if (phase.secsLeft === 0) {
        const prompt = pickRandomPrompt(state.categories)
        game.currentPrompt = prompt
        game.centroidHistory = []
        game.scoringRetries = 0
        game.phase = newGuessPhase(0, prompt)
        game.broadcast(currentGameState(gameId, game))
      }
      break
    }

    case 'GUESSES': {
      if (game.scoringInProgress) break
      phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)
      if (phase.secsLeft === 0) {
        scoreRound(gameId, game, state)
      }
      break
    }

    case 'REVEAL': {
      phase.secsLeft = Math.max(0, phase.secsLeft - deltaSecs)
      if (phase.secsLeft === 0) {
        goToNextRound(gameId, game, state)
      }
      break
    }

    case 'CONTINUE': {
      // No timer — waiting for player votes
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
      // Unicast LOUNGE to the joining player so their reducer
      // transitions to LOUNGE view (needed for GAME_END → "Back to Lounge" flow)
      webSocket.send(JSON.stringify({
        type: 'LOUNGE',
        loungingPlayers: [...state.lounge.entries()].map(
          ([id, info]) => [id, info.name, info.mood]
        ),
      } satisfies t.ToClientMessage))
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

    case 'REVEAL_READY': {
      const game = state.games.get(message.gameId)
      if (!game || game.phase.type !== 'REVEAL') {
        console.warn('REVEAL_READY: game not found or not in REVEAL phase', message.gameId)
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
        goToNextRound(message.gameId, game, state)
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

      const phase = game.phase
      const livePlayerIds = game.players
        .filter(p => p.webSocket.readyState === WebSocket.OPEN)
        .map(p => p.id)
      const allGuessed = livePlayerIds.length > 0
        && livePlayerIds.every(id => phase.guesses.has(id))

      if (allGuessed) {
        scoreRound(message.gameId, game, state)
      } else {
        game.broadcast(currentGameState(message.gameId, game))
      }
      break
    }

    case 'CONTINUE_VOTE': {
      const game = state.games.get(message.gameId)
      if (!game || game.phase.type !== 'CONTINUE') break

      if (message.continuePlay) {
        game.phase.isContinuing.add(message.playerId)
      } else {
        game.phase.isLeaving.add(message.playerId)
        // "I'm out" — move player from game to lounge
        const player = game.players.find(p => p.id === message.playerId)
        if (player) {
          // 1. Remove from game.players
          game.players = game.players.filter(p => p.id !== message.playerId)
          // 2. Add to lounge
          state.lounge.set(message.playerId, {
            name: player.name,
            mood: player.mood,
            webSocket: player.webSocket,
          })
          // 3. Unicast LOUNGE to departing player (transitions their view)
          // Send directly via captured socket — game.unicast won't find them after removal
          const loungeMsg: t.ToClientMessage = {
            type: 'LOUNGE',
            loungingPlayers: [...state.lounge.entries()].map(
              ([id, info]) => [id, info.name, info.mood]
            ),
          }
          player.webSocket.send(JSON.stringify(loungeMsg))
          // 4. Broadcast updates to lounge and remaining game players
          state.broadcastLoungeChange()
          game.broadcast(game.memberChangeMessage(message.gameId))
        }
      }

      // Check if all remaining players have voted
      checkContinueVotes(message.gameId, game, state)
      break
    }
  }
}

export function buildPlayerHistory(
  player: t.PlayerInfo,
  game: t.Game
): [string, string][] {
  return player.previousScoresAndGuesses.map(([_score, guess], i) =>
    [guess, game.centroidHistory[i] ?? ''])
}

export function endGame(
  gameId: t.GameId,
  game: t.Game,
  state: t.State,
  melded: boolean,
  meldRound?: number
) {
  // 1. Unicast GAME_END to each player
  for (const player of game.players) {
    game.unicast(player.id, {
      type: 'GAME_END',
      gameId,
      melded,
      meldRound: melded ? (meldRound ?? null) : null,
      centroidHistory: [...game.centroidHistory],
      playerHistory: buildPlayerHistory(player, game),
    })
  }

  // 2. Move all players to lounge
  for (const player of game.players) {
    state.lounge.set(player.id, {
      name: player.name,
      mood: player.mood,
      webSocket: player.webSocket,
    })
  }

  // 3. Delete the game from state.games
  state.games.delete(gameId)

  // 4. Broadcast lounge change (existing loungers see new players)
  state.broadcastLoungeChange()
}

export function checkContinueVotes(
  gameId: t.GameId,
  game: t.Game,
  state: t.State,
) {
  if (game.phase.type !== 'CONTINUE') return

  const liveIds = game.players
    .filter(p => p.webSocket.readyState === WebSocket.OPEN)
    .map(p => p.id)

  // isLeaving players are already removed from game.players,
  // so we only check isContinuing membership for remaining players.
  const allVoted = liveIds.every(id => game.phase.type === 'CONTINUE' && game.phase.isContinuing.has(id))

  if (allVoted && liveIds.length > 0) {
    if (game.phase.isContinuing.size >= 2) {
      // Continue — start round 21+ with last centroid as prompt
      const nextRound = game.centroidHistory.length
      game.phase = newGuessPhase(nextRound, game.currentPrompt)
      game.broadcast(currentGameState(gameId, game))
    } else {
      // Not enough players — game ends
      endGame(gameId, game, state, false)
    }
  }
}

async function scoreRound(gameId: t.GameId, game: t.Game, state: t.State) {
  const phase = game.phase
  if (phase.type !== 'GUESSES') return
  if (game.scoringInProgress) return

  const { guesses, prompt, round } = phase
  game.scoringInProgress = true

  // Filter out guesses that repeat the prompt
  const validGuesses = filterPromptRepetitions(guesses, game.currentPrompt)

  // Zero valid submissions — treat as scoring failure
  if (validGuesses.size === 0) {
    game.scoringInProgress = false
    handleScoringFailure(gameId, game, state, phase, new Error('All guesses repeated the prompt'))
    return
  }

  let scores: Map<t.PlayerId, number>
  let positions: Map<t.PlayerId, [number, number]>
  let centroidWord: string
  try {
    const result = await scoring.scoreGuesses(validGuesses, state.vocab)
    scores = result.scores
    positions = result.positions
    centroidWord = result.centroidWord
  } catch (err) {
    game.scoringInProgress = false
    handleScoringFailure(gameId, game, state, phase, err)
    return
  }

  // Check for meld using valid guesses (after filtering)
  const melded = detectMeld(validGuesses)

  // Strict ordering per plan:
  // a. centroidWord from ScoringResult (done above)
  // b. Push centroidWord to centroidHistory BEFORE storing round results
  game.centroidHistory.push(centroidWord)

  // c. detectMeld (done above)

  // d. Store round results
  const guessesAndScores: [t.PlayerId, string, number][] =
    [...guesses.entries()].map(([id, guess]) => [id, guess, scores.get(id) ?? 0])
  game.previousScores.push({ prompt, guessesAndScores })
  for (const player of game.players) {
    const guess = guesses.get(player.id) ?? ''
    const score = scores.get(player.id) ?? 0
    player.previousScoresAndGuesses.push([score, guess])
  }

  // e. Reset scoring retries on success
  game.scoringRetries = 0

  // f. Transition to REVEAL phase
  game.phase = {
    type: 'REVEAL',
    round,
    prompt,
    secsLeft: config.REVEAL_SECS,
    isReady: new Set(),
    scores,
    positions,
    guesses,
    centroidWord,
    melded,
  }

  game.scoringInProgress = false
  game.broadcast(currentGameState(gameId, game))
}

function handleScoringFailure(
  gameId: t.GameId,
  game: t.Game,
  state: t.State,
  phase: Extract<t.Phase, { type: 'GUESSES' }>,
  err: unknown
) {
  game.scoringRetries++
  console.error(
    `Scoring failed (round ${phase.round}, retry ${game.scoringRetries}/${config.MAX_SCORING_RETRIES}):`,
    err
  )

  if (game.scoringRetries >= config.MAX_SCORING_RETRIES) {
    // Too many retries — end game gracefully
    endGame(gameId, game, state, false)
    return
  }

  // Retry: same round, same prompt, fresh timer, players re-submit
  game.phase = {
    type: 'GUESSES',
    round: phase.round,
    prompt: game.currentPrompt,
    secsLeft: config.GUESS_SECS,
    guesses: new Map(),
  }
  game.broadcast(currentGameState(gameId, game))
}

function goToNextRound(gameId: t.GameId, game: t.Game, state: t.State) {
  if (game.phase.type !== 'REVEAL') {
    return
  }

  const phase = game.phase
  const round = phase.round + 1

  if (phase.melded) {
    // Meld detected — end game with celebration
    endGame(gameId, game, state, true, phase.round)
    return
  }

  if (round >= config.MAX_ROUNDS) {
    game.phase = {
      type: 'CONTINUE',
      isLeaving: new Set(),
      isContinuing: new Set(),
    }
    // Unicast CONTINUE_PROMPT to each player (per-player history)
    for (const player of game.players) {
      game.unicast(player.id, {
        type: 'CONTINUE_PROMPT',
        gameId,
        centroidHistory: [...game.centroidHistory],
        playerHistory: buildPlayerHistory(player, game),
      })
    }
    return
  }

  // Next round: centroid word becomes the new prompt
  game.currentPrompt = phase.centroidWord
  game.phase = newGuessPhase(round, phase.centroidWord)
  game.broadcast(currentGameState(gameId, game))
}

/**
 * Handle a player disconnecting from a game.
 * Removes them from the player list and broadcasts updates so remaining
 * players see the departure. Cleans up empty games.
 */
export function onPlayerDisconnect(
  playerId: t.PlayerId,
  gameId: t.GameId,
  game: t.Game,
  state: t.State,
) {
  const playerIdx = game.players.findIndex(p => p.id === playerId)
  if (playerIdx === -1) return

  game.players.splice(playerIdx, 1)

  // If no players remain, delete the game entirely
  if (game.players.length === 0) {
    state.games.delete(gameId)
    return
  }

  switch (game.phase.type) {
    case 'LOBBY': {
      // Clean up ready state for departed player
      game.phase.isReady.delete(playerId)

      // Cancel countdown if conditions no longer hold (need 2+ ready players)
      const livePlayerIds = game.players
        .filter(p => p.webSocket.readyState === WebSocket.OPEN)
        .map(p => p.id)
      const allReady = livePlayerIds.length >= 2
        && livePlayerIds.every(id => game.phase.type === 'LOBBY' && game.phase.isReady.has(id))

      if (!allReady && game.phase.secsLeft !== undefined) {
        game.phase.secsLeft = undefined
      }

      // Broadcast updated member list + game state to remaining players
      game.broadcast(game.memberChangeMessage(gameId))
      game.broadcast(currentGameState(gameId, game))
      break
    }

    case 'GUESSES': {
      game.broadcast(game.memberChangeMessage(gameId))
      // Check if all remaining live players have guessed (departure may complete the round)
      const livePlayerIds = game.players
        .filter(p => p.webSocket.readyState === WebSocket.OPEN)
        .map(p => p.id)
      const allGuessed = livePlayerIds.length > 0
        && livePlayerIds.every(id => game.phase.type === 'GUESSES' && game.phase.guesses.has(id))
      if (allGuessed) {
        scoreRound(gameId, game, state)
      } else {
        game.broadcast(currentGameState(gameId, game))
      }
      break
    }

    case 'REVEAL': {
      game.broadcast(game.memberChangeMessage(gameId))
      game.broadcast(currentGameState(gameId, game))
      break
    }

    case 'CONTINUE': {
      game.phase.isLeaving.add(playerId)
      game.broadcast(game.memberChangeMessage(gameId))
      checkContinueVotes(gameId, game, state)
      break
    }
  }
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
        prompt: phase.prompt,
        hasGuessed: game.players.map(info => [info.id, phase.guesses.has(info.id)]),
        secsLeft: phase.secsLeft,
        round: phase.round,
        totalRounds: config.MAX_ROUNDS,
      }
    }
    case 'REVEAL': {
      const phase = game.phase
      // Compute centroidIsRepeat fresh from history (all entries except the last one)
      const centroidIsRepeat = game.centroidHistory.slice(0, -1).includes(phase.centroidWord)
      return {
        type: 'REVEAL_STATE',
        gameId,
        centroidWord: phase.centroidWord,
        centroidIsRepeat,
        positions: [...phase.positions.entries()].map(([id, [x, y]]) => [id, x, y] as [t.PlayerId, number, number]),
        guesses: [...phase.guesses.entries()],
        melded: phase.melded,
        round: phase.round,
        totalRounds: config.MAX_ROUNDS,
        secsLeft: phase.secsLeft,
        isReady: game.players.map(info => [info.id, phase.isReady.has(info.id)]),
      }
    }
    case 'CONTINUE': {
      // CONTINUE phase uses per-player unicast (CONTINUE_PROMPT), not broadcast.
      // Safe fallback for reconnecting clients during CONTINUE — send LOBBY_STATE.
      return {
        type: 'LOBBY_STATE',
        gameId,
        isReady: [],
      }
    }
  }
}
