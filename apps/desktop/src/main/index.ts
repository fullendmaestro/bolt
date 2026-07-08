import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'

import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  LLAMA_3_2_1B_INST_Q4_0,
  loadModel,
  unloadModel,
  completion
} from '@qvac/sdk'
import Store from 'electron-store'
import type { ChannelEvent } from '../shared/types'
const PearRuntime = require('pear-runtime')
const HRPC = require('../shared/spec/hrpc/index.js')

app.commandLine.appendSwitch('no-sandbox')

// ── State ──────────────────────────────────────────────────
let win: BrowserWindow | null = null
let modelId: string | null = null
let rpc: any = null

// --- Strict Instance Isolation ---
// Parse custom user data directory for multi-peer local testing
const userDataArg = process.argv.find((arg) =>
  arg.startsWith('--user-data-dir=')
)
if (userDataArg) {
  const dir = userDataArg.replace('--user-data-dir=', '')
  const absolutePath = join(process.cwd(), dir)
  app.setPath('userData', absolutePath)
  console.log(`[Instance Isolation] userData path set to: ${absolutePath}`)
}
// ---------------------------------

// ── Local Persistence ──────────────────────────────────────
interface StoreSchema {
  joinedChannels: string[]
  ownChannelKey: string | null
  ownedChannels: string[]
}

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

  rpc.onWorkerReady(() => {
    console.log('P2P Worker is ready')
    rpc.initWorker({}).catch(console.error)

    const savedChannels = localStore.get('joinedChannels', [])
    for (const key of savedChannels) {
      rpc.joinChannel({ channelKey: key }).catch(console.error)
    }
  })

  rpc.onChannelEvent(({ eventJson }) => {
    win?.webContents.send('channel-event', JSON.parse(eventJson))
  })

  rpc.onErrorEvent(({ message, command }) => {
    win?.webContents.send('p2p-worker-message', { type: 'error', message, command })
  })

  rpc.onUploadProgress(({ videoId, percent }) => {
    win?.webContents.send('p2p-worker-message', { type: 'upload-progress', videoId, percent })
  })

  rpc.onDownloadProgress(({ videoId, channelKey, percent, bytesReceived, totalBytes }) => {
    win?.webContents.send('p2p-worker-message', { type: 'download-progress', videoId, channelKey, percent, bytesReceived, totalBytes })
  })

  worker.on('error', (err: Error) => {
    console.error('Worker pipe error:', err)
  })

  worker.stderr.on('data', (err: Buffer) => {
    console.error('P2P Worker Err:', err.toString())
  })
}

