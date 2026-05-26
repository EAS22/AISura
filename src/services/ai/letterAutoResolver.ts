// Auto-resolver: build the default placeholder values for a template
// without asking the user. Mirrors the manual flow in BuatSurat.tsx,
// but is pure data-in / data-out so it can be invoked from AI tools.

import type { DataDesa, DetectedPlaceholder, PerangkatDesa, TemplateSurat, Warga } from '@/types'
import { getAllTemplates, getTemplateById } from '../templateService'
import { getDataDesa } from '../desaService'
import { getAllPerangkatDesa } from '../perangkatDesaService'
import { findKepalaKeluarga, getWargaById, searchWarga } from '../wargaService'
import { getCurrentCounter, getNomorSuratConfig } from '../nomorSuratService'
import { generateMultiNomorParts } from '@/utils/nomorSuratGenerator'
import { applyTextModifier, type TextModifier } from '@/utils/textTransform'

const BULAN_INDONESIA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function computeUmur(tgl?: string | null): string {
  if (!tgl) return ''
  const [d, m, y] = tgl.split('-').map(Number)
  if (!d || !m || !y) return ''
  const birth = new Date(y, m - 1, d)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return Number.isFinite(age) && age >= 0 ? String(age) : ''
}

function formatTanggalPanjang(tgl?: string | null): string {
  if (!tgl) return ''
  const [d, m, y] = tgl.split('-').map(Number)
  if (!d || !m || !y) return tgl ?? ''
  return `${d} ${BULAN_INDONESIA[m - 1]} ${y}`
}

function buildAlamatLengkap(w: Warga, kepalaKeluarga: string, dataDesa: DataDesa | null): string {
  const rt = (w.rt || '').padStart(3, '0')
  const rw = (w.rw || '').padStart(3, '0')
  const parts = [`${w.alamat || ''} RT ${rt} RW ${rw}`.trim()]
  if (dataDesa?.desa) parts.push(`Desa ${dataDesa.desa}`)
  if (dataDesa?.kecamatan) parts.push(`Kecamatan ${dataDesa.kecamatan}`)
  if (dataDesa?.kabupaten) parts.push(`Kabupaten ${dataDesa.kabupaten}`)
  void kepalaKeluarga // not used in alamat string but kept for symmetry with manual flow
  return parts.join(' ')
}

function wargaFieldMap(
  w: Warga,
  kepalaKeluarga: string,
  alamatLengkap: string,
): Record<string, string> {
  return {
    NIK: w.nik || '',
    NAMA: w.nama || '',
    JENIS_KELAMIN: w.jenis_kelamin || '',
    TEMPAT_LAHIR: w.tempat_lahir || '',
    TANGGAL_LAHIR: w.tanggal_lahir || '',
    TANGGAL_LAHIR_PANJANG: formatTanggalPanjang(w.tanggal_lahir),
    UMUR: computeUmur(w.tanggal_lahir),
    AGAMA: w.agama || '',
    STATUS: w.status || '',
    HUB_KELUARGA: w.hub_keluarga || '',
    PENDIDIKAN: w.pendidikan || '',
    PEKERJAAN: w.pekerjaan || '',
    NAMA_IBU: w.nama_ibu || '',
    NAMA_AYAH: w.nama_ayah || '',
    ALAMAT: w.alamat || '',
    RT: (w.rt || '').padStart(3, '0'),
    RW: (w.rw || '').padStart(3, '0'),
    NO_KK: w.no_kk || '',
    ALAMAT_LENGKAP: alamatLengkap,
    TTL: `${w.tempat_lahir || ''}, ${w.tanggal_lahir || ''}`,
    KEPALA_KELUARGA: kepalaKeluarga,
  }
}

function perangkatFieldMap(pd: PerangkatDesa): Record<string, string> {
  return {
    NAMA: pd.nama || '',
    NAMA_LENGKAP: [pd.gelar_depan, pd.nama, pd.gelar_belakang].filter(Boolean).join(' '),
    NIK: pd.nik || '',
    NIPD: pd.nipd || '',
    JABATAN: pd.jabatan || '',
    ALAMAT: pd.alamat || '',
  }
}

