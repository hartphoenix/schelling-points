import { describe, it, expect, vi, beforeEach } from 'bun:test'
import WebSocket from 'ws'
import * as t from './types'
import * as scoring from './scoring'
import { onTickGame, onClientMessage, currentGameState } from './play'

function mockWs(readyState = WebSocket.OPEN): WebSocket {
  return { readyState, send: vi.fn() } as unknown as WebSocket
}

const stubVocab = { words: ['cat', 'dog'], vectors: [[1], [0]], globalCentroid: [0.5] }

function makeGame(players: { id: string, ws?: WebSocket }[]): t.Game {
  const game = new t.Game()
  for (const p of players) {
    game.players.push({
      id: p.id,
      name: p.id,
      mood: '😀',
      webSocket: p.ws ?? mockWs(),
      previousScoresAndGuesses: [],
    })
  }
  return game
}

function makeState(games?: [string, t.Game][]): t.State {
  const state = new t.State(
    { choose: () => 'test' } as any,
    categories,
    stubVocab,
  )
  if (games) {
    for (const [id, game] of games) {
      state.games.set(id, game)
    }
  }
  return state
}

function guessPhase(guesses: [string, string][] = []): t.Phase {
  const phase: t.Phase = {
    type: 'GUESSES',
    round: 0,
    prompt: 'animals',
    secsLeft: 10,
    guesses: new Map(guesses),
  }
  return phase
}

const stubScoring: scoring.ScoringResult = {
  scores: new Map([['a', 8], ['b', 6]]),
  positions: new Map([['a', [0.1, 0.2]], ['b', [-0.1, -0.2]]]),
  centroidWord: 'cat',
}

vi.spyOn(scoring, 'scoreGuesses').mockResolvedValue(stubScoring)

const categories: t.Category[] = [
  { id: 1, prompt: 'animals', difficulty: 'easy' },
]

describe('scoreRound via timer', () => {
  it('transitions to REVEAL when timer hits 0', async () => {
    const game = makeGame([{ id: 'a' }, { id: 'b' }])
    game.currentPrompt = 'animals'
    game.phase = guessPhase([['a', 'cat'], ['b', 'dog']])
    ;(game.phase as any).secsLeft = 0

    const state = makeState([['test-game', game]])
    onTickGame('test-game', game, 0, 1, state)

    // scoreRound is async — wait for it
    await new Promise(r => setTimeout(r, 10))

    expect(game.phase.type).toBe('REVEAL')
    expect(game.scoringInProgress).toBe(false)
    if (game.phase.type === 'REVEAL') {
      expect(game.phase.scores.get('a')).toBe(8)
      expect(game.phase.scores.get('b')).toBe(6)
      expect(game.phase.guesses.get('a')).toBe('cat')
    }
    expect(game.previousScores).toHaveLength(1)
    expect(game.previousScores[0].prompt).toBe('animals')
    expect(game.players[0].previousScoresAndGuesses).toEqual([[8, 'cat']])
    expect(game.players[1].previousScoresAndGuesses).toEqual([[6, 'dog']])
  })
})

describe('scoreRound via all guesses submitted', () => {
  it('scores immediately when all live players have guessed', async () => {
    const game = makeGame([{ id: 'a' }, { id: 'b' }])
    game.currentPrompt = 'animals'
    game.phase = guessPhase([['a', 'cat']])

    const state = makeState([['test-game', game]])

    onClientMessage(state, {
      type: 'GUESS',
      gameId: 'test-game',
      playerId: 'b',
      guess: 'dog',
    }, mockWs())

    await new Promise(r => setTimeout(r, 10))

    expect(game.phase.type).toBe('REVEAL')
    if (game.phase.type === 'REVEAL') {
      expect(game.phase.scores.get('a')).toBe(8)
      expect(game.phase.guesses.get('b')).toBe('dog')
    }
  })

  it('does NOT score when some players have not guessed', () => {
    const game = makeGame([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    game.phase = guessPhase()

    const state = makeState([['test-game', game]])

    onClientMessage(state, {
      type: 'GUESS',
      gameId: 'test-game',
      playerId: 'a',
      guess: 'cat',
    }, mockWs())

    expect(game.phase.type).toBe('GUESSES')
  })

  it('ignores disconnected players for all-guessed check', async () => {
    const closedWs = mockWs(WebSocket.CLOSED)
    const game = makeGame([{ id: 'a' }, { id: 'b' }, { id: 'c', ws: closedWs }])
    game.currentPrompt = 'animals'
    game.phase = guessPhase([['a', 'cat']])

    const state = makeState([['test-game', game]])

    onClientMessage(state, {
      type: 'GUESS',
      gameId: 'test-game',
      playerId: 'b',
      guess: 'dog',
    }, mockWs())

    await new Promise(r => setTimeout(r, 10))

    expect(game.phase.type).toBe('REVEAL')
  })
})
