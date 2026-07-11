// Static name -> {tier, kind} lookup for styling the agent activity chain.
// Mirrors the agents/tools actually defined in registries/sap_l15_hub/*.hocon.
// Anything not in this table (a typo, a future agent we haven't wired up
// styling for yet) falls back to a name-suffix heuristic in getAgentInfo, so
// the chain never crashes or renders blank on an unrecognized name.

export type AgentKind = 'agent' | 'tool'
export type AgentTier = 1 | 2 | 3

export interface AgentInfo {
  name: string
  kind: AgentKind
  tier: AgentTier
  shortLabel: string
}

const TOPOLOGY: Record<string, Omit<AgentInfo, 'name'>> = {
  L15SAPIntakeAgent: { kind: 'agent', tier: 1, shortLabel: 'Intake' },
  TicketAnalysisAgent: { kind: 'agent', tier: 1, shortLabel: 'Analysis' },
  ConsultorAgent: { kind: 'agent', tier: 1, shortLabel: 'Consultor' },

  MDMModuleAgent: { kind: 'agent', tier: 2, shortLabel: 'MDM' },
  OTCModuleAgent: { kind: 'agent', tier: 2, shortLabel: 'OTC' },
  ICOModuleAgent: { kind: 'agent', tier: 2, shortLabel: 'ICO' },
  LEXWarehouseModuleAgent: { kind: 'agent', tier: 2, shortLabel: 'LEX-WH' },
  LEXTMModuleAgent: { kind: 'agent', tier: 2, shortLabel: 'LEX-TM' },
  BIReportModuleAgent: { kind: 'agent', tier: 2, shortLabel: 'BI/Report' },
  SecurityModuleAgent: { kind: 'agent', tier: 2, shortLabel: 'Security' },
  BasisModuleAgent: { kind: 'agent', tier: 2, shortLabel: 'Basis' },

  FTSModuleAgent: { kind: 'agent', tier: 2, shortLabel: 'FTS' },
  DPDiagnosticsAgent: { kind: 'agent', tier: 3, shortLabel: 'DP' },
  SNPDiagnosticsAgent: { kind: 'agent', tier: 3, shortLabel: 'SNP' },
  PPDSPPDiagnosticsAgent: { kind: 'agent', tier: 3, shortLabel: 'PPDS/PP' },
  CIFAPODiagnosticsAgent: { kind: 'agent', tier: 3, shortLabel: 'CIF/APO' },
  ITSMRouterAgent: { kind: 'agent', tier: 3, shortLabel: 'ITSM Router' },

  ITSMQueueLookupTool: { kind: 'tool', tier: 3, shortLabel: 'ITSM Lookup' },
  HistoricalIncidentLookupTool: { kind: 'tool', tier: 3, shortLabel: 'Incident Search' },
}

// The one call-stack transition worth calling out visually: crossing from
// the Tier 1/2 hub file into the physically-separate FTS network file. The
// exact on-the-wire string for this origin hop (external-agent path vs. the
// front-man's own spec name) isn't 100% pinned down without a live server
// trace, so match either form defensively.
export function isFtsBoundaryTool(rawName: string): boolean {
  return rawName.includes('fts_agents') || rawName === 'FTSModuleAgent'
}

export function getAgentInfo(rawName: string): AgentInfo {
  // External-agent origin entries can be qualified paths like
  // "/sap_l15_hub/fts/fts_agents" -- match on the trailing path segment.
  const simpleName = rawName.split('/').filter(Boolean).pop() ?? rawName
  const known = TOPOLOGY[simpleName]

  if (known) {
    return { name: rawName, ...known }
  }

  const looksLikeTool = /Tool$/.test(simpleName)
  return {
    name: rawName,
    kind: looksLikeTool ? 'tool' : 'agent',
    tier: 2,
    shortLabel: simpleName.replace(/(Module|Diagnostics|Agent|Tool)$/, '') || simpleName,
  }
}
