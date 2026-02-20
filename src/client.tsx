import * as React from 'react'
import * as Router from 'react-router'
import * as ReactDOM from "react-dom/client"
import * as t from "./client/types"
import { Guesses } from "./client/Guesses"
import { Lounge } from "./client/Lounge"
import { Lobby } from "./client/Lobby"
import { Scores } from "./client/Scores"
import '../static/styles/global.css'
import '../static/styles/lounge.css'                                          
import '../static/styles/lobby.css'                                           
import '../static/styles/guesses.css'    
import '../static/styles/scores.css'
import '../static/styles/mood-picker.css'

import { MoodPicker } from './client/MoodPicker'

const router = Router.createBrowserRouter([
  {
    path: "/",
    Component: () => <App />,
  },
  {
    path: "game/:gameId",
    Component: () => {
      const { gameId } = Router.useParams()
      return <App gameId={gameId!} />
    },
  },
])

function onMessage(state: t.State, message: t.ToClientMessage): t.State {
  switch (message.type) {
    case 'LOUNGE':
      return { ...state, view: { type: 'LOUNGE' } }

    case 'MEMBER_CHANGE': {
      const viewGameId = 'gameId' in state.view ? state.view.gameId : undefined
      if (message.gameId !== viewGameId) return state
      return { ...state, otherPlayers: message.allPlayers }
    }

    case 'LOBBY_STATE':
      console.log(message)
      return { ...state, view: { type: 'LOBBY', gameId: message.gameId, isReady: message.isReady } }

    case 'GUESS_STATE':
      return { ...state, view: { type: 'GUESSES', gameId: message.gameId, hasGuessed: message.hasGuessed, category: message.category, secsLeft: message.secsLeft } }

    case 'SCORE_STATE':
      return { ...state, view: { type: 'SCORES', gameId: message.gameId, scores: message.playerScores, positions: message.positions, guesses: message.guesses, category: message.category, isReady: message.isReady, secsLeft: message.secsLeft } }

    case 'LOBBY_COUNTDOWN': {
      const isReady = state.view.type === 'LOBBY' ? state.view.isReady : []
      return { ...state, view: { type: 'LOBBY', gameId: message.gameId, isReady, secsLeft: message.secsLeft } }
    }

    case 'NO_SUCH_GAME':
      // TODO: Create notification?
      return state
  }
}

export interface Props {
  gameId?: t.GameId
}
function App({ gameId }: Props) {
  let [state, dispatch] = React.useReducer(onMessage, t.initialState())
  const [playerName, setPlayerName] = React.useState(state.playerName)
  const [nameInput, setNameInput] = React.useState('')
  const [currentMood, setCurrentMood] = React.useState(state.mood)

  function handleNameSubmit() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    localStorage.setItem('playerName', trimmed)
    setPlayerName(trimmed)
  }

  React.useEffect(() => {
    state.mailbox.listen(dispatch)
  }, [])

  React.useEffect(() => {
    if (state.view.type === 'LOUNGE') {
      window.history.replaceState(null, '', '/')
    } else if ('gameId' in state.view) {
      window.history.replaceState(null, '', `/game/${state.view.gameId}`)
    }
  }, [state.view])

  React.useEffect(() => {
    if (!gameId) return
    if (!playerName) return

    state.mailbox.send({
      type: 'SUBSCRIBE_GAME',
      gameId,
      playerId: state.playerId,
      playerName: playerName,
      mood: currentMood,
    })
  }, [gameId, playerName])

  if (gameId && !playerName) {
    return (
      <div className="lounge">
        <h1>What's your name?</h1>
        <input
          type="text"
          placeholder="Your name"
          value={nameInput}
          autoFocus
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
        />
        <MoodPicker currentMood={currentMood} onSelect={setCurrentMood} />
        <button onClick={handleNameSubmit}>Join Game</button>
      </div>
    )
  }

  switch (state.view.type) {
    case 'LOUNGE':
      return <Lounge
        mailbox={state.mailbox}
        playerId={state.playerId}
        mood={state.mood}
        otherPlayers={state.otherPlayers}
      />

    case 'LOBBY':
      return <Lobby
        mailbox={state.mailbox}
        playerId={state.playerId}
        gameId={state.view.gameId}
        isReady={state.view.isReady}
        secsLeft={state.view.secsLeft}
        mood={state.mood}
        playerName={state.playerName}
        otherPlayers={state.otherPlayers}
      />

    case 'GUESSES':
      return <Guesses
        mailbox={state.mailbox}
        playerId={state.playerId}
        gameId={state.view.gameId}
        category={state.view.category}
        secsLeft={state.view.secsLeft}
        hasGuessed={state.view.hasGuessed}
      />

    case 'SCORES':
      return <Scores
        gameId={state.view.gameId}
        playerId={state.playerId}
        mailbox={state.mailbox}
        scores={state.view.scores}
        positions={state.view.positions}
        guesses={state.view.guesses}
        category={state.view.category}
        otherPlayers={state.otherPlayers}
        isReady={state.view.isReady}
        secsLeft={state.view.secsLeft}
      />

    // minimal error boundary in case extra views added later
    default: {
      const _exhaustive: never = state.view
      return _exhaustive
    }
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router.RouterProvider router={router} />
  </React.StrictMode>
)
