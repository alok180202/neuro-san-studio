// Static topology of the sap_l15_hub agent network -- every agent/tool node and
// every wired edge, mirroring exactly how they're declared in
// registries/sap_l15_hub/sap_l15_hub.hocon and registries/sap_l15_hub/fts/fts_agents.hocon.
// This is deliberately hand-maintained rather than derived from a live trace: the
// graph should show the FULL network topology regardless of which path any single
// ticket happened to take, with the active run highlighted on top of it.

import { getAgentInfo } from './agentTopology'

export interface GraphNodeSpec {
  id: string
  tier: 1 | 2 | 3
}

export interface GraphEdgeSpec {
  source: string
  target: string
  // The FTS network is a physically separate registry file, reached via an
  // external-agent reference -- render that one edge distinctly.
  boundary?: boolean
}

export const GRAPH_NODES: GraphNodeSpec[] = [
  // Tier 1
  { id: 'L15SAPIntakeAgent', tier: 1 },
  { id: 'TicketAnalysisAgent', tier: 1 },
  { id: 'ConsultorAgent', tier: 1 },
  { id: 'HistoricalIncidentLookupTool', tier: 1 },

  // Tier 2 -- thin module routing agents
  { id: 'MDMModuleAgent', tier: 2 },
  { id: 'OTCModuleAgent', tier: 2 },
  { id: 'ICOModuleAgent', tier: 2 },
  { id: 'LEXWarehouseModuleAgent', tier: 2 },
  { id: 'LEXTMModuleAgent', tier: 2 },
  { id: 'BIReportModuleAgent', tier: 2 },
  { id: 'SecurityModuleAgent', tier: 2 },
  { id: 'BasisModuleAgent', tier: 2 },

  // Tier 2/3 boundary + Tier 3 (fts/fts_agents.hocon)
  { id: 'FTSModuleAgent', tier: 2 },
  { id: 'DPDiagnosticsAgent', tier: 3 },
  { id: 'SNPDiagnosticsAgent', tier: 3 },
  { id: 'PPDSPPDiagnosticsAgent', tier: 3 },
  { id: 'CIFAPODiagnosticsAgent', tier: 3 },
  { id: 'ITSMRouterAgent', tier: 3 },
  { id: 'ITSMQueueLookupTool', tier: 3 },
]

export const GRAPH_EDGES: GraphEdgeSpec[] = [
  { source: 'L15SAPIntakeAgent', target: 'TicketAnalysisAgent' },
  { source: 'L15SAPIntakeAgent', target: 'SecurityModuleAgent' },
  { source: 'L15SAPIntakeAgent', target: 'FTSModuleAgent', boundary: true },

  { source: 'TicketAnalysisAgent', target: 'HistoricalIncidentLookupTool' },
  { source: 'TicketAnalysisAgent', target: 'ConsultorAgent' },

  { source: 'ConsultorAgent', target: 'MDMModuleAgent' },
  { source: 'ConsultorAgent', target: 'OTCModuleAgent' },
  { source: 'ConsultorAgent', target: 'ICOModuleAgent' },
  { source: 'ConsultorAgent', target: 'LEXWarehouseModuleAgent' },
  { source: 'ConsultorAgent', target: 'LEXTMModuleAgent' },
  { source: 'ConsultorAgent', target: 'BIReportModuleAgent' },
  { source: 'ConsultorAgent', target: 'SecurityModuleAgent' },
  { source: 'ConsultorAgent', target: 'BasisModuleAgent' },
  { source: 'ConsultorAgent', target: 'FTSModuleAgent', boundary: true },

  { source: 'FTSModuleAgent', target: 'DPDiagnosticsAgent' },
  { source: 'FTSModuleAgent', target: 'SNPDiagnosticsAgent' },
  { source: 'FTSModuleAgent', target: 'PPDSPPDiagnosticsAgent' },
  { source: 'FTSModuleAgent', target: 'CIFAPODiagnosticsAgent' },

  { source: 'DPDiagnosticsAgent', target: 'ITSMRouterAgent' },
  { source: 'SNPDiagnosticsAgent', target: 'ITSMRouterAgent' },
  { source: 'PPDSPPDiagnosticsAgent', target: 'ITSMRouterAgent' },
  { source: 'CIFAPODiagnosticsAgent', target: 'ITSMRouterAgent' },

  { source: 'ITSMRouterAgent', target: 'ITSMQueueLookupTool' },
]

export function edgeKey(source: string, target: string): string {
  return `${source}->${target}`
}

// Re-export for convenience so graph components only need one import.
export { getAgentInfo }
