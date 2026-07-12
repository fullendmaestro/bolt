import { Loader2, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

interface UploadVideoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelName?: string
  uploadTitle: string
  onUploadTitleChange: (value: string) => void
  thumbnailPreview: string | null
  onSelectThumbnail: () => void
  onClearThumbnail: () => void
  uploading: boolean
  uploadProgress: number
  uploadBytesText: string
  onSelectAndUpload: () => void
}

export function UploadVideoModal({
  open,
  onOpenChange,
  channelName,
  uploadTitle,
  onUploadTitleChange,
  thumbnailPreview,
  onSelectThumbnail,
  onClearThumbnail,
  uploading,
  uploadProgress,
  uploadBytesText,
  onSelectAndUpload
}: UploadVideoModalProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (uploading && !nextOpen) {
      toast.error('Please wait for the upload to finish or cancel it.')
      return
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-106.25 bg-[#1a1a1a] border-neutral-800 text-white">
        <DialogHeader>
          <DialogTitle>Upload to {channelName}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Seed a new video to your local corestore. You remain the sole owner of your data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-neutral-400 uppercase">Video Title</label>
            <Input
              value={uploadTitle}
              onChange={(event) => onUploadTitleChange(event.target.value)}
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
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                  {!uploading && (
                    <button
                      type="button"
                      onClick={onClearThumbnail}
                      className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-16 w-28 rounded-lg border-2 border-dashed border-neutral-700 bg-[#0F0F0F] flex items-center justify-center shrink-0">
                  <ImagePlus className="h-5 w-5 text-neutral-600" />
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={onSelectThumbnail}
                disabled={uploading}
                className="bg-neutral-800 hover:bg-neutral-700 text-white border-none text-xs"
              >
                {thumbnailPreview ? 'Change Thumbnail' : 'Add Thumbnail'}
              </Button>
            </div>
          </div>

          {uploading && (
            <div className="mt-4 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
              <div className="flex justify-between text-xs text-neutral-400 mb-2">
                <span>Uploading to Corestore...</span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-right text-[10px] text-neutral-500 mt-1 font-mono">
                {uploadBytesText}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
            className="hover:bg-neutral-800 hover:text-white text-neutral-300"
          >
            Cancel
          </Button>
          <Button
            onClick={onSelectAndUpload}
            disabled={uploading}
            className="bg-white text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Select File & Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
