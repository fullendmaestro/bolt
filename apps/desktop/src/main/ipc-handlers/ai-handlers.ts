import { ipcMain } from 'electron'
import { QWEN3_4B_INST_Q4_K_M, completion, loadModel, unloadModel } from '@qvac/sdk'
import type { IpcHandlerContext } from './types'

type InferenceMode = 'local' | 'channel_peer' | 'cloud'

async function ensureModelLoaded(
  context: IpcHandlerContext,
  inferenceMode: InferenceMode = 'local'
) {
  const existingModelId = context.getModelId()
  if (existingModelId) return existingModelId

  const delegate =
    inferenceMode === 'channel_peer'
      ? {
          delegate: { providerPublicKey: context.localStore.get('ownChannelKey', '') || undefined }
        }
      : {}

  const modelId = await loadModel({
    modelSrc: QWEN3_4B_INST_Q4_K_M,
    modelType: 'llm',
    modelConfig: {
      ctx_size: 8192,
      tools: true,
      toolsMode: 'dynamic',
      reasoning_budget: -1,
      temp: 0.6
    },
    ...delegate,
    onProgress: (progress) => {
      context.getWindow()?.webContents.send('model-progress', progress)
    }
  } as any)

  context.setModelId(modelId)
  return modelId
}

async function runSummaryGeneration(
  context: IpcHandlerContext,
  channelKey: string,
  video: any
): Promise<any> {
  const modelId = await ensureModelLoaded(context, 'local')

  const transcriptChunks = video.workspaceId
    ? await context.getRpc().ragQuery({
        workspaceId: video.workspaceId,
        query: 'Summarize the match transcript with scoreline, standout moments, and outcome.'
      })
    : []

  const transcriptContext = Array.isArray(transcriptChunks)
    ? transcriptChunks
        .map((chunk: any) => chunk.content || '')
        .filter(Boolean)
        .join('\n\n')
    : ''

  const summaryPrompt = [
    'Write a brief match summary in 2-3 sentences.',
    'Use the metadata and transcript context.',
    `Metadata: ${JSON.stringify(video.matchData || {}, null, 2)}`,
    transcriptContext
      ? `Transcript context: ${transcriptContext}`
      : 'No transcript context available.'
  ].join('\n\n')

  const run = completion({
    modelId,
    history: [
      { role: 'system', content: 'You write concise sports match summaries.' },
      { role: 'user', content: summaryPrompt }
    ],
    stream: true,
    captureThinking: true
  } as any)

  let summary = ''
  for await (const ev of run.events) {
    if (ev.type === 'contentDelta') summary += ev.text
  }
  await run.final

  const updatedVideo = { ...video, aiSummary: summary.trim() }
  await context.getRpc().updateVideoMetadata({
    channelKey,
    videoJson: JSON.stringify(updatedVideo)
  })

  return updatedVideo
}

export async function handleUploadComplete(
  context: IpcHandlerContext,
  channelKey: string,
  video: any
): Promise<void> {
  try {
    const updatedVideo = await runSummaryGeneration(context, channelKey, video)
    context.getWindow()?.webContents.send('p2p-worker-message', {
      type: 'video-metadata-updated',
      channelKey,
      video: updatedVideo
    })
  } catch (err) {
    console.error('Failed to auto-summarize uploaded video:', err)
  }
}

export function registerAiHandlers({
  getWindow,
  getRpc,
  getModelId,
  setModelId,
  localStore
}: IpcHandlerContext): void {
  ipcMain.handle('load-model', async () => {
    const modelId = await loadModel({
      modelSrc: QWEN3_4B_INST_Q4_K_M,
      modelType: 'llm',
      modelConfig: {
        ctx_size: 8192,
        tools: true,
        toolsMode: 'dynamic',
        reasoning_budget: -1,
        temp: 0.6
      },
      onProgress: (progress) => {
        console.log(progress)
        getWindow()?.webContents.send('model-progress', progress)
      }
    } as any)

    setModelId(modelId)
    return 'model loaded'
  })

  ipcMain.handle('infer', async (_event, history, options = {}) => {
    const modelId = await ensureModelLoaded(
      { getWindow, getRpc, getModelId, setModelId, localStore },
      options.inferenceMode || 'local'
    )

    const tools = [
      {
        name: 'query_transcript',
        description: 'Search the current video transcript workspace for relevant context.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            workspaceId: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_match_stats',
        description: 'Fetch high-level match and upload metadata for the current channel.',
        parameters: {
          type: 'object',
          properties: {
            channelKey: { type: 'string' }
          }
        }
      },
      {
        name: 'search_channel_history',
        description: 'Search recent feed and channel entries for relevant context.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            channelKey: { type: 'string' }
          },
          required: ['query']
        }
      }
    ]

    const resolveTool = async (call: any) => {
      const args = call.arguments || call.args || {}
      if (call.name === 'query_transcript') {
        const workspaceId = args.workspaceId || options.workspaceId
        if (!workspaceId) return { error: 'No transcript workspace available.' }
        return getRpc().ragQuery({ workspaceId, query: args.query || '' })
      }
      if (call.name === 'get_match_stats') {
        const uploads = await getRpc().getUploads({
          channelKey: args.channelKey || options.channelKey || ''
        })
        return JSON.parse(uploads.channelJson || 'null')
      }
      if (call.name === 'search_channel_history') {
        const feed = await getRpc().getFeed({})
        const items = JSON.parse(feed.itemsJson || '[]')
        const query = String(args.query || '').toLowerCase()
        return items.filter((item: any) => JSON.stringify(item).toLowerCase().includes(query))
      }
      return { error: `Unknown tool: ${call.name}` }
    }

    let workingHistory = Array.isArray(history) ? [...history] : []

    for (let cycle = 0; cycle < 3; cycle += 1) {
      const result = completion({
        modelId,
        history: workingHistory,
        tools,
        stream: true,
        captureThinking: true,
        kvCache: options.kvCache ?? true
      } as any)

      let assistantText = ''
      const toolCalls: any[] = []

      for await (const ev of result.events) {
        if (ev.type === 'contentDelta') {
          assistantText += ev.text
          getWindow()?.webContents.send('completion-stream', ev.text)
        } else if (ev.type === 'toolCall') {
          toolCalls.push(ev.call)
        }
      }

      await result.final

      if (toolCalls.length === 0) {
        getWindow()?.webContents.send('completion-stream', '')
        return
      }

      workingHistory = workingHistory.concat(
        assistantText ? [{ role: 'assistant', content: assistantText }] : [],
        ...(await Promise.all(
          toolCalls.map(async (call) => ({
            role: 'tool',
            name: call.name,
            content: JSON.stringify(await resolveTool(call))
          }))
        ))
      )
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
