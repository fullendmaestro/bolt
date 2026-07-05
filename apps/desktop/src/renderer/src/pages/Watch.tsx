import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, PlayCircle } from 'lucide-react'
import { MOCK_STREAMS } from '../lib/data'
import { ChatInterface } from '../components/ChatInterface'

export function Watch({ modelLoading }: { modelLoading: boolean }) {
  const { id } = useParams()
  const activeVideo = MOCK_STREAMS.find((v) => v.id === id)

  useEffect(() => {
    if (id) {
      window.qvacAPI
        .sendP2PCommand({ type: 'join-sports-channel', roomId: id })
        .catch(console.error)
    }
  }, [id])

  if (!activeVideo) return <div className="p-10 text-center text-white">Stream not found.</div>

  return (
    <div className="mx-auto max-w-[1800px] p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5 group">
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
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4">
            <PlayCircle className="h-8 w-8 hover:text-indigo-400 cursor-pointer transition-colors" />
            <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden cursor-pointer">
              <div className="h-full bg-indigo-500 w-1/3" />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold text-[#F1F1F1] line-clamp-2 leading-tight">
            {activeVideo.title}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={activeVideo.avatar}
                className="h-10 w-10 rounded-full border border-neutral-700 object-cover"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#F1F1F1]">{activeVideo.channel}</span>
                <span className="text-xs text-[#AAAAAA]">{activeVideo.viewers} Viewers</span>
              </div>
              <button className="ml-3 rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 transition-colors">
                Join Channel
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
            {activeVideo.isLive
              ? 'Live • Streamed over Bolt Network Protocol'
              : `${activeVideo.time} • Bolt Network Protocol`}
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
          <ChatInterface loading={modelLoading} />
        </div>
      </div>
    </div>
  )
}
