import React from 'react'
import type { AssistantRuntime } from '@assistant-ui/react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'

import { Thread } from './assistant-ui/thread'
import { ShareIcon } from 'lucide-react'

interface AssistantProps {
  runtime: AssistantRuntime
}

export function Assistant({ runtime }: AssistantProps): React.ReactElement {
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <ShareIcon className="size-4" />
      </header>
      <div className="flex-1 overflow-hidden">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  )
}
