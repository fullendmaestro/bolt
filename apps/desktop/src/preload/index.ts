import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('qvacAPI', {
  // ── AI APIs ───────────────────────────────────────────────
  loadModel: () => ipcRenderer.invoke('load-model'),
  infer: (history) => ipcRenderer.invoke('infer', history),
  unloadModel: () => ipcRenderer.invoke('unload-model'),
  onCompletionStream: (cb) =>
    ipcRenderer.on('completion-stream', (_event, token) => cb(token)),

  // ── Channel Management ────────────────────────────────────
  joinChannel: (channelKey: string) => ipcRenderer.invoke('channel:join', channelKey),
  leaveChannel: (channelKey: string) => ipcRenderer.invoke('channel:leave', channelKey),
  getJoinedChannels: () => ipcRenderer.invoke('channel:list'),
  initChannel: (name: string, description: string) =>
    ipcRenderer.invoke('channel:init', name, description),

  // ── Feed ──────────────────────────────────────────────────
  getFeed: () => ipcRenderer.invoke('feed:get'),

  // ── Upload / Studio ───────────────────────────────────────
  selectAndUploadVideo: (title: string) => ipcRenderer.invoke('video:select-and-upload', title),
  getUploads: () => ipcRenderer.invoke('uploads:get'),

  // ── Streaming ─────────────────────────────────────────────
  getStreamUrl: (channelKey: string, videoId: string) =>
    ipcRenderer.invoke('stream:start', channelKey, videoId),

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