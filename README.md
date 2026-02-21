# schelling-points
A Jackbox TV-like mobile word game.

## Docker

Requires [Ollama](https://ollama.com) running locally to generate vocab embeddings.

```bash
OLLAMA_URL=http://localhost:11434 bun run scripts/build-vocab-embeddings.ts
docker build -t schellingpoint .
docker run -p 8000:8000 schellingpoint
```
