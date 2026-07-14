import { ChatModelAdapter } from "@assistant-ui/react"
import type { ChannelEvent } from "../../../shared/types"

/**
 * Creates a QVAC model adapter that:
 * 1. Injects live channel events as system context.
 * 2. Exposes a `search_video_transcript` tool so the LLM can actively query the
 *    RAG workspace of whichever video is currently playing.
 * 3. Feeds tool results back into the completion context and streams the final answer.
 */
export function createQvacModelAdapter(
    channelEventsRef: React.RefObject<ChannelEvent[]>,
    currentVideoWorkspaceId?: string
): ChatModelAdapter {
    return {
        async *run({ messages, abortSignal }) {
            // 1. Format messages for QVAC
            const history = messages.map((msg) => {
                const textContent = msg.content
                    .map((part) => (part.type === "text" ? part.text : ""))
                    .join("")
                return { role: msg.role, content: textContent }
            })

            // 2. Build system prompt with channel event context
            let systemPrompt =
                "You are a helpful sports AI assistant for the Bolt P2P streaming platform. " +
                "You help users with sports analysis, commentary, and questions about what's happening in the stream."

            const events = channelEventsRef.current || []
            if (events.length > 0) {
                const eventContext = events
                    .map((evt) => `[${evt.timestamp}] ${evt.eventType}: ${evt.description}`)
                    .join("\n")
                systemPrompt +=
                    `\n\n--- LIVE CHANNEL EVENTS ---\n${eventContext}\n--- END EVENTS ---\n` +
                    `\nUse the above events to provide contextual, real-time answers about the stream.`
            }

            history.unshift({ role: "system", content: systemPrompt })

            // 3. (Tools are now injected directly by the worker to avoid IPC Zod serialization issues)

            // 4. Run the completion (streaming)
            // Helper to build a local generator for completions
            const runCompletion = async function* (completionHistory: any[]) {
                const events: any[] = []
                let resolve: (() => void) | null = null
                let done = false

                const unsubscribeStream = window.qvacAPI.onCompletionStream((token) => {
                    if (!token) {
                        done = true
                    } else {
                        events.push({ type: "contentDelta", text: token })
                    }
                    resolve?.()
                    resolve = null
                })

                // We still listen to tool calls just in case we want to show a loading state in the future,
                // but the backend worker executes it natively now via BoltAgent.
                const unsubscribeToolCall = window.qvacAPI.onCompletionToolCall((toolCall) => {
                    events.push({ type: "toolCall", toolCall })
                    resolve?.()
                    resolve = null
                })

                window.qvacAPI.startCompletion({
                    history: completionHistory,
                    workspaceId: currentVideoWorkspaceId,
                    stream: true
                }).catch(err => {
                    console.error("Completion error:", err)
                    done = true
                    resolve?.()
                })

                try {
                    while (!done || events.length > 0) {
                        if (events.length > 0) {
                            yield events.shift()
                        } else {
                            await new Promise<void>((r) => { resolve = r })
                        }
                    }
                } finally {
                    unsubscribeStream()
                    unsubscribeToolCall()
                }
            }

            const run = runCompletion(history)
            let accumulatedText = ""

            for await (const event of run) {
                if (abortSignal?.aborted) break

                if (event.type === "contentDelta") {
                    accumulatedText += event.text
                    yield { content: [{ type: "text", text: accumulatedText }] }
                } else if (event.type === "toolCall") {
                    // Optional: You could yield a tool-call indicator here to the UI if desired
                    // yield { content: [{ type: "text", text: accumulatedText + "\n*Searching transcript...*" }] }
                }
            }
        }
    }
}

/**
 * @deprecated Use createQvacModelAdapter() instead.
 * Kept for backward compatibility.
 */
export const qvacModelAdapter: ChatModelAdapter = {
    async *run({ messages, abortSignal }) {
        const history = messages.map((msg) => {
            const textContent = msg.content
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("")
            return { role: msg.role, content: textContent }
        })

        history.unshift({ role: 'system', content: 'You are a helpful assistant.' })

        const queue: string[] = []
        let resolveNext: (() => void) | null = null
        let isDone = false

        window.qvacAPI.onCompletionStream((token) => {
            if (token === "") {
                isDone = true
            } else {
                queue.push(token)
            }
            if (resolveNext) {
                resolveNext()
                resolveNext = null
            }
        })

        window.qvacAPI.infer(history)

        let accumulatedText = ""

        while (!isDone || queue.length > 0) {
            if (abortSignal?.aborted) break

            if (queue.length > 0) {
                const token = queue.shift()
                if (token) {
                    accumulatedText += token
                    yield {
                        content: [{ type: "text", text: accumulatedText }]
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