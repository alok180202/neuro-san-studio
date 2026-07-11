import { useEffect, useRef } from 'react'
import { useReactFlow } from 'reactflow'
import { NODE_HEIGHT, NODE_WIDTH, STATIC_LAYOUT } from './agentGraphLayout'
import type { ChatStatus } from '../../hooks/useAgentChat'

interface AgentGraphCameraProps {
  status: ChatStatus
  activeId: string | null
}

// How long the full-network overview stays on screen before the camera
// starts following the active node, the first time a run starts.
const INITIAL_OVERVIEW_MS = 900
const FOCUS_ZOOM = 1.2
const TRANSITION_MS = 550

/**
 * Renders nothing -- just drives the camera. Shows the whole topology first
 * (react-flow's own `fitView` prop already does that on mount), then once a
 * short overview beat has played, follows the active node closely so the
 * currently-running agent stays readable instead of being one tiny box
 * among nineteen. Zooms back out to the full graph the moment the run stops
 * streaming, so the complete path taken is visible at a glance.
 */
export function AgentGraphCamera({ status, activeId }: AgentGraphCameraProps) {
  const { setCenter, fitView } = useReactFlow()
  const overviewShownRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)
  const prevStatusRef = useRef(status)

  useEffect(() => {
    if (prevStatusRef.current !== 'streaming' && status === 'streaming') {
      overviewShownRef.current = false
    }
    prevStatusRef.current = status
  }, [status])

  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)

    if (status !== 'streaming' || !activeId) {
      fitView({ duration: TRANSITION_MS, padding: 0.18 })
      return
    }

    const position = STATIC_LAYOUT[activeId]
    if (!position) return

    const focusOnActiveNode = () => {
      setCenter(position.x + NODE_WIDTH / 2, position.y + NODE_HEIGHT / 2, {
        zoom: FOCUS_ZOOM,
        duration: TRANSITION_MS,
      })
    }

    if (!overviewShownRef.current) {
      overviewShownRef.current = true
      timeoutRef.current = window.setTimeout(focusOnActiveNode, INITIAL_OVERVIEW_MS)
    } else {
      focusOnActiveNode()
    }

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [status, activeId, setCenter, fitView])

  return null
}
