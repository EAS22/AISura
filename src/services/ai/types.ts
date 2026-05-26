// Core AI types — shared across providers and modes.

export type AIProviderId =
  | 'groq'
  | 'openai'
  | 'openrouter'
  | 'deepseek'
  | 'mistral'
  | 'together'
  | 'anyscale'
  | 'ollama'
  | 'lmstudio'
  | 'custom'

export interface AIProviderPreset {
  id: AIProviderId
  label: string
  baseUrl: string
  defaultModel: string
  needsKey: boolean
  /** Suggested models surfaced in UI as quick picks (still free-form). */
  suggestedModels: string[]
  description: string
}

export interface AIConfig {
  id: string
  enabled: boolean
  provider: AIProviderId
  base_url: string
  api_key: string
  model: string
  temperature: number
  privacy_acknowledged: boolean
  created_at: string
  updated_at: string
}

export interface AIResolvedCredentials {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
}

// Chat message structure compatible with OpenAI Chat Completions API.
export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  /** Only set when role === 'assistant' and the model called tools. */
  tool_calls?: AIToolCall[]
  /** Only set when role === 'tool' — links back to the assistant's tool_call.id. */
  tool_call_id?: string
  /** Display name for tool messages. */
  name?: string
}

export interface AIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string per OpenAI spec
  }
}

export interface AIToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown> // JSON Schema
  }
}

export interface AIChatCompletionRequest {
  messages: AIChatMessage[]
  tools?: AIToolDefinition[]
  tool_choice?: 'auto' | 'none' | 'required'
  temperature?: number
  max_tokens?: number
  /** When true, request structured JSON object output (where supported). */
  jsonObjectMode?: boolean
}

export interface AIChatCompletionResponse {
  message: AIChatMessage
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | string
  usage?: { prompt: number; completion: number; total: number }
}

// =================================================================
// Quick reply / structured UI payloads (host-side only — never sent to AI)
// =================================================================

/**
 * Rich choice card displayed below a tool message. Click sends a
 * structured user message back into the conversation.
 */
export interface AIChoice {
  /** Stable id (warga id, template id, etc.) */
  id: string
  /** Bold first-line label, e.g. nama warga or nama template. */
  primary: string
  /** Optional subtitle line — masked NIK + L/P + umur, or template description. */
  secondary?: string
  /** Optional third line — alamat singkat, dll. */
  tertiary?: string
  /** Optional badges row — small pill tags. */
  badges?: string[]
  /** Full hover/tooltip text (e.g. alamat lengkap that gets truncated). */
  fullText?: string
}

/** Kind of follow-up action that should fire when user picks a choice. */
export type AIChoiceKind = 'pick_template' | 'pick_warga' | 'generic'

export interface AIQuickReplies {
  kind: AIChoiceKind
  /** Heading shown above the choice list. */
  prompt?: string
  /** Optional slot number when kind === 'pick_warga'. */
  slot?: number
  choices: AIChoice[]
  /** When true, host should hint the user to refine query (>5 ambiguous). */
  needsRefine?: boolean
}

/**
 * Status snapshot of the in-progress letter. Rendered as a sticky
 * panel in the AI drawer, with a "Preview Surat" button when ready.
 */
export interface AILetterStatus {
  templateId: string
  templateName: string
  /** Slot info for warga assignments. */
  slots: { slot: number; nama?: string }[]
  /** Custom tokens still empty. */
  missingCustom: string[]
  /** All custom tokens from this template (filled + unfilled), original casing. */
  allCustomTokens: string[]
  /** Which date will be used (string display). */
  defaultDate: string
  /** Preview of the next nomor surat. */
  nomorPreview: string
  readyToPreview: boolean
  /** Resolved values map for preview when readyToPreview is true. */
  values?: Record<string, string>
  /** State machine — current step in the letter creation flow. */
  currentStep: FlowStep
  /** Next warga slot to fill (when currentStep === 'ask_warga'). */
  nextWargaSlot?: number
  /** Next custom token to fill (when currentStep === 'ask_custom'). */
  nextCustomToken?: string
}

export type FlowStep = 'ask_template' | 'ask_warga' | 'ask_custom' | 'ready'
