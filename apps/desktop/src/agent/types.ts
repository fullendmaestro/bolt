export interface AgentConfig {
  maxTurns: number
  llmModelId?: string
  verbose?: boolean
  callbacks?: AgentCallbacks
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxTurns: 5,
  verbose: false
}

export interface AgentState {
  counters: {
    turns_total: number
    max_turns_total: number
  }
  execution: {
    error: string | null
  }
}

export function createInitialState(maxTurns: number): AgentState {
  return {
    counters: {
      turns_total: 0,
      max_turns_total: maxTurns
    },
    execution: {
      error: null
    }
  }
}

export interface ToolCall {
  tool: string
  args: Record<string, any>
}

export interface ToolResult {
  success: boolean
  error?: string
  data?: any
}

export interface TurnResult {
  response: string
  state: AgentState
  toolsCalled: ToolCall[]
  turnsUsed: number
  complete: boolean
  error?: string
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  timestamp: string
}

export type ToolName = 'search_video_transcript'

export interface ToolContext {
  workspaceId: string
  videoTitle?: string
  channelEvents?: any[]
  embedModelId: string
  updateState?: (patch: Partial<AgentState>) => void
  getState?: () => AgentState
}

export interface AgentCallbacks {
  onStateChange?: (newState: AgentState, previousState: AgentState) => void
  onToolCall?: (tool: string, args: Record<string, any>, status: 'calling' | 'completed', result?: any) => void
  onStreamContent?: (token: string) => void
}
