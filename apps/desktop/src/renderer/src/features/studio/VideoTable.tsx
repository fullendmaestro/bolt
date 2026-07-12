import { MoreVertical, FileVideo, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { VideoEntry } from '../../../../shared/types'

interface VideoTableProps {
  uploads: VideoEntry[]
  loading: boolean
}

export function VideoTable({ uploads, loading }: VideoTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-white">Channel Content</h2>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        </div>
      ) : uploads.length === 0 ? (
        <div className="bg-[#121212] border border-neutral-800 rounded-xl p-10 text-center">
          <p className="text-sm text-neutral-500">No uploads found in this channel.</p>
        </div>
      ) : (
        <div className="bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <div className="col-span-6 md:col-span-5">Video</div>
            <div className="col-span-3 hidden md:block">Visibility</div>
            <div className="col-span-3 md:col-span-2 text-right">Size</div>
            <div className="col-span-3 md:col-span-2 text-right">Published</div>
          </div>

          <div className="flex flex-col divide-y divide-neutral-800/50">
            {uploads.map((video) => (
              <div
                key={video.id}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group"
              >
                <div className="col-span-6 md:col-span-5 flex gap-4 items-center">
                  <div className="relative h-16 w-28 rounded-lg overflow-hidden shrink-0 bg-neutral-900 flex items-center justify-center">
                    {video.thumbnailPath ? (
                      <img
                        src={video.thumbnailPath}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileVideo className="h-6 w-6 text-neutral-600" />
                    )}
                    {video.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] font-medium text-white">
                        {video.duration}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-white truncate">{video.title}</span>
                    <span className="text-xs text-neutral-500 mt-1 line-clamp-1 font-mono">
                      {video.id}
                    </span>
                  </div>
                </div>

                <div className="col-span-3 hidden md:flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-neutral-300">Public (Seeding)</span>
                </div>

                <div className="col-span-3 md:col-span-2 text-right text-sm text-neutral-300">
                  {(video.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                </div>

                <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-4">
                  <span className="text-sm text-neutral-400">
                    {new Date(video.timestamp).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-800 hover:text-white text-neutral-400"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
