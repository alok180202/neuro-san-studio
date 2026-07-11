import { Handle, Position, type NodeProps } from 'reactflow'
import type { AgentInfo } from '../../data/agentTopology'

export interface AgentGraphNodeData {
  info: AgentInfo
  tier: 1 | 2 | 3
  visited: boolean
  active: boolean
}

const TIER_ACCENT: Record<1 | 2 | 3, string> = {
  1: 'border-l-sky-500/70',
  2: 'border-l-violet-500/60',
  3: 'border-l-emerald-500/60',
}

export function AgentGraphNode({ data }: NodeProps<AgentGraphNodeData>) {
  const { info, tier, visited, active } = data
  const isTool = info.kind === 'tool'

  const colorClass = active
    ? 'bg-accent text-accent-fg border-accent shadow-lg shadow-accent/30 animate-pulse-glow'
    : visited
      ? 'bg-accent-soft text-fg border-accent/60 shadow-sm'
      : isTool
        ? 'border-dashed bg-surface-alt text-fg-muted border-border'
        : 'bg-surface text-fg-muted border-border shadow-sm'

  const tierAccent = active || visited ? '' : TIER_ACCENT[tier]

  return (
    <div
      className={`flex h-full w-full items-center gap-1.5 rounded-2xl border border-l-4 px-2.5 text-left transition-all duration-500 ${colorClass} ${tierAccent}`}
      title={info.name}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <span className="shrink-0 text-[13px] leading-none opacity-80" aria-hidden="true">
        {isTool ? '⚙' : '◆'}
      </span>
      <span className="line-clamp-2 text-[11px] font-medium leading-tight">{info.shortLabel}</span>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}
