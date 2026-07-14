import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('qvacAPI', {
  // ── AI APIs ───────────────────────────────────────────────
  loadModel: (options?: object) => ipcRenderer.invoke('load-model', options),
  infer: (history, options) => ipcRenderer.invoke('infer', history, options),
  unloadModel: () => ipcRenderer.invoke('unload-model'),
  onCompletionStream: (cb) => {
    const listener = (_event, token) => cb(token)
    ipcRenderer.on('completion-stream', listener)
    return () => ipcRenderer.removeListener('completion-stream', listener)
  },
  onModelProgress: (cb) => {
    const listener = (_event, progress) => cb(progress)
    ipcRenderer.on('model-progress', listener)
    return () => ipcRenderer.removeListener('model-progress', listener)
  },
  removeModelProgressListener: () =>
    ipcRenderer.removeAllListeners('model-progress'),
  ragQuery: (workspaceId: string, query: string) => ipcRenderer.invoke('rag:query', workspaceId, query),

  /**
   * completion() — wraps the IPC infer channel with a streaming AsyncIterable.
   * The main process fires 'completion-stream' events; a '' token signals end-of-stream.
   * tool-call events are signalled via 'completion-tool-call'.
   */
  startCompletion: (options: object) => ipcRenderer.invoke('completion', options),
  onCompletionToolCall: (cb: (toolCall: any) => void) => {
    const listener = (_ev: any, toolCall: any) => cb(toolCall)
    ipcRenderer.on('completion-tool-call', listener)
    return () => ipcRenderer.removeListener('completion-tool-call', listener)
  },

  // ── Channel Management ────────────────────────────────────
  joinChannel: (channelKey: string) => ipcRenderer.invoke('channel:join', channelKey),
  leaveChannel: (channelKey: string) => ipcRenderer.invoke('channel:leave', channelKey),
  getJoinedChannels: () => ipcRenderer.invoke('channel:list'),
  getChannels: () => ipcRenderer.invoke('channels:get'),
  initChannel: (name: string, description: string, avatarPath?: string) =>
    ipcRenderer.invoke('channel:init', name, description, avatarPath),

  // ── Asset Selectors (via Electron dialog) ─────────────────
  selectAvatar: () => ipcRenderer.invoke('channel:select-avatar'),
  selectThumbnail: () => ipcRenderer.invoke('video:select-thumbnail'),
  selectTranscript: () => ipcRenderer.invoke('video:select-transcript'),

  // ── Feed ──────────────────────────────────────────────────
  getFeed: () => ipcRenderer.invoke('feed:get'),

  // ── Upload / Studio ───────────────────────────────────────
  selectAndUploadVideo: (meta: {
    title?: string
    thumbnailPath?: string
    videoType?: string
    opponentId?: string
    score?: string
    transcriptPath?: string
    eventsJson?: string
  }) => ipcRenderer.invoke('video:select-and-upload', meta),
  getUploads: (channelKey?: string) => ipcRenderer.invoke('uploads:get', channelKey),

  // ── Streaming ─────────────────────────────────────────────
  getStreamUrl: (channelKey: string, videoId: string) =>
    ipcRenderer.invoke('stream:start', channelKey, videoId),

  // ── Download & Seed ───────────────────────────────────────
  downloadVideo: (channelKey: string, videoId: string) =>
    ipcRenderer.invoke('video:download', channelKey, videoId),

  // ── Live Events (AI Context) ──────────────────────────────
  onChannelEvent: (cb: (event: any) => void) => {
    ipcRenderer.on('channel-event', (_event, data) => cb(data))
  },
  removeChannelEventListener: () => {
    ipcRenderer.removeAllListeners('channel-event')
  },

  // ── Worker Messages (generic) ─────────────────────────────
  onP2PMessage: (cb: (msg: any) => void) => {
    ipcRenderer.on('p2p-worker-message', (_event, msg) => cb(msg))
  },
  removeP2PMessageListener: () => {
    ipcRenderer.removeAllListeners('p2p-worker-message')
  },

  // ── Event Injection (for channel owners) ──────────────────
  injectEvent: (event: { timestamp: string; eventType: string; description: string }) =>
    ipcRenderer.invoke('event:inject', event),

  // ── Legacy ────────────────────────────────────────────────
  sendP2PCommand: (payload: any) => ipcRenderer.invoke('p2p-send', payload)
})