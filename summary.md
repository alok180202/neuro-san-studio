# SAP L1.5 Diagnostic Hub — Project Summary

## The problem

SAP L1.5 support desks sit between a fully automated ticketing system and the deep specialists
who actually fix things. Every ticket that lands there — a bare batch-job failure alert, an
access request, or a customer's narrative description of a broken sales order — has to be read,
classified, and routed to the right owning team before anyone can even start fixing it. That
triage work is repetitive, error-prone under volume, and rarely benefits from the fact that most
of these tickets have a near-identical precedent somewhere in the support desk's own history. The
SAP L1.5 Diagnostic Hub automates that first pass end-to-end: paste in a ticket, and it comes back
with a structured, ITSM-ready result card — component, root cause, confidence, the exact queue
and team to assign it to, verification and fix steps, and the specific past incidents it's
drawing on.

## Who it's for

SAP L1.5 support teams and the queues they feed: Master Data Management, Order to Cash,
Intercompany Operations, Warehouse Operations, Transportation Management, BI/BW Reporting, SAP
Security, SAP Basis, and — for anything touching Advanced Planning & Optimization — four deeper
specialists covering Demand Planning, Supply Network Planning, PPDS/PP, and CIF/qRFC integration.
It's built for the moment right after a ticket lands and before a human has decided what it even
is.

## Architecture: three tiers

The hub is a Neuro SAN multi-agent network split across three tiers (full breakdown, with a
data-flow diagram, in [`architecture.md`](architecture.md)):

- **Tier 1 — Intake & Analysis.** `L15SAPIntakeAgent` is the single entry point; its only job is
  classifying every incoming ticket into one of three categories — a bare automated notification,
  an access request, or everything else — and routing accordingly, without diagnosing anything
  itself. For the "everything else" category, `TicketAnalysisAgent` extracts eight structured
  fields from the raw text and makes the network's one and only call to the historical-incident
  lookup tool.
- **Tier 2 — Module Ownership.** `ConsultorAgent` decides which of nine teams owns the ticket and
  hands off to exactly one — either a thin module agent that formats a short routing card
  directly, or `FTSModuleAgent`, the gateway into the deep planning specialists.
- **Tier 3 — FTS Deep Diagnostics.** Four specialist agents (Demand Planning, Supply Network
  Planning, PPDS/PP, CIF/APO) each produce a full diagnosis, then hand off to `ITSMRouterAgent`,
  which looks up the exact ITSM queue and formats the final result card. This tier lives in its
  own registry file, since Neuro SAN's cross-file agent calls can only reach another network's
  front-man — a real architectural constraint, not an arbitrary split.

## The differentiator: historical-incident grounding

Most of a support desk's tickets aren't novel. Before the network even decides who owns a new
ticket, `TicketAnalysisAgent` searches 902 real, scrubbed historical tickets using deterministic
TF-IDF cosine similarity — against the ticket's own original customer-facing wording, not a
technical paraphrase, because the historical data is itself written in customer voice and
measurably matches better that way. When a strong match exists, its real, verified routing and
resolution become the authoritative answer that downstream agents build on, rather than generic
reasoning re-derived from scratch every time. That one lookup is condensed once at the source and
threaded — by that same field name, `similar_incidents` — through every agent in the chain that
needs it, instead of being re-run or re-summarized at each hop.

## Why this is a genuine agentic system, not prompt chaining

Nothing in this network follows a fixed, pre-scripted pipeline. Every hop is a real delegation
decision made by the agent that owns it, at runtime, from its own reasoning over that specific
ticket — this is Neuro SAN's AAOSA (Adaptive Agent Oriented Software Architecture) pattern:
adaptive, decentralized routing rather than a single orchestrator dictating the whole path in
advance. `L15SAPIntakeAgent` decides the category live; `ConsultorAgent` picks the owning module
from nine live options, using historical evidence when it exists rather than always following the
same static rule; `FTSModuleAgent` can dispatch to two specialists in parallel when a chain-risk
flag suggests a symptom might actually originate upstream. No step is a template fill-in — each
is a genuine tool-selection decision an LLM makes given the actual content of the ticket, which is
what lets the same network correctly handle a one-line automated alert, a two-sentence access
request, and a five-paragraph incident description without three different code paths to maintain.

## Tech stack

**Backend:** Neuro SAN (HOCON-configured multi-agent orchestration) with a deterministic Python
coded tool (`openpyxl` + TF-IDF/cosine similarity — no LLM or network call involved) for the
historical-incident search, and an LLM fallback chain (OpenAI → Anthropic → Google Gemini →
Mistral) so a rate-limited free-tier provider doesn't stall a demo mid-run.

**Frontend:** a standalone React/Vite/TypeScript console purpose-built for this network
(`frontend/`), replacing Neuro SAN's generic dev UI. Its centerpiece is a live agent-activity
graph — built on `reactflow` and `dagre` — that renders the network's actual topology (mirrored
by hand from both hocon files) and highlights the real path a ticket takes through it as the run
streams.
