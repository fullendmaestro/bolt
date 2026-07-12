import { useMemo, useState } from 'react'
import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import { BarChart3, Maximize2, MessageSquare, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Thread } from '@/components/assistant-ui/thread'
import { MatchStats } from '@/components/MatchStats'
import { createQvacModelAdapter } from '@/lib/qvac-adapter'
import type { VideoEntry } from '../../../shared/types'

interface WatchSidebarProps {
  modelStatus: string
  modelProgress: number
  loadModel: () => void
  channelKey?: string | null
  currentVideoWorkspaceId?: string
  video?: VideoEntry | null
}

export function WatchSidebar({
  modelStatus,
  modelProgress,
  loadModel,
  channelKey,
  currentVideoWorkspaceId,
  video
}: WatchSidebarProps) {
  const [activeView, setActiveView] = useState<'chat' | 'stats'>('chat')
  const [expanded, setExpanded] = useState(false)
  const [inferenceMode, setInferenceMode] = useState<'local' | 'channel_peer' | 'cloud'>('local')

  const adapter = useMemo(
    () => createQvacModelAdapter({ currentVideoWorkspaceId, inferenceMode }),
    [currentVideoWorkspaceId, inferenceMode]
  )

  const runtime = useLocalRuntime(adapter)

  const showLoadingState = modelStatus === 'idle' || modelStatus === 'downloading'

  return (
    <aside
      className={`sticky top-0 h-[calc(100vh-120px)] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0F0F0F] shadow-lg transition-all duration-300 ${expanded ? 'w-full lg:w-[44rem]' : 'w-full lg:w-[26rem]'}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveView((current) => (current === 'chat' ? 'stats' : 'chat'))}
            className="h-9 w-9 rounded-full bg-white/5 text-white hover:bg-white/10"
          >
            {activeView === 'chat' ? (
              <BarChart3 className="h-4 w-4" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
          </Button>
          <div>
            <p className="text-sm font-semibold text-white">
              {activeView === 'chat' ? 'Assistant' : 'Match Stats'}
            </p>
            <p className="text-xs text-neutral-500">
              {channelKey ? `Channel ${channelKey.slice(0, 8)}…` : 'No channel selected'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={inferenceMode} onValueChange={(value) => setInferenceMode(value as any)}>
            <SelectTrigger className="h-9 w-36 border-white/10 bg-white/5 text-xs text-white">
              <SelectValue placeholder="Inference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="channel_peer">Channel Peer</SelectItem>
              <SelectItem value="cloud">Cloud</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded((current) => !current)}
            className="h-9 w-9 rounded-full bg-white/5 text-white hover:bg-white/10"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="relative h-[calc(100%-57px)] overflow-hidden">
        <div
          className={`absolute inset-0 transition-all duration-300 ${activeView === 'chat' ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0 pointer-events-none'}`}
        >
          {showLoadingState ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-neutral-400">
              <p className="text-sm">
                {modelStatus === 'idle'
                  ? 'Local AI Model is not loaded.'
                  : 'Downloading Local AI Model...'}
              </p>
              {modelStatus === 'idle' ? (
                <button
                  onClick={loadModel}
                  className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                >
                  Download & Load Model
                </button>
              ) : (
                <>
                  <div className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${modelProgress}%` }}
                    />
                  </div>
                  <p className="text-xs font-mono">{Math.round(modelProgress)}%</p>
                </>
              )}
            </div>
          ) : (
            <AssistantRuntimeProvider runtime={runtime}>
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-hidden [&_.aui-thread]:h-full [&_.aui-thread]:bg-[#0F0F0F] [&_.aui-thread-viewport]:px-4 [&_.aui-text-muted]:text-neutral-500">
                  <Thread />
                </div>
              </div>
            </AssistantRuntimeProvider>
          )}
        </div>

        <div
          className={`absolute inset-0 transition-all duration-300 ${activeView === 'stats' ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0 pointer-events-none'}`}
        >
          <MatchStats video={video} />
        </div>
      </div>
    </aside>
  )
}
