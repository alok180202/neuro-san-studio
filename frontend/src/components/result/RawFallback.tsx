interface RawFallbackProps {
  text: string
}

export function RawFallback({ text }: RawFallbackProps) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-surface-alt/50 p-3 font-mono text-xs text-fg-muted">
      {text}
    </pre>
  )
}
