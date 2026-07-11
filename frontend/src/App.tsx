import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Header } from './components/layout/Header'
import { ScenarioSidebar } from './components/ticket/ScenarioSidebar'
import { TicketInputPanel } from './components/ticket/TicketInputPanel'
import { AgentActivityPanel } from './components/activity/AgentActivityPanel'
import { AgentActivityOverlay } from './components/activity/AgentActivityOverlay'
import { ResultCard } from './components/result/ResultCard'
import { ErrorBanner } from './components/common/ErrorBanner'
import { TokenAccountingFooter } from './components/common/TokenAccountingFooter'
import { useAgentChat } from './hooks/useAgentChat'
import type { Scenario } from './data/scenarios'

const AGENT_NAME = 'sap_l15_hub/sap_l15_hub'
const DARK_MODE_STORAGE_KEY = 'sap-l15-console-dark-mode'

function getInitialDarkMode(): boolean {
  const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
  if (stored != null) return stored === 'true'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function App() {
  const [dark, setDark] = useState(getInitialDarkMode)
  const [ticketText, setTicketText] = useState('')
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

  const { status, currentChain, hops, finalText, tokenAccounting, error, submit } =
    useAgentChat(AGENT_NAME)

  const resultRef = useRef<HTMLDivElement>(null)
  const prevStatusRef = useRef(status)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(dark))
  }, [dark])

  // Once the overlay's own "agents are working" moment ends, pull focus down
  // to the result so the reveal feels intentional rather than leaving the
  // user staring at wherever the page happened to be scrolled.
  useEffect(() => {
    if (prevStatusRef.current === 'streaming' && status === 'done') {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    prevStatusRef.current = status
  }, [status])

  const handleSelectScenario = useCallback((scenario: Scenario) => {
    setSelectedScenarioId(scenario.id)
    setTicketText(scenario.ticket)
  }, [])

  const handleTicketChange = useCallback((value: string) => {
    setTicketText(value)
    setSelectedScenarioId(null)
  }, [])

  const handleSubmit = useCallback(() => {
    if (ticketText.trim().length === 0) return
    void submit(ticketText.trim())
  }, [ticketText, submit])

  return (
    <AppShell
      header={<Header dark={dark} onToggleDark={() => setDark((d) => !d)} />}
      sidebar={<ScenarioSidebar selectedId={selectedScenarioId} onSelect={handleSelectScenario} />}
    >
      <TicketInputPanel
        value={ticketText}
        onChange={handleTicketChange}
        onSubmit={handleSubmit}
        isStreaming={status === 'streaming'}
      />

      {error && <ErrorBanner message={error} />}

      <AgentActivityPanel currentChain={currentChain} hops={hops} status={status} dark={dark} />

      <div ref={resultRef}>
        <ResultCard finalText={finalText} />
      </div>

      {tokenAccounting && <TokenAccountingFooter accounting={tokenAccounting} />}

      <AgentActivityOverlay status={status} hops={hops} currentChain={currentChain} dark={dark} />
    </AppShell>
  )
}

export default App
