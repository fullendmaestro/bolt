import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    },
    plugins: [
      {
        name: 'copy-p2p-worker',
        closeBundle() {
          // Copy the raw JS worker to the output directory (it cannot be bundled by Rollup)
          const src = resolve(__dirname, 'src/workers/p2p-worker.js')
          const destDir = resolve(__dirname, 'out/main')
          const dest = resolve(destDir, 'worker.js')
          try {
            mkdirSync(destDir, { recursive: true })
            copyFileSync(src, dest)
            console.log('[copy-p2p-worker] Copied p2p-worker.js → out/main/worker.js')
          } catch (err) {
            console.error('[copy-p2p-worker] Failed to copy worker:', err)
          }
        }
      }
    ]
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@renderer': resolve(__dirname, 'src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})