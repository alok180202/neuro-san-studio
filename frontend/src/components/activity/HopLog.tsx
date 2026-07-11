import type { HopLogEntry } from '../../hooks/useAgentChat'
import { getAgentInfo } from '../../data/agentTopology'

interface HopLogProps {
  hops: HopLogEntry[]
}

export function HopLog({ hops }: HopLogProps) {
  if (hops.length === 0) return null

  return (
    <details className="rounded-xl border border-border bg-surface-alt/50 px-4 py-2 text-sm">
      <summary className="cursor-pointer select-none text-fg-muted">Raw hop trace ({hops.length})</summary>
      <ol className="mt-2 space-y-1.5 border-t border-border pt-2 font-mono text-xs text-fg-muted">
        {hops.map((hop) => {
          const path = hop.origin.map((entry) => getAgentInfo(entry.tool).shortLabel).join(' → ')
          return (
            <li key={hop.id} className="flex gap-2">
              <span className="text-fg-muted/60">#{hop.id + 1}</span>
              <span>{path || '(root)'}</span>
              <span className="text-fg-muted/50">[{hop.message.type}]</span>
            </li>
          )
        })}
      </ol>
    </details>
  )
}