function desaFieldMap(d: DataDesa | null): Record<string, string> {
  if (!d) return {}
  return {
    DESA: d.desa || '',
    KECAMATAN: d.kecamatan || '',
    KABUPATEN: d.kabupaten || '',
    PROVINSI: d.provinsi || '',
    KODE_POS: d.kode_pos || '',
    TELEPON_DESA: d.telepon || '',
    EMAIL_DESA: d.email || '',
    ALAMAT_KANTOR_DESA: d.alamat_kantor || '',
    KOP_SURAT: d.kop_surat || '',
  }
}

const PERANGKAT_DESA_ALIASES: Record<string, string> = {
  KEPALA_DESA: 'PD1_NAMA_LENGKAP',
  NIK_KEPALA_DESA: 'PD1_NIK',
  NIPD_KEPALA_DESA: 'PD1_NIPD',
  JABATAN_KEPALA_DESA: 'PD1_JABATAN',
  ALAMAT_KEPALA_DESA: 'PD1_ALAMAT',
  SEKRETARIS_DESA: 'PD2_NAMA_LENGKAP',
  NIK_SEKRETARIS_DESA: 'PD2_NIK',
  NIPD_SEKRETARIS_DESA: 'PD2_NIPD',
  JABATAN_SEKRETARIS_DESA: 'PD2_JABATAN',
  ALAMAT_SEKRETARIS_DESA: 'PD2_ALAMAT',
}

const MODIFIER_RE = /_(U|L|P)$/

function splitTokenAndModifier(token: string): { base: string; modifier?: TextModifier } {
  const m = token.match(MODIFIER_RE)
  if (!m) return { base: token }
  return { base: token.slice(0, -2), modifier: m[1] as TextModifier }
}

interface PlaceholderResolveContext {
  warga: Map<number, Warga> // slot W1, W2 → warga
  kepalaKeluargaCache: Map<string, string> // no_kk → name
  dataDesa: DataDesa | null
  perangkat: PerangkatDesa[]
  nomor: Record<string, string> // already-prefixed values (NOMOR_SURAT, S_NOMOR, etc.)
}

function resolveSinglePlaceholder(token: string, ctx: PlaceholderResolveContext): string | null {
  const { base, modifier } = splitTokenAndModifier(token)

  // Warga
  const wargaMatch = base.match(/^W(\d+)_(.+)$/)
  if (wargaMatch) {
    const slot = parseInt(wargaMatch[1], 10)
    const field = wargaMatch[2]
    const w = ctx.warga.get(slot)
    if (!w) return null
    const kk = (w.no_kk && ctx.kepalaKeluargaCache.get(w.no_kk)) || ''
    const alamatLengkap = buildAlamatLengkap(w, kk, ctx.dataDesa)
    const map = wargaFieldMap(w, kk, alamatLengkap)
    const raw = map[field]
    if (raw === undefined) return null
    return applyTextModifier(raw, modifier)
  }

  // Perangkat Desa numeric
  const pdMatch = base.match(/^PD(\d+)_(.+)$/)
  if (pdMatch) {
    const urutan = parseInt(pdMatch[1], 10)
    const field = pdMatch[2]
    const pd = ctx.perangkat.find((p) => p.urutan === urutan)
    if (!pd) return ''
    const map = perangkatFieldMap(pd)
    return applyTextModifier(map[field] ?? '', modifier)
  }

  // Perangkat alias (KEPALA_DESA, etc.)
  if (base in PERANGKAT_DESA_ALIASES) {
    const target = PERANGKAT_DESA_ALIASES[base]
    const aliasMatch = target.match(/^PD(\d+)_(.+)$/)
    if (aliasMatch) {
      const urutan = parseInt(aliasMatch[1], 10)
      const field = aliasMatch[2]
      const pd = ctx.perangkat.find((p) => p.urutan === urutan)
      if (!pd) return ''
      const map = perangkatFieldMap(pd)
      return applyTextModifier(map[field] ?? '', modifier)
    }
  }

  // Nomor Surat (slotted Nn_FIELD or unslotted)
  const slottedNomorMatch = base.match(/^N(\d+)_(.+)$/)
  if (slottedNomorMatch) {
    const slotKey = `N${slottedNomorMatch[1]}_${slottedNomorMatch[2]}`
    const v = ctx.nomor[slotKey]
    return applyTextModifier(v ?? '', modifier)
  }
  if (base === 'NOMOR_SURAT' || base.startsWith('S_')) {
    const v = ctx.nomor[base]
    return applyTextModifier(v ?? '', modifier)
  }

  // Desa
  const desaMap = desaFieldMap(ctx.dataDesa)
  if (base in desaMap) {
    return applyTextModifier(desaMap[base] ?? '', modifier)
  }

  // Custom — leave for caller
  return null
}

