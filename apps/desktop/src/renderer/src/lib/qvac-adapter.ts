import { ChatModelAdapter } from "@assistant-ui/react"
import type { ChannelEvent } from "../../../shared/types"

/**
 * Creates a QVAC model adapter that injects live channel events as system context
 * and performs RAG retrieval against the channel's video transcript workspace.
 *
 * Task 1 — P2P RAG: Before running inference, the adapter calls ragSearch() with
 * the user's latest query so transcript chunks from uploaded videos are injected
 * as additional context alongside the live event feed.
 *
 * Task 3 — KV Caching: All completion calls pass kvCache:true so the LLM can
 * cache its key/value attention state across the continuous transcript event stream,
 * only computing a delta for each new segment instead of re-processing the prefix.
 *
 * @param channelEventsRef - Mutable ref accumulating live P2P channel events
 * @param channelKey       - Hex key of the current channel (used as RAG workspace)
 */
export function createQvacModelAdapter(
    channelEventsRef: React.RefObject<ChannelEvent[]>,
    channelKey?: string | null
): ChatModelAdapter {
    return {
        async *run({ messages, abortSignal }) {
            // 1. Format assistant-ui messages for QVAC inference
            const history = messages.map((msg) => {
                // Safely extract text from the strongly-typed message parts array
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
                    "\n\n--- LIVE CHANNEL EVENTS (real-time context from the broadcast) ---\n" +
                    eventContext +
                    "\n--- END EVENTS ---\n\n" +
                    "Use the above events to provide contextual, real-time answers about what is happening " +
                    "in the stream. Reference specific events when relevant."
            }

            // ── Task 1: P2P RAG — inject relevant video transcript chunks ────────────
            // Extract the user's latest message as the RAG search query.
            // Retrieved chunks are prepended to the system prompt so the LLM has
            // grounded context from actual video transcripts uploaded to this channel.
            if (channelKey) {
                try {
                    const userMessages = history.filter((m) => m.role === "user")
                    const latestQuery = userMessages[userMessages.length - 1]?.content ?? ""

                    if (latestQuery.trim()) {
                        const ragResults = await window.qvacAPI.ragSearch(channelKey, latestQuery)
                        if (ragResults && ragResults.length > 0) {
                            const ragContext = ragResults
                                .map((r, i) => `[Clip ${i + 1} — relevance ${(r.score * 100).toFixed(0)}%]\n${r.content}`)
                                .join("\n\n")
                            systemPrompt +=
                                "\n\n--- VIDEO TRANSCRIPT CONTEXT (retrieved from channel RAG) ---\n" +
                                ragContext +
                                "\n--- END TRANSCRIPT CONTEXT ---\n\n" +
                                "The above excerpts are from video transcripts uploaded to this channel. " +
                                "Use them to answer questions about specific matches, plays, or events."
                        }
                    }
                } catch (ragErr) {
                    // Non-fatal: continue without RAG context if it fails
                    console.warn("[qvac-adapter] RAG search failed (non-fatal):", ragErr)
                }
            }
            // ─────────────────────────────────────────────────────────────────────────

            // Inject system prompt as the first message
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

            // 4. Trigger the main process inference.
            // ── Task 3: KV Caching — pass kvCache:true so the LLM caches its
            //    key/value attention state across the continuous live event stream.
            //    Only the delta for new text is computed, not the entire prefix.
            window.qvacAPI.infer(history, { kvCache: true })

            // Accumulate the tokens. assistant-ui expects the full message state, not deltas.
            let accumulatedText = ""

            // 5. Yield the accumulated state as tokens arrive
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

        window.qvacAPI.infer(history, { kvCache: false })

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