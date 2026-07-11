import type { Scenario } from '../../data/scenarios'

interface ScenarioListItemProps {
  scenario: Scenario
  selected: boolean
  onSelect: (scenario: Scenario) => void
}

export function ScenarioListItem({ scenario, selected, onSelect }: ScenarioListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(scenario)}
      className={`w-full rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
        selected
          ? 'border-accent bg-accent-soft text-fg'
          : 'border-border bg-surface text-fg-muted hover:border-accent/40 hover:text-fg'
      }`}
    >
      <div className="font-medium text-fg">{scenario.title}</div>
      <div className="mt-0.5 text-xs text-fg-muted">{scenario.expectation}</div>
    </button>
  )
}
