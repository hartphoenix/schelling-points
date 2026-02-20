#!/bin/bash

MODEL="nomic-embed-text"

# Check if ollama is installed
if ! command -v ollama &> /dev/null; then
    echo ""
    echo "  ollama is not installed."
    echo "  This project uses ollama for text embeddings (scoring)."
    echo ""
    echo "  Install from: https://ollama.com/download"
    echo "  Then run:     npm run setup-ollama"
    echo ""
    exit 0
fi

# Check if ollama is running (ollama list fails if server is down)
if ! ollama list &> /dev/null 2>&1; then
    echo ""
    echo "  ollama is installed but not running."
    echo "  Start it with: ollama serve"
    echo "  Then run:      npm run setup-ollama"
    echo ""
    exit 0
fi

# Check if the model is already pulled
if ollama list | grep -q "$MODEL"; then
    echo "  ollama ready: $MODEL model found"
else
    echo "  Pulling $MODEL model (this may take a minute)..."
    ollama pull "$MODEL"
    if [ $? -eq 0 ]; then
        echo "  $MODEL model installed successfully"
    else
        echo ""
        echo "  Failed to pull $MODEL."
        echo "  Run manually: ollama pull $MODEL"
        echo ""
    fi
fi
