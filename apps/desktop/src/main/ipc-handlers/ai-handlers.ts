import { ipcMain } from 'electron'
import { LLAMA_3_2_1B_INST_Q4_0, loadModel, unloadModel, completion } from '@qvac/sdk'
import type { IpcHandlerContext } from './types'

export function registerAiHandlers({ getWindow, getRpc, getModelId, setModelId }: IpcHandlerContext): void {
  ipcMain.handle('load-model', async () => {
    const modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: 'llm',
      onProgress: (progress) => {
        console.log(progress)
        getWindow()?.webContents.send('model-progress', progress)
      }
    })

    setModelId(modelId)
    return 'model loaded'
  })

  ipcMain.handle('infer', async (_event, history, options = {}) => {
    const modelId = getModelId()
    if (!modelId) throw new Error('Model not loaded.')

    const result = completion({ modelId, history, stream: true, ...options })
    for await (const token of result.tokenStream) {
      getWindow()?.webContents.send('completion-stream', token)
    }
    getWindow()?.webContents.send('completion-stream', '')
  })

  ipcMain.handle('unload-model', async () => {
    const modelId = getModelId()
    if (!modelId) throw new Error('Model not loaded.')

    await unloadModel({ modelId })
    setModelId(null)
    return 'model unloaded'
  })

  ipcMain.handle('rag:query', async (_event, workspaceId: string, query: string) => {
    const res = await getRpc().ragQuery({ workspaceId, query })
    return JSON.parse(res.resultsJson)
  })
}