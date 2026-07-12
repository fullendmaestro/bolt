import React from 'react'
import { useLocalRuntime } from '@assistant-ui/react'
import { createQvacModelAdapter } from '../lib/qvac-adapter'
import { Assistant } from './Assistant'

interface ChatInterfaceProps {
  modelStatus: string
  modelProgress: number
  loadModel: () => void
  currentVideoWorkspaceId?: string
  inferenceMode?: 'local' | 'channel_peer' | 'cloud'
}

export function ChatInterface({
  modelStatus,
  modelProgress,
  loadModel,
  currentVideoWorkspaceId,
  inferenceMode
}: ChatInterfaceProps): React.ReactElement {
  const adapter = React.useMemo(
    () => createQvacModelAdapter({ currentVideoWorkspaceId, inferenceMode }),
    [currentVideoWorkspaceId, inferenceMode]
  )

  const runtime = useLocalRuntime(adapter)

  // Listen for live channel events when watching a channel
  return (
    <div className="flex flex-col h-full bg-[#0F0F0F]">
      {/* Main Chat Interface Layout */}
      <div className="flex-1 overflow-hidden relative">
        {modelStatus === 'idle' ? (
          <div className="flex flex-col items-center justify-center h-full bg-[#0F0F0F] text-neutral-400 gap-4">
            <p className="text-sm">Local AI Model is not loaded.</p>
            <button
              onClick={loadModel}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Download & Load Model
            </button>
          </div>
        ) : modelStatus === 'downloading' ? (
          <div className="flex flex-col items-center justify-center h-full bg-[#0F0F0F] text-neutral-400 gap-4">
            <p className="text-sm text-center">
              Downloading Local AI Model...
              <br />
              <span className="text-xs text-neutral-500">
                This may take a while depending on your connection.
              </span>
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
            <Assistant runtime={runtime} />
          </div>
        )}
      </div>
    </div>
  )
}
