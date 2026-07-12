import type { VideoEntry } from '../../../shared/types'

interface MatchStatsProps {
  video?: VideoEntry | null
}

export function MatchStats({ video }: MatchStatsProps) {
  const matchData = video?.matchData || null

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Summary</p>
        <p className="mt-3 text-sm leading-6 text-neutral-100">
          {video?.aiSummary || 'No AI summary is available yet for this upload.'}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Match Data
        </p>
        <div className="mt-3 space-y-3 text-sm text-neutral-200">
          {matchData ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-400">Match Type</span>
                <span className="font-medium text-white text-right">{matchData.matchType}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-400">Home Team</span>
                <span className="font-medium text-white text-right">{matchData.homeTeam}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-400">Away Team</span>
                <span className="font-medium text-white text-right">{matchData.awayTeam}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-400">Final Score</span>
                <span className="font-medium text-white text-right">{matchData.finalScore}</span>
              </div>
            </>
          ) : (
            <p className="text-neutral-500">No match metadata attached to this upload.</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Raw JSON
        </p>
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-neutral-300">
          {matchData ? JSON.stringify(matchData, null, 2) : '{ }'}
        </pre>
      </div>
    </div>
  )
}
