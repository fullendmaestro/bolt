import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync, cpSync } from 'fs'

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
          const srcSpec = resolve(__dirname, 'src/shared/spec')
          const destSpec = resolve(__dirname, 'out/shared/spec')
          try {
            mkdirSync(destDir, { recursive: true })
            copyFileSync(src, dest)
            cpSync(srcSpec, destSpec, { recursive: true })
            console.log('[copy-p2p-worker] Copied p2p-worker.js and spec dir')
          } catch (err) {
            console.error('[copy-p2p-worker] Failed to copy worker/spec:', err)
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