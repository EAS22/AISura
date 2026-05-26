// Privacy helpers — mask PII (NIK, NO_KK, etc.) before sending data
// to the AI provider. The AI sees enough to identify "which warga"
// while full identifiers stay local until the user confirms a pick.

import type { Warga } from '@/types'

/** Mask NIK / NO_KK to first 4 + last 4 digits. e.g. 3210221506570081 -> 3210********0081 */
export function maskNumeric(value?: string | null, opts?: { keepStart?: number; keepEnd?: number }): string {
  if (!value) return ''
  const digits = String(value).replace(/\s+/g, '')
  if (digits.length <= 8) return digits.replace(/./g, '*')
  const keepStart = opts?.keepStart ?? 4
  const keepEnd = opts?.keepEnd ?? 4
  if (digits.length <= keepStart + keepEnd) return digits
  const start = digits.slice(0, keepStart)
  const end = digits.slice(-keepEnd)
  const middle = '*'.repeat(Math.max(4, digits.length - keepStart - keepEnd))
  return `${start}${middle}${end}`
}

/** Mask a name: keep first word intact, show only initials for remaining words. */
export function maskName(value?: string | null): string {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0]
  const [first, ...rest] = parts
  const initials = rest.map((p) => `${p.charAt(0).toUpperCase()}.`).join(' ')
  return `${first} ${initials}`
}

/** Trim address to street segment + RT/RW only, drop other granular hints. */
export function maskAddress(alamat?: string | null, rt?: string | null, rw?: string | null): string {
  const a = (alamat || '').trim()
  const r = (rt || '').trim().padStart(3, '0').slice(0, 3)
  const w = (rw || '').trim().padStart(3, '0').slice(0, 3)
  if (!a) return ''
  // Take first 28 chars of address line
  const short = a.length > 28 ? `${a.slice(0, 28)}…` : a
  if (r && w) return `${short} (RT ${r}/${w})`
  return short
}

/** A privacy-safe summary of a warga for use in AI prompts / search results. */
export interface MaskedWargaSummary {
  id: string
  nama: string
  nik_masked: string
  alamat_masked: string
  jenis_kelamin?: string
  /** approximate age bucket only, e.g. "30-an" */
  umur_bucket?: string
}

export function summarizeWarga(w: Warga): MaskedWargaSummary {
  return {
    id: w.id,
    nama: maskName(w.nama),
    nik_masked: maskNumeric(w.nik),
    alamat_masked: maskAddress(w.alamat, w.rt, w.rw),
    jenis_kelamin: w.jenis_kelamin || undefined,
    umur_bucket: ageBucket(w.tanggal_lahir),
  }
}

function ageBucket(tgl?: string | null): string | undefined {
  if (!tgl) return undefined
  const [d, m, y] = tgl.split('-').map(Number)
  if (!d || !m || !y) return undefined
  const birth = new Date(y, m - 1, d)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--
  if (age < 0 || age > 120) return undefined
  if (age < 17) return '<17 tahun'
  const decade = Math.floor(age / 10) * 10
  return `${decade}-an`
}

/**
 * Sanitize an arbitrary text payload by replacing embedded NIK/NO_KK-shaped
 * runs of 16 digits with masked form. Used when sending docx text content.
 */
export function sanitizeText(text: string): string {
  if (!text) return ''
  return text.replace(/\b(\d{16})\b/g, (_, d: string) => maskNumeric(d))
}
