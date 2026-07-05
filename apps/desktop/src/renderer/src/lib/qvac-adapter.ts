import { ChatModelAdapter } from "@assistant-ui/react"

export const qvacModelAdapter: ChatModelAdapter = {
    async *run({ messages, abortSignal }) {
        // 1. Format assistant-ui messages for QVAC inference
        const history = messages.map((msg) => {
            // FIX: Safely extract text from the strongly-typed message parts array
            const textContent = msg.content
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("")

            return { role: msg.role, content: textContent }
        })

        // Inject system prompt
        history.unshift({ role: 'system', content: 'You are a helpful assistant.' })

        // 2. Setup a queue for the IPC stream listener
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

        // 3. Trigger the main process inference
        window.qvacAPI.infer(history)

        // FIX: Accumulate the tokens. assistant-ui expects the full message state, not deltas.
        let accumulatedText = ""

        // 4. Yield the accumulated state as tokens arrive
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