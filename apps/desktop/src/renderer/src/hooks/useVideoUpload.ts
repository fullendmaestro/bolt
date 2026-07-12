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

  const handleVideoChange = useCallback((file: File | null) => {
    if (!file) {
      setVideoPath(null)
      setVideoPreview(null)
      setVideoName('')
      return
    }

    const filePath = (file as File & { path?: string }).path
    setVideoPath(filePath || null)
    setVideoPreview(filePath ? 'local-asset://' + encodeURIComponent(filePath) : null)
    setVideoName(file.name)
  }, [])

  const handleThumbnailChange = useCallback((file: File | null) => {
    if (!file) {
      setThumbnailPath(null)
      setThumbnailPreview(null)
      setThumbnailName('')
      return
    }

    const filePath = (file as File & { path?: string }).path
    setThumbnailPath(filePath || null)
    setThumbnailPreview(filePath ? 'local-asset://' + encodeURIComponent(filePath) : null)
    setThumbnailName(file.name)
  }, [])

  const handleTranscriptChange = useCallback((file: File | null) => {
    if (!file) {
      setTranscriptPath(null)
      setTranscriptName('')
      return
    }

    const filePath = (file as File & { path?: string }).path
    setTranscriptPath(filePath || null)
    setTranscriptName(file.name)
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
