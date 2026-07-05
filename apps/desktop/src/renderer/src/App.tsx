import { useEffect, useState } from 'react'
import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import { Thread } from '@/components/assistant-ui/thread'
import { qvacModelAdapter } from '@/lib/qvac-adapter'

function App(): React.JSX.Element {
  const [loading, setLoading] = useState(true)

  // Initialize the runtime with the custom IPC bridge
  const runtime = useLocalRuntime(qvacModelAdapter)

  useEffect(() => {
    window.qvacAPI.loadModel().then(() => setLoading(false))

    return () => {
      window.qvacAPI.unloadModel()
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <h1 className="text-lg font-semibold">LLM Desktop App</h1>
        <span className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
          <span
            className={`inline-block w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
          />
          {loading ? 'Loading model…' : 'Ready'}
        </span>
      </header>

      {/* Main Chat Interface */}
      <main className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : (
          <div className="h-full w-full [&_.aui-thread]:h-full [&_.aui-thread]:bg-zinc-950 [&_.aui-thread-viewport]:px-6">
            <AssistantRuntimeProvider runtime={runtime}>
              <Thread />
            </AssistantRuntimeProvider>
          </div>
        )}
      </main>
    </div>
  )
}

export default App