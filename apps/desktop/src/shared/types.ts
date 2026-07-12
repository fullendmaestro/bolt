// ============================================================
// Bolt P2P Shared Types
// Shared between Renderer, Main Process, and Bare Worker
// ============================================================

/** Match metadata captured during upload */
export interface MatchData {
  matchType: string
  homeTeam: string
  awayTeam: string
  finalScore: string
}

/** A single video entry stored inside a Channel's Hyperdrive metadata */
export interface VideoEntry {
  /** Unique video identifier (UUID) */
  id: string
  /** User-facing title */
  title: string
  /** ISO 8601 timestamp of upload/broadcast */
  timestamp: string
  /** File size in bytes */
  sizeBytes: number
  /** Duration string (e.g., "1:14:05") */
  duration: string
  /** Original filename */
  filename: string
  /** Hyperdrive path to the video file */
  drivePath: string
  /** Whether this is a live broadcast */
  isLive: boolean
  /** Hyperdrive path to the video thumbnail image (optional) */
  thumbnailPath?: string
  /** Parsed match metadata supplied during upload */
  matchData?: MatchData | null
  /** AI-generated match summary, appended after upload */
  aiSummary?: string | null
}

/** Metadata for a Channel (a user's persistent Hyperdrive) */
export interface ChannelMetadata {
  /** Hex-encoded public key of the channel's Hyperdrive */
  publicKey: string
  /** Human-readable channel name */
  name: string
  /** Optional description */
  description: string
  /** Drive path to the channel avatar image (e.g., /assets/avatar.jpg) */
  avatar: string
  /** List of video entries in this channel */
  videos: VideoEntry[]
}

/** A video entry enriched with its parent channel info for the feed */
export interface FeedItem {
  video: VideoEntry
  channelKey: string
  channelName: string
  channelAvatar: string
}

/** A live event that occurs during a broadcast (e.g., "Goal scored at 45:00") */
export interface ChannelEvent {
  /** ISO 8601 timestamp */
  timestamp: string
  /** Short event type: "goal", "penalty", "foul", "halftime", "custom" */
  eventType: string
  /** Human-readable description */
  description: string
  /** Channel key this event belongs to */
  channelKey: string
}

// ============================================================
// IPC Commands: Renderer → Main → Worker
// ============================================================

export type P2PCommand =
  | { type: 'join-channel'; channelKey: string }
  | { type: 'leave-channel'; channelKey: string }
  | { type: 'get-feed' }
  | { type: 'init-channel'; name: string; description: string; avatarPath?: string }
  | {
      type: 'upload-video'
      filePath: string
      title: string
      duration: string
      thumbnailPath?: string
      matchData?: string
      transcriptPath?: string
    }
  | { type: 'get-uploads' }
  | { type: 'start-stream'; channelKey: string; videoId: string }
  | { type: 'inject-event'; event: Omit<ChannelEvent, 'channelKey'> }
  | { type: 'download-video'; channelKey: string; videoId: string; destinationPath: string }

// ============================================================
// IPC Responses: Worker → Main → Renderer
// ============================================================

export type P2PResponse =
  | { type: 'worker-ready' }
  | { type: 'channel-joined'; channelKey: string }
  | { type: 'channel-left'; channelKey: string }
  | { type: 'feed-data'; items: FeedItem[] }
  | { type: 'channel-initialized'; publicKey: string; name: string }
  | { type: 'upload-progress'; videoId: string; percent: number }
  | { type: 'upload-complete'; channelKey: string; video: VideoEntry }
  | { type: 'video-metadata-updated'; channelKey: string; video: VideoEntry }
  | { type: 'uploads-data'; channel: ChannelMetadata | null }
  | { type: 'stream-url'; url: string; channelKey: string; videoId: string }
  | { type: 'channel-event'; event: ChannelEvent }
  | {
      type: 'download-progress'
      videoId: string
      channelKey: string
      percent: number
      bytesReceived: number
      totalBytes: number
    }
  | { type: 'download-complete'; videoId: string; channelKey: string; destinationPath: string }
  | { type: 'error'; message: string; command?: string }
