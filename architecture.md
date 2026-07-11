# SAP L1.5 Diagnostic Hub — Architecture

This document covers the agent network's structure and how a ticket actually moves through it.
For setup/run instructions and project context, see [README.md](README.md#-sap-l15-diagnostic-hub--hackathon-submission).

## System overview

The hub is three tiers of Neuro SAN agents split across two HOCON registry files, plus a
standalone frontend that visualizes the live network as it runs:

```
registries/sap_l15_hub/sap_l15_hub.hocon          Tier 1 + Tier 2
registries/sap_l15_hub/fts/fts_agents.hocon        Tier 3 (nested, independently servable)
coded_tools/sap_l15/                               Deterministic Python tools called by name from the hocon
frontend/                                          Consultant console + agent-activity node graph
```

Tier 3 physically lives in its own file — not because it's conceptually separate from Tier 2,
but because cross-file agent calls in Neuro SAN can only reach the *front-man* of another
registered network, not an arbitrary agent inside it. `FTSModuleAgent` is Tier 3's front-man for
that reason, even though it's the thing Tier 2's `ConsultorAgent` treats as "the FTS module."

## Tier 1 — Intake & Analysis

**`L15SAPIntakeAgent`** (front-man) is the only entry point. It does no diagnosis — its entire job
is a single classification:

| Category | What it looks like | Routes to |
|---|---|---|
| A — Automated notification | Terse, system-generated alert with no human elaboration (e.g. a bare batch-job failure) | `FTSModuleAgent` directly, skipping analysis |
| B — Access request | "please provide access", an SU53-style authorization failure | `SecurityModuleAgent` directly, skipping analysis |
| C — Everything else | Any narrative incident, data mismatch, or config question | `TicketAnalysisAgent` |

**`TicketAnalysisAgent`** only runs for Category C. It extracts eight structured fields (ticket
type, SAP system, process area, symptom, objects, error text, urgency, chain risk) from the raw
text, then makes the network's *one and only* call to `HistoricalIncidentLookupTool` — using the
ticket's original wording, not its own technical paraphrase, because the historical corpus is
written in customer voice and a paraphrase measurably matches it worse. The similarity result is
condensed to at most its top 2 matches before being passed on, to keep the rest of the chain's
context from ballooning.

## Tier 2 — Module Ownership

**`ConsultorAgent`** decides which team owns the ticket, using the historical match as the
deciding factor when one exists — the dataset is curated to only contain correct, verified
routing outcomes, so a strong match's `module_owner` *is* the routing decision, not just a
hint. It falls back to keyword-based rules (SD/sales → OTC, picking/packing → LEX-Warehouse,
performance/RFC → Basis, etc.) only when no historical match exists.

It routes to exactly one of 9 targets:

- 8 thin module agents — `MDMModuleAgent`, `OTCModuleAgent`, `ICOModuleAgent`,
  `LEXWarehouseModuleAgent`, `LEXTMModuleAgent`, `BIReportModuleAgent`, `SecurityModuleAgent`,
  `BasisModuleAgent` — each does no deep diagnosis, just confirms ownership and emits a short
  routing card (module, ITSM queue, team, 2–3 starting checks).
- `FTSModuleAgent` — the gateway into Tier 3, for anything APO/planning/CIF-related.

## Tier 3 — FTS Deep Diagnostics

**`FTSModuleAgent`** dispatches by process area to one of four specialists:

| Process area | Specialist |
|---|---|
| DP | `DPDiagnosticsAgent` |
| SNP | `SNPDiagnosticsAgent` |
| PPDS or PP | `PPDSPPDiagnosticsAgent` |
| CIF / qRFC / IDoc | `CIFAPODiagnosticsAgent` |

If `chain_risk` is "Yes" and the symptom is in SNP or DP, it calls **both** that specialist and
`CIFAPODiagnosticsAgent`, since a planning-side symptom can actually be an upstream CIF/transfer
failure. Each specialist produces a full diagnosis — using the historical match threaded all the
way down from Tier 1 as its evidence when one exists — then calls **`ITSMRouterAgent`**, which
looks up the exact ITSM queue via the deterministic **`ITSMQueueLookupTool`** and formats the
final `SAP L1.5 DIAGNOSTIC RESULT` card.

## Data flow: a ticket's journey

```
raw ticket text
      │
      ▼
L15SAPIntakeAgent           classifies A / B / C
      │  (Category C)
      ▼
TicketAnalysisAgent         extracts 8 structured fields
      │  incident_text (raw wording) ──► HistoricalIncidentLookupTool
      │  ◄── similar_incidents (top 2, condensed)
      ▼
ConsultorAgent               ticket_analysis + similar_incidents
      │  decides module ownership (historical match is authoritative if present)
      ▼
FTSModuleAgent               context_package + process_area + chain_risk + similar_incidents
      │  (or a thin module agent, which formats its own card directly and skips the rest)
      ▼
<Specialist>DiagnosticsAgent  incident_context + similar_incidents
      │  full diagnosis: component, root cause, verification/fix steps, fix_owner, confidence
      ▼
ITSMRouterAgent               diagnosis_summary + fix_owner + error_pattern + similar_incidents
      │  ──► ITSMQueueLookupTool (deterministic fix_owner → queue/team lookup)
      ▼
SAP L1.5 DIAGNOSTIC RESULT card
  COMPONENT / ROOT CAUSE / CONFIDENCE
  ITSM QUEUE / TEAM
  VERIFICATION STEPS
  FIX STEPS
  SIMILAR PAST INCIDENTS
  ESCALATION
```

Each arrow above is a real tool-call parameter in the hocon, not a paraphrase — e.g.
`similar_incidents` is passed by that exact name from `TicketAnalysisAgent` all the way through
to `ITSMRouterAgent`, condensed once at the source and never re-derived, so every downstream agent
that needs it reuses one lookup instead of repeating it.

## Coded tools

Deterministic Python, no LLM involved, called by name from the hocon:

| Tool | File | Does |
|---|---|---|
| `HistoricalIncidentLookupTool` | `coded_tools/sap_l15/historical_incident_lookup.py` | TF-IDF + cosine similarity over 902 real (scrubbed) historical tickets |
| `ITSMQueueLookupTool` | `coded_tools/sap_l15/itsm_queue_lookup.py` | Fixed `fix_owner` → ITSM queue/team/notes lookup table |

## Visualization layer

`frontend/` is a standalone React/Vite/TS console that replaces Neuro SAN's generic nsflow dev UI
for this network specifically. Its agent-activity graph (`frontend/src/components/activity/`,
built on `reactflow` + `dagre`) is not a generic chat trace — `frontend/src/data/agentGraphTopology.ts`
hand-mirrors the exact node/edge wiring of both hocon files above, so what renders is the network's
*actual* topology, with the current ticket's real path highlighted on top of it as it streams. See
[`frontend/README.md`](frontend/README.md) for how to run it.
