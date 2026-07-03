import { useEffect, useRef, useState } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

function App(): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.qvacAPI.loadModel().then(() => setLoading(false))

    window.qvacAPI.onCompletionStream((token) => {
      if (token === '') {
        setProcessing(false)
      } else {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1].content += token
          return updated
        })
      }
    })

    return () => { window.qvacAPI.unloadModel() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (): void => {
    if (!input.trim() || processing || loading) return

    const nextHistory: Message[] = [
      ...messages,
      { role: 'user', content: input }
    ]
    setMessages([...nextHistory, { role: 'assistant', content: '' }])
    window.qvacAPI.infer([
      { role: 'system', content: 'You are a helpful assistant.' },
      ...nextHistory
    ])
    setInput('')
    setProcessing(true)
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-semibold">LLM Desktop App</h1>
        <span className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          {loading ? 'Loading model…' : 'Ready'}
        </span>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <div className="px-6 py-4 border-t border-zinc-800">
        <div className="flex gap-3">
          <textarea
            className="flex-1 resize-none rounded-xl bg-zinc-800 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500/50"
            rows={1}
            placeholder="Type a message…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={processing || loading}
            className="self-end rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default App