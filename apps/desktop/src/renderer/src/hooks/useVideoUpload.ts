import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { VideoEntry } from '../../../shared/types'

interface UseVideoUploadOptions {
  onUploadComplete?: (video: VideoEntry) => void
}

export function useVideoUpload({ onUploadComplete }: UseVideoUploadOptions = {}) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadBytesReceived, setUploadBytesReceived] = useState(0)
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0)
  const [uploadTitle, setUploadTitle] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoName, setVideoName] = useState('')
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [thumbnailName, setThumbnailName] = useState('')
  const [matchType, setMatchType] = useState('Tournament')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [finalScore, setFinalScore] = useState('')
  const [transcriptMode, setTranscriptMode] = useState<'auto' | 'manual'>('auto')
  const [transcriptPath, setTranscriptPath] = useState<string | null>(null)
  const [transcriptName, setTranscriptName] = useState('')

  const uploadBytesText = useMemo(() => {
    return `${(uploadBytesReceived / 1024 / 1024).toFixed(1)} MB / ${(uploadTotalBytes / 1024 / 1024).toFixed(1)} MB`
  }, [uploadBytesReceived, uploadTotalBytes])

  const matchDataJson = useMemo(
    () =>
      JSON.stringify(
        {
          matchType,
          homeTeam,
          awayTeam,
          finalScore
        },
        null,
        2
      ),
    [awayTeam, finalScore, homeTeam, matchType]
  )

  const resetUploadProgress = useCallback(() => {
    setUploading(false)
    setUploadProgress(0)
    setUploadBytesReceived(0)
    setUploadTotalBytes(0)
    setUploadTitle('')
    setShowUploadModal(false)
    setVideoPath(null)
    setVideoPreview(null)
    setVideoName('')
    setThumbnailPath(null)
    setThumbnailPreview(null)
    setThumbnailName('')
    setMatchType('Tournament')
    setHomeTeam('')
    setAwayTeam('')
    setFinalScore('')
    setTranscriptMode('auto')
    setTranscriptPath(null)
    setTranscriptName('')
  }, [])

  const handleP2PMessage = useCallback(
    (msg: any) => {
      if (msg.type === 'upload-progress') {
        setUploadProgress(msg.percent)
        setUploadBytesReceived(msg.bytesReceived || 0)
        setUploadTotalBytes(msg.totalBytes || 0)
      } else if (msg.type === 'upload-complete') {
        onUploadComplete?.(msg.video)
        resetUploadProgress()
        toast.success('Video uploaded successfully!')
      } else if (msg.type === 'error' && msg.command === 'upload-video') {
        console.error('Upload error:', msg.message)
        toast.error(`Upload failed: ${msg.message}`)
        setUploading(false)
      }
    },
    [onUploadComplete, resetUploadProgress]
  )

  const handleVideoChange = useCallback(async () => {
    const result = await window.qvacAPI.selectVideo()
    if (!result || result.canceled || !result.filePath) return

    const filePath = result.filePath
    setVideoPath(filePath)
    setVideoPreview('local-asset://' + encodeURIComponent(filePath))
    
    const parts = filePath.replace(/\\/g, '/').split('/')
    setVideoName(parts[parts.length - 1])
  }, [])

  const handleThumbnailChange = useCallback(async (clear?: null) => {
    if (clear === null) {
      setThumbnailPath(null)
      setThumbnailPreview(null)
      setThumbnailName('')
      return
    }

    const result = await window.qvacAPI.selectThumbnail()
    if (!result || result.canceled || !result.filePath) return

    const filePath = result.filePath
    setThumbnailPath(filePath)
    setThumbnailPreview('local-asset://' + encodeURIComponent(filePath))
    
    const parts = filePath.replace(/\\/g, '/').split('/')
    setThumbnailName(parts[parts.length - 1])
  }, [])

  const handleTranscriptChange = useCallback(async (clear?: null) => {
    if (clear === null) {
      setTranscriptPath(null)
      setTranscriptName('')
      return
    }

    const result = await window.qvacAPI.selectTranscript()
    if (!result || result.canceled || !result.filePath) return

    const filePath = result.filePath
    setTranscriptPath(filePath)
    
    const parts = filePath.replace(/\\/g, '/').split('/')
    setTranscriptName(parts[parts.length - 1])
  }, [])

  const handleSubmitUpload = useCallback(async () => {
    if (!videoPath) {
      toast.error('Select a video file before uploading.')
      return
    }

    setUploading(true)
    try {
      await window.qvacAPI.uploadVideo({
        filePath: videoPath,
        title: uploadTitle || 'Untitled Upload',
        duration: '0:00',
        thumbnailPath: thumbnailPath || undefined,
        matchData: matchDataJson,
        transcriptPath: transcriptMode === 'manual' ? transcriptPath || undefined : undefined,
        channelKey: ''
      })
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error('Upload failed. Please try again.')
      setUploading(false)
    }
  }, [matchDataJson, thumbnailPath, transcriptMode, transcriptPath, uploadTitle, videoPath])

  return {
    uploading,
    uploadProgress,
    uploadBytesReceived,
    uploadTotalBytes,
    uploadBytesText,
    uploadTitle,
    setUploadTitle,
    showUploadModal,
    setShowUploadModal,
    videoPath,
    videoPreview,
    videoName,
    handleVideoChange,
    thumbnailPath,
    setThumbnailPath,
    thumbnailPreview,
    setThumbnailPreview,
    thumbnailName,
    handleThumbnailChange,
    matchType,
    setMatchType,
    homeTeam,
    setHomeTeam,
    awayTeam,
    setAwayTeam,
    finalScore,
    setFinalScore,
    transcriptMode,
    setTranscriptMode,
    transcriptPath,
    transcriptName,
    handleTranscriptChange,
    handleP2PMessage,
    handleSubmitUpload,
    resetUploadProgress
  }
}
