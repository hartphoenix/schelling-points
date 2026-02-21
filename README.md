# schelling-points
A Jackbox TV-like mobile word game.

## Docker

Requires an [Ollama](https://ollama.com) instance for generating vocab embeddings on first startup.

```bash
docker build -t schellingpoint .
docker run -e OLLAMA_URL=http://host.docker.internal:11434 -p 8000:8000 schellingpoint
```

The container generates vocab embeddings on first boot (~30s), then starts the server on port 8000.
