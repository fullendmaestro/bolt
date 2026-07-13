import { FileText, FileVideo2, ImagePlus, Loader2, X, UploadCloud, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  onVideoChange: () => void
  thumbnailName: string
  thumbnailPreview: string | null
  onThumbnailChange: (clear?: null) => void
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
  onTranscriptChange: (clear?: null) => void
  uploading: boolean
  uploadProgress: number
  uploadBytesText: string
  onSubmitUpload: () => void
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
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col bg-[#0A0A0A] border-neutral-800 text-white p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-8 py-6 border-b border-neutral-800 bg-black/40">
          <DialogTitle className="text-2xl font-semibold tracking-tight">Upload to {channelName}</DialogTitle>
          <DialogDescription className="text-neutral-400 mt-1">
            Seed a new video to your local corestore with match metadata and transcript context.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar">
          {/* Section 1: Media */}
          <section className="space-y-5">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-widest flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-indigo-400" />
              Media Files
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Video File */}
              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-400">Video Source</label>
                <div
                  className={`relative group rounded-xl border border-neutral-800 bg-[#111111] p-5 transition-all min-h-[100px] flex items-center ${uploading ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-indigo-500/50 hover:bg-[#141414]'}`}
                  onClick={() => !uploading && onVideoChange()}
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
                      <FileVideo2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {videoName || 'Select a video'}
                      </p>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">MP4, MKV, WEBM, AVI, MOV</p>
                    </div>
                  </div>
                  {videoPreview && (
                    <div className="absolute top-2 right-2 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                      Ready
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnail */}
              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-400">Thumbnail Cover</label>
                <div
                  className={`relative group rounded-xl border border-neutral-800 bg-[#111111] p-5 transition-all min-h-[100px] flex items-center ${uploading ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-indigo-500/50 hover:bg-[#141414]'}`}
                  onClick={() => !uploading && onThumbnailChange()}
                >
                  <div className="flex items-center gap-4 w-full">
                    {thumbnailPreview ? (
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-700">
                        <img src={thumbnailPreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
                        {!uploading && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onThumbnailChange(null) }}
                            className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-black z-10"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
                        <ImagePlus className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {thumbnailName || 'Select a thumbnail'}
                      </p>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">Optional image cover</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Match Details */}
          <section className="space-y-5">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-widest flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-400" />
              Match Details
            </h3>
            <div className="rounded-xl border border-neutral-800 bg-[#111111] p-6 space-y-6">
              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-400">Video Title</label>
                <Input
                  value={uploadTitle}
                  onChange={(event) => onUploadTitleChange(event.target.value)}
                  placeholder="e.g. Match Highlights vs Arsenal"
                  className="bg-[#0A0A0A] border-neutral-800 text-white h-11 focus-visible:ring-indigo-500 transition-all rounded-lg"
                  disabled={uploading}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium text-neutral-400">Match Type / Tournament</label>
                <Input
                  value={matchType}
                  onChange={(event) => onMatchTypeChange(event.target.value)}
                  placeholder="League match, Cup final, Friendly..."
                  className="bg-[#0A0A0A] border-neutral-800 text-white h-11 focus-visible:ring-indigo-500 transition-all rounded-lg"
                  disabled={uploading}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-neutral-400">Home Team</label>
                  <Input
                    value={homeTeam}
                    onChange={(event) => onHomeTeamChange(event.target.value)}
                    placeholder="Home team"
                    className="bg-[#0A0A0A] border-neutral-800 text-white h-11 focus-visible:ring-indigo-500 transition-all rounded-lg"
                    disabled={uploading}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-neutral-400">Away Team</label>
                  <Input
                    value={awayTeam}
                    onChange={(event) => onAwayTeamChange(event.target.value)}
                    placeholder="Away team"
                    className="bg-[#0A0A0A] border-neutral-800 text-white h-11 focus-visible:ring-indigo-500 transition-all rounded-lg"
                    disabled={uploading}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-neutral-400">Final Score</label>
                  <Input
                    value={finalScore}
                    onChange={(event) => onFinalScoreChange(event.target.value)}
                    placeholder="e.g. 2-1"
                    className="bg-[#0A0A0A] border-neutral-800 text-white h-11 focus-visible:ring-indigo-500 transition-all rounded-lg"
                    disabled={uploading}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: AI Context */}
          <section className="space-y-5 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                AI Context
              </h3>
              <div className="flex items-center gap-3 bg-[#111111] px-3 py-1.5 rounded-full border border-neutral-800">
                <span className={`text-[10px] font-medium uppercase tracking-wider ${transcriptMode === 'auto' ? 'text-indigo-400' : 'text-neutral-500'}`}>
                  Auto
                </span>
                <Switch
                  checked={transcriptMode === 'manual'}
                  onCheckedChange={(checked) => onTranscriptModeChange(checked ? 'manual' : 'auto')}
                  disabled={uploading}
                  className="scale-75 data-[state=checked]:bg-indigo-500"
                />
                <span className={`text-[10px] font-medium uppercase tracking-wider ${transcriptMode === 'manual' ? 'text-indigo-400' : 'text-neutral-500'}`}>
                  Manual
                </span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 h-full">
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-neutral-800 bg-[#111111] p-5 text-sm text-neutral-400 leading-relaxed min-h-[110px] flex items-center">
                  {transcriptMode === 'auto' ? (
                    <p>The desktop worker will automatically transcribe the video locally using the Parakeet model. This feeds directly into the AI for search and summarization.</p>
                  ) : (
                    <p>Provide a pre-generated `.vtt` or `.txt` transcript file. This bypasses local transcription and feeds directly into the RAG model.</p>
                  )}
                </div>

                {transcriptMode === 'manual' && (
                  <div
                    className={`relative group rounded-xl border border-neutral-800 bg-[#111111] p-5 transition-all flex items-center ${uploading ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-indigo-500/50 hover:bg-[#141414]'}`}
                    onClick={() => !uploading && onTranscriptChange()}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {transcriptName || 'Select a transcript file'}
                        </p>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">.vtt or .txt allowed</p>
                      </div>
                      {transcriptName && !uploading && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onTranscriptChange(null) }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-0.5 text-white hover:bg-black z-10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-[#0A0A0A] p-5 min-h-[110px]">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Metadata Preview</label>
                <Textarea
                  value={matchType ? JSON.stringify({ matchType, homeTeam, awayTeam, finalScore }, null, 2) : ''}
                  readOnly
                  className="flex-1 resize-none border-0 bg-transparent p-0 font-mono text-xs text-neutral-400 focus-visible:ring-0 min-h-[100px]"
                />
              </div>
            </div>
          </section>

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-8 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1.5 bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading to Corestore...
                </span>
                <span className="text-sm font-mono text-white">{uploadProgress}%</span>
              </div>
              <div className="text-xs text-neutral-400 flex items-center justify-between mt-3">
                <span>Please do not close this window</span>
                <span className="font-mono bg-black/30 px-2 py-1 rounded">{uploadBytesText}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-8 py-5 border-t border-neutral-800 bg-[#0A0A0A] flex justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
            className="text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmitUpload}
            disabled={uploading || !videoName}
            className="bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 min-w-[140px] shadow-lg shadow-indigo-900/20"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Upload Video'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
