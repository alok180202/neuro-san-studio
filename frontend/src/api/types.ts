// Shapes mirror neuro_san's wire format exactly (see
// venv/Lib/site-packages/neuro_san/api/grpc/chat.proto and
// neuro_san/internals/messages/origination.py). Do not rename these fields --
// they are not ours to redesign, they come straight off the NDJSON stream.

export type ChatMessageType =
  | 'UNKNOWN'
  | 'SYSTEM'
  | 'HUMAN'
  | 'AI'
  | 'AGENT'
  | 'AGENT_FRAMEWORK'
  | 'AGENT_TOOL_RESULT'
  | 'AGENT_PROGRESS'

export interface OriginEntry {
  tool: string
  instantiation_index?: number
}

export interface ChatMessage {
  type: ChatMessageType
  text?: string | null
  origin?: OriginEntry[] | null
  structure?: Record<string, unknown> | null
  chat_context?: Record<string, unknown> | null
  tool_result_origin?: OriginEntry[] | null
  sly_data?: Record<string, unknown> | null
}

export interface StreamingChatResponseEnvelope {
  response?: ChatMessage
}

export type ClassifiedEventKind = 'final_answer' | 'token_accounting' | 'hop' | 'other'

export interface ClassifiedEvent {
  kind: ClassifiedEventKind
  message: ChatMessage
}

export interface TokenAccounting {
  total_tokens?: number
  total_cost?: number
  models?: Record<string, unknown>
  [key: string]: unknown
}
