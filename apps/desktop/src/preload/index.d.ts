import type { ChannelEvent } from '../shared/types'

/** A single streaming event from qvacAPI.completion() */
export interface CompletionEvent {
  type: 'contentDelta' | 'toolCall'
  /** Present when type === 'contentDelta' */
  text?: string
  /** Present when type === 'toolCall' */
  toolCall?: {
    id: string
    name: string
    arguments: Record<string, any>
    raw?: string
  }
}

/** Return value of qvacAPI.completion() */
export interface CompletionRun {
  events: AsyncIterable<CompletionEvent>
}

declare global {
  interface Window {
    electron: {
      process: {
        versions: NodeJS.ProcessVersions
      }
    }
    qvacAPI: {
      // AI APIs
      loadModel: (options?: {
        modelSrc?: string
        modelType?: string
        delegate?: {
          providerPublicKey: string
          timeout?: number
          fallbackToLocal?: boolean
        }
      }) => Promise<string>
      infer: (history: { role: string; content: string }[], options?: { kvCache?: boolean; [key: string]: any }) => Promise<void>
      unloadModel: () => Promise<string>
      onCompletionStream: (cb: (token: string) => void) => () => void
      onCompletionToolCall: (cb: (toolCall: any) => void) => () => void
      onModelProgress: (cb: (progress: any) => void) => () => void
      removeModelProgressListener: () => void
      ragQuery: (workspaceId: string, query: string) => Promise<any[]>
      startCompletion: (options: {
        history: { role: string; content: string; name?: string }[]
        workspaceId?: string
        videoTitle?: string
        channelEvents?: any[]
        stream: boolean
        tools?: object[]
      }) => Promise<void>

      // Channel Management
      joinChannel: (channelKey: string) => Promise<void>
      leaveChannel: (channelKey: string) => Promise<void>
      getJoinedChannels: () => Promise<string[]>
      getChannels: () => Promise<{ owned: any[]; joined: any[] }>
      initChannel: (name: string, description: string, avatarPath?: string) => Promise<void>

      // Asset Selectors
      selectAvatar: () => Promise<{ canceled: boolean; filePath?: string }>
      selectThumbnail: () => Promise<{ canceled: boolean; filePath?: string }>
      selectTranscript: () => Promise<{ canceled: boolean; filePath?: string }>


      // Feed
      getFeed: () => Promise<void>

      // Upload / Studio
      selectAndUploadVideo: (meta: {
        title?: string
        thumbnailPath?: string
        videoType?: string
        opponentId?: string
        score?: string
        transcriptPath?: string
        eventsJson?: string
      }) => Promise<{ canceled: boolean; filePath?: string }>

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