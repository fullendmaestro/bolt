import React, { useState, useRef } from 'react'
import type { AssistantRuntime } from '@assistant-ui/react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import {
  ChevronDown,
  MessageSquare,
  BarChart2,
  Shield,
  Cpu,
  type LucideIcon,
} from 'lucide-react'

import { Thread } from './assistant-ui/thread'
import type { VideoEntry, VideoTimelineEvent } from '../../../shared/types'
import { VIDEO_TYPES, getOpponentById } from '../../../shared/constants'

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

function DelegateIcon({ d, size = 16 }: { d: Delegate; size?: number }) {
  if (d.kind === 'avatar') {
    return (
      <img
        src={d.avatarSrc}
        alt={d.name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    )
  }
  const Icon = d.icon
  return <Icon size={size} className="text-muted-foreground shrink-0" />
}

function SelectDelegate({ selected, delegates, onSelect }: SelectDelegateProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        id="delegate-selector"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <DelegateIcon d={selected} />
        <span className="font-medium text-sm">{selected.name}</span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-background border rounded-lg shadow-xl z-50 overflow-hidden">
            {delegates.map((d) => (
              <button
                key={d.id}
                onClick={() => { onSelect(d); setOpen(false) }}
                className={`w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors flex items-center gap-3 ${
                  selected.id === d.id ? 'bg-secondary/30' : ''
                }`}
              >
                <DelegateIcon d={d} size={16} />
                <div className="flex flex-col min-w-0">
                  <div className="font-medium text-sm truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{d.description}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
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
      icon: Shield,
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
      icon: Cpu,
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