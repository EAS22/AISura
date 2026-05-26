// Default AI credentials embedded at build-time via vite.config.ts.
//
// SECURITY NOTE: This is NOT real security. The XOR + base64 obfuscation
// only prevents trivial `strings <binary>` discovery. Anyone determined
// can recover the key. Strategy:
// - Use a free-tier key (Groq) where rate-limit is the worst-case impact.
// - Encourage users to bring own key for higher quotas.
// - Be ready to rotate via app update if abuse becomes severe.

const XOR_KEY = 'AISura.default.v1'

function deobfuscate(b64: string): string {
  if (!b64) return ''
  try {
    const binary = atob(b64)
    const bytes: number[] = []
    for (let i = 0; i < binary.length; i++) {
      bytes.push(binary.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length))
    }
    return String.fromCharCode(...bytes)
  } catch {
    return ''
  }
}

export const DEFAULT_AI_BASE_URL = __AISURA_DEFAULT_AI_BASE_URL__
export const DEFAULT_AI_MODEL = __AISURA_DEFAULT_AI_MODEL__
export const DEFAULT_AI_KEY = deobfuscate(__AISURA_DEFAULT_AI_KEY_OBF__)

export function hasDefaultKey(): boolean {
  return DEFAULT_AI_KEY.length > 0
}
