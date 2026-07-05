import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import os from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  LLAMA_3_2_1B_INST_Q4_0,
  loadModel,
  unloadModel,
  completion
} from '@qvac/sdk'

const PearRuntime = require('pear-runtime')
const FramedStream = require('framed-stream')

app.commandLine.appendSwitch('no-sandbox')

let win: BrowserWindow | null = null
let modelId: string | null = null
let workerPipe: any = null

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

function initP2PWorker() {
  const appName = 'BoltSports'
  const storageDir = join(os.homedir(), '.config', appName)
  const workerPath = join(__dirname, 'worker.js')

  const worker = PearRuntime.run(workerPath, [
    storageDir,
    app.getAppPath(),
    'false',
    app.getVersion(),
    'bolt://prod',
    appName
  ])

  workerPipe = new FramedStream(worker)

  workerPipe.on('data', (data: Buffer) => {
    const message = JSON.parse(data.toString())
    win?.webContents.send('p2p-worker-message', message)
  })

  worker.stderr.on('data', (err: Buffer) => {
    console.error('P2P Worker Err:', err.toString())
  })
}

function setupHandlers(): void {
  ipcMain.handle('load-model', async () => {
    modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: 'llm',
      onProgress: (progress) => console.log(progress)
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

  ipcMain.handle('p2p-send', async (_event, payload) => {
    if (workerPipe) {
      workerPipe.write(JSON.stringify(payload))
    } else {
      console.warn('Attempted to send P2P command, but worker pipe is not initialized.')
    }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.bolt.sports')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  setupHandlers()
  initP2PWorker()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})