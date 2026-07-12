import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { ChannelMetadata, VideoEntry } from '../../../shared/types'

export interface ChannelSummary {
  publicKey: string
  name: string
  description: string
  avatar: string
}

export interface ChannelList {
  owned: ChannelSummary[]
  joined: ChannelSummary[]
}

export function useChannel() {
  const [channelData, setChannelData] = useState<ChannelMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [channelsList, setChannelsList] = useState<ChannelList>({ owned: [], joined: [] })
  const [activeChannelKey, setActiveChannelKey] = useState<string | null>(null)
  const [showInitModal, setShowInitModal] = useState(false)
  const [channelName, setChannelName] = useState('')
  const [channelDesc, setChannelDesc] = useState('')
  const [initError, setInitError] = useState<string | null>(null)
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const activeChannelKeyRef = useRef<string | null>(null)

  const handleSelectChannel = useCallback((key: string) => {
    activeChannelKeyRef.current = key
    setActiveChannelKey(key)
    setLoading(true)
    window.qvacAPI.getUploads(key)
  }, [])

  const fetchChannelsList = useCallback(async (selectKey?: string) => {
    try {
      const list = await window.qvacAPI.getChannels()
      setChannelsList(list)

      let keyToSelect = selectKey || activeChannelKeyRef.current
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
  }, [handleSelectChannel])

  const handleP2PMessage = useCallback((msg: any) => {
    if (msg.type === 'uploads-data') {
      setChannelData(msg.channel || null)
      setLoading(false)
    } else if (msg.type === 'channel-initialized') {
      setInitializing(false)
      setShowInitModal(false)
      setInitError(null)
      toast.success('Channel created successfully!')
      fetchChannelsList(msg.publicKey)
    } else if (msg.type === 'error' && msg.command === 'init-channel') {
      console.error('Channel init error:', msg.message)
      setInitError(msg.message || 'Unknown error occurred')
      toast.error(`Channel initialization failed: ${msg.message}`)
      setInitializing(false)
    }
  }, [fetchChannelsList])

  useEffect(() => {
    setLoading(true)
    fetchChannelsList()
  }, [fetchChannelsList])

  const handleInitSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!channelName.trim()) return

    setInitializing(true)
    setInitError(null)
    try {
      await window.qvacAPI.initChannel(channelName.trim(), channelDesc.trim(), avatarPath || undefined)
    } catch (err: any) {
      console.error('Failed to init channel:', err)
      setInitError(err.message || 'Failed to initialize channel')
      setInitializing(false)
    }
  }, [avatarPath, channelDesc, channelName])

  const handleSelectAvatar = useCallback(async () => {
    try {
      const result = await window.qvacAPI.selectAvatar()
      if (!result.canceled && result.filePath) {
        setAvatarPath(result.filePath)
        setAvatarPreview('local-asset://' + encodeURIComponent(result.filePath))
      }
    } catch (err) {
      console.error('Avatar selection failed:', err)
    }
  }, [])

  const handleCopyKey = useCallback(() => {
    if (channelData?.publicKey) {
      navigator.clipboard.writeText(channelData.publicKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [channelData?.publicKey])

  const appendVideo = useCallback((video: VideoEntry) => {
    setChannelData((prev) => {
      if (!prev) return prev
      return { ...prev, videos: [video, ...prev.videos] }
    })
  }, [])

  const isCurrentChannelOwned = channelsList.owned.some((channel) => channel.publicKey === activeChannelKey)

  return {
    channelData,
    loading,
    copied,
    initializing,
    channelsList,
    activeChannelKey,
    showInitModal,
    setShowInitModal,
    channelName,
    setChannelName,
    channelDesc,
    setChannelDesc,
    initError,
    avatarPath,
    setAvatarPath,
    avatarPreview,
    setAvatarPreview,
    fetchChannelsList,
    handleSelectChannel,
    handleP2PMessage,
    handleInitSubmit,
    handleSelectAvatar,
    handleCopyKey,
    appendVideo,
    isCurrentChannelOwned,
  }
}