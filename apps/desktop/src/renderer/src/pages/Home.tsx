import { useState, useEffect, useCallback } from 'react'
import { VideoCard } from '../components/VideoCard'
import { Plus, Loader2, Radio } from 'lucide-react'
import type { FeedItem } from '../../../shared/types'

const CATEGORIES = [
  'All',
  'Live Now',
  'Premier League',
  'Champions League',
  'Formula 1',
  'NBA',
  'NFL',
  'UFC',
  'Highlights'
]

export function Home() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [channelKeyInput, setChannelKeyInput] = useState('')
  const [joining, setJoining] = useState(false)

  // Convert P2P feed items to the Stream format used by VideoCard
  const feedStreams = feedItems.map((item) => ({
    id: item.channelKey + ':' + item.video.id,
    title: item.video.title,
    channel: item.channelName,
    viewers: '0',
    isLive: item.video.isLive,
    thumbnail: item.video.thumbnailPath || '',
    avatar: item.channelAvatar || '',
    time: new Date(item.video.timestamp).toLocaleDateString(),
    duration: item.video.duration,
    // Store routing info
    channelKey: item.channelKey,
    videoId: item.video.id
  }))

  const loadFeed = useCallback(() => {
    setLoading(true)

    // Listen for the feed response
    const handleMessage = (msg: any) => {
      if (msg.type === 'feed-data') {
        setFeedItems(msg.items || [])
        setLoading(false)
      } else if (msg.type === 'error' && msg.command === 'get-feed') {
        console.error('Failed to get feed:', msg.message)
        setLoading(false)
      }
    }

    window.qvacAPI.onP2PMessage(handleMessage)
    window.qvacAPI.getFeed()

    return () => {
      window.qvacAPI.removeP2PMessageListener()
    }
  }, [])

  useEffect(() => {
    const cleanup = loadFeed()
    return cleanup
  }, [loadFeed])

  const handleJoinChannel = async () => {
    if (!channelKeyInput.trim()) return
    setJoining(true)
    try {
      await window.qvacAPI.joinChannel(channelKeyInput.trim())
      setChannelKeyInput('')
      setJoinDialogOpen(false)
      // Refresh the feed after a short delay for sync
      setTimeout(loadFeed, 2000)
    } catch (err) {
      console.error('Failed to join channel:', err)
    } finally {
      setJoining(false)
    }
  }

  const displayStreams = feedStreams

  return (
    <div className="max-w-[2400px] mx-auto pb-10">
      {/* Category Bar + Join Channel Button */}
      <div className="sticky top-0 z-20 bg-[#0F0F0F]/95 backdrop-blur-sm py-3 px-4 md:px-6 border-b border-neutral-900/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 flex-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => setJoinDialogOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors text-sm font-medium whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Join Channel
          </button>
        </div>
      </div>

      {/* Join Channel Dialog */}
      {joinDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Join a P2P Channel</h3>
            <p className="text-sm text-neutral-400 mb-4">
              Paste the hex public key of the channel you want to subscribe to.
            </p>
            <input
              type="text"
              value={channelKeyInput}
              onChange={(e) => setChannelKeyInput(e.target.value)}
              placeholder="e.g. a1b2c3d4e5f6..."
              className="w-full px-4 py-3 bg-[#0F0F0F] border border-neutral-700 rounded-xl text-sm text-white placeholder:text-neutral-500 outline-none focus:border-indigo-500/50 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinChannel()}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setJoinDialogOpen(false)
                  setChannelKeyInput('')
                }}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinChannel}
                disabled={joining || !channelKeyInput.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
              >
                {joining && <Loader2 className="h-4 w-4 animate-spin" />}
                Join & Subscribe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-sm text-neutral-400">Syncing feed from the swarm...</p>
        </div>
      ) : displayStreams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Radio className="h-12 w-12 text-neutral-600" />
          <h3 className="text-lg font-medium text-neutral-300">No channels yet</h3>
          <p className="text-sm text-neutral-500 max-w-md">
            Join a channel to start watching decentralized sports streams, or go to the Studio to
            create your own channel.
          </p>
        </div>
      ) : (
        <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10">
          {displayStreams.map((stream) => (
            <VideoCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}
    </div>
  )
}
