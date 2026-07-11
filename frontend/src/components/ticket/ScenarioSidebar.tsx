import { SCENARIOS, type Scenario } from '../../data/scenarios'
import { ScenarioListItem } from './ScenarioListItem'

interface ScenarioSidebarProps {
  selectedId: string | null
  onSelect: (scenario: Scenario) => void
}

export function ScenarioSidebar({ selectedId, onSelect }: ScenarioSidebarProps) {
  return (
    <div className="space-y-3">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        Example tickets
      </h2>
      <div className="space-y-2">
        {SCENARIOS.map((scenario) => (
          <ScenarioListItem
            key={scenario.id}
            scenario={scenario}
            selected={scenario.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
