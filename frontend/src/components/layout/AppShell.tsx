import type { ReactNode } from 'react'

interface AppShellProps {
  header: ReactNode
  sidebar: ReactNode
  children: ReactNode
}

export function AppShell({ header, sidebar, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      {header}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-6">
        <aside className="w-72 shrink-0">{sidebar}</aside>
        <main className="min-w-0 flex-1 space-y-6">{children}</main>
      </div>
    </div>
  )
}
