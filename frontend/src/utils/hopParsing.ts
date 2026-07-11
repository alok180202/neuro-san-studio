import type { HopLogEntry } from '../hooks/useAgentChat'
import { edgeKey } from '../data/agentGraphTopology'

// Shared between useAgentChat's live "current position" tracking and the
// graph's accumulated "everywhere this run has been" tracking -- both need to
// recognize an "Invoking: `X`" progress message, since deep FTS specialists
// never get their own origin depth in the stream (see useAgentChat.ts).
export const INVOKING_PATTERN = /^Invoking:\s*`([^`]+)`/

export function parseInvokedName(text: string | null | undefined): string | null {
  const match = INVOKING_PATTERN.exec((text ?? '').trim())
  return match ? match[1] : null
}

export interface VisitedGraph {
  nodes: Set<string>
  edges: Set<string>
}

/**
 * Accumulates every node and edge seen across the whole run so far, for
 * highlighting the active path on the static topology graph. Unlike
 * useAgentChat's backboneChain (which only tracks the CURRENT call-stack
 * position and shrinks as calls return), this never shrinks -- once a node
 * has fired during this run, it stays highlighted.
 */
export function computeVisitedGraph(hops: HopLogEntry[]): VisitedGraph {
  const nodes = new Set<string>()
  const edges = new Set<string>()

  // Mirrors useAgentChat's backbone-growth heuristic exactly (see the comment
  // there): a hop's own origin can be a noisy shallow re-broadcast, so an
  // "Invoking: X" ghost edge must be attributed to the reliable backbone's
  // tail, not to that hop's own (possibly shallow) origin -- otherwise a deep
  // FTS specialist invocation gets wrongly drawn as coming straight from the
  // front-man.
  let backbone: string[] = []

  for (const hop of hops) {
    const chain = hop.origin.map((entry) => entry.tool)
    for (const name of chain) nodes.add(name)
    for (let i = 0; i < chain.length - 1; i++) {
      edges.add(edgeKey(chain[i], chain[i + 1]))
    }

    if (chain.length > backbone.length) {
      backbone = chain
    } else if (hop.message.type === 'AGENT_TOOL_RESULT') {
      backbone = chain
    }

    const invoked = parseInvokedName(hop.message.text)
    if (invoked) {
      nodes.add(invoked)
      const caller = backbone[backbone.length - 1]
      if (caller) edges.add(edgeKey(caller, invoked))
    }
  }

  return { nodes, edges }
}
