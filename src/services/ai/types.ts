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
