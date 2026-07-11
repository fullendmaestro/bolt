import { ChatModelAdapter } from "@assistant-ui/react"
import type { ChannelEvent } from "../../../shared/types"

/**
 * Creates a QVAC model adapter that injects live channel events as system context.
 * The channelEventsRef is a mutable ref that accumulates events from the P2P worker.
 */
export function createQvacModelAdapter(
    channelEventsRef: React.RefObject<ChannelEvent[]>
): ChatModelAdapter {
    return {
        async *run({ messages, abortSignal }) {
            // 1. Format assistant-ui messages for QVAC inference
            const history = messages.map((msg) => {
                // FIX: Safely extract text from the strongly-typed message parts array
                const textContent = msg.content
                    .map((part) => (part.type === "text" ? part.text : ""))
                    .join("")

                return { role: msg.role, content: textContent }
            })

            // 2. Build system prompt with channel event context
            let systemPrompt = "You are a helpful sports AI assistant for the Bolt P2P streaming platform. You help users with sports analysis, commentary, and questions about what's happening in the stream."

            const events = channelEventsRef.current || []
            if (events.length > 0) {
                const eventContext = events
                    .map((evt) => `[${evt.timestamp}] ${evt.eventType}: ${evt.description}`)
                    .join("\n")

                systemPrompt += `\n\n--- LIVE CHANNEL EVENTS (real-time context from the broadcast) ---\n${eventContext}\n--- END EVENTS ---\n\nUse the above events to provide contextual, real-time answers about what is happening in the stream. Reference specific events when relevant.`
            }

            // Inject system prompt
            history.unshift({ role: "system", content: systemPrompt })

            // 3. Setup a queue for the IPC stream listener
            const queue: string[] = []
            let resolveNext: (() => void) | null = null
            let isDone = false

            window.qvacAPI.onCompletionStream((token) => {
                if (token === "") {
                    isDone = true
                } else {
                    queue.push(token)
                }
                // Wake up the generator if it's waiting
                if (resolveNext) {
                    resolveNext()
                    resolveNext = null
                }
            })

            // 4. Trigger the main process inference
            window.qvacAPI.infer(history)

            // FIX: Accumulate the tokens. assistant-ui expects the full message state, not deltas.
            let accumulatedText = ""

            // 5. Yield the accumulated state as tokens arrive
            while (!isDone || queue.length > 0) {
                if (abortSignal?.aborted) break

                if (queue.length > 0) {
                    const token = queue.shift()
                    if (token) {
                        accumulatedText += token // Append the new token
                        yield {
                            content: [{ type: "text", text: accumulatedText }] // Yield the entire string
                        }
                    }
                } else {
                    // Wait for the next token from the IPC listener
                    await new Promise<void>((resolve) => {
                        resolveNext = resolve
                    })
                }
            }
        }
    }
}

/**
 * @deprecated Use createQvacModelAdapter() instead for event context injection.
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