export * from './types'
export * from './providers'
export * from './aiConfigService'
export * from './privacy'
export * from './aiClient'
export * from './tools'
export * from './prompts'
export { hasDefaultKey, DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL } from './defaultCreds'

import type { AIResolvedCredentials } from './types'
import { chatCompletion } from './aiClient'

/**
 * Quick ping: send a 1-token prompt and check the provider responds OK.
 * Used by the "Test connection" button in AI Settings.
 */
export async function testAIConnection(
  creds: AIResolvedCredentials,
): Promise<{ ok: true; sample: string } | { ok: false; error: string }> {
  try {
    const res = await chatCompletion(creds, {
      messages: [
        { role: 'system', content: 'Reply with the single word: OK' },
        { role: 'user', content: 'ping' },
      ],
      max_tokens: 5,
      temperature: 0,
    })
    return { ok: true, sample: (res.message.content || '').slice(0, 40) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}
