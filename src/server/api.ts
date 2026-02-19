import express from 'express'
import expressWs from 'express-ws'
import path from 'path'
import * as ws from 'ws'
import * as play from './play'
import * as t from './types'

const socketOwner = new Map<ws.WebSocket, t.PlayerId>()

export function addWebsockets(state: t.State, app: express.Application) {
  const wsApp = expressWs(app).app
  wsApp.ws('/ws', (webSocket: ws.WebSocket, req: any) => {
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
    webSocket.on('close', () => socketOwner.delete(webSocket))
  })
}

export function addRest(app: express.Application) {
}

export function addStatic(app: express.Application) {
  app.use(express.static(path.resolve('dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.resolve('dist/index.html'))
  })
}
