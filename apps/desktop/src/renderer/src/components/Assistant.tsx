import React, { useState } from 'react'
import type { AssistantRuntime } from '@assistant-ui/react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { ChevronDown, Settings2, Bot, Cpu, Shield, type LucideIcon } from 'lucide-react'

import { Thread } from './assistant-ui/thread'

interface Delegate {
  id: string
  name: string
  description: string
  icon: LucideIcon
}

// Mock delegate data with icons  
const MOCK_DELEGATES: Delegate[] = [
  { id: 'delegate-1', name: 'GPT-4 Turbo', description: 'Fast and capable', icon: Bot },
  { id: 'delegate-2', name: 'Claude 3 Opus', description: 'Advanced reasoning', icon: Cpu },
  { id: 'delegate-3', name: 'Local LLaMA', description: 'Privacy-focused', icon: Shield },
]

interface SelectDelegateProps {
  selectedDelegate: Delegate
  onDelegateSelect: (delegate: Delegate) => void
  delegates: Delegate[]
}

function SelectDelegate({ selectedDelegate, onDelegateSelect, delegates }: SelectDelegateProps) {
  const [isOpen, setIsOpen] = useState(false)
  const IconComponent = selectedDelegate.icon

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <IconComponent size={16} className="text-muted-foreground" />
        <span className="font-medium text-sm">{selectedDelegate.name}</span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
            {delegates.map((delegate) => {
              const DelegateIcon = delegate.icon
              return (
                <button
                  key={delegate.id}
                  onClick={() => {
                    onDelegateSelect(delegate)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors flex items-center gap-3 ${selectedDelegate.id === delegate.id ? 'bg-secondary/30' : ''
                    }`}
                >
                  <DelegateIcon size={16} className="text-muted-foreground shrink-0" />
                  <div className="flex flex-col">
                    <div className="font-medium text-sm">{delegate.name}</div>
                    <div className="text-xs text-muted-foreground">{delegate.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

interface AssistantProps {
  runtime: AssistantRuntime
}

export function Assistant({ runtime }: AssistantProps): React.ReactElement {
  const [selectedDelegate, setSelectedDelegate] = useState(MOCK_DELEGATES[0])

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full flex-col bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b">
          <SelectDelegate
            selectedDelegate={selectedDelegate}
            onDelegateSelect={setSelectedDelegate}
            delegates={MOCK_DELEGATES}
          />
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Settings2 size={20} className="text-muted-foreground" />
          </button>
        </header>
        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  )
}