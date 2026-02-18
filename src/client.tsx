import * as React from 'react'
import * as ReactDOM from "react-dom/client"
import * as t from "./client/types"
import { Guesses } from "./client/Guesses"
import { Lounge } from "./client/Lounge"
import { Lobby } from "./client/Lobby"
import { Scores } from "./client/Scores"

function onMessage(state: t.State, message: t.ToClientMessage): t.State {
  switch (message.type) {
    case 'LOUNGE':
      return { ...state, view: { type: 'LOUNGE' } }

    case 'MEMBER_CHANGE':
      return { ...state, otherPlayers: message.allPlayers }

    case 'LOBBY_STATE':
      return { ...state, view: { type: 'LOBBY', gameId: message.gameId, isReady: message.isReady } }

    case 'GUESS_STATE':
      return { ...state, view: { type: 'GUESSES', gameId: message.gameId, hasGuessed: message.hasGuessed, category: message.category, secsLeft: message.secsLeft } }

    case 'SCORE_STATE':
      return { ...state, view: { type: 'SCORES', gameId: message.gameId, scores: message.playerScores, category: message.category } }

    case 'LOBBY_COUNTDOWN':
      // TODO: start countdown animation
      return state

    case 'NO_SUCH_GAME':
      // TODO: Create notification?
      return state
  }
}

function App() {
  let [state, dispatch] = React.useReducer(onMessage, t.initialState())

  React.useEffect(() => {
    state.mailbox.listen(dispatch)
  }, [])

  switch (state.view.type) {
    case 'LOUNGE':
      return <Lounge
        mailbox={state.mailbox}
        playerId={state.playerId}
        otherPlayers={state.otherPlayers}
      />

    case 'LOBBY':
      return <Lobby
        mailbox={state.mailbox}
        playerId={state.playerId}
        gameId={state.view.gameId}
        isReady={state.view.isReady}
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
        scores={state.view.scores}
        category={state.view.category}
        otherPlayers={state.otherPlayers}
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
    <App />
  </React.StrictMode>
)
