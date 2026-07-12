import { dialog, ipcMain } from 'electron'
import type { IpcHandlerContext } from './types'

export function registerVideoHandlers({ getWindow, getRpc }: IpcHandlerContext): void {
  ipcMain.handle('video:select-thumbnail', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Video Thumbnail',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return { canceled: true }
    return { canceled: false, filePath: result.filePaths[0] }
  })

  ipcMain.handle(
    'video:select-and-upload',
    async (_event, title: string, thumbnailPath?: string) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] }]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true }
      }

      const filePath = result.filePaths[0]

      getRpc()
        .uploadVideo({
          filePath,
          title: title || 'Untitled Upload',
          duration: '0:00',
          thumbnailPath: thumbnailPath || '',
          channelKey: ''
        })
        .then((res) => {
          getWindow()?.webContents.send('p2p-worker-message', {
            type: 'upload-complete',
            video: JSON.parse(res.videoJson)
          })
        })
        .catch((err) => {
          getWindow()?.webContents.send('p2p-worker-message', {
            type: 'error',
            message: err.message,
            command: 'upload-video'
          })
        })

      return { canceled: false, filePath }
    }
  )

  ipcMain.handle('uploads:get', async (_event, channelKey?: string) => {
    const res = await getRpc().getUploads({ channelKey: channelKey || '' })
    getWindow()?.webContents.send('p2p-worker-message', {
      type: 'uploads-data',
      channel: JSON.parse(res.channelJson)
    })
  })

  ipcMain.handle('stream:start', async (_event, channelKey: string, videoId: string) => {
    const res = await getRpc().startStream({ channelKey, videoId })
    getWindow()?.webContents.send('p2p-worker-message', {
      type: 'stream-url',
      url: res.url,
      channelKey: res.channelKey,
      videoId: res.videoId
    })
  })

  ipcMain.handle('video:download', async (_event, channelKey: string, videoId: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Save Video',
      defaultPath: videoId + '.mp4',
      filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] }]
    })
    if (result.canceled || !result.filePath) return { canceled: true }

    getRpc()
      .downloadVideo({ channelKey, videoId, destinationPath: result.filePath })
      .then((res) => {
        getWindow()?.webContents.send('p2p-worker-message', {
          type: 'download-complete',
          videoId,
          channelKey,
          destinationPath: res.destinationPath
        })
      })
      .catch((err) => {
        getWindow()?.webContents.send('p2p-worker-message', {
          type: 'error',
          message: err.message,
          command: 'download-video'
        })
      })

    return { canceled: false, destinationPath: result.filePath }
  })
}
