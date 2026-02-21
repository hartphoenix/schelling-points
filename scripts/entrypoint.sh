#!/bin/sh
if [ ! -f data/vocab-embeddings.json ]; then
  echo "Generating vocab embeddings..."
  bun run scripts/build-vocab-embeddings.ts
fi
exec bun run src/server.ts
