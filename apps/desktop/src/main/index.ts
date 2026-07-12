import { app, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'

import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
const PearRuntime = require('pear-runtime')
const HRPC = require('../shared/spec/hrpc/index.js')
import { handleUploadComplete, registerAiHandlers } from './ipc-handlers/ai-handlers'
import { registerChannelHandlers } from './ipc-handlers/channel-handlers'
import { registerVideoHandlers } from './ipc-handlers/video-handlers'
import type { StoreSchema, IpcHandlerContext } from './ipc-handlers/types'

app.commandLine.appendSwitch('no-sandbox')

// ── State ──────────────────────────────────────────────────
let win: BrowserWindow | null = null
let modelId: string | null = null
let rpc: any = null
let handlerContext: IpcHandlerContext | null = null

// --- Strict Instance Isolation ---
// Parse custom user data directory for multi-peer local testing
const userDataArg = process.argv.find((arg) => arg.startsWith('--user-data-dir='))
if (userDataArg) {
  const dir = userDataArg.replace('--user-data-dir=', '')
  const absolutePath = join(process.cwd(), dir)
  app.setPath('userData', absolutePath)
  console.log(`[Instance Isolation] userData path set to: ${absolutePath}`)
}
// ---------------------------------

// ── Local Persistence ──────────────────────────────────────
const localStore = new Store<StoreSchema>({
  defaults: {
    joinedChannels: [],
    ownChannelKey: null,
    ownedChannels: []
  }
})

// ── Window Creation ────────────────────────────────────────
function createWindow(): void {
  win = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win!.show())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── P2P Worker Management ──────────────────────────────────
function initP2PWorker(): void {
  const appName = 'BoltSports'
  // Use the isolated app.getPath('userData') so corestore stays separated!
  const storageDir = join(app.getPath('userData'), 'holepunch-storage')
  const workerPath = join(__dirname, 'worker.js')

  const worker = PearRuntime.run(workerPath, [
    storageDir,
    app.getAppPath(),
    'false',
    app.getVersion(),
    'pear://0000000000000000000000000000000000000000000000000000000000000000',
    appName
  ])

  rpc = new HRPC(worker)

  rpc.onWorkerReady(async () => {
    console.log('P2P Worker is ready')
    await rpc.initWorker({})

    const savedChannels = localStore.get('joinedChannels', [])
    for (const key of savedChannels) {
      await rpc.joinChannel({ channelKey: key }).catch(console.error)
    }
  })

  rpc.onChannelEvent(({ eventJson }) => {
    win?.webContents.send('channel-event', JSON.parse(eventJson))
  })

  rpc.onErrorEvent(({ message, command }) => {
    win?.webContents.send('p2p-worker-message', { type: 'error', message, command })
  })

  rpc.onUploadProgress(({ videoId, percent, bytesReceived, totalBytes }) => {
    win?.webContents.send('p2p-worker-message', {
      type: 'upload-progress',
      videoId,
      percent,
      bytesReceived,
      totalBytes
    })
  })

  rpc.onUploadComplete(({ channelKey, videoJson }) => {
    const video = JSON.parse(videoJson)
    win?.webContents.send('p2p-worker-message', {
      type: 'upload-complete',
      channelKey,
      video
    })

    if (handlerContext) {
      void handleUploadComplete(handlerContext, channelKey, video)
    }
  })

  rpc.onDownloadProgress(({ videoId, channelKey, percent, bytesReceived, totalBytes }) => {
    win?.webContents.send('p2p-worker-message', {
      type: 'download-progress',
      videoId,
      channelKey,
      percent,
      bytesReceived,
      totalBytes
    })
  })

  worker.on('error', (err: Error) => {
    console.error('Worker pipe error:', err)
  })

  worker.stderr.on('data', (err: Buffer) => {
    console.error('P2P Worker Err:', err.toString())
  })

  worker.stdout.on('data', (data: Buffer) => {
    console.log('P2P Worker Log:', data.toString())
  })
}

function setupHandlers(): void {
  handlerContext = {
    getWindow: () => win,
    getRpc: () => rpc,
    getModelId: () => modelId,
    setModelId: (nextModelId) => {
      modelId = nextModelId
    },
    localStore
  }

  registerAiHandlers(handlerContext)
  registerChannelHandlers(handlerContext)
  registerVideoHandlers(handlerContext)
}

// ── App Lifecycle ──────────────────────────────────────────
app.whenReady().then(() => {
  protocol.handle('local-asset', (request) => {
    let filePath = request.url.slice('local-asset://'.length)
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.slice(1) // handle Windows /C:/...
    }
    filePath = decodeURIComponent(filePath)
    return net.fetch(pathToFileURL(filePath).toString())
  })

  electronApp.setAppUserModelId('com.bolt.sports')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  setupHandlers()
  initP2PWorker()
})

app.on('before-quit', () => {
  if (rpc && rpc._stream) {
    rpc._stream.destroy()
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
