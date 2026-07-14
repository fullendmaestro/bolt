import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mkdirSync, cpSync } from 'fs'
import { buildSync } from 'esbuild'

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
          // Compile the raw TS worker to the output directory (it cannot be bundled by Rollup)
          const src = resolve(__dirname, 'src/workers/p2p-worker.ts')
          const destDir = resolve(__dirname, 'out/main')
          const dest = resolve(destDir, 'worker.js')
          const srcSpec = resolve(__dirname, 'src/shared/spec')
          const destSpec = resolve(__dirname, 'out/shared/spec')
          try {
            mkdirSync(destDir, { recursive: true })
            buildSync({
              entryPoints: [src],
              outfile: dest,
              bundle: true,
              packages: 'external',
              format: 'cjs',
              platform: 'node'
            })
            cpSync(srcSpec, destSpec, { recursive: true })
            console.log('[copy-p2p-worker] Compiled p2p-worker.ts and copied spec dir')
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