// ── IPC Handlers ───────────────────────────────────────────
function setupHandlers(): void {
  // ── QVAC AI Handlers ──────────────────────────────────
  ipcMain.handle('load-model', async () => {
    modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: 'llm',
      onProgress: (progress) => {
        console.log(progress)
        win?.webContents.send('model-progress', progress)
      }
    })
    return 'model loaded'
  })

  ipcMain.handle('infer', async (_event, history) => {
    if (!modelId) throw new Error('Model not loaded.')

    const result = completion({ modelId, history, stream: true })
    for await (const token of result.tokenStream) {
      win?.webContents.send('completion-stream', token)
    }
    win?.webContents.send('completion-stream', '')
  })

  ipcMain.handle('unload-model', async () => {
    if (!modelId) throw new Error('Model not loaded.')
    await unloadModel({ modelId })
    modelId = null
    return 'model unloaded'
  })

  // ── Channel Subscription Handlers ─────────────────────
  ipcMain.handle('channel:join', async (_event, channelKey: string) => {
    const channels = localStore.get('joinedChannels', [])
    if (!channels.includes(channelKey)) {
      channels.push(channelKey)
      localStore.set('joinedChannels', channels)
    }
    await rpc.joinChannel({ channelKey })
  })

  ipcMain.handle('channel:leave', async (_event, channelKey: string) => {
    const channels = localStore.get('joinedChannels', [])
    localStore.set(
      'joinedChannels',
      channels.filter((k) => k !== channelKey)
    )
    await rpc.leaveChannel({ channelKey })
  })

  ipcMain.handle('channel:list', async () => {
    return localStore.get('joinedChannels', [])
  })

  ipcMain.handle('channels:get', async () => {
    const res = await rpc.getChannels({})
    return JSON.parse(res.channelsJson)
  })

  ipcMain.handle('channel:init', async (_event, name: string, description: string, avatarPath?: string) => {
    try {
      const res = await rpc.initChannel({ name, description, avatarPath: avatarPath || '' })
      win?.webContents.send('p2p-worker-message', { type: 'channel-initialized', publicKey: res.publicKey, name: res.name })
      return res.publicKey
    } catch (err: any) {
      console.error('Channel init failed:', err)
      throw err
    }
  })

  // ── Avatar / Thumbnail Selectors ──────────────────────
  ipcMain.handle('channel:select-avatar', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Channel Avatar',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return { canceled: true }
    return { canceled: false, filePath: result.filePaths[0] }
  })

  ipcMain.handle('video:select-thumbnail', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Video Thumbnail',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return { canceled: true }
    return { canceled: false, filePath: result.filePaths[0] }
  })

  // ── Feed Handler ──────────────────────────────────────
  ipcMain.handle('feed:get', async () => {
    const res = await rpc.getFeed({})
    win?.webContents.send('p2p-worker-message', { type: 'feed-data', items: JSON.parse(res.itemsJson) })
  })

  // ── Upload Handlers ───────────────────────────────────
  ipcMain.handle('video:select-and-upload', async (_event, title: string, thumbnailPath?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const filePath = result.filePaths[0]

    rpc.uploadVideo({
      filePath,
      title: title || 'Untitled Upload',
      duration: '0:00',
      thumbnailPath: thumbnailPath || '',
      channelKey: ''
    }).then((res) => {
      win?.webContents.send('p2p-worker-message', { type: 'upload-complete', video: JSON.parse(res.videoJson) })
    }).catch((err) => {
      win?.webContents.send('p2p-worker-message', { type: 'error', message: err.message, command: 'upload-video' })
    })
    return { canceled: false, filePath }
  })

  ipcMain.handle('uploads:get', async (_event, channelKey?: string) => {
    const res = await rpc.getUploads({ channelKey: channelKey || '' })
    win?.webContents.send('p2p-worker-message', { type: 'uploads-data', channel: JSON.parse(res.channelJson) })
  })

  // ── Streaming Handler ─────────────────────────────────
  ipcMain.handle('stream:start', async (_event, channelKey: string, videoId: string) => {
    const res = await rpc.startStream({ channelKey, videoId })
    win?.webContents.send('p2p-worker-message', { type: 'stream-url', url: res.url, channelKey: res.channelKey, videoId: res.videoId })
  })

  // ── Download & Seed Handler ───────────────────────────
  ipcMain.handle('video:download', async (_event, channelKey: string, videoId: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Save Video',
      defaultPath: videoId + '.mp4',
      filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] }]
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    
    rpc.downloadVideo({ channelKey, videoId, destinationPath: result.filePath })
      .then((res) => {
        win?.webContents.send('p2p-worker-message', { type: 'download-complete', videoId, channelKey, destinationPath: res.destinationPath })
      })
      .catch((err) => {
        win?.webContents.send('p2p-worker-message', { type: 'error', message: err.message, command: 'download-video' })
      })
    return { canceled: false, destinationPath: result.filePath }
  })

  // ── Event Injection Handler ───────────────────────────
  ipcMain.handle('event:inject', async (_event, eventData: Omit<ChannelEvent, 'channelKey'>) => {
    await rpc.injectEvent({ channelKey: '', eventJson: JSON.stringify(eventData) })
  })

  // ── Legacy P2P Send (backward compatibility) ──────────
  ipcMain.handle('p2p-send', async (_event, payload) => {
    console.warn('Legacy p2p-send called, payload ignored:', payload)
  })
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