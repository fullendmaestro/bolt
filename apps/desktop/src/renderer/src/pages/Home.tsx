import { useState } from 'react'
import { CATEGORIES, MOCK_STREAMS } from '../lib/data'
import { VideoCard } from '../components/VideoCard'

export function Home() {
  const [activeCategory, setActiveCategory] = useState('All')

  return (
    <div className="max-w-[2400px] mx-auto pb-10">
      <div className="sticky top-0 z-20 bg-[#0F0F0F]/95 backdrop-blur-sm py-3 px-4 md:px-6 border-b border-neutral-900/50">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10">
        {MOCK_STREAMS.map((stream) => (
          <VideoCard key={stream.id} stream={stream} />
        ))}
      </div>
    </div>
  )
}
