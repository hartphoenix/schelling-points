import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/embeddings': {
        target: 'http://localhost:11434',
        changeOrigin: true,
      },
    },
  },
})
