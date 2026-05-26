// AI tool registry — minimal sandbox for letter creation flow.
//
// Design principle (after UX revision):
// AI hanya perlu menanyakan 2 hal:
//   1. Template surat mana yang akan dibuat
//   2. Warga mana untuk tiap slot W1, W2, ... yang dibutuhkan template
// Semua sisanya (tanggal, nomor surat, kepala desa, data desa) di-resolve
// otomatis lewat prepare_letter — AI tidak perlu nanya.
//
// Tool results carry both:
// - `content`: stringified payload sent to the AI (textual hints only)
// - `raw`: structured payload consumed by the host UI (choice cards,
//   status panel, preview button). Never serialized into the model's
//   conversation history.

import type {
  AIChoice,
  AILetterStatus,
  AIQuickReplies,
  AIToolDefinition,
} from './types'
import {
  buildPreparedLetter,
  listTemplatesForAI,
  searchWargaForAI,
} from './letterAutoResolver'
import { getTemplateById } from '../templateService'

export interface ToolContext {
  /**
   * Notify host UI that a warga slot has been assigned (for breadcrumb display).
   */
  onSlotAssigned?: (input: { slot: number; wargaId: string; nama: string }) => void
}

export interface ToolExecutionResult {
  ok: boolean
  /** Stringified payload sent back to the model. */
  content: string
  /** Structured payload retained for the host UI. Not sent to the model. */
  raw?: ToolRawPayload
}

export interface ToolRawPayload {
  quickReplies?: AIQuickReplies
  status?: AILetterStatus
}

type ToolHandler = (args: unknown, ctx: ToolContext, session: SessionState) => Promise<ToolExecutionResult>

interface RegisteredTool {
  definition: AIToolDefinition
  handler: ToolHandler
}

/** Per-conversation state — NOT exposed to the AI. */
export interface SessionState {
  templateId?: string
  /** key W1, W2, ... → wargaId */
  wargaSlots: Record<string, string>
  customValues: Record<string, string>
  /** Cache per-tool results so UI can reconstruct quick replies / status. */
  lastChoices?: AIQuickReplies
  lastStatus?: AILetterStatus
}

export function createSessionState(): SessionState {
  return { wargaSlots: {}, customValues: {} }
}

function ok(payload: unknown, raw?: ToolRawPayload): ToolExecutionResult {
  return {
    ok: true,
    content: typeof payload === 'string' ? payload : JSON.stringify(payload),
    raw,
  }
}

function fail(message: string): ToolExecutionResult {
  return { ok: false, content: JSON.stringify({ error: message }) }
}

function asObject(args: unknown): Record<string, unknown> {
  if (args && typeof args === 'object' && !Array.isArray(args)) return args as Record<string, unknown>
  return {}
}

