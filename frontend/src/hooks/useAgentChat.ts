import { useCallback, useMemo, useRef, useState } from 'react'
import { streamChat } from '../api/neuroSanClient'
import type { ChatMessage, OriginEntry, TokenAccounting } from '../api/types'
import { parseInvokedName } from '../utils/hopParsing'

export type ChatStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface HopLogEntry {
  id: number
  origin: OriginEntry[]
  message: ChatMessage
}

export interface AgentChatState {
  status: ChatStatus
  // The reliable "ancestor path" backbone of the chain, derived from origin.
  // Real traces show ancestor agents re-broadcast a child's "Invoking: X"
  // progress messages at their OWN (shallower) origin depth, so origin alone
  // flickers if trusted naively on every hop. The backbone only grows when a
  // hop's origin is strictly deeper than what we've already confirmed, and
  // only shrinks on an AGENT_TOOL_RESULT message (which reliably marks a
  // call actually returning to that depth).
  backboneChain: OriginEntry[]
  // Deep FTS-network specialists (SNPDiagnosticsAgent, ITSMRouterAgent, the
  // coded tools, etc.) never get their own origin depth in the stream at
  // all -- they only surface as "Invoking: `X` with:" text on messages whose
  // origin is still the shallow ancestor path. This tracks the most recent
  // such name so it can be appended to the backbone as the current tip.
  pendingInvocation: string | null
  hops: HopLogEntry[]
  finalText: string | null
  finalStructure: Record<string, unknown> | null
  tokenAccounting: TokenAccounting | null
  error: string | null
}

const initialState: AgentChatState = {
  status: 'idle',
  backboneChain: [],
  pendingInvocation: null,
  hops: [],
  finalText: null,
  finalStructure: null,
  tokenAccounting: null,
  error: null,
}

export function useAgentChat(agentName: string) {
  const [state, setState] = useState<AgentChatState>(initialState)
  const abortRef = useRef<AbortController | null>(null)
  const hopIdRef = useRef(0)

  const submit = useCallback(
    async (userMessageText: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      hopIdRef.current = 0

      setState({ ...initialState, status: 'streaming' })

      try {
        for await (const event of streamChat({
          agentName,
          userMessageText,
          signal: controller.signal,
        })) {
          if (controller.signal.aborted) return

          if (event.kind === 'hop') {
            const origin = event.message.origin ?? []
            const invokedName = parseInvokedName(event.message.text)

            setState((prev) => {
              let backbone = prev.backboneChain
              if (origin.length > backbone.length) {
                backbone = origin
              } else if (event.message.type === 'AGENT_TOOL_RESULT') {
                backbone = origin
              }

              return {
                ...prev,
                backboneChain: backbone,
                pendingInvocation: invokedName,
                hops: [
                  ...prev.hops,
                  { id: hopIdRef.current++, origin, message: event.message },
                ],
              }
            })
          } else if (event.kind === 'final_answer') {
            setState((prev) => ({
              ...prev,
              finalText: event.message.text ?? null,
              finalStructure:
                (event.message.structure as Record<string, unknown> | null) ?? null,
            }))
          } else if (event.kind === 'token_accounting') {
            setState((prev) => ({
              ...prev,
              tokenAccounting: event.message.structure as TokenAccounting,
            }))
          }
        }

        if (!controller.signal.aborted) {
          setState((prev) => ({ ...prev, status: 'done', pendingInvocation: null }))
        }
      } catch (err) {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Unknown error contacting the agent service.'
        setState((prev) => ({ ...prev, status: 'error', error: message }))
      }
    },
    [agentName],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initialState)
  }, [])

  const currentChain = useMemo(
    () =>
      state.pendingInvocation
        ? [...state.backboneChain, { tool: state.pendingInvocation }]
        : state.backboneChain,
    [state.backboneChain, state.pendingInvocation],
  )

  return { ...state, currentChain, submit, reset }
}
