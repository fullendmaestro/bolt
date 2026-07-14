import { z } from 'zod'
import { ragSearch } from '@qvac/bare-sdk'
import type { AgentState, ToolContext, ToolResult } from './types'

export const TOOLS = [
  {
    name: 'search_video_transcript',
    description: 'Search the current video\'s transcript for specific keywords, events, or timestamps. Use this whenever the user asks about something that happened in the video.',
    parameters: z.object({
      query: z.string().describe('The keywords or phrase to search for in the transcript')
    })
  }
]

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  _state: AgentState,
  context: ToolContext
): Promise<ToolResult> {
  if (toolName === 'search_video_transcript') {
    try {
      const query = args.query || ''
      if (!query) {
        return { success: false, error: 'Query parameter is missing' }
      }

      if (!context.workspaceId) {
        return { success: false, error: 'workspaceId is not set in tool context' }
      }

      if (!context.embedModelId) {
        return { success: false, error: 'embedModelId is not set in tool context' }
      }

      // We rely on the fact that p2p-worker already initialized the AI models and ragSearch
      const res = await ragSearch({
        modelId: context.embedModelId,
        workspace: context.workspaceId,
        query
      })

      const ragContext = res && res.length > 0
        ? res.map((r: any) => r.content).join('\n\n')
        : 'No relevant transcript sections found.'

      return {
        success: true,
        data: ragContext
      }
    } catch (err: any) {
      console.error('[Agent] Tool execution failed:', err)
      return { success: false, error: err.message || String(err) }
    }
  }

  return { success: false, error: `Unknown tool: ${toolName}` }
}
