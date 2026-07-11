import dagre from 'dagre'
import { GRAPH_EDGES, GRAPH_NODES } from '../../data/agentGraphTopology'

export const NODE_WIDTH = 196
export const NODE_HEIGHT = 54

function computeLayout(): Record<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 92 })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const node of GRAPH_NODES) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of GRAPH_EDGES) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  const positions: Record<string, { x: number; y: number }> = {}
  for (const node of GRAPH_NODES) {
    const { x, y } = graph.node(node.id)
    // dagre positions are node centers; react-flow wants top-left corners.
    positions[node.id] = { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 }
  }
  return positions
}

// Topology is static, so the layout is computed once at module load rather
// than on every render.
export const STATIC_LAYOUT = computeLayout()
