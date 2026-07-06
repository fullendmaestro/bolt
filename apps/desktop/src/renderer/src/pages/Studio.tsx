import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  UploadCloud,
  BarChart,
  Settings,
  MoreVertical,
  Loader2,
  Copy,
  Check,
  FileVideo,
  ImagePlus,
  X,
} from 'lucide-react'
import type { ChannelMetadata, VideoEntry } from '../../../shared/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ── Studio Page ────────────────────────────────────────────
export function Studio() {
  const [uploading, setUploading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [channelData, setChannelData] = useState<ChannelMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [initializing, setInitializing] = useState(false)
  
  // Dialog state
  const [showInitModal, setShowInitModal] = useState(false)
  const [channelName, setChannelName] = useState('')
  const [channelDesc, setChannelDesc] = useState('')
  const [initError, setInitError] = useState<string | null>(null)
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Upload state
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  // Set up a persistent, global P2P message listener for the lifetime of this page
  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === 'uploads-data') {
        setChannelData(msg.channel || null)
        setLoading(false)
      } else if (msg.type === 'upload-complete') {
        setChannelData((prev) => {
          if (!prev) return prev
          return { ...prev, videos: [msg.video, ...prev.videos] }
        })
        setUploading(false)
        setUploadTitle('')
        toast.success('Video uploaded successfully!')
      } else if (msg.type === 'channel-initialized') {
        setInitializing(false)
        setShowInitModal(false)
        setInitError(null)
        toast.success('Channel created successfully!')
        // Refresh channel data now that init is done
        window.qvacAPI.getUploads()
      } else if (msg.type === 'error') {
        if (msg.command === 'upload-video') {
          console.error('Upload error:', msg.message)
          toast.error(`Upload failed: ${msg.message}`)
          setUploading(false)
        } else if (msg.command === 'init-channel') {
          console.error('Channel init error:', msg.message)
          setInitError(msg.message || 'Unknown error occurred')
          toast.error(`Channel initialization failed: ${msg.message}`)
          setInitializing(false)
        }
      }
    }

    window.qvacAPI.onP2PMessage(handleMessage)

    // Kick off initial data load
    setLoading(true)
    window.qvacAPI.getUploads()
    const timeout = setTimeout(() => setLoading(false), 5000)

    return () => {
      clearTimeout(timeout)
      window.qvacAPI.removeP2PMessageListener()
    }
  }, [])

  const handleInitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelName.trim()) return

    setInitializing(true)
    setInitError(null)
    try {
      await window.qvacAPI.initChannel(channelName.trim(), channelDesc.trim(), avatarPath || undefined)
      // `channel-initialized` worker message will finalize state and close modal
    } catch (err: any) {
      console.error('Failed to init channel:', err)
      setInitError(err.message || 'Failed to initialize channel')
      setInitializing(false)
    }
  }

  const handleSelectAvatar = async () => {
    try {
      const result = await window.qvacAPI.selectAvatar()
      if (!result.canceled && result.filePath) {
        setAvatarPath(result.filePath)
        // Create an object URL for preview using fetch (Electron allows file:// in preload context)
        setAvatarPreview('file://' + result.filePath)
      }
    } catch (err) {
      console.error('Avatar selection failed:', err)
    }
  }

  const handleSelectThumbnail = async () => {
    try {
      const result = await window.qvacAPI.selectThumbnail()
      if (!result.canceled && result.filePath) {
        setThumbnailPath(result.filePath)
        setThumbnailPreview('file://' + result.filePath)
      }
    } catch (err) {
      console.error('Thumbnail selection failed:', err)
    }
  }

  const handleSelectAndUpload = async () => {
    setUploading(true)
    try {
      const result = await window.qvacAPI.selectAndUploadVideo(
        uploadTitle || 'Untitled Upload',
        thumbnailPath || undefined
      )
      if (result.canceled) {
        setUploading(false)
      } else {
        // Reset thumbnail after initiating upload
        setThumbnailPath(null)
        setThumbnailPreview(null)
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
      {/* Shadcn Channel Init Dialog */}
      <Dialog open={showInitModal} onOpenChange={setShowInitModal}>
        <DialogContent className="sm:max-w-[425px] bg-[#1a1a1a] border-neutral-800 text-white">
          <form onSubmit={handleInitSubmit}>
            <DialogHeader>
              <DialogTitle>Create Your Channel</DialogTitle>
              <DialogDescription className="text-neutral-400">
                This will generate a unique cryptographic keypair on the Holepunch network. Your
                channel key will be displayed after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {initError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-2">
                  {initError}
                </div>
              )}

              {/* Avatar Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase">Channel Avatar</label>
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 rounded-full bg-neutral-800 border-2 border-dashed border-neutral-700 overflow-hidden flex items-center justify-center shrink-0">
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setAvatarPath(null); setAvatarPreview(null) }}
                          className="absolute top-0 right-0 bg-black/70 rounded-full p-0.5 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <ImagePlus className="h-5 w-5 text-neutral-600" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSelectAvatar}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white border-none text-xs"
                  >
                    {avatarPreview ? 'Change Image' : 'Select Image'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-xs font-semibold text-neutral-400 uppercase">
                  Channel Name <span className="text-red-400">*</span>
                </label>
                <Input
                  id="name"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g. My Sports Node"
                  className="bg-[#0F0F0F] border-neutral-700 text-white focus-visible:ring-indigo-500"
                  maxLength={64}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="desc" className="text-xs font-semibold text-neutral-400 uppercase">
                  Description
                </label>
                <Textarea
                  id="desc"
                  value={channelDesc}
                  onChange={(e) => setChannelDesc(e.target.value)}
                  placeholder="What's this channel about?"
                  className="bg-[#0F0F0F] border-neutral-700 text-white focus-visible:ring-indigo-500 resize-none"
                  rows={3}
                  maxLength={256}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowInitModal(false)}
                className="hover:bg-neutral-800 hover:text-white text-neutral-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!channelName.trim() || initializing}
                className="bg-white text-black hover:bg-neutral-200 disabled:opacity-50"
              >
                {initializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initializing ? 'Creating...' : 'Create Channel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Channel Studio</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage your local node broadcasts and decentralized uploads.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="bg-neutral-800 hover:bg-neutral-700 text-white border-none">
            <BarChart className="mr-2 h-4 w-4" />
            Node Analytics
          </Button>
          <Button variant="secondary" className="bg-neutral-800 hover:bg-neutral-700 text-white border-none">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Channel Key Display */}
      {channelData?.publicKey && (
        <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider font-semibold">
              Your Channel Public Key
            </p>
            <p className="text-sm text-indigo-400 font-mono truncate">{channelData.publicKey}</p>
            <p className="text-xs text-neutral-500 mt-1">
              Share this key with others so they can subscribe to your channel.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleCopyKey}
            className="bg-neutral-800 hover:bg-neutral-700 text-white border-none shrink-0"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </>
            )}
          </Button>
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
          <Button
            onClick={() => setShowInitModal(true)}
            disabled={initializing}
            className="bg-white text-black hover:bg-neutral-200 rounded-full px-6 py-5 text-sm font-semibold"
          >
            {initializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initializing ? 'Creating Channel...' : 'Create Channel'}
          </Button>
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
            <Input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Video title..."
              className="bg-[#0F0F0F] border-neutral-700 text-white focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>

          {/* Thumbnail picker */}
          <div className="flex items-center gap-3 mb-4">
            {thumbnailPreview ? (
              <div className="relative h-12 w-20 rounded-lg overflow-hidden shrink-0">
                <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setThumbnailPath(null); setThumbnailPreview(null) }}
                  className="absolute top-0 right-0 bg-black/70 rounded-full p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={handleSelectThumbnail}
              className="bg-neutral-800 hover:bg-neutral-700 text-white border-none text-xs"
            >
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              {thumbnailPreview ? 'Change Thumbnail' : 'Add Thumbnail'}
            </Button>
          </div>

          <Button
            onClick={handleSelectAndUpload}
            disabled={uploading}
            className="bg-white text-black hover:bg-neutral-200 rounded-full px-6 py-5 text-sm font-semibold"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Select Files to Seed'
            )}
          </Button>
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
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-800 hover:text-white text-neutral-400">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
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
