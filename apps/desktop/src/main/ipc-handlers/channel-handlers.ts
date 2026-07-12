import { dialog, ipcMain } from 'electron'
import type { IpcHandlerContext } from './types'
import type { ChannelEvent } from '../../shared/types'

export function registerChannelHandlers({ getWindow, getRpc, localStore }: IpcHandlerContext): void {
  ipcMain.handle('channel:join', async (_event, channelKey: string) => {
    const channels = localStore.get('joinedChannels', [])
    if (!channels.includes(channelKey)) {
      channels.push(channelKey)
      localStore.set('joinedChannels', channels)
    }
    await getRpc().joinChannel({ channelKey })
  })

  ipcMain.handle('channel:leave', async (_event, channelKey: string) => {
    const channels = localStore.get('joinedChannels', [])
    localStore.set(
      'joinedChannels',
      channels.filter((k) => k !== channelKey)
    )
    await getRpc().leaveChannel({ channelKey })
  })

  ipcMain.handle('channel:list', async () => {
    return localStore.get('joinedChannels', [])
  })

  ipcMain.handle('channels:get', async () => {
    const res = await getRpc().getChannels({})
    return JSON.parse(res.channelsJson)
  })

  ipcMain.handle('channel:init', async (_event, name: string, description: string, avatarPath?: string) => {
    try {
      const res = await getRpc().initChannel({ name, description, avatarPath: avatarPath || '' })

      const ownedChannels = localStore.get('ownedChannels', [])
      if (!ownedChannels.includes(res.publicKey)) {
        ownedChannels.push(res.publicKey)
        localStore.set('ownedChannels', ownedChannels)
      }
      localStore.set('ownChannelKey', res.publicKey)

      getWindow()?.webContents.send('p2p-worker-message', { type: 'channel-initialized', publicKey: res.publicKey, name: res.name })
      return res.publicKey
    } catch (err: any) {
      console.error('Channel init failed:', err)
      throw err
    }
  })

  ipcMain.handle('channel:select-avatar', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Channel Avatar',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return { canceled: true }
    return { canceled: false, filePath: result.filePaths[0] }
  })

  ipcMain.handle('feed:get', async () => {
    const res = await getRpc().getFeed({})
    getWindow()?.webContents.send('p2p-worker-message', { type: 'feed-data', items: JSON.parse(res.itemsJson) })
  })

  ipcMain.handle('event:inject', async (_event, eventData: Omit<ChannelEvent, 'channelKey'>) => {
    await getRpc().injectEvent({ channelKey: '', eventJson: JSON.stringify(eventData) })
  })

  ipcMain.handle('p2p-send', async (_event, payload) => {
    console.warn('Legacy p2p-send called, payload ignored:', payload)
  })
}