import { UploadCloud, BarChart, Settings, MoreVertical, PlayCircle } from 'lucide-react'
import { USER_UPLOADS } from '../lib/data'

export function Studio() {
  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 flex flex-col gap-8">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Channel Studio</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage your local node broadcasts and decentralized uploads.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm font-medium">
            <BarChart className="h-4 w-4" />
            Node Analytics
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm font-medium">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Upload / Broadcast Action Area */}
      <div className="border-2 border-dashed border-neutral-800 rounded-2xl bg-[#121212] p-10 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 transition-colors group cursor-pointer">
        <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <UploadCloud className="h-8 w-8 text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Upload Video or Start Broadcast</h3>
        <p className="text-sm text-neutral-400 max-w-md mb-6">
          Files are added to your local `corestore` and seeded across the Holepunch network. You
          remain the sole owner of your data.
        </p>
        <button className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-neutral-200 transition-colors">
          Select Files to Seed
        </button>
      </div>

      {/* Uploads List */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Your Node Content</h2>

        <div className="bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <div className="col-span-6 md:col-span-5">Video</div>
            <div className="col-span-3 hidden md:block">Visibility</div>
            <div className="col-span-3 md:col-span-2 text-right">Viewers (Peers)</div>
            <div className="col-span-3 md:col-span-2 text-right">Published</div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col divide-y divide-neutral-800/50">
            {USER_UPLOADS.map((video) => (
              <div
                key={video.id}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group"
              >
                <div className="col-span-6 md:col-span-5 flex gap-4 items-center">
                  <div className="relative h-16 w-28 rounded-lg overflow-hidden shrink-0 bg-neutral-900">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] font-medium text-white">
                      {video.duration}
                    </div>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-white truncate">{video.title}</span>
                    <span className="text-xs text-neutral-500 mt-1 line-clamp-1">
                      Streamed from local corestore
                    </span>
                  </div>
                </div>

                <div className="col-span-3 hidden md:flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-neutral-300">Public (Seeding)</span>
                </div>

                <div className="col-span-3 md:col-span-2 text-right text-sm text-neutral-300">
                  {video.viewers}
                </div>

                <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-4">
                  <span className="text-sm text-neutral-400">{video.time}</span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-neutral-800 rounded-md">
                    <MoreVertical className="h-4 w-4 text-neutral-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
