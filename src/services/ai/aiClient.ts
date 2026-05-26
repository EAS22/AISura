// OpenAI-compatible Chat Completions client.
// Works with Groq, OpenAI, OpenRouter, DeepSeek, Mistral, Together,
// Anyscale, Ollama, LM Studio, and any custom endpoint that implements
// /chat/completions per OpenAI's contract.

import type {
  AIChatCompletionRequest,
  AIChatCompletionResponse,
  AIChatMessage,
  AIResolvedCredentials,
  AIToolCall,
} from './types'

export interface AIClientError extends Error {
  status?: number
  body?: string
  isRateLimit: boolean
  isAuth: boolean
  isNetwork: boolean
}

function makeError(message: string, init: Partial<AIClientError>): AIClientError {
  const err = new Error(message) as AIClientError
  err.status = init.status
  err.body = init.body
  err.isRateLimit = init.isRateLimit ?? false
  err.isAuth = init.isAuth ?? false
  err.isNetwork = init.isNetwork ?? false
  return err
}

function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/** Non-streaming chat completion. Returns parsed assistant message. */
export async function chatCompletion(
  creds: AIResolvedCredentials,
  request: AIChatCompletionRequest,
  signal?: AbortSignal,
): Promise<AIChatCompletionResponse> {
  const url = buildUrl(creds.baseUrl, '/chat/completions')

  const body: Record<string, unknown> = {
    model: creds.model,
    messages: request.messages,
    temperature: request.temperature ?? creds.temperature ?? 0.3,
  }
  if (typeof request.max_tokens === 'number') body.max_tokens = request.max_tokens
  if (request.tools && request.tools.length > 0) {
    body.tools = request.tools
    body.tool_choice = request.tool_choice ?? 'auto'
  }
  if (request.jsonObjectMode) {
    body.response_format = { type: 'json_object' }
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(creds.apiKey ? { Authorization: `Bearer ${creds.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw makeError(
      `Tidak dapat menghubungi AI provider (${creds.baseUrl}). Cek koneksi internet atau alamat endpoint.`,
      { isNetwork: true },
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const isAuth = res.status === 401 || res.status === 403
    const isRateLimit = res.status === 429
    const human =
      isAuth
        ? 'API key ditolak (401/403). Cek lagi key di Pengaturan AI.'
        : isRateLimit
          ? 'Rate limit tercapai. Tunggu sebentar atau pakai API key sendiri.'
          : `AI provider mengembalikan error ${res.status}.`
    throw makeError(human, { status: res.status, body: text, isAuth, isRateLimit })
  }

  const data = (await res.json()) as ChatCompletionRaw
  const choice = data.choices?.[0]
  if (!choice) throw makeError('Respons AI tidak berisi pesan.', {})

  const message: AIChatMessage = {
    role: 'assistant',
    content: choice.message?.content ?? '',
  }
  if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
    message.tool_calls = choice.message.tool_calls.map<AIToolCall>((c) => ({
      id: c.id,
      type: 'function',
      function: {
        name: c.function?.name ?? '',
        arguments: c.function?.arguments ?? '{}',
      },
    }))
  }

  return {
    message,
    finishReason: choice.finish_reason || 'stop',
    usage: data.usage
      ? {
          prompt: data.usage.prompt_tokens || 0,
          completion: data.usage.completion_tokens || 0,
          total: data.usage.total_tokens || 0,
        }
      : undefined,
  }
}

/**
 * Streaming chat completion. Calls onDelta with text chunks as they arrive.
 * Returns the final assembled assistant message + any tool calls.
 */
export async function streamChatCompletion(
  creds: AIResolvedCredentials,
  request: AIChatCompletionRequest,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<AIChatCompletionResponse> {
  const url = buildUrl(creds.baseUrl, '/chat/completions')

  const body: Record<string, unknown> = {
    model: creds.model,
    messages: request.messages,
    stream: true,
    temperature: request.temperature ?? creds.temperature ?? 0.3,
  }
  if (typeof request.max_tokens === 'number') body.max_tokens = request.max_tokens
  if (request.tools && request.tools.length > 0) {
    body.tools = request.tools
    body.tool_choice = request.tool_choice ?? 'auto'
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(creds.apiKey ? { Authorization: `Bearer ${creds.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw makeError(
      `Tidak dapat menghubungi AI provider (${creds.baseUrl}). Cek koneksi internet atau alamat endpoint.`,
      { isNetwork: true },
    )
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    const isAuth = res.status === 401 || res.status === 403
    const isRateLimit = res.status === 429
    const human =
      isAuth
        ? 'API key ditolak (401/403). Cek lagi key di Pengaturan AI.'
        : isRateLimit
          ? 'Rate limit tercapai. Tunggu sebentar atau pakai API key sendiri.'
          : `AI provider mengembalikan error ${res.status}.`
    throw makeError(human, { status: res.status, body: text, isAuth, isRateLimit })
  }

  // Lazy-load eventsource-parser only when streaming is needed
  const { createParser } = await import('eventsource-parser')

  let assembledContent = ''
  const toolCallBuffers: Record<number, ToolCallBuffer> = {}
  let finishReason = 'stop'
  let usage: AIChatCompletionResponse['usage']

  const parser = createParser({
    onEvent: (evt) => {
      if (!evt.data || evt.data === '[DONE]') return
      let chunk: ChatCompletionChunkRaw
      try {
        chunk = JSON.parse(evt.data) as ChatCompletionChunkRaw
      } catch {
        return
      }
      const choice = chunk.choices?.[0]
      if (!choice) {
        if (chunk.usage) {
          usage = {
            prompt: chunk.usage.prompt_tokens || 0,
            completion: chunk.usage.completion_tokens || 0,
            total: chunk.usage.total_tokens || 0,
          }
        }
        return
      }
      if (choice.finish_reason) finishReason = choice.finish_reason
      const delta = choice.delta
      if (!delta) return
      if (typeof delta.content === 'string' && delta.content) {
        assembledContent += delta.content
        onDelta(delta.content)
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          const buf = (toolCallBuffers[idx] ??= { id: '', name: '', args: '' })
          if (tc.id) buf.id = tc.id
          if (tc.function?.name) buf.name = tc.function.name
          if (tc.function?.arguments) buf.args += tc.function.arguments
        }
      }
    },
  })

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    parser.feed(decoder.decode(value, { stream: true }))
  }

  const message: AIChatMessage = { role: 'assistant', content: assembledContent }
  const toolCallEntries = Object.entries(toolCallBuffers)
    .map(([idx, b]) => ({ idx: Number(idx), b }))
    .sort((a, b) => a.idx - b.idx)
  if (toolCallEntries.length > 0) {
    message.tool_calls = toolCallEntries.map(({ b }) => ({
      id: b.id,
      type: 'function' as const,
      function: { name: b.name, arguments: b.args || '{}' },
    }))
  }

  return { message, finishReason, usage }
}

interface ToolCallBuffer { id: string; name: string; args: string }

// ---- Raw provider response types (loosely typed) ----

interface ChatCompletionRaw {
  choices?: {
    message?: {
      content?: string
      tool_calls?: Array<{
        id: string
        type?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string
  }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

interface ChatCompletionChunkRaw {
  choices?: {
    delta?: {
      content?: string
      tool_calls?: Array<{
        index?: number
        id?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string | null
  }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}
