import express from 'express'
import http from 'http'
import * as api from './server/api'
import * as names from './server/names'
import * as t from './server/types'

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const state: t.State = t.initialState(
    new names.Chooser(
        [
            __dirname + '/../static/adjectives.txt',
            __dirname + '/../static/nouns.txt',
        ],
    ),
)

const app = express()
app.use(express.json())

api.addWebsockets(
    state,
    app,
)

api.addRest(
    app,
)

api.addStatic(
    app,
)

const webServer = http.createServer(app)
webServer.listen(8000, '0.0.0.0')
