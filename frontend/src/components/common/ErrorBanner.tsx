interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
      <div className="flex items-start gap-2">
        <span aria-hidden="true">⚠</span>
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-danger/70 hover:text-danger"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  )
}
