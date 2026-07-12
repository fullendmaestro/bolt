import type { FormEvent } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

interface CreateChannelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelName: string
  onChannelNameChange: (value: string) => void
  channelDesc: string
  onChannelDescChange: (value: string) => void
  initError: string | null
  initializing: boolean
  avatarPreview: string | null
  onSelectAvatar: () => void
  onClearAvatar: () => void
  onSubmit: (event: FormEvent) => void
}

export function CreateChannelModal({
  open,
  onOpenChange,
  channelName,
  onChannelNameChange,
  channelDesc,
  onChannelDescChange,
  initError,
  initializing,
  avatarPreview,
  onSelectAvatar,
  onClearAvatar,
  onSubmit
}: CreateChannelModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25 bg-[#1a1a1a] border-neutral-800 text-white">
        <form onSubmit={onSubmit}>
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

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase">
                Channel Avatar
              </label>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 rounded-full bg-neutral-800 border-2 border-dashed border-neutral-700 overflow-hidden flex items-center justify-center shrink-0">
                  {avatarPreview ? (
                    <>
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={onClearAvatar}
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
                  onClick={onSelectAvatar}
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
                onChange={(event) => onChannelNameChange(event.target.value)}
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
                onChange={(event) => onChannelDescChange(event.target.value)}
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
              onClick={() => onOpenChange(false)}
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
  )
}
