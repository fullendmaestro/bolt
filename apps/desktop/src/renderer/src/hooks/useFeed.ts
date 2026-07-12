import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FeedItem } from '../../../shared/types'

export interface FeedStream {
  id: string
  title: string
  channel: string
  viewers: string
  isLive: boolean
  thumbnail: string
  avatar: string
  time: string
  duration: string
  channelKey: string
  videoId: string
}

export function useFeed() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [channelKeyInput, setChannelKeyInput] = useState('')
  const [joining, setJoining] = useState(false)

  const feedStreams = useMemo<FeedStream[]>(
    () =>
      feedItems.map((item) => ({
        id: item.channelKey + ':' + item.video.id,
        title: item.video.title,
        channel: item.channelName,
        viewers: '0',
        isLive: item.video.isLive,
        thumbnail: item.video.thumbnailPath || '',
        avatar: item.channelAvatar || '',
        time: new Date(item.video.timestamp).toLocaleDateString(),
        duration: item.video.duration,
        channelKey: item.channelKey,
        videoId: item.video.id,
      })),
    [feedItems]
  )

  const refreshFeed = useCallback(() => {
    setLoading(true)
    window.qvacAPI.getFeed()
  }, [])

  const handleP2PMessage = useCallback((msg: any) => {
    if (msg.type === 'feed-data') {
      setFeedItems(msg.items || [])
      setLoading(false)
    } else if (msg.type === 'error' && msg.command === 'get-feed') {
      console.error('Failed to get feed:', msg.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    window.qvacAPI.onP2PMessage(handleP2PMessage)
    refreshFeed()

    return () => {
      window.qvacAPI.removeP2PMessageListener()
    }
  }, [handleP2PMessage, refreshFeed])

  const handleJoinChannel = useCallback(async () => {
    if (!channelKeyInput.trim()) return

    setJoining(true)
    try {
      await window.qvacAPI.joinChannel(channelKeyInput.trim())
      setChannelKeyInput('')
      setJoinDialogOpen(false)
      setTimeout(refreshFeed, 2000)
    } catch (err) {
      console.error('Failed to join channel:', err)
    } finally {
      setJoining(false)
    }
  }, [channelKeyInput, refreshFeed])

  return {
    activeCategory,
    setActiveCategory,
    feedStreams,
    loading,
    joinDialogOpen,
    setJoinDialogOpen,
    channelKeyInput,
    setChannelKeyInput,
    joining,
    handleJoinChannel,
    refreshFeed,
  }
}