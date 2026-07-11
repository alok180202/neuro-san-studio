import { parseResultCard } from '../../parsing/resultCardParser'
import { DiagnosticCardView } from './DiagnosticCardView'
import { ModuleCardView } from './ModuleCardView'
import { RawFallback } from './RawFallback'

interface ResultCardProps {
  finalText: string | null
}

export function ResultCard({ finalText }: ResultCardProps) {
  if (!finalText) return null

  const card = parseResultCard(finalText)

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      {card.kind === 'diagnostic' && <DiagnosticCardView card={card} />}
      {card.kind === 'module' && <ModuleCardView card={card} />}
      {card.kind === 'raw' && <RawFallback text={card.rawText} />}
    </section>
  )
}