export interface PreparedLetter {
  template: TemplateSurat
  placeholders: DetectedPlaceholder[]
  /** Already-resolved values keyed by full token (W1_NAMA, W1_NAMA_U, etc). */
  values: Record<string, string>
  /** Tokens still missing — broken down by category for AI to know what to ask. */
  missing: {
    warga: { slot: number; tokens: string[] }[]
    /** Full tokens (with modifier) that are still empty. */
    custom: string[]
    other: string[]
  }
  /** Distinct custom token base names (no modifier suffix). */
  allCustomBases: string[]
  /** Distinct custom base names that are still missing a value. */
  missingCustomBases: string[]
  /** Slot map for warga (so AI can introspect which slots are filled). */
  wargaSlots: { slot: number; warga_id?: string; nama?: string }[]
  /** Snapshot of nomor surat preview values without consuming counter. */
  nomorPreview: Record<string, string>
  /** Tanggal default = hari ini (kalau template butuh) */
  defaultDate: string
}

export interface BuildPreparedLetterInput {
  templateId: string
  /** Optional warga assignment per slot (key W1, W2, ...) */
  wargaSlots?: Record<string, string> // slot label → warga id
  /** Optional custom token overrides supplied by user */
  customValues?: Record<string, string>
  /** Optional override for tanggal surat (default: today) */
  tanggalSurat?: Date
}

/**
 * Compose a fully-resolved `values` map for a template, automatically filling
 * desa, perangkat desa (Kepala Desa as default signer), and nomor surat
 * (preview without consuming counter). Warga slots remain blank unless
 * supplied via `wargaSlots`. Custom tokens remain blank unless supplied
 * via `customValues`.
 *
 * IMPORTANT: This is a non-consuming preparation. The actual counter
 * increment happens later in finalizeLetter().
 */
