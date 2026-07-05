import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, PlayCircle, Loader2, Wifi } from 'lucide-react'
import { MOCK_STREAMS } from '../lib/data'
import { ChatInterface } from '../components/ChatInterface'

type ConnectionState = 'connecting' | 'buffering' | 'streaming' | 'error'

export function Watch({ modelLoading }: { modelLoading: boolean }) {
  const { id } = useParams()
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [joined, setJoined] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Parse compound ID (channelKey:videoId) or fall back to mock
  const isP2PId = id?.includes(':')
  const channelKey = isP2PId ? id!.split(':')[0] : null
  const videoId = isP2PId ? id!.split(':')[1] : null

  // Fall back to mock data for non-P2P IDs
  const activeVideo = !isP2PId ? MOCK_STREAMS.find((v) => v.id === id) : null

  useEffect(() => {
    if (!channelKey || !videoId) return

    setConnectionState('connecting')

    const handleMessage = (msg: any) => {
      if (msg.type === 'stream-url' && msg.channelKey === channelKey && msg.videoId === videoId) {
        setStreamUrl(msg.url)
        setConnectionState('buffering')
      } else if (msg.type === 'error' && msg.command === 'start-stream') {
        setConnectionState('error')
      }
    }

    window.qvacAPI.onP2PMessage(handleMessage)
    window.qvacAPI.getStreamUrl(channelKey, videoId)

    return () => {
      window.qvacAPI.removeP2PMessageListener()
    }
  }, [channelKey, videoId])

  const handleJoinChannel = async () => {
    if (!channelKey) return
    try {
      await window.qvacAPI.joinChannel(channelKey)
      setJoined(true)
    } catch (err) {
      console.error('Failed to join channel:', err)
    }
  }

  const displayTitle = activeVideo?.title || (channelKey ? `Stream from ${channelKey.slice(0, 8)}...` : 'Unknown Stream')
  const displayChannel = activeVideo?.channel || (channelKey ? `Channel ${channelKey.slice(0, 12)}...` : 'Unknown')

  return (
    <div className="mx-auto max-w-[1800px] p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5 group">
          {streamUrl ? (
            <video
              ref={videoRef}
              src={streamUrl}
              autoPlay
              controls
              className="w-full h-full object-contain"
              onCanPlay={() => setConnectionState('streaming')}
              onWaiting={() => setConnectionState('buffering')}
              onPlaying={() => setConnectionState('streaming')}
              onError={() => setConnectionState('error')}
            />
          ) : activeVideo ? (
            <>
              <img
                src={activeVideo.thumbnail}
                alt={activeVideo.title}
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                <div className="h-14 w-14 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <div className="text-center">
                  <h3 className="text-sm font-medium text-neutral-200">
                    Connecting to {activeVideo.channel}...
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 font-mono">
                    Channel ID: {activeVideo.id}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
              {connectionState === 'connecting' && (
                <>
                  <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                  <p className="text-sm text-neutral-300">Connecting to swarm peers...</p>
                  <p className="text-xs text-neutral-500 font-mono">{channelKey?.slice(0, 16)}...</p>
                </>
              )}
              {connectionState === 'buffering' && (
                <>
                  <Wifi className="h-10 w-10 text-indigo-400 animate-pulse" />
                  <p className="text-sm text-neutral-300">Buffering P2P stream...</p>
                </>
              )}
              {connectionState === 'error' && (
                <>
                  <p className="text-sm text-red-400">Failed to connect to stream</p>
                  <p className="text-xs text-neutral-500">The channel may be offline or the video unavailable.</p>
                </>
              )}
            </div>
          )}

          {/* Overlay controls for mock videos */}
          {activeVideo && !streamUrl && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4">
              <PlayCircle className="h-8 w-8 hover:text-indigo-400 cursor-pointer transition-colors" />
              <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                <div className="h-full bg-indigo-500 w-1/3" />
              </div>
            </div>
          )}

          {/* Connection status badge */}
          {streamUrl && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionState === 'streaming'
                    ? 'bg-emerald-500'
                    : connectionState === 'buffering'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-white font-medium capitalize">{connectionState}</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold text-[#F1F1F1] line-clamp-2 leading-tight">
            {displayTitle}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {activeVideo?.avatar ? (
                <img
                  src={activeVideo.avatar}
                  className="h-10 w-10 rounded-full border border-neutral-700 object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                  {displayChannel.charAt(0)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#F1F1F1]">{displayChannel}</span>
                <span className="text-xs text-[#AAAAAA]">
                  {activeVideo?.viewers || '0'} Viewers
                </span>
              </div>
              <button
                onClick={handleJoinChannel}
                disabled={joined || !channelKey}
                className={`ml-3 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  joined
                    ? 'bg-neutral-700 text-neutral-300 cursor-default'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {joined ? 'Joined' : 'Join Channel'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-r border-white/20">
                  <ThumbsUp className="h-4 w-4" />
                  <span>12K</span>
                </button>
                <button className="px-4 py-2">
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
              <button className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 hover:bg-white/20 transition-colors text-sm font-medium">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share Channel</span>
              </button>
              <button className="flex items-center justify-center bg-white/10 rounded-full w-9 h-9 hover:bg-white/20 transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-xl p-3 text-sm text-[#F1F1F1] mt-2 cursor-pointer">
          <div className="font-medium mb-1">
            {streamUrl
              ? 'Streaming • Bolt Network Protocol (P2P)'
              : activeVideo?.isLive
                ? 'Live • Streamed over Bolt Network Protocol'
                : `${activeVideo?.time || 'Just now'} • Bolt Network Protocol`}
          </div>
          <p className="line-clamp-2 text-[#AAAAAA]">
            This stream is hosted purely peer-to-peer via Bare runtime and Corestore. By watching,
            you are actively assisting in the distribution of the broadcast data to other network
            participants.
          </p>
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      <div className="w-full lg:w-[400px] xl:w-[420px] shrink-0">
        <div className="sticky top-0 h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-white/10 shadow-lg bg-[#0F0F0F] flex flex-col">
          <ChatInterface loading={modelLoading} channelKey={channelKey} />
        </div>
      </div>
    </div>
  )
}
