import type { ChannelEvent } from '../shared/types'

declare global {
  interface Window {
    electron: {
      process: {
        versions: NodeJS.ProcessVersions
      }
    }
    qvacAPI: {
      // AI APIs
      loadModel: (channelOwnerKey?: string) => Promise<string>
      infer: (history: { role: string; content: string }[], options?: { kvCache?: boolean }) => Promise<void>
      unloadModel: () => Promise<string>
      onCompletionStream: (cb: (token: string) => void) => void
      onModelProgress: (cb: (progress: any) => void) => void
      removeModelProgressListener: () => void

      // RAG
      ragSearch: (channelKey: string, query: string) => Promise<{ id: string; content: string; score: number }[]>

      // Channel Management
      joinChannel: (channelKey: string) => Promise<void>
      leaveChannel: (channelKey: string) => Promise<void>
      getJoinedChannels: () => Promise<string[]>
      getChannels: () => Promise<{ owned: any[]; joined: any[] }>
      initChannel: (name: string, description: string, avatarPath?: string) => Promise<void>

      // Asset Selectors
      selectAvatar: () => Promise<{ canceled: boolean; filePath?: string }>
      selectThumbnail: () => Promise<{ canceled: boolean; filePath?: string }>

      // Feed
      getFeed: () => Promise<void>

      // Upload / Studio
      selectAndUploadVideo: (title: string, thumbnailPath?: string) => Promise<{ canceled: boolean; filePath?: string }>
      getUploads: (channelKey?: string) => Promise<void>

      // Streaming
      getStreamUrl: (channelKey: string, videoId: string) => Promise<void>

      // Download & Seed
      downloadVideo: (channelKey: string, videoId: string) => Promise<{ canceled: boolean; destinationPath?: string }>

      // Live Events (AI Context)
      onChannelEvent: (cb: (event: ChannelEvent) => void) => void
      removeChannelEventListener: () => void

      // Worker Messages (generic)
      onP2PMessage: (cb: (msg: any) => void) => void
      removeP2PMessageListener: () => void

      // Event Injection
      injectEvent: (event: Omit<ChannelEvent, 'channelKey'>) => Promise<void>

      // Legacy
      sendP2PCommand: (payload: any) => Promise<void>
    }
  }
}

export {}