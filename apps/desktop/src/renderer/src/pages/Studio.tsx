import { useEffect } from 'react'
import { UploadCloud, BarChart, Settings, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChannel } from '@/hooks/useChannel'
import { useVideoUpload } from '@/hooks/useVideoUpload'
import { ChannelList } from '@/features/studio/ChannelList'
import { CreateChannelModal } from '@/features/studio/CreateChannelModal'
import { UploadVideoModal } from '@/features/studio/UploadVideoModal'
import { VideoTable } from '@/features/studio/VideoTable'

export function Studio() {
  const channel = useChannel()
  const upload = useVideoUpload({ onUploadComplete: channel.appendVideo })
  const handleChannelMessage = channel.handleP2PMessage
  const handleUploadMessage = upload.handleP2PMessage

  useEffect(() => {
    const handleMessage = (msg: any) => {
      handleChannelMessage(msg)
      handleUploadMessage(msg)
    }

    window.qvacAPI.onP2PMessage(handleMessage)

    return () => {
      window.qvacAPI.removeP2PMessageListener()
    }
  }, [handleChannelMessage, handleUploadMessage])

  const handleClearAvatar = () => {
    channel.setAvatarPath(null)
    channel.setAvatarPreview(null)
  }

  const handleClearThumbnail = () => {
    upload.setThumbnailPath(null)
    upload.setThumbnailPreview(null)
  }

  return (
    <div className="max-w-350 mx-auto p-6 md:p-8 flex gap-8 items-start">
      <CreateChannelModal
        open={channel.showInitModal}
        onOpenChange={channel.setShowInitModal}
        channelName={channel.channelName}
        onChannelNameChange={channel.setChannelName}
        channelDesc={channel.channelDesc}
        onChannelDescChange={channel.setChannelDesc}
        initError={channel.initError}
        initializing={channel.initializing}
        avatarPreview={channel.avatarPreview}
        onSelectAvatar={channel.handleSelectAvatar}
        onClearAvatar={handleClearAvatar}
        onSubmit={channel.handleInitSubmit}
      />

      <UploadVideoModal
        open={upload.showUploadModal}
        onOpenChange={upload.setShowUploadModal}
        channelName={channel.channelData?.name}
        uploadTitle={upload.uploadTitle}
        onUploadTitleChange={upload.setUploadTitle}
        thumbnailPreview={upload.thumbnailPreview}
        onSelectThumbnail={upload.handleSelectThumbnail}
        onClearThumbnail={handleClearThumbnail}
        uploading={upload.uploading}
        uploadProgress={upload.uploadProgress}
        uploadBytesText={upload.uploadBytesText}
        onSelectAndUpload={upload.handleSelectAndUpload}
      />

      <ChannelList
        channelsList={channel.channelsList}
        activeChannelKey={channel.activeChannelKey}
        onSelectChannel={channel.handleSelectChannel}
        onCreateChannel={() => channel.setShowInitModal(true)}
      />

      <div className="flex-1 min-w-0 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {channel.channelData ? channel.channelData.name : 'Select a Channel'}
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              {channel.isCurrentChannelOwned
                ? 'Manage your local node broadcasts and uploads.'
                : 'Viewing joined channel content in read-only mode.'}
            </p>
          </div>
          <div className="flex gap-3">
            {channel.channelData && channel.isCurrentChannelOwned && (
              <Button
                onClick={() => upload.setShowUploadModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-none"
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload Video
              </Button>
            )}
            <Button
              variant="secondary"
              className="bg-neutral-800 hover:bg-neutral-700 text-white border-none"
            >
              <BarChart className="mr-2 h-4 w-4" />
              Node Analytics
            </Button>
            <Button
              variant="secondary"
              className="bg-neutral-800 hover:bg-neutral-700 text-white border-none"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {channel.channelData?.publicKey && (
          <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider font-semibold">
                Channel Public Key
              </p>
              <p className="text-sm text-indigo-400 font-mono truncate">
                {channel.channelData.publicKey}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {channel.isCurrentChannelOwned
                  ? 'Share this key with others so they can subscribe to your channel.'
                  : 'This is the cryptographic key representing this channel.'}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={channel.handleCopyKey}
              className="bg-neutral-800 hover:bg-neutral-700 text-white border-none shrink-0"
            >
              {channel.copied ? (
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

        <VideoTable uploads={channel.channelData?.videos || []} loading={channel.loading} />
      </div>
    </div>
  )
}
