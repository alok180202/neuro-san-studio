import type { SimilarIncident } from '../../parsing/resultCardParser'

interface IncidentAccordionProps {
  incidents: SimilarIncident[]
  rawBlock: string
}

export function IncidentAccordion({ incidents, rawBlock }: IncidentAccordionProps) {
  return (
    <details className="rounded-xl border border-border bg-surface-alt/40 px-4 py-3" open>
      <summary className="cursor-pointer select-none text-sm font-medium text-fg">
        Similar past incidents{incidents.length > 0 ? ` (${incidents.length})` : ''}
      </summary>
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        {incidents.length === 0 ? (
          <p className="text-sm text-fg-muted">{rawBlock || 'No similar historical incidents found.'}</p>
        ) : (
          incidents.map((incident, index) => (
            <div key={index} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              {incident.ticketId && (
                <span className="mr-2 inline-block rounded-md bg-accent-soft px-2 py-0.5 font-mono text-xs text-accent">
                  {incident.ticketId}
                </span>
              )}
              <span className="text-fg-muted">{incident.summary}</span>
            </div>
          ))
        )}
      </div>
    </details>
  )
}
