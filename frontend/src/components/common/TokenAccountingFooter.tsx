import type { TokenAccounting } from '../../api/types'

interface TokenAccountingFooterProps {
  accounting: TokenAccounting | null
}

export function TokenAccountingFooter({ accounting }: TokenAccountingFooterProps) {
  if (!accounting) return null

  const models = accounting.models as Record<string, unknown> | undefined
  const modelNames = models ? Object.keys(models) : []

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-fg-muted">
      {accounting.total_tokens != null && <span>{String(accounting.total_tokens)} tokens</span>}
      {accounting.total_cost != null && <span>${Number(accounting.total_cost).toFixed(4)}</span>}
      {modelNames.length > 0 && <span>models: {modelNames.join(', ')}</span>}
    </div>
  )
}
