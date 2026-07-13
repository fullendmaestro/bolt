// ============================================================
// Bolt P2P — Shared Constants
// ============================================================

/** Allowed video classification types */
export const VIDEO_TYPES = {
  FULL_TOURNAMENT: 'full_tournament',
  CLIP: 'clip',
} as const

export type VideoType = (typeof VIDEO_TYPES)[keyof typeof VIDEO_TYPES]

/** Known opponent team definitions */
export const OPPONENTS: Record<string, { id: string; name: string; icon: string }> = {
  CHELSEA: { id: 'chelsea', name: 'Chelsea', icon: '/assets/chelsea.png' },
  BARCA: { id: 'barca', name: 'Barcelona', icon: '/assets/barca.png' },
}

/** Lookup an opponent by id */
export function getOpponentById(id: string) {
  return Object.values(OPPONENTS).find((o) => o.id === id) ?? null
}
