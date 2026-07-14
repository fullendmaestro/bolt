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

            // 3. Define the transcript search tool (only injected when a video is active)
            const tools = currentVideoWorkspaceId
                ? [
                    {
                        type: "function",
                        function: {
                            name: "search_video_transcript",
                            description:
                                "Search the current video's transcript for specific keywords, events, or timestamps. " +
                                "Use this whenever the user asks about something that happened in the video.",
                            parameters: {
                                type: "object",
                                properties: {
                                    query: {
                                        type: "string",
                                        description: "The keywords or phrase to search for in the transcript"
                                    }
                                },
                                required: ["query"]
                            }
                        }
                    }
                ]
                : []

            // 4. Run the completion (streaming)
            const run = await window.qvacAPI.completion({
                history,
                stream: true,
                ...(tools.length > 0 ? { tools } : {})
            })

            let accumulatedText = ""

            for await (const event of run.events) {
                if (abortSignal?.aborted) break

                if (event.type === "toolCall") {
                    // ── Tool interception: RAG search ──────────────────
                    try {
                        if (!event.toolCall) throw new Error("toolCall payload missing")
                        const args = JSON.parse(event.toolCall.function.arguments)
                        const query: string = args.query || ""

                        const ragResults = await window.qvacAPI.ragQuery(
                            currentVideoWorkspaceId!,
                            query
                        )

                        const ragContext =
                            ragResults && ragResults.length > 0
                                ? ragResults.map((r: any) => r.content).join("\n\n")
                                : "No relevant transcript sections found."

                        // Feed the RAG result back as a tool response and re-run
                        const continueHistory = [
                            ...history,
                            {
                                role: "tool",
                                name: "search_video_transcript",
                                content: ragContext
                            }
                        ]

                        const followUp = await window.qvacAPI.completion({
                            history: continueHistory,
                            stream: true
                        })

                        for await (const followEvent of followUp.events) {
                            if (abortSignal?.aborted) break
                            if (followEvent.type === "contentDelta") {
                                accumulatedText += followEvent.text
                                yield { content: [{ type: "text", text: accumulatedText }] }
                            }
                        }
                    } catch (err) {
                        console.error("[QVAC] Tool call / RAG query failed:", err)
                    }

                } else if (event.type === "contentDelta") {
                    accumulatedText += event.text
                    yield { content: [{ type: "text", text: accumulatedText }] }
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