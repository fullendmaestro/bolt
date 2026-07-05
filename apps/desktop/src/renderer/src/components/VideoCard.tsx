import { Radio } from 'lucide-react'
import { Stream } from '../lib/data'
import { useNavigate } from 'react-router-dom'

export function VideoCard({ stream }: { stream: Stream }) {
  const navigate = useNavigate()

  return (
    <div
      className="flex flex-col gap-3 group cursor-pointer"
      onClick={() => navigate(`/watch/${stream.id}`)}
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-white/5">
        <img
          src={stream.thumbnail}
          alt={stream.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
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
        <img
          src={stream.avatar}
          alt={stream.channel}
          className="w-9 h-9 rounded-full object-cover mt-0.5 border border-neutral-800"
        />
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
