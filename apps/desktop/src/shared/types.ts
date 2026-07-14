// ============================================================
// Bolt P2P Shared Types
// Shared between Renderer, Main Process, and Bare Worker
// ============================================================

/** User-supplied match timeline event (included at upload time) */
export interface VideoTimelineEvent {
  /** Short label e.g. "Goal", "Red Card" */
  label: string
  /** Human-readable timestamp string e.g. "45:00" */
  timestamp: string
  /** Seconds into the video for programmatic seeking */
  videoTimeSecs: number
  /** Player name involved in the event */
  playerName?: string
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
  /** Video type: 'full_tournament' | 'clip' */
  videoType?: string
  /** Home team ID/name */
  homeTeam?: string
  /** Away team ID/name */
  awayTeam?: string
  /** Final score for the home team */
  homeScore?: string
  /** Final score for the away team */
  awayScore?: string
  /** Name of the tournament/competition */
  tournamentName?: string
  /** Match date (e.g. 07/13/2026) */
  matchDate?: string
  /** Absolute path to a pre-existing transcript file (skips Parakeet) */
  transcriptPath?: string
  /** Serialized JSON array of VideoTimelineEvent — user-supplied at upload */
  eventsJson?: string
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
  | { type: 'upload-video'; filePath: string; title: string; duration: string; thumbnailPath?: string; videoType?: string; homeTeam?: string; awayTeam?: string; homeScore?: string; awayScore?: string; tournamentName?: string; matchDate?: string; eventsJson?: string; transcriptPath?: string }
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
  | { type: 'upload-complete'; video: VideoEntry }
  | { type: 'uploads-data'; channel: ChannelMetadata | null }
  | { type: 'stream-url'; url: string; channelKey: string; videoId: string }
  | { type: 'channel-event'; event: ChannelEvent }
  | { type: 'download-progress'; videoId: string; channelKey: string; percent: number; bytesReceived: number; totalBytes: number }
  | { type: 'download-complete'; videoId: string; channelKey: string; destinationPath: string }
  | { type: 'error'; message: string; command?: string }
