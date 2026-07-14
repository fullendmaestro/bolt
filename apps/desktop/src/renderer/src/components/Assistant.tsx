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

import { footballTeams } from '../lib/const'
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
  const events: VideoTimelineEvent[] = (() => {
    try { return video.eventsJson ? JSON.parse(video.eventsJson) : [] }
    catch { return [] }
  })()

  const seek = (secs: number) => {
    if (videoRef.current) videoRef.current.currentTime = secs
  }

  const homeTeamDef = footballTeams.find(t => t.name === video.homeTeam)
  const awayTeamDef = footballTeams.find(t => t.name === video.awayTeam)

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#F9FAFB] text-sm rounded-lg border border-border/40">
      {/* Match header scoreboard block */}
      <div className="bg-white rounded-t-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border-b border-border/60 py-5 px-4">
        <div className="flex items-center justify-between w-full">
          {/* Home side */}
          <div className="flex flex-1 items-center justify-start gap-3">
            {homeTeamDef ? (
              <>
                <img src={homeTeamDef.crestUrl} alt={video.homeTeam || 'Home Team'} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span className="text-sm font-bold uppercase tracking-wide truncate max-w-[100px] hidden sm:block">{video.homeTeam || 'Home'}</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-lg shadow-sm border border-neutral-200">⚽</div>
                <span className="text-sm font-bold uppercase tracking-wide truncate hidden sm:block">My Team</span>
              </>
            )}
          </div>

          {/* Score */}
          <div className="flex flex-col items-center justify-center px-4">
            {video.homeScore && video.awayScore ? (
              <div className="flex items-center gap-3 text-3xl font-black text-neutral-800 tracking-tight">
                <span>{video.homeScore}</span>
                <span className="text-neutral-300 font-medium text-xl">-</span>
                <span>{video.awayScore}</span>
              </div>
            ) : (
              <span className="text-sm font-medium text-neutral-400">vs</span>
            )}
            <div className="text-xs text-neutral-500 font-medium mt-1">{video.matchDate || 'Full Time'}</div>
          </div>

          {/* Away side */}
          <div className="flex flex-1 items-center justify-end gap-3">
            {awayTeamDef ? (
              <>
                <span className="text-sm font-bold uppercase tracking-wide truncate max-w-[100px] hidden sm:block text-right">{video.awayTeam || 'Away'}</span>
                <img src={awayTeamDef.crestUrl} alt={video.awayTeam || 'Away'} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </>
            ) : (
              <>
                <span className="text-sm font-bold uppercase tracking-wide truncate hidden sm:block text-right">Opponent</span>
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-lg shadow-sm border border-neutral-200">🏟️</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-sm font-bold text-neutral-800 mb-6 flex items-center gap-2">
          Match Timeline
        </h3>

        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 opacity-60 mt-10">
            <span className="text-xs italic">No timeline events were provided for this video.</span>
          </div>
        ) : (
          <div className="relative pl-3">
            {/* Vertical line connecting events */}
            <div className="absolute left-[29px] sm:left-[35px] top-4 bottom-4 w-0.5 bg-neutral-200" />
            
            <ol className="relative flex flex-col gap-6 w-full">
              {events.map((evt, i) => {
                const isGoal = evt.label.toLowerCase() === 'goal'
                const isYellow = evt.label.toLowerCase() === 'yellow card'
                const isRed = evt.label.toLowerCase() === 'red card'
                const isSub = evt.label.toLowerCase() === 'substitution'
                
                return (
                  <li key={i} className="flex items-center gap-4 group cursor-pointer" onClick={() => seek(evt.videoTimeSecs)}>
                    <div className="w-10 sm:w-12 flex justify-end shrink-0 text-neutral-600 font-bold text-[13px] group-hover:text-indigo-600 transition-colors">
                      {evt.timestamp}'
                    </div>
                    
                    <div className="relative z-10 shrink-0 w-[22px] h-[22px] rounded-full bg-white border-2 border-indigo-500 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:border-indigo-600 group-hover:bg-indigo-50 transition-all">
                      {isGoal && <span className="text-[10px]">⚽</span>}
                      {isYellow && <div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm" />}
                      {isRed && <div className="w-2.5 h-3.5 bg-red-500 rounded-sm" />}
                      {isSub && <span className="text-[10px]">🔄</span>}
                      {!isGoal && !isYellow && !isRed && !isSub && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                    </div>

                    <div className="bg-white border border-neutral-200 rounded-lg py-2 px-3 shadow-sm flex-1 min-w-0 group-hover:border-indigo-200 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-[13px]">
                          <span className="font-bold text-neutral-800 mr-1">{evt.label}:</span>
                          <span className="text-neutral-600 truncate inline-block max-w-[200px] align-bottom">
                            {evt.playerName || 'Player'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            id="view-mode-toggle"
            onClick={() => setViewMode((v) => v === 'chat' ? 'stats' : 'chat')}
            title={viewMode === 'chat' ? 'Show stats' : 'Show chat'}
            className={`h-8 rounded-full px-3 border border-border/50 transition-colors ${
              viewMode === 'stats'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {viewMode === 'chat'
              ? <BarChart2 size={16} />
              : <MessageSquare size={16} />}
          </Button>
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