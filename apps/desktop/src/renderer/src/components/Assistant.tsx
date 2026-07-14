import React, { useState, useRef } from 'react'
import type { AssistantRuntime } from '@assistant-ui/react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import {
  ChevronDown,
  MessageSquare,
  BarChart2,
  MonitorSmartphone,
  XIcon,
  type LucideIcon,
} from 'lucide-react'

import { Thread } from './assistant-ui/thread'
import type { VideoEntry, VideoTimelineEvent } from '../../../shared/types'
import { VIDEO_TYPES, getOpponentById } from '../../../shared/constants'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

// ── Delegate types ──────────────────────────────────────────

interface IconDelegate {
  kind: 'icon'
  id: string
  name: string
  description: string
  icon: LucideIcon
  channelKey?: string
}

interface AvatarDelegate {
  kind: 'avatar'
  id: string
  name: string
  description: string
  avatarSrc: string
  channelKey: string
}

type Delegate = IconDelegate | AvatarDelegate

// ── SelectDelegate ───────────────────────────────────────────

interface SelectDelegateProps {
  selected: Delegate
  delegates: Delegate[]
  onSelect: (d: Delegate) => void
}

function DelegateIcon({ d, size = 16, className = "" }: { d: Delegate; size?: number, className?: string }) {
  if (d.kind === 'avatar') {
    return (
      <img
        src={d.avatarSrc}
        alt={d.name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }
  const Icon = d.icon
  return <Icon size={size} className={`shrink-0 ${className}`} />
}

function SelectDelegate({ selected, delegates, onSelect }: SelectDelegateProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 rounded-full gap-1.5 px-3 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/50 text-xs font-medium transition-colors"
        onClick={() => setOpen(true)}
      >
        <DelegateIcon d={selected} size={14} className="text-primary/70" />
        <ChevronDown size={14} className="opacity-60 ml-0.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-card">
          <div className="p-6 pb-4">
            <DialogHeader className="mb-6 text-center">
              <DialogTitle className="text-xl font-medium text-center">
                Select AI Delegate
              </DialogTitle>
              <DialogDescription className="text-center">
                Choose who processes your queries.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              {delegates.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { onSelect(d); setOpen(false) }}
                  className={`flex items-center gap-3 p-3 rounded-lg border bg-background text-sm shadow-sm relative overflow-hidden text-left hover:bg-secondary/50 transition-colors ${selected.id === d.id ? 'border-primary' : ''}`}
                >
                  <DelegateIcon d={d} size={20} className="text-primary shrink-0 z-10" />
                  <div className="flex-1 min-w-0 z-10">
                    <span className="font-medium truncate block max-w-full">{d.name}</span>
                    <span className="text-xs text-muted-foreground truncate block max-w-full">{d.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── VideoStats ───────────────────────────────────────────────

interface VideoStatsProps {
  video: VideoEntry
  videoRef: React.RefObject<HTMLVideoElement | null>
}

function VideoStats({ video, videoRef }: VideoStatsProps) {
  const opponent = video.opponentId ? getOpponentById(video.opponentId) : null
  const events: VideoTimelineEvent[] = (() => {
    try { return video.eventsJson ? JSON.parse(video.eventsJson) : [] }
    catch { return [] }
  })()

  const typeLabel =
    video.videoType === VIDEO_TYPES.FULL_TOURNAMENT ? 'Full Match'
    : video.videoType === VIDEO_TYPES.CLIP ? 'Clip'
    : video.videoType || 'Video'

  const seek = (secs: number) => {
    if (videoRef.current) videoRef.current.currentTime = secs
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-5 gap-5 text-sm">
      {/* Match header */}
      <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
        <div className="flex items-center justify-center gap-6 w-full">
          {/* Home side — placeholder "My Team" */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg">⚽</div>
            <span className="text-xs font-medium text-center leading-tight">My Team</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            {video.score ? (
              <span className="text-2xl font-bold tracking-wide text-foreground">{video.score}</span>
            ) : (
              <span className="text-xs text-muted-foreground">No score</span>
            )}
          </div>

          {/* Opponent side */}
          <div className="flex flex-col items-center gap-1 flex-1">
            {opponent ? (
              <>
                <img src={opponent.icon} alt={opponent.name}
                  className="w-10 h-10 rounded-full object-cover bg-secondary"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span className="text-xs font-medium text-center leading-tight">{opponent.name}</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">🏟️</div>
                <span className="text-xs text-muted-foreground">Opponent</span>
              </>
            )}
          </div>
        </div>

        {/* Video type badge */}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          {typeLabel}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Match Timeline
        </h3>

        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No timeline events were provided for this video.</p>
        ) : (
          <ol className="relative border-l border-border ml-3 flex flex-col gap-0">
            {events.map((evt, i) => (
              <li key={i} className="mb-0">
                <button
                  onClick={() => seek(evt.videoTimeSecs)}
                  className="group flex items-start gap-3 w-full text-left pl-4 py-2.5 hover:bg-secondary/40 rounded-r-lg transition-colors relative"
                >
                  {/* Dot */}
                  <span className="absolute -left-[5px] top-3.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-background group-hover:scale-125 transition-transform" />
                  <span className="text-xs font-mono text-indigo-400 shrink-0 pt-0.5 w-12">{evt.timestamp}</span>
                  <span className="text-xs text-foreground leading-relaxed">{evt.label}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

// ── Assistant ────────────────────────────────────────────────

interface AssistantProps {
  runtime: AssistantRuntime
  channelKey?: string | null
  channelName?: string | null
  channelAvatar?: string | null
  currentVideo?: VideoEntry | null
  videoRef?: React.RefObject<HTMLVideoElement | null>
}

export function Assistant({
  runtime,
  channelKey,
  channelName,
  channelAvatar,
  currentVideo,
  videoRef,
}: AssistantProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<'chat' | 'stats'>('chat')

  // Build delegate list dynamically from channel context
  const delegates: Delegate[] = [
    {
      kind: 'icon',
      id: 'local',
      name: 'Local',
      description: 'Run inference on this machine',
      icon: MonitorSmartphone,
    },
    ...(channelKey && channelName
      ? [{
          kind: 'avatar' as const,
          id: `channel-${channelKey}`,
          name: channelName,
          description: 'Delegate to channel provider',
          avatarSrc: channelAvatar || '',
          channelKey,
        }]
      : []),
    {
      kind: 'icon',
      id: 'custom',
      name: 'Custom',
      description: 'Enter a provider key manually',
      icon: XIcon,
    },
  ]

  const [selectedDelegate, setSelectedDelegate] = useState<Delegate>(delegates[0])

  const handleDelegateSelect = (d: Delegate) => {
    setSelectedDelegate(d)
    if (d.kind === 'avatar' && d.channelKey) {
      window.qvacAPI?.loadModel?.({
        modelSrc: 'LLAMA_3_2_1B_INST_Q4_0',
        modelType: 'llm',
        delegate: {
          providerPublicKey: d.channelKey,
          timeout: 60000,
          fallbackToLocal: true,
        },
      })
    }
  }

  const internalVideoRef = useRef<HTMLVideoElement | null>(null)
  const resolvedVideoRef = videoRef ?? internalVideoRef

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full flex-col bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b">
          <SelectDelegate
            selected={selectedDelegate}
            delegates={delegates}
            onSelect={handleDelegateSelect}
          />

          {/* Chat ↔ Stats toggle */}
          <button
            id="view-mode-toggle"
            onClick={() => setViewMode((v) => v === 'chat' ? 'stats' : 'chat')}
            title={viewMode === 'chat' ? 'Show stats' : 'Show chat'}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'stats'
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'hover:bg-secondary text-muted-foreground'
            }`}
          >
            {viewMode === 'chat'
              ? <BarChart2 size={20} />
              : <MessageSquare size={20} />}
          </button>
        </header>

        <div className="flex-1 overflow-hidden">
          {viewMode === 'chat' ? (
            <Thread />
          ) : currentVideo ? (
            <VideoStats video={currentVideo} videoRef={resolvedVideoRef} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <BarChart2 size={32} className="opacity-30" />
              <p className="text-sm">No video selected</p>
            </div>
          )}
        </div>
      </div>
    </AssistantRuntimeProvider>
  )
}