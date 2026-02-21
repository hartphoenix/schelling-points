import express from 'express'
import expressWs from 'express-ws'
import path from 'path'
import WebSocket from 'ws'
import * as play from './play'
import * as t from './types'

const socketOwner = new Map<WebSocket, t.PlayerId>()

export function addWebsockets(state: t.State, app: express.Application) {
  const wsApp = expressWs(app).app
  wsApp.ws('/ws', (webSocket: WebSocket, req: any) => {
    webSocket.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString()) as t.ToServerMessage
      const boundId = socketOwner.get(webSocket)
      if (boundId === undefined) {
        socketOwner.set(webSocket, message.playerId)
      } else if (boundId !== message.playerId) {
        console.warn('Rejected message: playerId mismatch', { expected: boundId, got: message.playerId })
        return
      }

      play.onClientMessage(state, message, webSocket)
    })

    webSocket.on('close', () => {
      const boundId = socketOwner.get(webSocket)
      if (boundId !== undefined) {
        if (state.lounge.has(boundId)) {
          state.lounge.delete(boundId)
          state.broadcastLoungeChange()
        }

        // Handle disconnect during CONTINUE phase
        for (const [gameId, game] of state.games) {
          const playerIdx = game.players.findIndex(p => p.id === boundId)
          if (playerIdx === -1) continue
          if (game.phase.type === 'CONTINUE') {
            game.players.splice(playerIdx, 1)
            game.phase.isLeaving.add(boundId)
            play.checkContinueVotes(gameId, game, state)
          }
          break
        }

        socketOwner.delete(webSocket)
      }
    })
  })
}

export function addStatic(app: express.Application) {
  app.use(express.static(path.resolve('dist')))
  app.get('*path', (req, res) => {
    res.sendFile(path.resolve('dist/index.html'))
  })
}
