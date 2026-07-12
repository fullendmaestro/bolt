import { Loader2, Wifi } from 'lucide-react'

export type ConnectionState = 'connecting' | 'buffering' | 'streaming' | 'error'

interface VideoPlayerProps {
  streamUrl: string | null
  connectionState: ConnectionState
  channelKey: string | null
  onCanPlay: () => void
  onWaiting: () => void
  onPlaying: () => void
  onError: () => void
}

export function VideoPlayer({
  streamUrl,
  connectionState,
  channelKey,
  onCanPlay,
  onWaiting,
  onPlaying,
  onError
}: VideoPlayerProps) {
  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5 group">
      {streamUrl ? (
        <video
          src={streamUrl}
          autoPlay
          controls
          className="w-full h-full object-contain"
          onCanPlay={onCanPlay}
          onWaiting={onWaiting}
          onPlaying={onPlaying}
          onError={onError}
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
              <p className="text-xs text-neutral-500">
                The channel may be offline or the video unavailable.
              </p>
            </>
          )}
        </div>
      )}

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
  )
}
