interface HeaderProps {
  dark: boolean
  onToggleDark: () => void
}

export function Header({ dark, onToggleDark }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-fg">SAP L1.5 Diagnostic Console</h1>
        <p className="text-sm text-fg-muted">Multi-agent ticket triage &amp; routing</p>
      </div>
      <button
        type="button"
        onClick={onToggleDark}
        className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-fg-muted transition hover:text-fg"
        aria-label="Toggle dark mode"
      >
        {dark ? '☀ Light' : '☾ Dark'}
      </button>
    </header>
  )
}
