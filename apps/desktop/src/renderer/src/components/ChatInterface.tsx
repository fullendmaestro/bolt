import React, { useEffect, useRef, useState } from 'react'
import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import { Thread } from './assistant-ui/thread'
import { createQvacModelAdapter } from '../lib/qvac-adapter'
import type { ChannelEvent } from '../../../shared/types'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatInterfaceProps {
    modelStatus: string
    modelProgress: number
    /** Task 2: Updated signature — accepts optional channelOwnerKey for delegated inference */
    loadModel: (channelOwnerKey?: string) => void
    channelKey?: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatInterface({ modelStatus, modelProgress, loadModel, channelKey }: ChatInterfaceProps): React.JSX.Element {
    // Accumulate channel events for AI context injection (live P2P broadcast feed)
    const channelEventsRef = useRef<ChannelEvent[]>([])

    // Task 2: Dual-Mode Inference — 'local' runs on-device, 'delegate' routes to
    // the channel owner's QVAC provider node over the P2P swarm.
    const [inferenceMode, setInferenceMode] = useState<'local' | 'delegate'>('local')

    // Task 1 + 3: Create the adapter with event buffer and channelKey for RAG search.
    // Re-created when channelKey changes so it always targets the right RAG workspace.
    const adapter = React.useMemo(
        () => createQvacModelAdapter(channelEventsRef, channelKey),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [channelKey]
    )

    const runtime = useLocalRuntime(adapter)

    // Listen for live channel events when watching a channel
    useEffect(() => {
        if (!channelKey) return

        // Clear previous events when switching channels
        channelEventsRef.current = []

        const handleEvent = (event: ChannelEvent) => {
            // Only accumulate events for the current channel
            if (event.channelKey === channelKey) {
                channelEventsRef.current.push(event)
                // Keep only the last 20 events to avoid context overflow
                if (channelEventsRef.current.length > 20) {
                    channelEventsRef.current = channelEventsRef.current.slice(-20)
                }
            }
        }

        window.qvacAPI.onChannelEvent(handleEvent)

        return () => {
            window.qvacAPI.removeChannelEventListener()
        }
    }, [channelKey])

    // Task 2: handleStartInference — chooses local vs. delegated inference mode.
    // In delegate mode the channelOwnerKey is passed so the main process can route
    // the loadModel request to the channel owner's QVAC provider peer.
    const handleStartInference = () => {
        const ownerKey = inferenceMode === 'delegate' && channelKey ? channelKey : undefined
        loadModel(ownerKey)
    }

    return (
        <div className="flex flex-col h-full bg-[#0F0F0F]">
            {/* Main Chat Interface Layout */}
            <div className="flex-1 overflow-hidden relative">
                {modelStatus === 'idle' ? (
                    <div className="flex flex-col items-center justify-center h-full bg-[#0F0F0F] text-neutral-400 gap-4 px-4">
                        <p className="text-sm text-center">Local AI Model is not loaded.</p>

                        {/* Task 2: Inference mode toggle — only shown when a channel is open */}
                        {channelKey && (
                            <div className="flex items-center gap-1 bg-neutral-800/60 rounded-full p-1 border border-white/10">
                                <button
                                    id="inference-mode-local"
                                    onClick={() => setInferenceMode('local')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        inferenceMode === 'local'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-neutral-400 hover:text-neutral-200'
                                    }`}
                                >
                                    🖥 Local
                                </button>
                                <button
                                    id="inference-mode-delegate"
                                    onClick={() => setInferenceMode('delegate')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        inferenceMode === 'delegate'
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'text-neutral-400 hover:text-neutral-200'
                                    }`}
                                >
                                    🌐 Channel Node
                                </button>
                            </div>
                        )}

                        {inferenceMode === 'delegate' && channelKey && (
                            <p className="text-xs text-purple-400/80 text-center max-w-[240px]">
                                Inference will be delegated to the channel owner's node.
                                Falls back to local if unreachable.
                            </p>
                        )}

                        <button
                            id="load-model-btn"
                            onClick={handleStartInference}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-md"
                        >
                            {inferenceMode === 'delegate' ? 'Connect & Load Model' : 'Download & Load Model'}
                        </button>
                    </div>
                ) : modelStatus === 'downloading' ? (
                    <div className="flex flex-col items-center justify-center h-full bg-[#0F0F0F] text-neutral-400 gap-4">
                        <p className="text-sm text-center">
                            {inferenceMode === 'delegate'
                                ? 'Connecting to channel node...'
                                : 'Downloading Local AI Model...'}
                            <br />
                            <span className="text-xs text-neutral-500">This may take a while depending on your connection.</span>
                        </p>
                        <div className="w-48 h-2 bg-neutral-800 rounded-full overflow-hidden mt-2 relative">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-300"
                                style={{ width: `${modelProgress}%` }}
                            />
                        </div>
                        <p className="text-xs font-mono">{Math.round(modelProgress)}%</p>
                    </div>
                ) : (
                    /* Tailoring assistant-ui styles to sit perfectly inside the dark YouTube design language */
                    <div className="h-full w-full [&_.aui-thread]:h-full [&_.aui-thread]:bg-[#0F0F0F] [&_.aui-thread-viewport]:px-4 [&_.aui-text-muted]:text-neutral-500">
                        <AssistantRuntimeProvider runtime={runtime}>
                            <Thread />
                        </AssistantRuntimeProvider>
                    </div>
                )}
            </div>
        </div>
    )
}