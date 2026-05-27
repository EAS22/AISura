import { v4 as uuid } from 'uuid'
import { execute, select } from '../db'
import type { AIProviderId, AIProviderProfile } from './types'

interface AIProviderProfileRow {
  id: string
  label: string
  provider: string
  base_url: string
  api_key: string
  model: string
  temperature: number
  created_at: string
  updated_at: string
}

function rowToProfile(row: AIProviderProfileRow): AIProviderProfile {
  return {
    id: row.id,
    label: row.label,
    provider: (row.provider || 'custom') as AIProviderId,
    base_url: row.base_url || '',
    api_key: row.api_key || '',
    model: row.model || '',
    temperature: typeof row.temperature === 'number' ? row.temperature : 0.3,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listAIProviderProfiles(): Promise<AIProviderProfile[]> {
  const rows = await select<AIProviderProfileRow>(
    'SELECT * FROM ai_provider_profiles ORDER BY label COLLATE NOCASE ASC',
  )
  return rows.map(rowToProfile)
}

export interface SaveAIProviderProfileInput {
  id?: string
  label: string
  provider: AIProviderId
  base_url: string
  api_key: string
  model: string
  temperature: number
}

export async function saveAIProviderProfile(input: SaveAIProviderProfileInput): Promise<AIProviderProfile> {
  const now = new Date().toISOString()
  if (input.id) {
    await execute(
      `UPDATE ai_provider_profiles SET label=$1, provider=$2, base_url=$3, api_key=$4, model=$5, temperature=$6, updated_at=$7 WHERE id=$8`,
      [
        input.label,
        input.provider,
        input.base_url,
        input.api_key,
        input.model,
        input.temperature,
        now,
        input.id,
      ],
    )
    return {
      id: input.id,
      label: input.label,
      provider: input.provider,
      base_url: input.base_url,
      api_key: input.api_key,
      model: input.model,
      temperature: input.temperature,
      created_at: now,
      updated_at: now,
    }
  }

  const id = uuid()
  await execute(
    `INSERT INTO ai_provider_profiles (id, label, provider, base_url, api_key, model, temperature, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      input.label,
      input.provider,
      input.base_url,
      input.api_key,
      input.model,
      input.temperature,
      now,
      now,
    ],
  )
  return {
    id,
    label: input.label,
    provider: input.provider,
    base_url: input.base_url,
    api_key: input.api_key,
    model: input.model,
    temperature: input.temperature,
    created_at: now,
    updated_at: now,
  }
}

export async function deleteAIProviderProfile(id: string): Promise<void> {
  await execute('DELETE FROM ai_provider_profiles WHERE id=$1', [id])
}
