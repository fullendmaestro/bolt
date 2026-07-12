import type { BrowserWindow } from 'electron'
import type Store from 'electron-store'

export interface StoreSchema {
  joinedChannels: string[]
  ownChannelKey: string | null
  ownedChannels: string[]
}

export interface IpcHandlerContext {
  getWindow: () => BrowserWindow | null
  getRpc: () => any
  getModelId: () => string | null
  setModelId: (modelId: string | null) => void
  localStore: Store<StoreSchema>
}