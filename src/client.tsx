import * as React from 'react'
import * as Router from 'react-router'
import * as ReactDOM from "react-dom/client"
import * as t from "./client/types"
import { Guesses } from "./client/Guesses"
import { Lounge } from "./client/Lounge"
import { Lobby } from "./client/Lobby"
import { Reveal } from "./client/Reveal"
import { GameEnd } from "./client/GameEnd"
import { ScreenBackground } from './client/ScreenBackground'
import { PlayerRing } from "./client/PlayerRing"
import { MoodPicker } from './client/MoodPicker'
import '../static/styles/global.css'
import '../static/styles/lounge.css'
import '../static/styles/lobby.css'
import '../static/styles/guesses.css'
import '../static/styles/reveal.css'
import '../static/styles/game-end.css'
import '../static/styles/mood-picker.css'
import '../static/styles/instructions.css'
import '../static/styles/screen-background.css'
import '../static/styles/radial-visualization.css'

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
      return { ...state, view: { type: 'GUESSES', gameId: message.gameId, hasGuessed: message.hasGuessed, prompt: message.prompt, secsLeft: message.secsLeft, round: message.round, totalRounds: message.totalRounds } }

    case 'REVEAL_STATE':
      return { ...state, view: {
        type: 'REVEAL', gameId: message.gameId,
        centroidWord: message.centroidWord,
        centroidIsRepeat: message.centroidIsRepeat,
        positions: message.positions,
        guesses: message.guesses,
        melded: message.melded,
        round: message.round,
        totalRounds: message.totalRounds,
        secsLeft: message.secsLeft,
        isReady: message.isReady,
      }}

    case 'GAME_END':
      return { ...state, view: {
        type: 'GAME_END', gameId: message.gameId,
        melded: message.melded,
        meldRound: message.meldRound,
        centroidHistory: message.centroidHistory,
        playerHistory: message.playerHistory,
      }}

    case 'CONTINUE_PROMPT':
      return { ...state, view: {
        type: 'CONTINUE', gameId: message.gameId,
        centroidHistory: message.centroidHistory,
        playerHistory: message.playerHistory,
      }}

    case 'LOBBY_COUNTDOWN': {
      const isReady = state.view.type === 'LOBBY' ? state.view.isReady : []
      return { ...state, view: { type: 'LOBBY', gameId: message.gameId, isReady, secsLeft: message.secsLeft } }
    }

    case 'SCORING': {
      if (state.view.type !== 'GUESSES' || state.view.gameId !== message.gameId) return state
      return { ...state, view: { ...state.view, scoring: true } }
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
      <div className="screen lounge">
        <div className="title-block">
          <h1 className="title">The Schelling Point</h1>
          <p className="subtitle">Do you & your friends think alike?</p>
        </div>
        <PlayerRing />
        <div className="screen-footer">
          <input className="input"
            type="text"
            placeholder="Your name"
            maxLength={20}
            value={nameInput}
            autoFocus
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
          />
          <button className="btn" onClick={handleNameSubmit}>Join Lobby</button>
        </div>
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
        prompt={state.view.prompt}
        secsLeft={state.view.secsLeft}
        hasGuessed={state.view.hasGuessed}
        round={state.view.round}
        totalRounds={state.view.totalRounds}
        scoring={state.view.scoring}
      />

    case 'REVEAL':
      return <Reveal
        gameId={state.view.gameId}
        playerId={state.playerId}
        playerName={playerName}
        mood={currentMood}
        mailbox={state.mailbox}
        centroidWord={state.view.centroidWord}
        centroidIsRepeat={state.view.centroidIsRepeat}
        positions={state.view.positions}
        guesses={state.view.guesses}
        melded={state.view.melded}
        round={state.view.round}
        totalRounds={state.view.totalRounds}
        secsLeft={state.view.secsLeft}
        isReady={state.view.isReady}
        otherPlayers={state.otherPlayers}
      />

    case 'GAME_END':
      return <GameEnd
        gameId={state.view.gameId}
        playerId={state.playerId}
        playerName={playerName}
        mood={currentMood}
        mailbox={state.mailbox}
        melded={state.view.melded}
        meldRound={state.view.meldRound}
        centroidHistory={state.view.centroidHistory}
        playerHistory={state.view.playerHistory}
      />

    case 'CONTINUE':
      return <GameEnd
        gameId={state.view.gameId}
        playerId={state.playerId}
        playerName={playerName}
        mood={currentMood}
        mailbox={state.mailbox}
        isContinue
        centroidHistory={state.view.centroidHistory}
        playerHistory={state.view.playerHistory}
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
    <ScreenBackground />
    <Router.RouterProvider router={router} />
  </React.StrictMode>
)
