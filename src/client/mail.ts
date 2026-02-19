import * as t from "./types"

export class Box {
  constructor(
    private webSocket: WebSocket,
    private outbox: t.ToServerMessage[] = []
  ) {
    this.webSocket.onopen = () => {
      for (let message of this.outbox) {
        console.log("sending", message)
        this.send(message)
      }

      this.outbox = []
    }
  }

  send(message: t.ToServerMessage) {
    if (this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message))
    } else {
      this.outbox.push(message)
    }
  }

  listen(callback: (message: t.ToClientMessage) => void) {
    this.webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data) as t.ToClientMessage
      callback(message)
    }
  }
}
