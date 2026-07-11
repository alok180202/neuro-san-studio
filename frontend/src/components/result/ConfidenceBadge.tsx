interface ConfidenceBadgeProps {
  confidence: string | null
}

type Level = 'high' | 'medium' | 'low' | 'unknown'

function classify(confidence: string): Level {
  const normalized = confidence.toLowerCase()
  if (normalized.includes('high')) return 'high'
  if (normalized.includes('medium') || normalized.includes('moderate')) return 'medium'
  if (normalized.includes('low')) return 'low'
  return 'unknown'
}

const STYLES: Record<Level, string> = {
  high: 'bg-success-bg text-success border-success/30',
  medium: 'bg-warning-bg text-warning border-warning/30',
  low: 'bg-danger-bg text-danger border-danger/30',
  unknown: 'bg-surface-alt text-fg-muted border-border',
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (!confidence) return null
  const level = classify(confidence)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STYLES[level]}`}
    >
      Confidence: {confidence}
    </span>
  )
}
