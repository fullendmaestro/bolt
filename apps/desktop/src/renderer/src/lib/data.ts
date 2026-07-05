export interface Stream {
  id: string
  title: string
  channel: string
  viewers: string
  isLive: boolean
  thumbnail: string
  avatar: string
  time?: string
  duration?: string
}

export const CATEGORIES = [
  'All',
  'Live Now',
  'Premier League',
  'Champions League',
  'Formula 1',
  'NBA',
  'NFL',
  'UFC',
  'Highlights'
]

export const MOCK_STREAMS: Stream[] = [
  {
    id: 'v1',
    title: 'Manchester City vs. Arsenal | Live Multi-Node Broadcast',
    channel: 'Premier League Channel',
    viewers: '24.5K',
    isLive: true,
    thumbnail:
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200&auto=format&fit=crop',
    avatar:
      'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=100&auto=format&fit=crop'
  },
  {
    id: 'v2',
    title: 'F1 Bahrain Grand Prix - Main Race Feed',
    channel: 'F1 Decentralized',
    viewers: '18.2K',
    isLive: true,
    thumbnail:
      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=1200&auto=format&fit=crop',
    avatar:
      'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=100&auto=format&fit=crop'
  },
  {
    id: 'v3',
    title: 'Lakers vs. Celtics | Full Game Replay & Analysis',
    channel: 'Hoops Hub',
    viewers: '5.1K',
    isLive: false,
    time: '2 hours ago',
    duration: '2:14:05',
    thumbnail:
      'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1200&auto=format&fit=crop',
    avatar:
      'https://images.unsplash.com/photo-1544098485-2a2ed6da40ba?q=80&w=100&auto=format&fit=crop'
  },
  {
    id: 'v4',
    title: 'UFC 300: Main Card Prelims',
    channel: 'Combat Sports Net',
    viewers: '12K',
    isLive: true,
    thumbnail:
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=1200&auto=format&fit=crop',
    avatar:
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100&auto=format&fit=crop'
  }
]

// --- NEW: User's Channel Data ---
export const USER_UPLOADS: Stream[] = [
  {
    id: 'u1',
    title: 'My Local Node Test Stream | 1080p60',
    channel: 'My Bolt Node',
    viewers: '142',
    isLive: false,
    time: '1 day ago',
    duration: '1:12:05',
    thumbnail:
      'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=1200&auto=format&fit=crop',
    avatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'
  },
  {
    id: 'u2',
    title: 'Sunday League Highlights - Week 4',
    channel: 'My Bolt Node',
    viewers: '85',
    isLive: false,
    time: '3 days ago',
    duration: '14:20',
    thumbnail:
      'https://images.unsplash.com/photo-1518605368461-1e1e38ce7058?q=80&w=1200&auto=format&fit=crop',
    avatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'
  }
]
