import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('qvacAPI', {
  // AI APIs
  loadModel: () => ipcRenderer.invoke('load-model'),
  infer: (history) => ipcRenderer.invoke('infer', history),
  onCompletionStream: (cb) => ipcRenderer.on('completion-stream', (_event, token) => cb(token)),

  // Decentralized Sports P2P APIs
  sendP2PCommand: (payload: any) => ipcRenderer.invoke('p2p-send', payload),
  onP2PMessage: (cb: (msg: any) => void) => {
    ipcRenderer.on('p2p-worker-message', (_event, msg) => cb(msg))
  }
})