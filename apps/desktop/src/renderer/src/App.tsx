import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Home } from './pages/Home'
import { Watch } from './pages/Watch'

function AppLayout() {
  const [modelLoading, setModelLoading] = useState(true)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

  const location = useLocation()

  // Auto-collapse sidebar when on the watch page for maximum cinematic space
  useEffect(() => {
    setIsSidebarExpanded(!location.pathname.startsWith('/watch'))
  }, [location.pathname])

  // Initialize the local QVAC AI core globally
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
      <Header onMenuClick={() => setIsSidebarExpanded(!isSidebarExpanded)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isExpanded={isSidebarExpanded} />

        <main className="flex-1 overflow-y-auto bg-[#0F0F0F] scrollbar-thin scrollbar-thumb-neutral-800">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/watch/:id" element={<Watch modelLoading={modelLoading} />} />
            {/* Future routes like /channel/:id can go here */}
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