const TOOLS: RegisteredTool[] = [
  {
    definition: {
      type: 'function',
      function: {
        name: 'list_templates',
        description: 'Daftar semua template surat yang tersedia. Pakai untuk membantu user memilih template. Hasilnya akan ditampilkan sebagai kartu pilihan ke user — TIDAK perlu Anda menulis ulang daftarnya di chat.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
    },
    handler: async (_args, _ctx, session) => {
      const templates = await listTemplatesForAI()
      const choices: AIChoice[] = templates.map((t) => ({
        id: t.id,
        primary: t.nama,
        secondary: t.deskripsi || undefined,
        badges: [
          t.prefix_surat ? `Prefix: ${t.prefix_surat}` : undefined,
          t.warga_count > 0 ? `${t.warga_count} slot warga` : 'Tanpa slot warga',
        ].filter(Boolean) as string[],
      }))
      const quickReplies: AIQuickReplies = {
        kind: 'pick_template',
        prompt: choices.length === 0
          ? 'Belum ada template tersimpan.'
          : 'Pilih template dari kartu di bawah:',
        choices,
      }
      session.lastChoices = quickReplies
      // Hint kept short to discourage AI from re-listing all templates.
      return ok(
        {
          count: templates.length,
          hint: choices.length === 0
            ? 'Tidak ada template. Beritahu user untuk upload template lewat halaman Template Surat dulu.'
            : 'UI sudah menampilkan kartu pilihan template. Cukup minta user pilih (1 kalimat singkat). Jangan ulangi daftar.',
        },
        { quickReplies },
      )
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'select_template',
        description:
          'Set template aktif untuk sesi ini. Setelah dipanggil, gunakan prepare_letter untuk lihat berapa slot warga yang perlu diisi.',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Template id dari list_templates' } },
          required: ['id'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args, _ctx, session) => {
      const a = asObject(args)
      const id = typeof a.id === 'string' ? a.id : ''
      if (!id) return fail('id wajib diisi')
      const t = await getTemplateById(id)
      if (!t) return fail('Template tidak ditemukan')
      session.templateId = id
      session.wargaSlots = {}
      session.customValues = {}
      session.lastChoices = undefined
      // Pre-build status snapshot for UI panel
      const prepared = await buildPreparedLetter({ templateId: id })
      const status = preparedToStatus(prepared)
      session.lastStatus = status
      return ok(
        {
          templateId: id,
          nama: t.nama,
          warga_count: t.warga_count,
          message: `Template "${t.nama}" dipilih. Lanjut panggil prepare_letter atau langsung tanyakan warga untuk slot pertama.`,
        },
        { status },
      )
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'search_warga',
        description:
          'Cari warga berdasarkan nama atau bagian NIK. Hasil ditampilkan sebagai kartu pilihan dengan nama, NIK masked, umur, dan alamat — TIDAK perlu Anda menulis ulang daftarnya di chat.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 2 },
            slot: { type: 'number', description: 'Nomor slot warga yang sedang dicari (W1, W2, ...). Wajib jika sedang mengisi slot tertentu.' },
            limit: { type: 'number', description: 'Maks hasil (default 5)' },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args, _ctx, session) => {
      const a = asObject(args)
      const query = typeof a.query === 'string' ? a.query.trim() : ''
      if (query.length < 2) return fail('Query minimal 2 karakter')
      const limit = typeof a.limit === 'number' && a.limit > 0 && a.limit <= 10 ? a.limit : 5
      const slotArg = typeof a.slot === 'number' && a.slot >= 1 ? Math.floor(a.slot) : undefined
      const results = await searchWargaForAI(query, limit)

      const choices: AIChoice[] = results.map((w) => {
        const ageText = w.umur ? `${w.umur} thn` : ''
        const jkText = w.jenis_kelamin === 'Laki-laki' ? 'L' : w.jenis_kelamin === 'Perempuan' ? 'P' : ''
        const subParts = [
          `NIK ${w.nik_masked}`,
          jkText,
          ageText,
        ].filter(Boolean)
        const alamatShort = w.alamat
          ? (w.alamat.length > 36 ? `${w.alamat.slice(0, 36)}…` : w.alamat)
          : ''
        return {
          id: w.id,
          primary: w.nama,
          secondary: subParts.join(' · '),
          tertiary: alamatShort ? `${alamatShort}  ${w.rt_rw}` : w.rt_rw,
          fullText: w.alamat ? `${w.alamat} RT/RW ${w.rt_rw}` : undefined,
        }
      })

      const quickReplies: AIQuickReplies = {
        kind: 'pick_warga',
        slot: slotArg,
        prompt: choices.length === 0
          ? 'Tidak ditemukan warga yang cocok.'
          : `Pilih warga ${slotArg ? `untuk slot W${slotArg}` : ''} dari kartu di bawah:`.trim(),
        choices,
        needsRefine: choices.length >= limit,
      }
      session.lastChoices = quickReplies

      return ok(
        {
          count: results.length,
          hint:
            results.length === 0
              ? 'Tidak ada hasil. Sarankan user ketik nama yang berbeda atau lebih pendek.'
              : results.length >= limit
                ? `Hasil banyak (>${limit}). UI sudah menampilkan kartu pilihan. Sarankan user pilih, atau ketik nama lebih spesifik.`
                : 'UI sudah menampilkan kartu pilihan warga. Cukup tulis 1 kalimat instruksi singkat. Jangan ulangi daftar.',
        },
        { quickReplies },
      )
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'assign_warga',
        description:
          'Assign warga (id dari search_warga) ke slot Wn (W1, W2, ...). Slot pertama W1 selalu untuk pemohon utama. Setelah semua slot terisi, panggil prepare_letter — UI akan menampilkan tombol Preview Surat.',
        parameters: {
          type: 'object',
          properties: {
            slot: { type: 'number', description: 'Nomor slot warga (1, 2, ...)' },
            wargaId: { type: 'string', description: 'id warga dari hasil search_warga' },
          },
          required: ['slot', 'wargaId'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args, ctx, session) => {
      const a = asObject(args)
      const slot = typeof a.slot === 'number' ? Math.floor(a.slot) : NaN
      const wargaId = typeof a.wargaId === 'string' ? a.wargaId : ''
      if (!Number.isFinite(slot) || slot < 1) return fail('slot harus angka >= 1')
      if (!wargaId) return fail('wargaId wajib diisi')
      if (!session.templateId) return fail('Belum ada template aktif. Panggil select_template dulu.')

      session.wargaSlots[`W${slot}`] = wargaId
      session.lastChoices = undefined

      const prepared = await buildPreparedLetter({
        templateId: session.templateId,
        wargaSlots: session.wargaSlots,
        customValues: session.customValues,
      })
      const slotInfo = prepared.wargaSlots.find((s) => s.slot === slot)
      if (slotInfo?.warga_id && slotInfo.nama) {
        ctx.onSlotAssigned?.({ slot, wargaId: slotInfo.warga_id, nama: slotInfo.nama })
      }
      const status = preparedToStatus(prepared)
      session.lastStatus = status
      return ok(
        {
          slot,
          nama: slotInfo?.nama,
          remainingSlots: prepared.wargaSlots.filter((s) => !s.warga_id).map((s) => s.slot),
          missingCustom: prepared.missing.custom,
          readyToPreview: status.readyToPreview,
        },
        { status },
      )
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'set_custom_value',
        description:
          'Isi placeholder kategori "custom" (token yang bukan warga/perangkat/desa/nomor). Hanya panggil kalau prepare_letter melaporkan ada custom yang kosong.',
        parameters: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Token tanpa kurung kurawal, contoh: PERIHAL' },
            value: { type: 'string' },
          },
          required: ['token', 'value'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args, _ctx, session) => {
      const a = asObject(args)
      const token = typeof a.token === 'string' ? a.token.replace(/^\{|\}$/g, '').trim() : ''
      const value = typeof a.value === 'string' ? a.value : ''
      if (!token) return fail('token wajib diisi')
      session.customValues[token] = value

      // Recompute status if template aktif
      if (session.templateId) {
        const prepared = await buildPreparedLetter({
          templateId: session.templateId,
          wargaSlots: session.wargaSlots,
          customValues: session.customValues,
        })
        const status = preparedToStatus(prepared)
        session.lastStatus = status
        return ok({ token, value, readyToPreview: status.readyToPreview }, { status })
      }
      return ok({ token, value })
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'prepare_letter',
        description:
          'Hitung status pengisian template aktif: berapa slot warga sudah/belum, custom token yang kosong, dan apakah surat sudah readyToPreview. Tanggal otomatis hari ini, nomor otomatis dari config, kepala desa otomatis sebagai penandatangan. UI akan menampilkan tombol Preview Surat ketika ready — Anda TIDAK perlu lagi memanggil tool preview, user akan klik tombol secara manual.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
    },
    handler: async (_args, _ctx, session) => {
      if (!session.templateId) return fail('Belum ada template aktif. Panggil select_template dulu.')
      const prepared = await buildPreparedLetter({
        templateId: session.templateId,
        wargaSlots: session.wargaSlots,
        customValues: session.customValues,
      })
      const status = preparedToStatus(prepared)
      session.lastStatus = status
      return ok(
        {
          template: { id: prepared.template.id, nama: prepared.template.nama, warga_count: prepared.template.warga_count },
          missingWargaSlots: status.slots.filter((s) => !s.nama).map((s) => s.slot),
          missingCustom: status.missingCustom,
          defaultDate: status.defaultDate,
          nomorPreview: status.nomorPreview,
          readyToPreview: status.readyToPreview,
          hint: status.readyToPreview
            ? 'Surat siap. UI sudah menampilkan tombol "Preview Surat" — minta user klik tombol tersebut.'
            : 'Masih ada data yang kosong. Lanjut tanyakan slot/custom yang missing.',
        },
        { status },
      )
    },
  },
]

function preparedToStatus(prepared: Awaited<ReturnType<typeof buildPreparedLetter>>): AILetterStatus {
  const slots = prepared.wargaSlots.map((s) => ({ slot: s.slot, nama: s.nama }))
  const missingSlots = slots.filter((s) => !s.nama)
  const ready = missingSlots.length === 0 && prepared.missing.custom.length === 0
  return {
    templateId: prepared.template.id,
    templateName: prepared.template.nama,
    slots,
    missingCustom: prepared.missing.custom,
    defaultDate: prepared.defaultDate,
    nomorPreview: prepared.nomorPreview['NOMOR_SURAT'] || '',
    readyToPreview: ready,
    values: ready ? prepared.values : undefined,
  }
}

export const TOOL_DEFINITIONS: AIToolDefinition[] = TOOLS.map((t) => t.definition)

export async function executeTool(
  name: string,
  argsJson: string,
  ctx: ToolContext,
  session: SessionState,
): Promise<ToolExecutionResult> {
  const tool = TOOLS.find((t) => t.definition.function.name === name)
  if (!tool) {
    return fail(
      `Tool '${name}' tidak dikenal. Pakai salah satu: ${TOOLS.map((t) => t.definition.function.name).join(', ')}.`,
    )
  }
  let parsedArgs: unknown
  try {
    parsedArgs = argsJson ? JSON.parse(argsJson) : {}
  } catch {
    return fail('Argumen tool bukan JSON yang valid.')
  }
  try {
    return await tool.handler(parsedArgs, ctx, session)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Tool execution error'
    return fail(msg)
  }
}
