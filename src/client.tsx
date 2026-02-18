import * as React from 'react'
import * as ReactDOM from "react-dom/client"
import * as t from "./client/types"

function onMessage(state: t.State, message: t.ToClientMessage): t.State {
  switch(message.type) {
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

  switch(state.view.type) {
    case 'LOUNGE':
      return <></>
    case 'LOBBY':
      return <></>
    case 'GUESSES':
      return <></>
    case 'SCORES':
      return <></>
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
