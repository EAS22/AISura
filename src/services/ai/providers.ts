import type { AIProviderPreset, AIProviderId } from './types'

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    needsKey: true,
    suggestedModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'qwen/qwen3-32b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
    ],
    description: 'Free tier inference cepat. Default bawaan AISura.',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    needsKey: true,
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
    description: 'Resmi dari OpenAI. Berbayar per token.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    needsKey: true,
    suggestedModels: [
      'meta-llama/llama-3.3-70b-instruct',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o-mini',
      'google/gemini-2.0-flash-001',
    ],
    description: 'Aggregator banyak model dengan satu API key.',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    needsKey: true,
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    description: 'Murah & tetap kompetitif untuk task umum.',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    needsKey: true,
    suggestedModels: [
      'mistral-small-latest',
      'mistral-large-latest',
      'open-mistral-nemo',
    ],
    description: 'Penyedia model dari Eropa.',
  },
  {
    id: 'together',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    needsKey: true,
    suggestedModels: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
    ],
    description: 'Hosted open-source models.',
  },
  {
    id: 'anyscale',
    label: 'Anyscale',
    baseUrl: 'https://api.endpoints.anyscale.com/v1',
    defaultModel: 'meta-llama/Meta-Llama-3-70B-Instruct',
    needsKey: true,
    suggestedModels: ['meta-llama/Meta-Llama-3-70B-Instruct'],
    description: 'Endpoint Llama dari Anyscale.',
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    needsKey: false,
    suggestedModels: ['llama3.2', 'qwen2.5', 'mistral', 'gemma2'],
    description: 'Jalan lokal di laptop. Install Ollama dan pull model dulu.',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (Local)',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    needsKey: false,
    suggestedModels: ['local-model'],
    description: 'LM Studio local server (OpenAI-compatible).',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    needsKey: true,
    suggestedModels: [],
    description: 'Endpoint apapun yang implement OpenAI Chat Completions API.',
  },
]

export function getProviderPreset(id: AIProviderId): AIProviderPreset {
  return AI_PROVIDER_PRESETS.find((p) => p.id === id) ?? AI_PROVIDER_PRESETS[AI_PROVIDER_PRESETS.length - 1]
}

export function detectProviderFromUrl(baseUrl: string): AIProviderId {
  const url = baseUrl.toLowerCase()
  if (url.includes('groq.com')) return 'groq'
  if (url.includes('openai.com')) return 'openai'
  if (url.includes('openrouter.ai')) return 'openrouter'
  if (url.includes('deepseek.com')) return 'deepseek'
  if (url.includes('mistral.ai')) return 'mistral'
  if (url.includes('together.xyz')) return 'together'
  if (url.includes('anyscale.com')) return 'anyscale'
  if (url.includes('11434')) return 'ollama'
  if (url.includes('1234')) return 'lmstudio'
  return 'custom'
}
