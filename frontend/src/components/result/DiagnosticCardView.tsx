import type { DiagnosticCard } from '../../parsing/resultCardParser'
import { ConfidenceBadge } from './ConfidenceBadge'
import { IncidentAccordion } from './IncidentAccordion'
import { RawFallback } from './RawFallback'

interface DiagnosticCardViewProps {
  card: DiagnosticCard
}

function StepList({ title, steps }: { title: string; steps: string[] }) {
  if (steps.length === 0) return null
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h3>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-fg">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  )
}

export function DiagnosticCardView({ card }: DiagnosticCardViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-fg">{card.component ?? 'SAP L1.5 Diagnostic Result'}</h2>
        <ConfidenceBadge confidence={card.confidence} />
      </div>

      {card.rootCause && (
        <p className="text-sm text-fg-muted">
          <span className="font-medium text-fg">Root cause: </span>
          {card.rootCause}
        </p>
      )}

      <div className="flex flex-wrap gap-6 rounded-xl border border-border bg-surface-alt/40 px-4 py-3 text-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">ITSM queue</span>
          <p className="text-fg">{card.itsmQueue ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Team</span>
          <p className="text-fg">{card.team ?? '—'}</p>
        </div>
      </div>

      <StepList title="Verification steps" steps={card.verificationSteps} />
      <StepList title="Fix steps" steps={card.fixSteps} />

      <IncidentAccordion incidents={card.similarIncidents} rawBlock={card.similarIncidentsRaw} />

      {card.escalation && (
        <p className="rounded-xl border border-warning/30 bg-warning-bg px-4 py-2.5 text-sm text-warning">
          <span className="font-medium">Escalation: </span>
          {card.escalation}
        </p>
      )}

      <details className="text-xs text-fg-muted">
        <summary className="cursor-pointer select-none">View raw</summary>
        <div className="mt-2">
          <RawFallback text={card.rawText} />
        </div>
      </details>
    </div>
  )
}
