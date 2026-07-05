declare global {
  interface Window {
    electron: {
      process: {
        versions: NodeJS.ProcessVersions
      }
    }
    qvacAPI: {
      loadModel: () => Promise<string>
      infer: (history: { role: string; content: string }[]) => Promise<void>
      onCompletionStream: (cb: (token: string) => void) => void
      unloadModel: () => Promise<string>
      sendP2PCommand: (payload: any) => Promise<void>
      onP2PMessage: (cb: (msg: any) => void) => void
    }
  }
}

export { }