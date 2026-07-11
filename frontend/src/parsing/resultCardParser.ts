// Parses the two known final-answer card shapes produced by the sap_l15_hub
// network (see the ITSMRouterAgent and *ModuleAgent instructions blocks in
// registries/sap_l15_hub/*.hocon for the exact templates these mirror).
// The card content itself is LLM-authored prose filling in a template, not a
// machine-generated format, so every extraction step here is best-effort and
// MUST NOT throw -- an unrecognized or partially-malformed card always falls
// back to the raw text rather than crashing the view.

export interface SimilarIncident {
  ticketId: string | null
  label: string | null
  summary: string
}

export interface DiagnosticCard {
  kind: 'diagnostic'
  component: string | null
  rootCause: string | null
  confidence: string | null
  itsmQueue: string | null
  team: string | null
  verificationSteps: string[]
  fixSteps: string[]
  similarIncidents: SimilarIncident[]
  similarIncidentsRaw: string
  escalation: string | null
  rawText: string
}

export interface ModuleCard {
  kind: 'module'
  module: string | null
  itsmQueue: string | null
  team: string | null
  startingChecks: string[]
  rawText: string
}

export interface RawCard {
  kind: 'raw'
  rawText: string
}

export type ParsedCard = DiagnosticCard | ModuleCard | RawCard

const DASH_SEPARATOR = /^-{4,}\s*$/m
const LABEL_LINE = (label: string): RegExp => new RegExp(`^${label}\\s*:\\s*(.*)$`, 'im')
const TICKET_ID_PATTERN = /\b[A-Z]{2,}-[A-Z0-9]{3,}\b/

export function parseResultCard(text: string | null | undefined): ParsedCard {
  const rawText = (text ?? '').trim()
  if (!rawText) {
    return { kind: 'raw', rawText }
  }

  try {
    if (/^SAP L1\.5 DIAGNOSTIC RESULT/m.test(rawText)) {
      return parseDiagnosticCard(rawText)
    }
    if (/^MODULE\s*:/m.test(rawText)) {
      return parseModuleCard(rawText)
    }
  } catch {
    // Fall through to raw -- a parsing bug should never break the result view.
  }

  return { kind: 'raw', rawText }
}

function extractLabel(block: string, label: string): string | null {
  const match = block.match(LABEL_LINE(label))
  const value = match?.[1]?.trim()
  return value ? value : null
}

function extractListItems(block: string, labelLine: RegExp): string[] {
  // Slice from just after the matched label line to the end of the block,
  // rather than a blanket replace -- a replace would leave earlier label
  // lines (e.g. MODULE/ITSM QUEUE/TEAM preceding STARTING CHECKS in the thin
  // module card, which has no section separators) bleeding into the list.
  const match = block.match(labelLine)
  if (!match || match.index == null) return []

  const afterLabel = block.slice(match.index + match[0].length).trim()
  if (!afterLabel) return []

  return afterLabel
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '').trim())
    .filter(Boolean)
}

function parseDiagnosticCard(rawText: string): DiagnosticCard {
  const blocks = rawText
    .split(DASH_SEPARATOR)
    .map((block) => block.trim())
    .filter(Boolean)

  const [headerBlock, queueBlock, verificationBlock, fixBlock, incidentsBlock, escalationBlock] = blocks

  const similarIncidentsRaw = (incidentsBlock ?? '')
    .replace(/^SIMILAR PAST INCIDENTS\s*:\s*/i, '')
    .trim()

  return {
    kind: 'diagnostic',
    component: headerBlock ? extractLabel(headerBlock, 'COMPONENT') : null,
    rootCause: headerBlock ? extractLabel(headerBlock, 'ROOT CAUSE') : null,
    confidence: headerBlock ? extractLabel(headerBlock, 'CONFIDENCE') : null,
    itsmQueue: queueBlock ? extractLabel(queueBlock, 'ITSM QUEUE') : null,
    team: queueBlock ? extractLabel(queueBlock, 'TEAM') : null,
    verificationSteps: verificationBlock
      ? extractListItems(verificationBlock, /^VERIFICATION STEPS\s*:?\s*/im)
      : [],
    fixSteps: fixBlock ? extractListItems(fixBlock, /^FIX STEPS\s*:?\s*/im) : [],
    similarIncidents: parseSimilarIncidents(similarIncidentsRaw),
    similarIncidentsRaw,
    escalation: escalationBlock ? extractLabel(escalationBlock, 'ESCALATION') ?? escalationBlock : null,
    rawText,
  }
}

function parseSimilarIncidents(block: string): SimilarIncident[] {
  if (!block) return []

  // Split on blank lines or numbered/bulleted entries -- the LLM is free to
  // format this prose however it likes, so we only extract what we can find
  // and always keep the full line as a summary fallback.
  const entries = block
    .split(/\n\s*\n|(?=^\s*(?:\d+[.)]|[-*])\s)/m)
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (entries.length <= 1) {
    const singleLine = block.replace(/\n/g, ' ').trim()
    const ticketMatch = singleLine.match(TICKET_ID_PATTERN)
    if (!ticketMatch) {
      return singleLine ? [{ ticketId: null, label: null, summary: singleLine }] : []
    }
  }

  return entries.map((entry) => {
    const flat = entry.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '').replace(/\n/g, ' ').trim()
    const ticketMatch = flat.match(TICKET_ID_PATTERN)
    return {
      ticketId: ticketMatch ? ticketMatch[0] : null,
      label: null,
      summary: flat,
    }
  })
}

function parseModuleCard(rawText: string): ModuleCard {
  return {
    kind: 'module',
    module: extractLabel(rawText, 'MODULE'),
    itsmQueue: extractLabel(rawText, 'ITSM QUEUE'),
    team: extractLabel(rawText, 'TEAM'),
    startingChecks: extractListItems(rawText, /^STARTING CHECKS\s*:?\s*/im),
    rawText,
  }
}
