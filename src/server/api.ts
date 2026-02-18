import express from 'express'
import expressWs from 'express-ws'
import path  from 'path'
import * as ws from 'ws'
import * as play from './play'
import * as t from './types'

export function addWebsockets(state: t.State, app: express.Application) {
    expressWs(app)
    app.ws('/', (webSocket: ws.WebSocket, req: any) => {
        webSocket.on('message', (data: object) => {
            play.onClientMessage(state, data as t.ToServerMessage, webSocket)
        })
    })
}

export function addRest(app: express.Application) {
}

export function addStatic(app: express.Application) {
    app.get('/', (req, res) => {
        res.sendFile(path.resolve('static/index.html'))
    })

    app.use(express.static('./'))
}
