import type { ChatModelAdapter } from '@assistant-ui/react'

type InferenceMode = 'local' | 'channel_peer' | 'cloud'

interface QvacAdapterOptions {
  currentVideoWorkspaceId?: string
  inferenceMode?: InferenceMode
}

export function createQvacModelAdapter({
  currentVideoWorkspaceId,
  inferenceMode = 'local'
}: QvacAdapterOptions = {}): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const history = messages.map((msg) => {
        const textContent = msg.content
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join('')

        return { role: msg.role, content: textContent }
      })

      const queue: string[] = []
      let resolveNext: (() => void) | null = null
      let isDone = false

      window.qvacAPI.onCompletionStream((token) => {
        if (token === '') {
          isDone = true
        } else {
          queue.push(token)
        }

        if (resolveNext) {
          resolveNext()
          resolveNext = null
        }
      })

      window.qvacAPI.infer(history, {
        kvCache: true,
        inferenceMode,
        workspaceId: currentVideoWorkspaceId
      })

      let accumulatedText = ''

      while (!isDone || queue.length > 0) {
        if (abortSignal?.aborted) break

        if (queue.length > 0) {
          const token = queue.shift()
          if (token) {
            accumulatedText += token
            yield {
              content: [{ type: 'text', text: accumulatedText }]
            }
          }
        } else {
          await new Promise<void>((resolve) => {
            resolveNext = resolve
          })
        }
      }
    }
  }
}
