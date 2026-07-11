import { Spinner } from '../common/Spinner'

interface TicketInputPanelProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isStreaming: boolean
}

export function TicketInputPanel({ value, onChange, onSubmit, isStreaming }: TicketInputPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <label htmlFor="ticket-text" className="mb-2 block text-sm font-medium text-fg">
        Ticket text
      </label>
      <textarea
        id="ticket-text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste a SAP support ticket, alert, or incident description..."
        rows={6}
        className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-muted/70 focus:border-accent focus:outline-none"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-fg-muted">
          {isStreaming ? 'Agents are triaging this ticket...' : 'Pick an example or paste your own ticket.'}
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isStreaming || value.trim().length === 0}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStreaming && <Spinner size={14} className="border-accent-fg/40 border-t-accent-fg" />}
          {isStreaming ? 'Running' : 'Run diagnosis'}
        </button>
      </div>
    </section>
  )
}
