import type { ModuleCard } from '../../parsing/resultCardParser'
import { RawFallback } from './RawFallback'

interface ModuleCardViewProps {
  card: ModuleCard
}

export function ModuleCardView({ card }: ModuleCardViewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-fg">{card.module ?? 'Module routing result'}</h2>

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

      {card.startingChecks.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">Starting checks</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-fg">
            {card.startingChecks.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
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
