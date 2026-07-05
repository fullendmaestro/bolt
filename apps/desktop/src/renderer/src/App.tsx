import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Menu, Search, Mic, Bell, User, ThumbsUp, ThumbsDown, Share2,
  MoreHorizontal, Home, Compass, History, Radio, Layers, Flame, PlayCircle
} from 'lucide-react'
import { ChatInterface } from './components/ChatInterface'

// --- Mock Data ---
const CATEGORIES = ["All", "Live Now", "Premier League", "Champions League", "Formula 1", "NBA", "NFL", "UFC", "Highlights"]

const MOCK_STREAMS = [
  { id: 'v1', title: 'Manchester City vs. Arsenal | Live Multi-Node Broadcast', node: 'Premier League Swarm', peers: '24.5K', isLive: true, thumbnail: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200&auto=format&fit=crop', avatar: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=100&auto=format&fit=crop' },
  { id: 'v2', title: 'F1 Bahrain Grand Prix - Main Race Feed', node: 'F1 Decentralized', peers: '18.2K', isLive: true, thumbnail: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=1200&auto=format&fit=crop', avatar: 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=100&auto=format&fit=crop' },
  { id: 'v3', title: 'Lakers vs. Celtics | Full Game Replay & Analysis', node: 'Hoops Hub', peers: '5.1K', isLive: false, time: '2 hours ago', duration: '2:14:05', thumbnail: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1200&auto=format&fit=crop', avatar: 'https://images.unsplash.com/photo-1544098485-2a2ed6da40ba?q=80&w=100&auto=format&fit=crop' },
  { id: 'v4', title: 'UFC 300: Main Card Prelims', node: 'Combat Sports Net', peers: '12K', isLive: true, thumbnail: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=1200&auto=format&fit=crop', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100&auto=format&fit=crop' },
  { id: 'v5', title: 'Real Madrid vs. Barcelona | El Clásico Highlights', node: 'La Liga Archive', peers: '3.4K', isLive: false, time: '1 day ago', duration: '12:45', thumbnail: 'https://images.unsplash.com/photo-1518605368461-1e1e38ce7058?q=80&w=1200&auto=format&fit=crop', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop' },
  { id: 'v6', title: 'Champions League Goals of the Week', node: 'Euro Football', peers: '1.2K', isLive: false, time: '3 days ago', duration: '08:20', thumbnail: 'https://images.unsplash.com/photo-1574629810360-7efbb2275b1e?q=80&w=1200&auto=format&fit=crop', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=100&auto=format&fit=crop' },
]

// --- Views ---

function ExploreView() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All')

  return (
    <div className="max-w-[2400px] mx-auto pb-10">
      {/* Category Filters */}
      <div className="sticky top-0 z-20 bg-[#0F0F0F]/95 backdrop-blur-sm py-3 px-4 md:px-6 border-b border-neutral-900/50">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10">
        {MOCK_STREAMS.map((stream) => (
          <div
            key={stream.id}
            className="flex flex-col gap-3 group cursor-pointer"
            onClick={() => navigate(`/watch/${stream.id}`)}
          >
            {/* Thumbnail */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-900">
              <img src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              {stream.isLive ? (
                <div className="absolute bottom-2 right-2 bg-red-600 px-1.5 py-0.5 rounded text-xs font-semibold tracking-wider flex items-center gap-1">
                  <Radio className="h-3 w-3" /> LIVE
                </div>
              ) : (
                <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs font-medium">
                  {stream.duration}
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex gap-3 items-start">
              <img src={stream.avatar} alt={stream.node} className="w-9 h-9 rounded-full object-cover mt-0.5 border border-neutral-800" />
              <div className="flex flex-col overflow-hidden">
                <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-indigo-400 transition-colors leading-tight">
                  {stream.title}
                </h3>
                <span className="text-sm text-neutral-400 mt-1 hover:text-white transition-colors">{stream.node}</span>
                <div className="text-sm text-neutral-400 flex items-center gap-1">
                  <span>{stream.peers} peers</span>
                  {stream.time && (
                    <>
                      <span className="text-[10px]">•</span>
                      <span>{stream.time}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WatchView({ modelLoading }: { modelLoading: boolean }) {
  const { id } = useParams()
  const activeVideo = MOCK_STREAMS.find(v => v.id === id)

  // Trigger P2P Swarm join command when entering a stream
  useEffect(() => {
    if (id) {
      window.qvacAPI.sendP2PCommand({
        type: 'join-sports-room',
        roomId: id
      }).catch(console.error)
    }
  }, [id])

  if (!activeVideo) return <div className="p-10 text-center text-white">Stream not found.</div>

  return (
    <div className="mx-auto max-w-[1800px] p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
      {/* Left Column: Primary Video Player & Metadata */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Native P2P Video Canvas Area */}
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5 group">
          <img src={activeVideo.thumbnail} alt={activeVideo.title} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <div className="h-14 w-14 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-sm font-medium text-neutral-200">Connecting to {activeVideo.node}...</h3>
              <p className="text-xs text-neutral-500 mt-1 font-mono">Swarm ID: {activeVideo.id}</p>
            </div>
          </div>
          {/* Fake Player Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4">
            <PlayCircle className="h-8 w-8 hover:text-indigo-400 cursor-pointer transition-colors" />
            <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden cursor-pointer">
              <div className="h-full bg-indigo-500 w-1/3" />
            </div>
          </div>
        </div>

        {/* Video Metadata / Title Section */}
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold text-[#F1F1F1] line-clamp-2 leading-tight">
            {activeVideo.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Channel / Node Info */}
            <div className="flex items-center gap-3">
              <img src={activeVideo.avatar} className="h-10 w-10 rounded-full border border-neutral-700 object-cover" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#F1F1F1]">{activeVideo.node}</span>
                <span className="text-xs text-[#AAAAAA]">{activeVideo.peers} Peers Seeding</span>
              </div>
              <button className="ml-3 rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 transition-colors">
                Join Swarm
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-r border-white/20">
                  <ThumbsUp className="h-4 w-4" />
                  <span>12K</span>
                </button>
                <button className="px-4 py-2">
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
              <button className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 hover:bg-white/20 transition-colors text-sm font-medium">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share Node</span>
              </button>
              <button className="flex items-center justify-center bg-white/10 rounded-full w-9 h-9 hover:bg-white/20 transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Description Box */}
        <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-xl p-3 text-sm text-[#F1F1F1] mt-2 cursor-pointer">
          <div className="font-medium mb-1">
            {activeVideo.isLive ? 'Live • Streamed over Bolt Network Protocol' : `${activeVideo.time} • Bolt Network Protocol`}
          </div>
          <p className="line-clamp-2 text-[#AAAAAA]">
            This stream is hosted purely peer-to-peer via Bare runtime and Corestore. By watching, you are actively assisting in the distribution of the broadcast data to other network participants.
          </p>
        </div>
      </div>

      {/* Right Column: AI Chat Agent */}
      <div className="w-full lg:w-[400px] xl:w-[420px] shrink-0">
        <div className="sticky top-0 h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-white/10 shadow-lg bg-[#0F0F0F] flex flex-col">
          <ChatInterface loading={modelLoading} />
        </div>
      </div>
    </div>
  )
}

// --- Layout & Main App ---

function AppLayout() {
  const [modelLoading, setModelLoading] = useState(true)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()

  // Auto-collapse sidebar when on the watch page
  const isWatchPage = location.pathname.startsWith('/watch')

  useEffect(() => {
    if (isWatchPage) {
      setIsSidebarExpanded(false)
    } else {
      setIsSidebarExpanded(true)
    }
  }, [isWatchPage])

  // Initialize the local QVAC AI core
  useEffect(() => {
    const initModel = async () => {
      try {
        await window.qvacAPI.loadModel()
        setModelLoading(false)
      } catch (error) {
        console.error('Failed to initialize local QVAC runtime:', error)
      }
    }
    initModel()

    return () => {
      window.qvacAPI.unloadModel().catch(console.error)
    }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0F0F0F] text-[#F1F1F1] font-sans overflow-hidden antialiased selection:bg-neutral-800">
      {/* Global Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between px-4 z-50 bg-[#0F0F0F]">
        <div className="flex items-center gap-4 xl:w-64">
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div onClick={() => navigate('/')} className="flex items-center gap-1.5 font-semibold tracking-tight cursor-pointer">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Radio className="h-3.5 w-3.5" />
            </div>
            <span className="text-lg tracking-tighter">Bolt</span>
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1 mt-1">P2P</span>
          </div>
        </div>

        <div className="flex flex-1 max-w-2xl items-center gap-4 px-4 hidden md:flex">
          <div className="flex flex-1 items-center rounded-full border border-neutral-800 bg-[#121212] focus-within:border-indigo-500/50 overflow-hidden ml-8">
            <div className="flex h-10 flex-1 items-center px-4">
              <input
                type="text"
                placeholder="Search decentralized streams..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
              />
            </div>
            <button className="flex h-10 w-16 items-center justify-center bg-white/5 border-l border-neutral-800 hover:bg-white/10 transition-colors">
              <Search className="h-5 w-5 text-neutral-400" />
            </button>
          </div>
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#181818] hover:bg-white/10 transition-colors">
            <Mic className="h-5 w-5 text-neutral-100" />
          </button>
        </div>

        <div className="flex items-center gap-2 xl:w-64 justify-end">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          <button className="p-1 ml-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
              <User className="h-5 w-5 text-white/90" />
            </div>
          </button>
        </div>
      </header>

      {/* Main Application Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <aside
          className={`flex flex-col bg-[#0F0F0F] transition-all duration-200 z-10 ${isSidebarExpanded ? 'w-60 px-3' : 'w-[72px] px-1 items-center'
            } py-3 gap-1 overflow-y-auto hidden sm:flex shrink-0`}
        >
          <NavItem icon={<Home />} label="Home" isExpanded={isSidebarExpanded} active={location.pathname === '/'} onClick={() => navigate('/')} />
          <NavItem icon={<Radio />} label="Live Nodes" isExpanded={isSidebarExpanded} />
          <NavItem icon={<Compass />} label="Explore" isExpanded={isSidebarExpanded} />
          <NavItem icon={<Flame />} label="Trending" isExpanded={isSidebarExpanded} />

          <div className="w-full h-px bg-white/10 my-3" />

          <NavItem icon={<History />} label="History" isExpanded={isSidebarExpanded} />
          <NavItem icon={<Layers />} label="My Swarms" isExpanded={isSidebarExpanded} />
        </aside>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-[#0F0F0F] scrollbar-thin scrollbar-thumb-neutral-800">
          <Routes>
            <Route path="/" element={<ExploreView />} />
            <Route path="/watch/:id" element={<WatchView modelLoading={modelLoading} />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}

// Reusable Sidebar Item Component
function NavItem({ icon, label, isExpanded, active = false, onClick }: { icon: React.ReactNode, label: string, isExpanded: boolean, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center ${isExpanded ? 'flex-row gap-4 px-3 py-2.5 w-full' : 'flex-col gap-1 px-1 py-4 w-[64px]'} rounded-lg hover:bg-white/10 transition-colors ${active ? 'bg-white/10' : ''}`}
    >
      <div className={`shrink-0 ${isExpanded ? '*:h-5 *:w-5' : '*:h-6 *:w-6'} ${active ? 'text-white' : 'text-neutral-200'}`}>
        {icon}
      </div>
      <span className={`${isExpanded ? 'text-sm font-medium' : 'text-[10px] font-normal'} ${active ? 'text-white' : 'text-neutral-200'} truncate`}>
        {label}
      </span>
    </button>
  )
}