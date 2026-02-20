---
review_agents: [code-simplicity-reviewer]
base_branch: main
---

# Review Context

Schelling Points — multiplayer word game with WebSocket real-time communication.

Key review concerns for this project:
- WebSocket message handling: ensure JSON.parse at I/O boundaries
- Shared types (src/types.ts): changes here affect both client and server
- Game state transitions: tick loop in play.ts drives phase changes
- In-memory state: no persistence, so disconnects lose data
