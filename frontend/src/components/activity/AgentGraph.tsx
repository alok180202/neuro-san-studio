import { useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  ReactFlowProvider,
  type Edge,
  type Node,
} from 'reactflow'
import { GRAPH_EDGES, GRAPH_NODES, edgeKey, getAgentInfo } from '../../data/agentGraphTopology'
import { NODE_HEIGHT, NODE_WIDTH, STATIC_LAYOUT } from './agentGraphLayout'
import { computeVisitedGraph } from '../../utils/hopParsing'
import { AgentGraphCamera } from './AgentGraphCamera'
import type { ChatStatus, HopLogEntry } from '../../hooks/useAgentChat'
import type { OriginEntry } from '../../api/types'
import { AgentGraphNode, type AgentGraphNodeData } from './AgentGraphNode'

const nodeTypes = { agentNode: AgentGraphNode }

// Raw SVG marker/stroke attributes don't reliably resolve CSS custom
// properties across browsers the way inline `style` on HTML elements does,
// so edge colors are resolved to concrete values here rather than reusing
// the app's CSS variables directly. Kept in sync with theme.css by hand.
const EDGE_PALETTE = {
  light: { accent: '#b5563c', border: '#ddcfb8' },
  dark: { accent: '#d97a5f', border: '#4a4136' },
}

interface AgentGraphProps {
  hops: HopLogEntry[]
  currentChain: OriginEntry[]
  status: ChatStatus
  dark: boolean
  height?: number | string
  showLegend?: boolean
  // Pan/zoom the camera onto the currently-active node as the run
  // progresses (after a brief full-network overview), rather than always
  // showing the whole graph. Scoped off by default -- meant for a large,
  // dedicated "watch it work" view (the streaming overlay), not the small
  // inline reference graph, where an auto-moving camera would just be
  // distracting background motion.
  followActive?: boolean
}

export function AgentGraph({
  hops,
  currentChain,
  status,
  dark,
  height = 440,
  showLegend = true,
  followActive = false,
}: AgentGraphProps) {
  const activeName = currentChain[currentChain.length - 1]?.tool ?? null

  const { nodes, edges } = useMemo(() => {
    const visited = computeVisitedGraph(hops)
    const palette = dark ? EDGE_PALETTE.dark : EDGE_PALETTE.light

    const nodes: Node<AgentGraphNodeData>[] = GRAPH_NODES.map((spec) => ({
      id: spec.id,
      type: 'agentNode',
      position: STATIC_LAYOUT[spec.id],
      data: {
        info: getAgentInfo(spec.id),
        tier: spec.tier,
        visited: visited.nodes.has(spec.id),
        active: spec.id === activeName,
      },
      draggable: true,
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    }))

    const edges: Edge[] = GRAPH_EDGES.map((spec) => {
      const key = edgeKey(spec.source, spec.target)
      const isVisited = visited.edges.has(key)
      const color = isVisited ? palette.accent : palette.border

      return {
        id: key,
        source: spec.source,
        target: spec.target,
        type: 'smoothstep',
        pathOptions: { borderRadius: 12 },
        animated: isVisited,
        style: {
          stroke: color,
          strokeWidth: isVisited ? 2.5 : 1.25,
          strokeDasharray: spec.boundary ? '6 5' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      }
    })

    return { nodes, edges }
    // Topology (GRAPH_NODES/GRAPH_EDGES/STATIC_LAYOUT) is static -- only the
    // per-run visited state and theme need to trigger a recompute.
  }, [hops, activeName, dark])

  return (
    <div>
      <div
        className="w-full overflow-hidden rounded-2xl border border-border bg-surface-alt/30"
        style={{ height }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.3}
            maxZoom={1.5}
          >
            <Background gap={20} size={1} color={dark ? EDGE_PALETTE.dark.border : EDGE_PALETTE.light.border} />
            <Controls showInteractive={false} />
            {followActive && <AgentGraphCamera status={status} activeId={activeName} />}
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {showLegend && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-fg-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-sm shadow-accent/50" />
            Active now
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-accent/60 bg-accent-soft" />
            Visited this run
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-border bg-surface" />
            Not yet reached
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-md border border-dashed border-border bg-surface-alt" />
            Coded tool
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t border-dashed border-fg-muted/70" />
            Cross-network hop
          </span>
        </div>
      )}
    </div>
  )
}
