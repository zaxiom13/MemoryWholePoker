import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The Cloudflare plugin runs worker/index.ts inside workerd during `vite dev`,
// so /api/* behaves exactly like production on *.workers.dev.
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
