import { Radio, ImagePlus, FileVideo } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export interface Stream {
  id: string
  title: string
  channel: string
  viewers: string
  isLive: boolean
  thumbnail: string
  avatar: string
  time?: string
  duration?: string
}

export function VideoCard({ stream }: { stream: Stream }) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  return (
    <div
      className="flex flex-col gap-3 group cursor-pointer"
      onClick={() => navigate(`/watch/${stream.id}`, { state: { stream } })}
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-white/5">
        {!imgError ? (
          <img
            src={stream.thumbnail}
            alt={stream.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-500 group-hover:scale-105 transition-transform duration-300">
            <FileVideo className="w-8 h-8" />
          </div>
        )}
        {stream.isLive ? (
          <div className="absolute bottom-2 right-2 bg-red-600 px-1.5 py-0.5 rounded text-xs font-semibold tracking-wider flex items-center gap-1">
            <Radio className="h-3 w-3" /> LIVE
          </div>
        ) : (
          <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs font-medium">
            {stream.duration}
          </div>
        )}
      </div>
      <div className="flex gap-3 items-start">
        {!avatarError ? (
          <img
            src={stream.avatar}
            alt={stream.channel}
            onError={() => setAvatarError(true)}
            className="w-9 h-9 rounded-full object-cover mt-0.5 border border-neutral-800"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center mt-0.5 border border-neutral-800 text-neutral-500 shrink-0">
            <ImagePlus className="w-4 h-4" />
          </div>
        )}
        <div className="flex flex-col overflow-hidden">
          <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-indigo-400 transition-colors leading-tight">
            {stream.title}
          </h3>
          <span className="text-sm text-neutral-400 mt-1 hover:text-white transition-colors">
            {stream.channel}
          </span>
          <div className="text-sm text-neutral-400 flex items-center gap-1">
            <span>{stream.viewers} viewers</span>
            {stream.time && (
              <>
                <span className="text-[10px]">•</span>
                <span>{stream.time}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
