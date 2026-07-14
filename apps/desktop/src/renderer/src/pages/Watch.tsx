import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Loader2, Wifi, Download, CheckCircle2 } from 'lucide-react'
import { ChatInterface } from '../components/ChatInterface'

type ConnectionState = 'connecting' | 'buffering' | 'streaming' | 'error'
type DownloadState = 'idle' | 'downloading' | 'complete'

export function Watch({
  modelStatus,
  modelProgress,
  loadModel
}: {
  modelStatus: string
  modelProgress: number
  loadModel: () => void
}) {
  const { id } = useParams()
  const location = useLocation()
  const initialStream = location.state?.stream
  const [stream, setStream] = useState<any>(initialStream)
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [joined, setJoined] = useState(false)
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadBytesReceived, setDownloadBytesReceived] = useState(0)
  const [downloadTotalBytes, setDownloadTotalBytes] = useState(0)
  const [swarmCount, setSwarmCount] = useState<number>(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Parse compound ID (channelKey:videoId)
  const channelKey = id?.includes(':') ? id!.split(':')[0] : null
  const videoId = id?.includes(':') ? id!.split(':')[1] : null

  useEffect(() => {
    if (!channelKey || !videoId) return

    setConnectionState('connecting')

    const handleMessage = (msg: any) => {
      if (msg.type === 'stream-url' && msg.channelKey === channelKey && msg.videoId === videoId) {
        setStreamUrl(msg.url)
        setConnectionState('buffering')
      } else if (msg.type === 'error' && msg.command === 'start-stream') {
        setConnectionState('error')
        toast.error(`Failed to load stream: ${msg.message}`)
      } else if (msg.type === 'download-progress' && msg.channelKey === channelKey && msg.videoId === videoId) {
        setDownloadProgress(msg.percent)
        setDownloadBytesReceived(msg.bytesReceived || 0)
        setDownloadTotalBytes(msg.totalBytes || 0)
        setDownloadState('downloading')
      } else if (msg.type === 'download-complete' && msg.channelKey === channelKey && msg.videoId === videoId) {
        setDownloadState('complete')
        setDownloadProgress(100)
        toast.success('Download complete! Your node is now seeding this video.')
      } else if (msg.type === 'error' && msg.command === 'download-video') {
        setDownloadState('idle')
        toast.error(`Download failed: ${msg.message}`)
      } else if (msg.type === 'uploads-data' && msg.channel?.publicKey === channelKey) {
        const video = msg.channel.videos.find((v: any) => v.id === videoId)
        if (video) {
          setStream({
            ...video,
            channel: msg.channel.name,
            avatar: msg.channel.avatar
          })
        }
      }
    }

    const handleChannelEvent = (msg: any) => {
      if (msg.type === 'swarm-stats') setSwarmCount(msg.count)
    }

    window.qvacAPI.onP2PMessage(handleMessage)
    window.qvacAPI.onChannelEvent(handleChannelEvent)
    window.qvacAPI.getStreamUrl(channelKey, videoId)
    
    if (!stream && channelKey) {
      window.qvacAPI.getUploads(channelKey)
    }

    return () => {
      window.qvacAPI.removeP2PMessageListener()
      window.qvacAPI.removeChannelEventListener?.()
    }
  }, [channelKey, videoId])

  const handleJoinChannel = async () => {
    if (!channelKey) return
    try {
      await window.qvacAPI.joinChannel(channelKey)
      setJoined(true)
      toast.success('Successfully joined the channel!')
    } catch (err: any) {
      console.error('Failed to join channel:', err)
      toast.error(`Failed to join channel: ${err.message || 'Unknown error'}`)
    }
  }

  const handleDownloadAndSeed = async () => {
    if (!channelKey || !videoId || downloadState !== 'idle') return
    try {
      const result = await window.qvacAPI.downloadVideo(channelKey, videoId)
      if (result.canceled) return
      setDownloadState('downloading')
      setDownloadProgress(0)
      toast.info('Download started — your node will seed after completion.')
    } catch (err: any) {
      console.error('Download failed:', err)
      toast.error(`Could not start download: ${err.message || 'Unknown error'}`)
    }
  }

  const displayTitle = stream?.title || (channelKey ? `Stream from ${channelKey.slice(0, 8)}...` : 'Unknown Stream')
  const displayChannel = stream?.channel || (channelKey ? `Channel ${channelKey.slice(0, 12)}...` : 'Unknown')
  const displayAvatar = stream?.avatar || null

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
          
          {/* Game Stats */}
          {stream && (stream.videoType || stream.opponentId || stream.score) && (
            <div className="flex flex-wrap items-center gap-3">
              {stream.videoType && (
                <div className="bg-white/10 rounded-full px-3 py-1 text-xs font-medium text-[#F1F1F1]">
                  Match: {stream.videoType}
                </div>
              )}
              {stream.opponentId && (
                <div className="bg-white/10 rounded-full px-3 py-1 text-xs font-medium text-[#F1F1F1]">
                  Vs: {stream.opponentId}
                </div>
              )}
              {stream.score && (
                <div className="bg-white/10 rounded-full px-3 py-1 text-xs font-medium text-[#F1F1F1]">
                  Score: {stream.score}
                </div>
              )}
            </div>
          )}
          
          <div className="flex flex-wrap items-center justify-between gap-4 mt-1">
            <div className="flex items-center gap-3">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
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
                  0 Viewers • {swarmCount} Peers
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

              {/* Download & Seed — only for real P2P streams */}
              {channelKey && videoId && (
                <button
                  onClick={handleDownloadAndSeed}
                  disabled={downloadState !== 'idle'}
                  title="Download to disk and become a seeder for this video"
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    downloadState === 'complete'
                      ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                      : downloadState === 'downloading'
                        ? 'bg-indigo-500/20 text-indigo-400 cursor-default'
                        : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {downloadState === 'complete' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Seeding</span>
                    </>
                  ) : downloadState === 'downloading' ? (
                    <div className="flex flex-col items-center gap-1 min-w-[80px]">
                      <div className="w-full bg-indigo-900/50 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-400 h-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                      </div>
                      <span className="text-[10px] text-indigo-300 leading-none">
                        {downloadTotalBytes > 0 
                          ? `${(downloadBytesReceived / 1024 / 1024).toFixed(1)} / ${(downloadTotalBytes / 1024 / 1024).toFixed(1)} MB` 
                          : `${downloadProgress}%`}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Download & Seed</span>
                    </>
                  )}
                </button>
              )}

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
              : 'Connecting... • Bolt Network Protocol'}
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
          <ChatInterface
            key={videoId}
            modelStatus={modelStatus}
            modelProgress={modelProgress}
            loadModel={loadModel}
            channelKey={channelKey}
            currentVideoWorkspaceId={videoId ? `rag-${videoId}` : undefined}
            currentVideoTitle={stream?.title}
          />
        </div>
      </div>
    </div>
  )
}
