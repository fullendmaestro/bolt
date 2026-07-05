import { Menu, Search, Mic, Bell, User, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import boltLogo from '../assets/bolt-logo.svg'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-4 z-50 bg-[#0F0F0F] border-b border-white/5">
      {/* Left Navigation & Logo */}
      <div className="flex items-center gap-4 xl:w-64">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-semibold tracking-tight cursor-pointer group"
        >
          <img
            src={boltLogo}
            alt="Bolt Protocol Logo"
            className="h-7 w-7 group-hover:scale-105 transition-transform"
          />
          <span className="text-lg tracking-tighter">Bolt</span>
          <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1 mt-1">
            P2P
          </span>
        </div>
      </div>

      {/* Center Search Bar */}
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

      {/* Right Actions Panel */}
      <div className="flex items-center gap-3 xl:w-64 justify-end">
        <button
          onClick={() => navigate('/studio')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium border border-white/5"
        >
          <Video className="h-4 w-4" />
          <span>Studio</span>
        </button>

        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <button className="p-1 ml-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
            <User className="h-5 w-5 text-white/90" />
          </div>
        </button>
      </div>
    </header>
  )
}
