import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('qvacAPI', {
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