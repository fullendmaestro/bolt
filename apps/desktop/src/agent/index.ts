import { completion } from '@qvac/bare-sdk'
import type {
  AgentState,
  AgentConfig,
  AgentCallbacks,
  Message,
  ToolCall,
  TurnResult,
  ToolContext
} from './types'
import { createInitialState, DEFAULT_AGENT_CONFIG } from './types'
import { TOOLS, executeTool } from './tools'

export class BoltAgent {
  private state: AgentState
  private config: AgentConfig
  private messages: Message[]
  private toolContext: ToolContext
  private verbose: boolean
  private callbacks: AgentCallbacks

  constructor(toolContext: ToolContext, config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config }
    this.state = createInitialState(this.config.maxTurns)
    this.messages = []
    this.verbose = config.verbose ?? false
    this.callbacks = config.callbacks ?? {}
    this.toolContext = toolContext
  }

  public setCallbacks(callbacks: AgentCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  public async processMessage(history: { role: string; content: string; name?: string }[]): Promise<TurnResult> {
    const startTurns = this.state.counters.turns_total

    // Construct the System Prompt
    let systemPrompt =
      "You are a helpful sports AI assistant for the Bolt P2P streaming platform. " +
      "You help users with sports analysis, commentary, and questions about what's happening in the stream."

    if (this.toolContext.videoTitle) {
      systemPrompt += `\n\nYou are currently watching the video: ${this.toolContext.videoTitle}`
    }

    if (this.toolContext.channelEvents && this.toolContext.channelEvents.length > 0) {
      const eventContext = this.toolContext.channelEvents
        .map((evt: any) => `[${evt.timestamp}] ${evt.eventType}: ${evt.description}`)
        .join("\n")
      systemPrompt +=
        `\n\n--- LIVE CHANNEL EVENTS ---\n${eventContext}\n--- END EVENTS ---\n` +
        `\nUse the above events to provide contextual, real-time answers about the stream.`
    }

    // Filter out any existing system messages from the frontend
    const cleanedHistory = history.filter(m => m.role !== 'system')
    
    // Prepend the new system prompt
    cleanedHistory.unshift({ role: 'system', content: systemPrompt })

    // Initialize messages from provided history
    this.messages = cleanedHistory.map(m => ({
      role: m.role as any,
      content: m.content,
      name: m.name,
      timestamp: new Date().toISOString()
    }))

    if (this.verbose) {
      console.log(`🤖 Agent loop starting...`)
    }

    const toolsCalled: ToolCall[] = []
    let response = ""

    try {
      response = await this.runReActLoop(toolsCalled)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      this.state.execution.error = errMsg
      return {
        response: `I encountered an error: ${errMsg}`,
        state: this.state,
        toolsCalled,
        turnsUsed: this.state.counters.turns_total - startTurns,
        complete: true,
        error: errMsg
      }
    }

    return {
      response,
      state: this.state,
      toolsCalled,
      turnsUsed: this.state.counters.turns_total - startTurns,
      complete: true
    }
  }

  private async runReActLoop(toolsCalled: ToolCall[]): Promise<string> {
    while (!this.isBudgetExceeded()) {
      const run = completion({
        modelId: this.config.llmModelId || 'default',
        history: this.messages.map(m => ({
          role: m.role,
          content: m.content,
          name: m.name
        })),
        stream: true,
        tools: TOOLS
      })

      let accumulatedText = ""
      let toolCallReceived: any = null

      for await (const ev of run.events) {
        if (ev.type === "contentDelta") {
          accumulatedText += ev.text
          this.callbacks.onStreamContent?.(ev.text)
        } else if (ev.type === "toolCall") {
          toolCallReceived = ev.call
          // Stream the tool call intent back to the client if they want to render it
          this.callbacks.onToolCall?.(toolCallReceived.name, toolCallReceived.arguments || {}, 'calling')
        }
      }

      if (toolCallReceived) {
        const toolName = toolCallReceived.name
        const args = toolCallReceived.arguments || {}
        toolsCalled.push({ tool: toolName, args })

        if (this.verbose) {
          console.log(`🔧 Tool Call Intercepted: ${toolName}`, args)
        }

        // 1. Add assistant's text generated so far + the tool call intent
        this.messages.push({
          role: "assistant",
          content: accumulatedText,
          timestamp: new Date().toISOString()
        })

        // 2. Execute the tool natively
        const result = await executeTool(toolName, args, this.state, this.toolContext)
        this.callbacks.onToolCall?.(toolName, args, 'completed', result)

        if (this.verbose) {
          console.log(`🔧 Tool Result:`, result)
        }

        // 3. Feed the result back as the 'tool' role
        this.messages.push({
          role: "tool",
          name: toolName,
          content: result.data || result.error || JSON.stringify(result),
          timestamp: new Date().toISOString()
        })

        this.incrementTurnCounter()
        
        // Loop around and let the LLM see the tool result and answer the user!
        continue
      } else {
        // No tools called, the LLM just answered naturally.
        return accumulatedText
      }
    }

    return "I've reached my thinking limit."
  }

  private incrementTurnCounter(): void {
    this.state.counters.turns_total++
  }

  private isBudgetExceeded(): boolean {
    return this.state.counters.turns_total >= this.state.counters.max_turns_total
  }
}
