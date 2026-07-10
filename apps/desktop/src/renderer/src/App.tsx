import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Home } from './pages/Home'
import { Watch } from './pages/Watch'
import { Studio } from './pages/Studio' // NEW IMPORT

function AppLayout() {
  const [modelStatus, setModelStatus] = useState<'idle' | 'downloading' | 'ready'>('idle')
  const [modelProgress, setModelProgress] = useState(0)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

  const location = useLocation()

  // Auto-collapse sidebar when on the watch page or studio for maximum workspace
  useEffect(() => {
    const isWatchOrStudio =
      location.pathname.startsWith('/watch') || location.pathname.startsWith('/studio')
    setIsSidebarExpanded(!isWatchOrStudio)
  }, [location.pathname])

  // Listen to model download progress
  useEffect(() => {
    window.qvacAPI.onModelProgress((progress) => {
      setModelProgress(progress.percentage || 0)
    })
    return () => {
      window.qvacAPI.removeModelProgressListener()
      window.qvacAPI.unloadModel().catch(console.error)
    }
  }, [])

  // Task 2: handleLoadModel accepts an optional channelOwnerKey.
  // When provided (delegate mode), the main process routes the loadModel
  // request to the channel owner's QVAC provider node over P2P.
  const handleLoadModel = async (channelOwnerKey?: string) => {
    setModelStatus('downloading')
    try {
      await window.qvacAPI.loadModel(channelOwnerKey)
      setModelStatus('ready')
    } catch (error) {
      console.error('Failed to initialize QVAC runtime:', error)
      setModelStatus('idle')
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0F0F0F] text-[#F1F1F1] font-sans overflow-hidden antialiased selection:bg-neutral-800">
      <Header onMenuClick={() => setIsSidebarExpanded(!isSidebarExpanded)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isExpanded={isSidebarExpanded} />

        <main className="flex-1 overflow-y-auto bg-[#0F0F0F] scrollbar-thin scrollbar-thumb-neutral-800">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/watch/:id" element={<Watch modelStatus={modelStatus} modelProgress={modelProgress} loadModel={handleLoadModel} />} />
            <Route path="/studio" element={<Studio />} /> {/* NEW ROUTE */}
          </Routes>
        </main>
      </div>
      <Toaster theme="dark" position="bottom-right" />
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
