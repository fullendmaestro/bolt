import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Download, CheckCircle2 } from 'lucide-react'

export type DownloadState = 'idle' | 'downloading' | 'complete'

interface StreamMetadataProps {
  stream?: {
    title?: string
    channel?: string
    avatar?: string | null
  } | null
  channelKey: string | null
  videoId: string | null
  streamUrl: string | null
  joined: boolean
  swarmCount: number
  downloadState: DownloadState
  downloadProgress: number
  downloadBytesReceived: number
  downloadTotalBytes: number
  onJoinChannel: () => void
  onDownloadAndSeed: () => void
}

export function StreamMetadata({
  stream,
  channelKey,
  videoId,
  streamUrl,
  joined,
  swarmCount,
  downloadState,
  downloadProgress,
  downloadBytesReceived,
  downloadTotalBytes,
  onJoinChannel,
  onDownloadAndSeed,
}: StreamMetadataProps) {
  const displayTitle = stream?.title || (channelKey ? `Stream from ${channelKey.slice(0, 8)}...` : 'Unknown Stream')
  const displayChannel = stream?.channel || (channelKey ? `Channel ${channelKey.slice(0, 12)}...` : 'Unknown')
  const displayAvatar = stream?.avatar || null

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-[#F1F1F1] line-clamp-2 leading-tight">{displayTitle}</h1>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {displayAvatar ? (
            <img src={displayAvatar} className="h-10 w-10 rounded-full border border-neutral-700 object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold">
              {displayChannel.charAt(0)}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#F1F1F1]">{displayChannel}</span>
            <span className="text-xs text-[#AAAAAA]">0 Viewers • {swarmCount} Peers</span>
          </div>
          <button
            onClick={onJoinChannel}
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

          {channelKey && videoId && (
            <button
              onClick={onDownloadAndSeed}
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

      <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-xl p-3 text-sm text-[#F1F1F1] mt-2 cursor-pointer">
        <div className="font-medium mb-1">
          {streamUrl ? 'Streaming • Bolt Network Protocol (P2P)' : 'Connecting... • Bolt Network Protocol'}
        </div>
        <p className="line-clamp-2 text-[#AAAAAA]">
          This stream is hosted purely peer-to-peer via Bare runtime and Corestore. By watching,
          you are actively assisting in the distribution of the broadcast data to other network
          participants.
        </p>
      </div>
    </div>
  )
}