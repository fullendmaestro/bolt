import { Home, Compass, History, Radio, Layers, Flame } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export function Sidebar({ isExpanded }: { isExpanded: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()

  const NavItem = ({
    icon,
    label,
    path
  }: {
    icon: React.ReactNode
    label: string
    path: string
  }) => {
    const active = location.pathname === path
    return (
      <button
        onClick={() => navigate(path)}
        className={`flex items-center ${isExpanded ? 'flex-row gap-4 px-3 py-2.5 w-full' : 'flex-col gap-1 px-1 py-4 w-[64px]'} rounded-lg hover:bg-white/10 transition-colors ${active ? 'bg-white/10' : ''}`}
      >
        <div
          className={`shrink-0 ${isExpanded ? '*:h-5 *:w-5' : '*:h-6 *:w-6'} ${active ? 'text-white' : 'text-neutral-200'}`}
        >
          {icon}
        </div>
        <span
          className={`${isExpanded ? 'text-sm font-medium' : 'text-[10px] font-normal'} ${active ? 'text-white' : 'text-neutral-200'} truncate`}
        >
          {label}
        </span>
      </button>
    )
  }

  return (
    <aside
      className={`flex flex-col bg-[#0F0F0F] transition-all duration-200 z-10 ${isExpanded ? 'w-60 px-3' : 'w-[72px] px-1 items-center'} py-3 gap-1 overflow-y-auto hidden sm:flex shrink-0 border-r border-white/5`}
    >
      <NavItem icon={<Home />} label="Home" path="/" />
      <NavItem icon={<Radio />} label="Live Channels" path="/live" />
      <NavItem icon={<Compass />} label="Explore" path="/explore" />
      <NavItem icon={<Flame />} label="Trending" path="/trending" />
      <div className="w-full h-px bg-white/10 my-3" />
      <NavItem icon={<History />} label="History" path="/history" />
      <NavItem icon={<Layers />} label="My Channels" path="/my-channels" />
    </aside>
  )
}
