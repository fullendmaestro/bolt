import React from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useLangGraphRuntime } from '@assistant-ui/react-langgraph'
import { Client } from '@langchain/langgraph-sdk'
import { Thread } from './assistant-ui/thread'

const client = new Client({
    apiUrl: import.meta.env.VITE_LANGGRAPH_API_URL || 'http://localhost:3000'
})

export function ChatInterface(): React.JSX.Element {
    // Point this to the local LangGraph API server spawned by Electron
    const assistantId = import.meta.env.VITE_LANGGRAPH_ASSISTANT_ID || 'assistant'
    const runtime = useLangGraphRuntime({
        create: async () => {
            console.log("ChatInterface: create thread called")
            const thread = await client.threads.create()
            console.log("ChatInterface: thread created", thread)
            return { externalId: thread.thread_id }
        },
        load: async (externalId) => {
            console.log("ChatInterface: load thread called", externalId)
            const state = await client.threads.getState(externalId)
            return { messages: (state.values as any)?.messages ?? [], interrupts: [] }
        },
        stream: async function* (messages, { initialize, ...config }) {
            console.log("ChatInterface: stream called with messages", messages)
            const { externalId } = await initialize()
            console.log("ChatInterface: initialize complete, thread ID is", externalId)

            try {
                yield* client.runs.stream(externalId!, assistantId, {
                    input: { messages },
                    streamMode: "messages",
                    ...config,
                })
                console.log("ChatInterface: stream complete")
            } catch (e) {
                console.error("ChatInterface: stream error", e)
                throw e
            }
        },
    })

    return (
        <div className="flex flex-col h-full bg-[#0F0F0F]">
            <div className="flex-1 overflow-hidden relative">
                <div className="h-full w-full [&_.aui-thread]:h-full [&_.aui-thread]:bg-[#0F0F0F] [&_.aui-thread-viewport]:px-4 [&_.aui-text-muted]:text-neutral-500">
                    <AssistantRuntimeProvider runtime={runtime}>
                        <Thread />
                    </AssistantRuntimeProvider>
                </div>
            </div>
        </div>
    )
}