import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const PORT = 3001;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("close", () => console.log("Client disconnected"));
});
