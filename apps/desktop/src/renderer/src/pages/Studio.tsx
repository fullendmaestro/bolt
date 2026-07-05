import { useState, useEffect, useCallback } from 'react'
import {
  UploadCloud,
  BarChart,
  Settings,
  MoreVertical,
  Loader2,
  Copy,
  Check,
  FileVideo
} from 'lucide-react'
import type { ChannelMetadata, VideoEntry } from '../../../shared/types'

export function Studio() {
  const [uploading, setUploading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [channelData, setChannelData] = useState<ChannelMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [initializing, setInitializing] = useState(false)

  const loadUploads = useCallback(() => {
    setLoading(true)

    const handleMessage = (msg: any) => {
      if (msg.type === 'uploads-data') {
        setChannelData(msg.channel || null)
        setLoading(false)
      } else if (msg.type === 'upload-complete') {
        // Append the new upload to the existing channel data
        setChannelData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            videos: [msg.video, ...prev.videos]
          }
        })
        setUploading(false)
        setUploadTitle('')
      } else if (msg.type === 'channel-initialized') {
        // Refresh uploads after channel init
        setInitializing(false)
        window.qvacAPI.getUploads()
      } else if (msg.type === 'error' && msg.command === 'upload-video') {
        console.error('Upload error:', msg.message)
        setUploading(false)
      }
    }

    window.qvacAPI.onP2PMessage(handleMessage)
    window.qvacAPI.getUploads()

    const timeout = setTimeout(() => setLoading(false), 5000)

    return () => {
      clearTimeout(timeout)
      window.qvacAPI.removeP2PMessageListener()
    }
  }, [])

  useEffect(() => {
    const cleanup = loadUploads()
    return cleanup
  }, [loadUploads])

  const handleInitChannel = async () => {
    setInitializing(true)
    try {
      await window.qvacAPI.initChannel('My Bolt Node', 'Personal sports channel')
    } catch (err) {
      console.error('Failed to init channel:', err)
      setInitializing(false)
    }
  }

  const handleSelectAndUpload = async () => {
    setUploading(true)
    try {
      const result = await window.qvacAPI.selectAndUploadVideo(uploadTitle || 'Untitled Upload')
      if (result.canceled) {
        setUploading(false)
      }
      // Upload progress will come via worker messages
    } catch (err) {
      console.error('Upload failed:', err)
      setUploading(false)
    }
  }

  const handleCopyKey = () => {
    if (channelData?.publicKey) {
      navigator.clipboard.writeText(channelData.publicKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const uploads: VideoEntry[] = channelData?.videos || []

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 flex flex-col gap-8">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Channel Studio</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage your local node broadcasts and decentralized uploads.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm font-medium">
            <BarChart className="h-4 w-4" />
            Node Analytics
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm font-medium">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Channel Key Display */}
      {channelData?.publicKey && (
        <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider font-semibold">
              Your Channel Public Key
            </p>
            <p className="text-sm text-indigo-400 font-mono truncate">
              {channelData.publicKey}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Share this key with others so they can subscribe to your channel.
            </p>
          </div>
          <button
            onClick={handleCopyKey}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm font-medium shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        </div>
      )}

      {/* Channel Init (if no channel yet) */}
      {!channelData && !loading && (
        <div className="border-2 border-dashed border-neutral-800 rounded-2xl bg-[#121212] p-10 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <FileVideo className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Initialize Your Channel</h3>
          <p className="text-sm text-neutral-400 max-w-md mb-6">
            Create your persistent P2P channel. This generates a unique cryptographic keypair that
            represents your channel on the Holepunch network.
          </p>
          <button
            onClick={handleInitChannel}
            disabled={initializing}
            className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {initializing && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Channel
          </button>
        </div>
      )}

      {/* Upload / Broadcast Action Area */}
      {channelData && (
        <div className="border-2 border-dashed border-neutral-800 rounded-2xl bg-[#121212] p-10 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 transition-colors group">
          <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Upload Video or Start Broadcast</h3>
          <p className="text-sm text-neutral-400 max-w-md mb-4">
            Files are added to your local corestore and seeded across the Holepunch network. You
            remain the sole owner of your data.
          </p>

          <div className="flex items-center gap-3 mb-4 w-full max-w-sm">
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Video title..."
              className="flex-1 px-4 py-2.5 bg-[#0F0F0F] border border-neutral-700 rounded-xl text-sm text-white placeholder:text-neutral-500 outline-none focus:border-indigo-500/50"
            />
          </div>

          <button
            onClick={handleSelectAndUpload}
            disabled={uploading}
            className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Select Files to Seed'
            )}
          </button>
        </div>
      )}

      {/* Uploads List */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Your Node Content</h2>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="bg-[#121212] border border-neutral-800 rounded-xl p-10 text-center">
            <p className="text-sm text-neutral-500">
              No uploads yet. Select a video file to start seeding.
            </p>
          </div>
        ) : (
          <div className="bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              <div className="col-span-6 md:col-span-5">Video</div>
              <div className="col-span-3 hidden md:block">Visibility</div>
              <div className="col-span-3 md:col-span-2 text-right">Size</div>
              <div className="col-span-3 md:col-span-2 text-right">Published</div>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col divide-y divide-neutral-800/50">
              {uploads.map((video) => (
                <div
                  key={video.id}
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group"
                >
                  <div className="col-span-6 md:col-span-5 flex gap-4 items-center">
                    <div className="relative h-16 w-28 rounded-lg overflow-hidden shrink-0 bg-neutral-900 flex items-center justify-center">
                      <FileVideo className="h-6 w-6 text-neutral-600" />
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
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-neutral-800 rounded-md">
                      <MoreVertical className="h-4 w-4 text-neutral-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
