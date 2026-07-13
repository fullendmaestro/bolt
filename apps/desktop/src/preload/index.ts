import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('qvacAPI', {
  // ── AI APIs ───────────────────────────────────────────────
  loadModel: (options?: object) => ipcRenderer.invoke('load-model', options),
  infer: (history, options) => ipcRenderer.invoke('infer', history, options),
  unloadModel: () => ipcRenderer.invoke('unload-model'),
  onCompletionStream: (cb) =>
    ipcRenderer.on('completion-stream', (_event, token) => cb(token)),
  onModelProgress: (cb) =>
    ipcRenderer.on('model-progress', (_event, progress) => cb(progress)),
  removeModelProgressListener: () =>
    ipcRenderer.removeAllListeners('model-progress'),
  ragQuery: (workspaceId: string, query: string) => ipcRenderer.invoke('rag:query', workspaceId, query),

  /**
   * completion() — wraps the IPC infer channel with a streaming AsyncIterable.
   * The main process fires 'completion-stream' events; a '' token signals end-of-stream.
   * tool-call events are signalled via 'completion-tool-call'.
   */
  completion: (options: object) => ipcRenderer.invoke('completion', options).then(() => {
    // Build an AsyncIterable over IPC events
    const events: any[] = []
    let resolve: (() => void) | null = null
    let done = false

    ipcRenderer.on('completion-stream', (_ev, token: string) => {
      if (token === '') {
        done = true
      } else {
        events.push({ type: 'contentDelta', text: token })
      }
      resolve?.()
      resolve = null
    })

    ipcRenderer.on('completion-tool-call', (_ev, toolCall: any) => {
      events.push({ type: 'toolCall', toolCall })
      resolve?.()
      resolve = null
    })

    async function* gen() {
      while (!done || events.length > 0) {
        if (events.length > 0) {
          yield events.shift()
        } else {
          await new Promise<void>((r) => { resolve = r })
        }
      }
      ipcRenderer.removeAllListeners('completion-stream')
      ipcRenderer.removeAllListeners('completion-tool-call')
    }

    return { events: gen() }
  }),

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

  // ── Feed ──────────────────────────────────────────────────
  getFeed: () => ipcRenderer.invoke('feed:get'),

  // ── Upload / Studio ───────────────────────────────────────
  selectAndUploadVideo: (title: string, thumbnailPath?: string) =>
    ipcRenderer.invoke('video:select-and-upload', title, thumbnailPath),
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