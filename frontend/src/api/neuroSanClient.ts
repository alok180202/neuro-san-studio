import type {
  ChatMessage,
  ClassifiedEvent,
  StreamingChatResponseEnvelope,
} from './types'

/**
 * Mirrors neuro_san's AnswerMessageFilter / TokenAccountingMessageFilter
 * (venv/Lib/site-packages/neuro_san/internals/filters/*.py) exactly, since
 * those are the ground truth for what counts as a "final answer" vs a
 * "token accounting" message vs an ordinary hop. The final-answer and
 * token-accounting checks must run before the generic hop check: both also
 * carry origin arrays of length <= 1 (they come from the front-man), so a
 * naive "has an origin -> hop" check would swallow them.
 */
export function classifyMessage(message: ChatMessage): ClassifiedEvent {
  const origin = message.origin ?? undefined
  const originLen = origin?.length ?? 0

  const isFinalAnswer =
    (message.type === 'AI' || message.type === 'AGENT_FRAMEWORK') &&
    originLen <= 1 &&
    (message.text != null || message.structure != null)

  if (isFinalAnswer) {
    return { kind: 'final_answer', message }
  }

  const isTokenAccounting =
    message.type === 'AGENT' &&
    originLen <= 1 &&
    message.structure != null &&
    (message.structure as Record<string, unknown>).total_tokens != null

  if (isTokenAccounting) {
    return { kind: 'token_accounting', message }
  }

  if (origin != null && origin.length > 0) {
    return { kind: 'hop', message }
  }

  return { kind: 'other', message }
}

export interface StreamChatOptions {
  agentName: string
  userMessageText: string
  signal?: AbortSignal
}

/**
 * Streams a single-turn chat against neuro-san's HTTP streaming_chat
 * endpoint. Transport is chunked HTTP NDJSON (Content-Type:
 * application/json-lines, one JSON object + "\n" per chunk) -- not
 * WebSocket, not SSE (confirmed against
 * neuro_san/service/http/handlers/streaming_chat_handler.py).
 */
export async function* streamChat(
  options: StreamChatOptions,
): AsyncGenerator<ClassifiedEvent, void, unknown> {
  const { agentName, userMessageText, signal } = options

  const response = await fetch(`/api/v1/${agentName}/streaming_chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_message: { type: 'HUMAN', text: userMessageText },
      chat_filter: { chat_filter_type: 'MAXIMAL' },
    }),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`streaming_chat request failed: ${response.status} ${response.statusText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)

        const event = parseLine(line)
        if (event) yield event

        newlineIndex = buffer.indexOf('\n')
      }
    }

    // Flush any trailing partial line left after the stream closes.
    const finalEvent = parseLine(buffer)
    if (finalEvent) yield finalEvent
  } finally {
    reader.releaseLock()
  }
}

function parseLine(line: string): ClassifiedEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  let envelope: StreamingChatResponseEnvelope
  try {
    envelope = JSON.parse(trimmed)
  } catch {
    // Never let a malformed line crash the stream -- skip it.
    return null
  }

  const message = envelope?.response
  if (!message) return null

  return classifyMessage(message)
}
