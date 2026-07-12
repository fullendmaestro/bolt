import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ChatInterface } from '../components/ChatInterface'
import { VideoPlayer, type ConnectionState } from '@/features/watch/VideoPlayer'
import { StreamMetadata, type DownloadState } from '@/features/watch/StreamMetadata'

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
  const stream = location.state?.stream

  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [joined, setJoined] = useState(false)
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadBytesReceived, setDownloadBytesReceived] = useState(0)
  const [downloadTotalBytes, setDownloadTotalBytes] = useState(0)
  const [swarmCount, setSwarmCount] = useState<number>(0)

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
      } else if (
        msg.type === 'download-progress' &&
        msg.channelKey === channelKey &&
        msg.videoId === videoId
      ) {
        setDownloadProgress(msg.percent)
        setDownloadBytesReceived(msg.bytesReceived || 0)
        setDownloadTotalBytes(msg.totalBytes || 0)
        setDownloadState('downloading')
      } else if (
        msg.type === 'download-complete' &&
        msg.channelKey === channelKey &&
        msg.videoId === videoId
      ) {
        setDownloadState('complete')
        setDownloadProgress(100)
        toast.success('Download complete! Your node is now seeding this video.')
      } else if (msg.type === 'error' && msg.command === 'download-video') {
        setDownloadState('idle')
        toast.error(`Download failed: ${msg.message}`)
      }
    }

    const handleChannelEvent = (msg: any) => {
      if (msg.type === 'swarm-stats') setSwarmCount(msg.count)
    }

    window.qvacAPI.onP2PMessage(handleMessage)
    window.qvacAPI.onChannelEvent(handleChannelEvent)
    window.qvacAPI.getStreamUrl(channelKey, videoId)

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

  return (
    <div className="mx-auto max-w-[1800px] p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <VideoPlayer
          streamUrl={streamUrl}
          connectionState={connectionState}
          channelKey={channelKey}
          onCanPlay={() => setConnectionState('streaming')}
          onWaiting={() => setConnectionState('buffering')}
          onPlaying={() => setConnectionState('streaming')}
          onError={() => setConnectionState('error')}
        />

        <StreamMetadata
          stream={stream}
          channelKey={channelKey}
          videoId={videoId}
          streamUrl={streamUrl}
          joined={joined}
          swarmCount={swarmCount}
          downloadState={downloadState}
          downloadProgress={downloadProgress}
          downloadBytesReceived={downloadBytesReceived}
          downloadTotalBytes={downloadTotalBytes}
          onJoinChannel={handleJoinChannel}
          onDownloadAndSeed={handleDownloadAndSeed}
        />
      </div>

      {/* AI Assistant Sidebar */}
      <div className="w-full lg:w-100 xl:w-105 shrink-0">
        <div className="sticky top-0 h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-white/10 shadow-lg bg-[#0F0F0F] flex flex-col">
          <ChatInterface
            modelStatus={modelStatus}
            modelProgress={modelProgress}
            loadModel={loadModel}
            channelKey={channelKey}
            currentVideoWorkspaceId={videoId ? `rag-${videoId}` : undefined}
          />
        </div>
      </div>
    </div>
  )
}
