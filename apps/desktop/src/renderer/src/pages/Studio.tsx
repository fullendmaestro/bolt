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
  FileText,
  X,
  Plus,
  Trash2,
} from 'lucide-react'
import type { ChannelMetadata, VideoEntry, VideoTimelineEvent } from '../../../shared/types'
import { VIDEO_TYPES } from '../../../shared/constants'
import { footballTeams } from '../lib/const'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Studio Page ────────────────────────────────────────────
export function Studio() {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadBytesReceived, setUploadBytesReceived] = useState(0)
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0)
  const [uploadTitle, setUploadTitle] = useState('')
  const [channelData, setChannelData] = useState<ChannelMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [initializing, setInitializing] = useState(false)

  // Channels List State
  const [channelsList, setChannelsList] = useState<{ owned: any[], joined: any[] }>({ owned: [], joined: [] })
  const [activeChannelKey, setActiveChannelKey] = useState<string | null>(null)

  // Dialog state
  const [showInitModal, setShowInitModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false) // <-- New Upload Modal State
  const [channelName, setChannelName] = useState('')
  const [channelDesc, setChannelDesc] = useState('')
  const [initError, setInitError] = useState<string | null>(null)
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Upload state
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  
  // Wizard state
  const [uploadStep, setUploadStep] = useState<1 | 2>(1)
  
  // New metadata fields
  const [videoType, setVideoType] = useState<string>(VIDEO_TYPES.FULL_TOURNAMENT)
  const [homeTeam, setHomeTeam] = useState<string>('')
  const [awayTeam, setAwayTeam] = useState<string>('')
  const [homeScore, setHomeScore] = useState<string>('')
  const [awayScore, setAwayScore] = useState<string>('')
  const [tournamentName, setTournamentName] = useState<string>('')
  const [matchDate, setMatchDate] = useState<string>('')
  const [transcriptPath, setTranscriptPath] = useState<string | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<VideoTimelineEvent[]>([])

  const fetchChannelsList = async (selectKey?: string) => {
    try {
      const list = await window.qvacAPI.getChannels()
      setChannelsList(list)

      let keyToSelect = selectKey || activeChannelKey
      if (!keyToSelect) {
        if (list.owned.length > 0) keyToSelect = list.owned[list.owned.length - 1].publicKey
        else if (list.joined.length > 0) keyToSelect = list.joined[list.joined.length - 1].publicKey
      }

      if (keyToSelect) {
        handleSelectChannel(keyToSelect)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err)
      setLoading(false)
    }
  }

  const handleSelectChannel = (key: string) => {
    setActiveChannelKey(key)
    setLoading(true)
    window.qvacAPI.getUploads(key)
  }

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
        setUploadProgress(0)
        setUploadBytesReceived(0)
        setUploadTotalBytes(0)
        setUploadTitle('')
        setShowUploadModal(false) // Close modal on success
        toast.success('Video uploaded successfully!')
      } else if (msg.type === 'upload-progress') {
        setUploadProgress(msg.percent)
        setUploadBytesReceived(msg.bytesReceived || 0)
        setUploadTotalBytes(msg.totalBytes || 0)
      } else if (msg.type === 'channel-initialized') {
        setInitializing(false)
        setShowInitModal(false)
        setInitError(null)
        toast.success('Channel created successfully!')
        // Refresh channels list and select new channel
        fetchChannelsList(msg.publicKey)
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
    fetchChannelsList()

    return () => {
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
        setAvatarPreview('local-asset://' + encodeURIComponent(result.filePath))
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
        setThumbnailPreview('local-asset://' + encodeURIComponent(result.filePath))
      }
    } catch (err) {
      console.error('Thumbnail selection failed:', err)
    }
  }

  const handleSelectTranscript = async () => {
    try {
      const result = await window.qvacAPI.selectTranscript()
      if (!result.canceled && result.filePath) {
        setTranscriptPath(result.filePath)
        toast.success('Transcript selected — Parakeet will be skipped')
      }
    } catch (err) {
      console.error('Transcript selection failed:', err)
    }
  }

  const addTimelineEvent = () =>
    setTimelineEvents(prev => [...prev, { label: '', timestamp: '', videoTimeSecs: 0 }])

  const removeTimelineEvent = (i: number) =>
    setTimelineEvents(prev => prev.filter((_, idx) => idx !== i))

  const updateTimelineEvent = (i: number, field: keyof VideoTimelineEvent, value: string | number) =>
    setTimelineEvents(prev => prev.map((evt, idx) => idx === i ? { ...evt, [field]: value } : evt))

  const handleSelectAndUpload = async () => {
    setUploading(true)
    try {
      const result = await window.qvacAPI.selectAndUploadVideo({
        title: uploadTitle || 'Untitled Upload',
        thumbnailPath: thumbnailPath || undefined,
        videoType,
        homeTeam: homeTeam || undefined,
        awayTeam: awayTeam || undefined,
        homeScore: homeScore || undefined,
        awayScore: awayScore || undefined,
        tournamentName: tournamentName || undefined,
        matchDate: matchDate || undefined,
        transcriptPath: transcriptPath || undefined,
        eventsJson: timelineEvents.length > 0 ? JSON.stringify(timelineEvents) : undefined,
      })
      if (result.canceled) {
        setUploading(false)
      } else {
        // Reset metadata after initiating upload
        setThumbnailPath(null)
        setThumbnailPreview(null)
        setTranscriptPath(null)
        setTimelineEvents([])
        setHomeTeam('')
        setAwayTeam('')
        setHomeScore('')
        setAwayScore('')
        setTournamentName('')
        setMatchDate('')
        setUploadStep(1)
      }
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
  const isCurrentChannelOwned = channelsList.owned.some(c => c.publicKey === activeChannelKey)

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 flex gap-8 items-start">
      {/* ── Modals ── */}

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

      {/* Upload Video Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => {
        if (uploading && !open) {
          toast.error('Please wait for the upload to finish.')
          return
        }
        setShowUploadModal(open)
      }}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-neutral-800 text-white p-0">
          <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
            <DialogTitle className="text-xl">Seed New Video</DialogTitle>
          </div>

          <div className="px-6 py-4">
            {/* Steps indicator */}
            <div className="flex bg-neutral-900 rounded-lg overflow-hidden mb-6 text-sm font-medium">
              <button
                onClick={() => setUploadStep(1)}
                className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 relative ${uploadStep === 1 ? 'text-white' : 'text-neutral-400'}`}
              >
                1. Media {uploadStep === 2 && <Check className="h-4 w-4 text-emerald-400" />}
                {uploadStep === 1 && (
                  <div className="absolute top-0 bottom-0 right-0 w-4 bg-indigo-500 clip-arrow-right"></div>
                )}
              </button>
              <button
                onClick={() => setUploadStep(2)}
                className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 ${uploadStep === 2 ? 'bg-indigo-500 text-white' : 'text-neutral-500'}`}
              >
                2. Match Stats
              </button>
            </div>

            {uploadStep === 1 ? (
              <div className="grid gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase">Video Title</label>
                  <Input
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Match Highlights vs Arsenal"
                    className="bg-[#0F0F0F] border-neutral-700 text-white focus-visible:ring-indigo-500 rounded-lg"
                    disabled={uploading}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase">Thumbnail</label>
                  <div className="flex items-center gap-3">
                    {thumbnailPreview ? (
                      <div className="relative h-16 w-28 rounded-lg overflow-hidden shrink-0 border border-neutral-700 bg-black">
                        <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                        {!uploading && (
                          <button onClick={() => { setThumbnailPath(null); setThumbnailPreview(null) }} className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white hover:bg-black">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="h-16 w-28 rounded-lg border-2 border-dashed border-neutral-700 bg-[#0F0F0F] flex items-center justify-center shrink-0">
                        <ImagePlus className="h-5 w-5 text-neutral-600" />
                      </div>
                    )}
                    <Button type="button" variant="secondary" onClick={handleSelectThumbnail} disabled={uploading} className="bg-neutral-800 hover:bg-neutral-700 text-white border-none text-xs">
                      {thumbnailPreview ? 'Change' : 'Add Thumbnail'}
                    </Button>
                  </div>
                </div>

                {/* Transcript */}
                <div className="flex flex-col gap-2 mb-1">
                  <label className="text-xs font-semibold text-neutral-400 uppercase">Transcript (optional)</label>
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs truncate ${transcriptPath ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' : 'border-neutral-700 bg-[#0F0F0F] text-neutral-500'}`}>
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{transcriptPath ? transcriptPath.split('/').pop() : 'No file selected — Parakeet will auto-transcribe'}</span>
                    </div>
                    <Button type="button" variant="secondary" onClick={handleSelectTranscript} disabled={uploading} className="bg-neutral-800 hover:bg-neutral-700 text-white border-none text-xs shrink-0">
                      Browse
                    </Button>
                    {transcriptPath && (
                      <button onClick={() => setTranscriptPath(null)} className="text-neutral-500 hover:text-neutral-300"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase">Video Type</label>
                  <div className="flex bg-[#0F0F0F] p-1 rounded-lg border border-neutral-800 gap-1">
                    {Object.entries(VIDEO_TYPES).map(([key, val]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setVideoType(val)}
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${videoType === val ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                      >
                        {key === 'FULL_TOURNAMENT' ? 'Full Tournament' : 'Clip'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase">Home Team</label>
                    <div className="relative">
                      <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)} disabled={uploading} className="w-full bg-[#0F0F0F] border border-neutral-700 text-white text-sm rounded-lg pl-10 pr-3 py-2 appearance-none">
                        <option value="">Select Team</option>
                        {footballTeams.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                      {homeTeam && footballTeams.find(t => t.name === homeTeam) && (
                        <img src={footballTeams.find(t => t.name === homeTeam)?.crestUrl} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" alt="" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase">Away Team</label>
                    <div className="relative">
                      <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)} disabled={uploading} className="w-full bg-[#0F0F0F] border border-neutral-700 text-white text-sm rounded-lg pl-10 pr-3 py-2 appearance-none">
                        <option value="">Select Team</option>
                        {footballTeams.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                      {awayTeam && footballTeams.find(t => t.name === awayTeam) && (
                        <img src={footballTeams.find(t => t.name === awayTeam)?.crestUrl} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" alt="" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase">Final Score</label>
                    <div className="flex items-center gap-2">
                      <Input value={homeScore} onChange={e => setHomeScore(e.target.value)} placeholder="0" className="bg-[#0F0F0F] border-neutral-700 text-white text-center" disabled={uploading} />
                      <span className="text-neutral-500">-</span>
                      <Input value={awayScore} onChange={e => setAwayScore(e.target.value)} placeholder="0" className="bg-[#0F0F0F] border-neutral-700 text-white text-center" disabled={uploading} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase">Tournament Name</label>
                    <Input value={tournamentName} onChange={e => setTournamentName(e.target.value)} placeholder="Champions League" className="bg-[#0F0F0F] border-neutral-700 text-white" disabled={uploading} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase">Match Date</label>
                    <Input value={matchDate} onChange={e => setMatchDate(e.target.value)} placeholder="MM/DD/YYYY" className="bg-[#0F0F0F] border-neutral-700 text-white" disabled={uploading} />
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-neutral-400 uppercase">Timeline Events</label>
                    <button type="button" onClick={addTimelineEvent} disabled={uploading} className="border border-indigo-500/50 text-indigo-400 text-xs px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors">
                      Add Event
                    </button>
                  </div>
                  
                  {timelineEvents.length === 0 ? (
                    <p className="text-xs text-neutral-600 italic">No events added.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-[80px_1fr_120px_auto] gap-2 items-center text-[10px] text-neutral-500 uppercase px-1">
                        <span>Timestamp</span>
                        <span>Event Type</span>
                        <span>Player Name</span>
                        <span></span>
                      </div>
                      {timelineEvents.map((evt, i) => (
                        <div key={i} className="grid grid-cols-[80px_1fr_120px_auto] gap-2 items-center">
                          <Input value={evt.timestamp} onChange={(e) => updateTimelineEvent(i, 'timestamp', e.target.value)} placeholder="24:00" disabled={uploading} className="bg-[#0F0F0F] border-neutral-700 text-white text-xs h-8" />
                          <select value={evt.label} onChange={(e) => updateTimelineEvent(i, 'label', e.target.value)} disabled={uploading} className="bg-[#0F0F0F] border border-neutral-700 text-white text-xs h-8 rounded-md px-2">
                            <option value="">Select...</option>
                            <option value="Goal">Goal</option>
                            <option value="Yellow Card">Yellow Card</option>
                            <option value="Red Card">Red Card</option>
                            <option value="Substitution">Substitution</option>
                          </select>
                          <Input value={evt.playerName || ''} onChange={(e) => updateTimelineEvent(i, 'playerName', e.target.value)} placeholder="Player Name" disabled={uploading} className="bg-[#0F0F0F] border-neutral-700 text-white text-xs h-8" />
                          <button type="button" onClick={() => removeTimelineEvent(i)} disabled={uploading} className="p-1.5 text-neutral-500 hover:text-red-400 rounded hover:bg-red-400/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {uploading && (
              <div className="mt-6 flex flex-col gap-2 bg-[#0a0a0a] rounded-lg p-3 border border-neutral-800">
                <div className="flex justify-between items-center text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                  <span>Uploading to Corestore...</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                </div>
                <div className="text-right text-[10px] text-neutral-500 mt-1 font-mono">
                  {(uploadBytesReceived / 1024 / 1024).toFixed(1)} MB / {(uploadTotalBytes / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-800 flex justify-end gap-3 bg-[#121212]">
            {uploadStep === 1 ? (
              <Button type="button" onClick={() => setUploadStep(2)} className="bg-indigo-600 hover:bg-indigo-500 text-white border-none w-full">
                Next: Match Stats
              </Button>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={() => setShowUploadModal(false)} disabled={uploading} className="hover:bg-neutral-800 hover:text-white text-neutral-300">
                  Cancel
                </Button>
                <Button onClick={handleSelectAndUpload} disabled={uploading} className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 min-w-[140px]">
                  {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : 'Seed Video'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sidebar (Channels List) ── */}
      <div className="w-80 shrink-0 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Channel Studio</h1>

        <Tabs defaultValue="owned" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-neutral-900 mb-4 p-1 rounded-xl">
            <TabsTrigger value="owned" className="rounded-lg data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white text-neutral-400">My Channels</TabsTrigger>
            <TabsTrigger value="joined" className="rounded-lg data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white text-neutral-400">Joined</TabsTrigger>
          </TabsList>

          <TabsContent value="owned" className="flex flex-col gap-2 mt-0">
            <Button variant="outline" onClick={() => setShowInitModal(true)} className="w-full border-dashed border-neutral-700 bg-transparent text-neutral-400 hover:text-white hover:border-neutral-500 mb-2">
              <Plus className="h-4 w-4 mr-2" /> Create New Channel
            </Button>

            {channelsList.owned.length === 0 && (
              <p className="text-xs text-neutral-500 text-center py-4">You have not created any channels yet.</p>
            )}

            {channelsList.owned.map(ch => (
              <div
                key={ch.publicKey}
                onClick={() => handleSelectChannel(ch.publicKey)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${activeChannelKey === ch.publicKey ? 'bg-indigo-500/10 border border-indigo-500/50' : 'bg-[#121212] border border-neutral-800 hover:bg-white/5'}`}
              >
                <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800 shrink-0">
                  {ch.avatar ? (
                    <img src={ch.avatar} alt={ch.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-500/20 text-indigo-400 font-bold">
                      {ch.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ch.name}</p>
                  <p className="text-xs text-neutral-500 truncate">{ch.description || 'No description'}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="joined" className="flex flex-col gap-2 mt-0">
            {channelsList.joined.length === 0 && (
              <p className="text-xs text-neutral-500 text-center py-4">You have not joined any channels yet.</p>
            )}
            {channelsList.joined.map(ch => (
              <div
                key={ch.publicKey}
                onClick={() => handleSelectChannel(ch.publicKey)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${activeChannelKey === ch.publicKey ? 'bg-indigo-500/10 border border-indigo-500/50' : 'bg-[#121212] border border-neutral-800 hover:bg-white/5'}`}
              >
                <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800 shrink-0">
                  {ch.avatar ? (
                    <img src={ch.avatar} alt={ch.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 font-bold">
                      {ch.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ch.name}</p>
                  <p className="text-xs text-neutral-500 truncate">{ch.description || 'No description'}</p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">

        {/* Studio Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {channelData ? channelData.name : 'Select a Channel'}
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              {isCurrentChannelOwned ? 'Manage your local node broadcasts and uploads.' : 'Viewing joined channel content in read-only mode.'}
            </p>
          </div>
          <div className="flex gap-3">
            {channelData && isCurrentChannelOwned && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-none"
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload Video
              </Button>
            )}
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
                Channel Public Key
              </p>
              <p className="text-sm text-indigo-400 font-mono truncate">{channelData.publicKey}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {isCurrentChannelOwned ? 'Share this key with others so they can subscribe to your channel.' : 'This is the cryptographic key representing this channel.'}
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

        {/* Uploads List */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">Channel Content</h2>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
          ) : uploads.length === 0 ? (
            <div className="bg-[#121212] border border-neutral-800 rounded-xl p-10 text-center">
              <p className="text-sm text-neutral-500">
                No uploads found in this channel.
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
                        {video.thumbnailPath ? (
                          <img src={video.thumbnailPath} alt={video.title} className="w-full h-full object-cover" />
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
    </div>
  )
}