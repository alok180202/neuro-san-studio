import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AgentGraph } from './AgentGraph'
import { Spinner } from '../common/Spinner'
import type { ChatStatus, HopLogEntry } from '../../hooks/useAgentChat'
import type { OriginEntry } from '../../api/types'

interface AgentActivityOverlayProps {
  status: ChatStatus
  hops: HopLogEntry[]
  currentChain: OriginEntry[]
  dark: boolean
}

// Demo-flourish: while a ticket is streaming, the graph takes over the
// screen so the audience can watch agents light up live. The instant the run
// finishes, it shrinks/fades away on its own and the page focuses on the
// result -- no user interaction needed to dismiss it.
const CLOSE_ANIMATION_MS = 320

export function AgentActivityOverlay({ status, hops, currentChain, dark }: AgentActivityOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (status === 'streaming') {
      setMounted(true)
      return
    }
    if (!mounted) return
    const timeout = window.setTimeout(() => setMounted(false), CLOSE_ANIMATION_MS)
    return () => window.clearTimeout(timeout)
  }, [status, mounted])

  if (!mounted) return null

  const closing = status !== 'streaming'

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-bg/75 p-4 backdrop-blur-sm transition-opacity duration-300 sm:p-8 ${
        closing ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Agent activity in progress"
    >
      <div
        className={`w-full max-w-5xl rounded-3xl border border-border bg-surface p-6 shadow-2xl transition-all duration-300 ${
          closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <div className="mb-4 flex items-center gap-2.5">
          <Spinner size={16} />
          <h2 className="text-base font-semibold text-fg">Agents are triaging this ticket&hellip;</h2>
        </div>
        <AgentGraph
          hops={hops}
          currentChain={currentChain}
          status={status}
          dark={dark}
          height="min(62vh, 560px)"
          followActive
        />
      </div>
    </div>,
    document.body,
  )
}
