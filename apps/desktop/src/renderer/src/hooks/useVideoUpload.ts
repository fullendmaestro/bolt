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
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  const uploadBytesText = useMemo(() => {
    return `${(uploadBytesReceived / 1024 / 1024).toFixed(1)} MB / ${(uploadTotalBytes / 1024 / 1024).toFixed(1)} MB`
  }, [uploadBytesReceived, uploadTotalBytes])

  const resetUploadProgress = useCallback(() => {
    setUploading(false)
    setUploadProgress(0)
    setUploadBytesReceived(0)
    setUploadTotalBytes(0)
    setUploadTitle('')
    setShowUploadModal(false)
  }, [])

  const handleP2PMessage = useCallback((msg: any) => {
    if (msg.type === 'upload-progress') {
      setUploadProgress(msg.percent)
      setUploadBytesReceived(msg.bytesReceived || 0)
      setUploadTotalBytes(msg.totalBytes || 0)
    } else if (msg.type === 'upload-complete') {
      onUploadComplete?.(msg.video)
      resetUploadProgress()
      setThumbnailPath(null)
      setThumbnailPreview(null)
      toast.success('Video uploaded successfully!')
    } else if (msg.type === 'error' && msg.command === 'upload-video') {
      console.error('Upload error:', msg.message)
      toast.error(`Upload failed: ${msg.message}`)
      setUploading(false)
    }
  }, [onUploadComplete, resetUploadProgress])

  const handleSelectThumbnail = useCallback(async () => {
    try {
      const result = await window.qvacAPI.selectThumbnail()
      if (!result.canceled && result.filePath) {
        setThumbnailPath(result.filePath)
        setThumbnailPreview('local-asset://' + encodeURIComponent(result.filePath))
      }
    } catch (err) {
      console.error('Thumbnail selection failed:', err)
    }
  }, [])

  const handleSelectAndUpload = useCallback(async () => {
    setUploading(true)
    try {
      const result = await window.qvacAPI.selectAndUploadVideo(
        uploadTitle || 'Untitled Upload',
        thumbnailPath || undefined
      )
      if (result.canceled) {
        setUploading(false)
      } else {
        setThumbnailPath(null)
        setThumbnailPreview(null)
      }
    } catch (err) {
      console.error('Upload failed:', err)
      setUploading(false)
    }
  }, [thumbnailPath, uploadTitle])

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
    thumbnailPath,
    setThumbnailPath,
    thumbnailPreview,
    setThumbnailPreview,
    handleP2PMessage,
    handleSelectThumbnail,
    handleSelectAndUpload,
    resetUploadProgress,
  }
}