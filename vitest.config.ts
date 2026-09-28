import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Kept separate from vite.config.ts so unit tests don't spin up the Cloudflare runtime.
export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: { include: ['src/**/*.test.ts', 'worker/**/*.test.ts'] },
})
