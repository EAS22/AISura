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

function makeError(message: string, init: Partial<AIClientError>, cause?: unknown): AIClientError {
  const err = new Error(message) as AIClientError
  err.status = init.status
  err.body = init.body
  err.isRateLimit = init.isRateLimit ?? false
  err.isAuth = init.isAuth ?? false
  err.isNetwork = init.isNetwork ?? false
  if (cause !== undefined) {
    try {
      ;(err as Error & { cause?: unknown }).cause = cause
    } catch { /* older runtimes */ }
  }
  return err
}

/** Strip control characters that would break HTTP header serialization. */
function sanitizeHeaderValue(input: string): string {
  // Headers must not contain CR/LF or other control chars (0x00-0x1F except 0x09 tab is ok-ish).
  // Also strip soft hyphen, zero-width chars, NBSP that often hitch a ride from copy-paste.
  return input
    .replace(/[\u0000-\u0008\u000A-\u001F\u007F]/g, '')
    .replace(/\u00AD/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
}

/**
 * Build a request URL with strict validation. WebKit (Tauri on Linux) throws
 * a generic "The string did not match the expected pattern." when fetch
 * receives a malformed URL, which is opaque to users. We surface a clearer
 * message with the offending input.
 */
function buildUrl(baseUrl: string, path: string): string {
  const cleaned = sanitizeHeaderValue(baseUrl)
  if (!cleaned) {
    throw makeError('Base URL kosong. Cek pengaturan AI.', {})
  }
  // Validate it parses as a URL.
  try {
    const u = new URL(cleaned)
    if (!/^https?:$/.test(u.protocol)) {
      throw new Error(`Protokol tidak didukung: ${u.protocol}`)
    }
  } catch (err) {
    throw makeError(
      `Base URL tidak valid: "${baseUrl}". ${err instanceof Error ? err.message : ''}`.trim(),
      {},
      err,
    )
  }
  const base = cleaned.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/** Build Authorization header safely. Empty key returns no header pair. */
function buildAuthHeader(apiKey: string): Record<string, string> {
  const cleaned = sanitizeHeaderValue(apiKey)
  if (!cleaned) return {}
  return { Authorization: `Bearer ${cleaned}` }
}

/**
 * List available models from an OpenAI-compatible endpoint.
 * Returns an array of model id strings sorted alphabetically.
 */
export async function listModels(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const url = buildUrl(baseUrl, '/models')
  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      signal,
      headers: {
        Accept: 'application/json',
        ...buildAuthHeader(apiKey),
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[AI] listModels fetch error', err)
    throw makeError(
      `Tidak dapat menghubungi ${baseUrl}. ${detail}`.trim(),
      { isNetwork: true },
      err,
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const isAuth = res.status === 401 || res.status === 403
    const isRateLimit = res.status === 429
    const human = isAuth
      ? 'API key ditolak (401/403).'
      : isRateLimit
        ? 'Rate limit tercapai saat fetch model.'
        : `Provider mengembalikan error ${res.status} saat fetch model.`
    throw makeError(human, { status: res.status, body: text, isAuth, isRateLimit })
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw makeError('Respons /models bukan JSON yang valid.', {})
  }
  // OpenAI-compatible spec: { data: [{ id: string }, ...] }
  // Some providers (Ollama) return { data: [...] } as well, but field may be 'name'.
  if (data && typeof data === 'object' && 'data' in data) {
    const arr = (data as { data: unknown }).data
    if (Array.isArray(arr)) {
      const ids = arr
        .map((m) => {
          if (m && typeof m === 'object') {
            const obj = m as Record<string, unknown>
            if (typeof obj.id === 'string') return obj.id
            if (typeof obj.name === 'string') return obj.name
          }
          return ''
        })
        .filter((s) => s.length > 0)
      return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b))
    }
  }
  // Some servers (Ollama legacy) return { models: [{ name }, ...] }
  if (data && typeof data === 'object' && 'models' in data) {
    const arr = (data as { models: unknown }).models
    if (Array.isArray(arr)) {
      const ids = arr
        .map((m) => (m && typeof m === 'object' && typeof (m as Record<string, unknown>).name === 'string'
          ? ((m as Record<string, unknown>).name as string)
          : ''))
        .filter((s) => s.length > 0)
      return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b))
    }
  }
  return []
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

  // Serialize body BEFORE fetch so any JSON / encoding error is caught
  // separately from network errors. Same applies to header building.
  let bodyJson: string
  try {
    bodyJson = JSON.stringify(body)
  } catch (err) {
    console.error('[AI] chatCompletion JSON.stringify error', { error: err, bodyPreview: { model: creds.model, messageCount: request.messages.length } })
    throw makeError(
      `Tidak bisa serialize request body ke JSON: ${err instanceof Error ? err.message : 'unknown'}`,
      {},
      err,
    )
  }

  let headers: Record<string, string>
  try {
    headers = {
      'Content-Type': 'application/json',
      ...buildAuthHeader(creds.apiKey),
    }
    // Validate header values manually so a malformed value doesn't crash the
    // entire fetch with an opaque WebKit message.
    for (const [k, v] of Object.entries(headers)) {
      if (/[\r\n\u0000-\u001F\u007F]/.test(v)) {
        throw new Error(`Header "${k}" mengandung karakter terlarang`)
      }
    }
  } catch (err) {
    console.error('[AI] chatCompletion header build error', err)
    throw makeError(
      `Header request tidak valid: ${err instanceof Error ? err.message : 'unknown'}`,
      {},
      err,
    )
  }

  console.debug('[AI] chatCompletion →', {
    url,
    model: creds.model,
    messageCount: request.messages.length,
    bodyBytes: bodyJson.length,
    jsonObjectMode: !!request.jsonObjectMode,
    hasTools: !!request.tools?.length,
  })

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      signal,
      headers,
      body: bodyJson,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[AI] chatCompletion fetch error', { url, model: creds.model, error: err })
    throw makeError(
      `Tidak dapat menghubungi AI provider (${creds.baseUrl}). ${detail}`.trim(),
      { isNetwork: true },
      err,
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
          : `AI provider mengembalikan error ${res.status}.${text ? ` Detail: ${text.slice(0, 200)}` : ''}`
    console.error('[AI] chatCompletion non-ok', { status: res.status, body: text.slice(0, 500) })
    throw makeError(human, { status: res.status, body: text, isAuth, isRateLimit })
  }

  let data: ChatCompletionRaw
  try {
    data = (await res.json()) as ChatCompletionRaw
  } catch (err) {
    const txt = await res.text().catch(() => '(failed to read body)')
    console.error('[AI] chatCompletion response JSON parse error', { error: err, bodySample: txt.slice(0, 500) })
    throw makeError(
      `Respons AI bukan JSON yang valid: ${err instanceof Error ? err.message : 'unknown'}`,
      {},
      err,
    )
  }
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
        ...buildAuthHeader(creds.apiKey),
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[AI] streamChatCompletion fetch error', { url, model: creds.model, error: err })
    throw makeError(
      `Tidak dapat menghubungi AI provider (${creds.baseUrl}). ${detail}`.trim(),
      { isNetwork: true },
      err,
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
          : `AI provider mengembalikan error ${res.status}.${text ? ` Detail: ${text.slice(0, 200)}` : ''}`
    console.error('[AI] streamChatCompletion non-ok', { status: res.status, body: text.slice(0, 500) })
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
