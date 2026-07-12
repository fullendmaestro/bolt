import { ChangeEvent } from 'react'
import { FileText, FileVideo2, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
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
  videoName: string
  videoPreview: string | null
  onVideoChange: (file: File | null) => void
  thumbnailName: string
  thumbnailPreview: string | null
  onThumbnailChange: (file: File | null) => void
  matchType: string
  onMatchTypeChange: (value: string) => void
  homeTeam: string
  onHomeTeamChange: (value: string) => void
  awayTeam: string
  onAwayTeamChange: (value: string) => void
  finalScore: string
  onFinalScoreChange: (value: string) => void
  transcriptMode: 'auto' | 'manual'
  onTranscriptModeChange: (mode: 'auto' | 'manual') => void
  transcriptName: string
  onTranscriptChange: (file: File | null) => void
  uploading: boolean
  uploadProgress: number
  uploadBytesText: string
  onSubmitUpload: () => void
}

function handleFileInput(
  event: ChangeEvent<HTMLInputElement>,
  onChange: (file: File | null) => void
) {
  onChange(event.target.files?.[0] || null)
}

export function UploadVideoModal({
  open,
  onOpenChange,
  channelName,
  uploadTitle,
  onUploadTitleChange,
  videoName,
  videoPreview,
  onVideoChange,
  thumbnailName,
  thumbnailPreview,
  onThumbnailChange,
  matchType,
  onMatchTypeChange,
  homeTeam,
  onHomeTeamChange,
  awayTeam,
  onAwayTeamChange,
  finalScore,
  onFinalScoreChange,
  transcriptMode,
  onTranscriptModeChange,
  transcriptName,
  onTranscriptChange,
  uploading,
  uploadProgress,
  uploadBytesText,
  onSubmitUpload
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
      <DialogContent className="sm:max-w-3xl bg-[#111111] border-neutral-800 text-white overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload to {channelName}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Seed a new video to your local corestore with match metadata and transcript context.
          </DialogDescription>
        </DialogHeader>

        <Accordion type="single" collapsible defaultValue="step-1" className="w-full">
          <AccordionItem value="step-1" className="border-neutral-800">
            <AccordionTrigger className="px-1 text-base hover:no-underline">
              1. Video and thumbnail
            </AccordionTrigger>
            <AccordionContent className="px-1">
              <div className="grid gap-4 pt-2">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Video File
                  </label>
                  <div className="rounded-xl border border-dashed border-neutral-700 bg-[#0C0C0C] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                        <FileVideo2 className="h-5 w-5 text-neutral-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {videoName || 'Choose a video file'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          MP4, MKV, WEBM, AVI, or MOV from your desktop.
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-neutral-500">
                      {videoPreview
                        ? 'Video file selected and ready to upload.'
                        : 'Select the source file from your desktop.'}
                    </p>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(event) => handleFileInput(event, onVideoChange)}
                      disabled={uploading}
                      className="mt-4 border-neutral-700 bg-black/30 text-neutral-300 file:border-0 file:bg-white/10 file:text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Thumbnail
                  </label>
                  <div className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-[#0C0C0C] p-4">
                    {thumbnailPreview ? (
                      <div className="relative h-16 w-28 overflow-hidden rounded-lg border border-neutral-700">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="h-full w-full object-cover"
                        />
                        {!uploading && (
                          <button
                            type="button"
                            onClick={() => onThumbnailChange(null)}
                            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-18 w-32 items-center justify-center rounded-lg border border-dashed border-neutral-700 bg-white/5">
                        <ImagePlus className="h-5 w-5 text-neutral-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {thumbnailName || 'Choose a thumbnail image'}
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleFileInput(event, onThumbnailChange)}
                        disabled={uploading}
                        className="mt-3 border-neutral-700 bg-black/30 text-neutral-300 file:border-0 file:bg-white/10 file:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-2" className="border-neutral-800">
            <AccordionTrigger className="px-1 text-base hover:no-underline">
              2. Rich match metadata
            </AccordionTrigger>
            <AccordionContent className="px-1">
              <div className="grid gap-4 pt-2">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Video Title
                  </label>
                  <Input
                    value={uploadTitle}
                    onChange={(event) => onUploadTitleChange(event.target.value)}
                    placeholder="e.g. Match Highlights vs Arsenal"
                    className="bg-[#0B0B0B] border-neutral-700 text-white focus-visible:ring-indigo-500 rounded-lg"
                    disabled={uploading}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Match Type / Tournament
                  </label>
                  <Input
                    value={matchType}
                    onChange={(event) => onMatchTypeChange(event.target.value)}
                    placeholder="League match, Cup final, Friendly..."
                    className="bg-[#0B0B0B] border-neutral-700 text-white focus-visible:ring-indigo-500 rounded-lg"
                    disabled={uploading}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Home Team
                    </label>
                    <Input
                      value={homeTeam}
                      onChange={(event) => onHomeTeamChange(event.target.value)}
                      placeholder="Home team"
                      className="bg-[#0B0B0B] border-neutral-700 text-white focus-visible:ring-indigo-500 rounded-lg"
                      disabled={uploading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Away Team
                    </label>
                    <Input
                      value={awayTeam}
                      onChange={(event) => onAwayTeamChange(event.target.value)}
                      placeholder="Away team"
                      className="bg-[#0B0B0B] border-neutral-700 text-white focus-visible:ring-indigo-500 rounded-lg"
                      disabled={uploading}
                    />
                  </div>
                </div>

                <div className="grid gap-2 max-w-xs">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Final Score
                  </label>
                  <Input
                    value={finalScore}
                    onChange={(event) => onFinalScoreChange(event.target.value)}
                    placeholder="2-1"
                    className="bg-[#0B0B0B] border-neutral-700 text-white focus-visible:ring-indigo-500 rounded-lg"
                    disabled={uploading}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-3" className="border-neutral-800">
            <AccordionTrigger className="px-1 text-base hover:no-underline">
              3. AI context and transcript
            </AccordionTrigger>
            <AccordionContent className="px-1">
              <div className="grid gap-4 pt-2">
                <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-[#0B0B0B] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Transcript source</p>
                    <p className="text-xs text-neutral-500">
                      Auto-transcribe the video or upload a prepared .vtt/.txt file.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs ${transcriptMode === 'auto' ? 'text-white' : 'text-neutral-500'}`}
                    >
                      Auto-Transcribe
                    </span>
                    <Switch
                      checked={transcriptMode === 'manual'}
                      onCheckedChange={(checked) =>
                        onTranscriptModeChange(checked ? 'manual' : 'auto')
                      }
                      disabled={uploading}
                    />
                    <span
                      className={`text-xs ${transcriptMode === 'manual' ? 'text-white' : 'text-neutral-500'}`}
                    >
                      Upload .vtt/.txt
                    </span>
                  </div>
                </div>

                {transcriptMode === 'manual' && (
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Transcript File
                    </label>
                    <div className="rounded-xl border border-neutral-800 bg-[#0C0C0C] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                          <FileText className="h-5 w-5 text-neutral-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            {transcriptName || 'Choose a .vtt or .txt transcript'}
                          </p>
                          <p className="text-xs text-neutral-500">
                            This skips local transcription and feeds the transcript straight into
                            RAG.
                          </p>
                        </div>
                      </div>
                      <Input
                        type="file"
                        accept=".vtt,.txt,text/vtt,text/plain"
                        onChange={(event) => handleFileInput(event, onTranscriptChange)}
                        disabled={uploading}
                        className="mt-4 border-neutral-700 bg-black/30 text-neutral-300 file:border-0 file:bg-white/10 file:text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-2 rounded-xl border border-neutral-800 bg-black/40 p-4 text-sm text-neutral-300">
                  <p className="font-medium text-white">Preview</p>
                  <Textarea
                    value={
                      matchType
                        ? JSON.stringify({ matchType, homeTeam, awayTeam, finalScore }, null, 2)
                        : ''
                    }
                    readOnly
                    className="min-h-28 border-neutral-700 bg-[#090909] font-mono text-xs text-neutral-300"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {uploading && (
          <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-2 flex justify-between text-xs text-neutral-400">
              <span>Uploading to Corestore...</span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="mt-1 text-right font-mono text-[10px] text-neutral-500">
              {uploadBytesText}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
            className="text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmitUpload}
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