export async function buildPreparedLetter(input: BuildPreparedLetterInput): Promise<PreparedLetter> {
  const template = await getTemplateById(input.templateId)
  if (!template) throw new Error(`Template ${input.templateId} tidak ditemukan`)

  const placeholders: DetectedPlaceholder[] = (() => {
    try { return JSON.parse(template.placeholders || '[]') } catch { return [] }
  })()

  const dataDesa = await getDataDesa()
  const perangkat = await getAllPerangkatDesa()

  // Resolve nomor preview without incrementing counter
  const nomorConfig = await getNomorSuratConfig()
  const counter = await getCurrentCounter()
  const nomorSlots = [...new Set(placeholders.filter((p) => p.kategori === 'nomor_surat' && p.slot).map((p) => p.slot!))]
  const slotCount = nomorSlots.length || 1
  const date = input.tanggalSurat ?? new Date()
  const multiParts = nomorConfig
    ? generateMultiNomorParts(nomorConfig.format, counter, nomorConfig.kode_desa, template.prefix_surat || '', slotCount, date)
    : null

  const nomor: Record<string, string> = {}
  if (multiParts) {
    for (const [slot, parts] of Object.entries(multiParts)) {
      for (const [field, val] of Object.entries(parts)) {
        nomor[`${slot}_${field}`] = String(val)
      }
    }
    // Unslotted aliases (NOMOR_SURAT, S_NOMOR, etc) → use first slot
    const first = multiParts['N1']
    if (first) {
      for (const [field, val] of Object.entries(first)) {
        nomor[field] = String(val)
      }
    }
  }

  // Warga slot assignments
  const wargaSlotsMap = new Map<number, Warga>()
  const kepalaKeluargaCache = new Map<string, string>()
  if (input.wargaSlots) {
    for (const [slotLabel, wargaId] of Object.entries(input.wargaSlots)) {
      const m = slotLabel.match(/^W(\d+)$/)
      if (!m) continue
      const slot = parseInt(m[1], 10)
      const w = await getWargaById(wargaId)
      if (!w) continue
      wargaSlotsMap.set(slot, w)
      if (w.no_kk && !kepalaKeluargaCache.has(w.no_kk)) {
        const kk = await findKepalaKeluarga(w.no_kk)
        kepalaKeluargaCache.set(w.no_kk, kk?.nama ?? '')
      }
    }
  }

  const ctx: PlaceholderResolveContext = {
    warga: wargaSlotsMap,
    kepalaKeluargaCache,
    dataDesa,
    perangkat,
    nomor,
  }

  // Build resolved values for every detected token
  const values: Record<string, string> = {}
  const missingWargaBySlot = new Map<number, string[]>()
  // Track unique custom base tokens (no modifier) and which are still missing.
  const allCustomBases = new Set<string>()
  const filledCustomBases = new Set<string>()
  const missingCustomFullTokens: string[] = []
  const missingOther: string[] = []

  // Build a case-insensitive index of user-supplied custom values keyed by base
  // token. Keys are stored UPPERCASE for lookup.
  const customLookup = new Map<string, string>()
  if (input.customValues) {
    for (const [k, v] of Object.entries(input.customValues)) {
      const cleaned = k.replace(/^\{|\}$/g, '').trim()
      if (!cleaned) continue
      // Strip a possible suffix the user might have typed (rare).
      const { base } = splitTokenAndModifier(cleaned.toUpperCase())
      customLookup.set(base, v)
    }
  }

  for (const ph of placeholders) {
    const resolved = resolveSinglePlaceholder(ph.token, ctx)
    if (resolved !== null) {
      values[ph.token] = resolved
      continue
    }
    if (ph.kategori === 'warga' && ph.slot) {
      const slot = parseInt(ph.slot.replace(/^W/, ''), 10)
      const list = missingWargaBySlot.get(slot) ?? []
      list.push(ph.token)
      missingWargaBySlot.set(slot, list)
      values[ph.token] = '' // initial empty
      continue
    }
    if (ph.kategori === 'custom') {
      const { base, modifier } = splitTokenAndModifier(ph.token)
      allCustomBases.add(base)
      const supplied = customLookup.get(base.toUpperCase())
      if (supplied !== undefined && supplied !== '') {
        values[ph.token] = applyTextModifier(supplied, modifier)
        filledCustomBases.add(base)
      } else {
        values[ph.token] = ''
        missingCustomFullTokens.push(ph.token)
      }
      continue
    }
    missingOther.push(ph.token)
    values[ph.token] = ''
  }

  // Distinct list of slots referenced by template
  const allWargaSlots = [
    ...new Set(
      placeholders
        .filter((p) => p.kategori === 'warga' && p.slot)
        .map((p) => parseInt(p.slot!.replace(/^W/, ''), 10)),
    ),
  ].sort((a, b) => a - b)

  return {
    template,
    placeholders,
    values,
    missing: {
      warga: allWargaSlots.map((slot) => ({
        slot,
        tokens: missingWargaBySlot.get(slot) ?? [],
      })),
      custom: missingCustomFullTokens,
      other: missingOther,
    },
    allCustomBases: Array.from(allCustomBases).sort(),
    missingCustomBases: Array.from(allCustomBases)
      .filter((b) => !filledCustomBases.has(b))
      .sort(),
    wargaSlots: allWargaSlots.map((slot) => {
      const w = wargaSlotsMap.get(slot)
      return { slot, warga_id: w?.id, nama: w?.nama }
    }),
    nomorPreview: { ...nomor },
    defaultDate: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

/** Simple search wrapper to expose just a few fields the AI tool needs. */
export async function searchWargaForAI(query: string, limit = 5): Promise<{ id: string; nama: string; nik_masked: string; rt_rw: string; alamat: string; jenis_kelamin: string; umur: string }[]> {
  const results = await searchWarga(query, limit)
  return results.map((w) => ({
    id: w.id,
    nama: w.nama,
    nik_masked:
      w.nik && w.nik.length >= 8
        ? `${w.nik.slice(0, 4)}${'*'.repeat(Math.max(4, w.nik.length - 8))}${w.nik.slice(-4)}`
        : (w.nik || '').replace(/./g, '*'),
    rt_rw: `${(w.rt || '').padStart(3, '0')}/${(w.rw || '').padStart(3, '0')}`,
    alamat: w.alamat || '',
    jenis_kelamin: w.jenis_kelamin || '',
    umur: computeUmur(w.tanggal_lahir),
  }))
}

export async function listTemplatesForAI(): Promise<{ id: string; nama: string; deskripsi: string; warga_count: number; prefix_surat: string }[]> {
  const all = await getAllTemplates()
  return all.map((t) => ({
    id: t.id,
    nama: t.nama,
    deskripsi: t.deskripsi || '',
    warga_count: t.warga_count,
    prefix_surat: t.prefix_surat || '',
  }))
}
