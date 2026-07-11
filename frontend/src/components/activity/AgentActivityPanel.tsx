import type { OriginEntry } from '../../api/types'
import type { ChatStatus, HopLogEntry } from '../../hooks/useAgentChat'
import { AgentGraph } from './AgentGraph'
import { HopLog } from './HopLog'

interface AgentActivityPanelProps {
  currentChain: OriginEntry[]
  hops: HopLogEntry[]
  status: ChatStatus
  dark: boolean
}

export function AgentActivityPanel({ currentChain, hops, status, dark }: AgentActivityPanelProps) {
  if (status === 'idle') return null

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold text-fg">Agent activity</h2>
      <AgentGraph hops={hops} currentChain={currentChain} status={status} dark={dark} />
      <div className="mt-4">
        <HopLog hops={hops} />
      </div>
    </section>
  )
}
