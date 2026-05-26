import { v4 as uuid } from 'uuid'
import { select, execute } from '../db'
import type { AIConfig, AIProviderId, AIResolvedCredentials } from './types'
import { getProviderPreset } from './providers'
import { DEFAULT_AI_BASE_URL, DEFAULT_AI_KEY, DEFAULT_AI_MODEL, hasDefaultKey } from './defaultCreds'

interface AIConfigRow {
  id: string
  enabled: number
  use_default: number
  provider: string
  base_url: string
  api_key: string
  model: string
  temperature: number
  privacy_acknowledged: number
  created_at: string
  updated_at: string
}

function rowToConfig(row: AIConfigRow): AIConfig {
  return {
    id: row.id,
    enabled: row.enabled === 1,
    use_default: row.use_default === 1,
    provider: (row.provider || 'groq') as AIProviderId,
    base_url: row.base_url || '',
    api_key: row.api_key || '',
    model: row.model || '',
    temperature: typeof row.temperature === 'number' ? row.temperature : 0.3,
    privacy_acknowledged: row.privacy_acknowledged === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function getAIConfig(): Promise<AIConfig | null> {
  const rows = await select<AIConfigRow>('SELECT * FROM ai_config LIMIT 1')
  return rows.length > 0 ? rowToConfig(rows[0]) : null
}

export interface AIConfigInput {
  enabled?: boolean
  use_default?: boolean
  provider?: AIProviderId
  base_url?: string
  api_key?: string
  model?: string
  temperature?: number
  privacy_acknowledged?: boolean
}

export async function saveAIConfig(input: AIConfigInput): Promise<AIConfig> {
  const existing = await getAIConfig()
  const now = new Date().toISOString()

  if (existing) {
    const next: AIConfig = {
      ...existing,
      ...input,
      updated_at: now,
    }
    await execute(
      `UPDATE ai_config SET enabled=$1, use_default=$2, provider=$3, base_url=$4, api_key=$5, model=$6, temperature=$7, privacy_acknowledged=$8, updated_at=$9 WHERE id=$10`,
      [
        next.enabled ? 1 : 0,
        next.use_default ? 1 : 0,
        next.provider,
        next.base_url,
        next.api_key,
        next.model,
        next.temperature,
        next.privacy_acknowledged ? 1 : 0,
        now,
        existing.id,
      ]
    )
    return next
  }

  const id = uuid()
  const initial: AIConfig = {
    id,
    enabled: input.enabled ?? false,
    use_default: input.use_default ?? true,
    provider: input.provider ?? 'groq',
    base_url: input.base_url ?? '',
    api_key: input.api_key ?? '',
    model: input.model ?? '',
    temperature: input.temperature ?? 0.3,
    privacy_acknowledged: input.privacy_acknowledged ?? false,
    created_at: now,
    updated_at: now,
  }

  await execute(
    `INSERT INTO ai_config (id, enabled, use_default, provider, base_url, api_key, model, temperature, privacy_acknowledged, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      initial.id,
      initial.enabled ? 1 : 0,
      initial.use_default ? 1 : 0,
      initial.provider,
      initial.base_url,
      initial.api_key,
      initial.model,
      initial.temperature,
      initial.privacy_acknowledged ? 1 : 0,
      now,
      now,
    ]
  )
  return initial
}

/**
 * Resolve effective credentials based on config + embedded defaults.
 * Returns null if AI cannot be used (disabled, privacy not acknowledged,
 * or default key missing & no custom key).
 */
export function resolveCredentials(config: AIConfig | null): AIResolvedCredentials | null {
  if (!config || !config.enabled) return null
  // Privacy acknowledgement is mandatory regardless of provider source.
  if (!config.privacy_acknowledged) return null

  if (config.use_default) {
    if (!hasDefaultKey()) return null
    return {
      baseUrl: DEFAULT_AI_BASE_URL,
      apiKey: DEFAULT_AI_KEY,
      model: DEFAULT_AI_MODEL,
      temperature: config.temperature,
      isDefault: true,
    }
  }

  // Custom credentials
  const preset = getProviderPreset(config.provider)
  const baseUrl = (config.base_url || preset.baseUrl).trim()
  const model = (config.model || preset.defaultModel).trim()

  if (!baseUrl || !model) return null
  // For local providers (ollama / lmstudio) key is optional
  if (preset.needsKey && !config.api_key.trim()) return null

  return {
    baseUrl,
    apiKey: config.api_key.trim(),
    model,
    temperature: config.temperature,
    isDefault: false,
  }
}
