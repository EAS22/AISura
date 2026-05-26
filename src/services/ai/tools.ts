// AI tool registry — minimal sandbox for letter creation flow.
//
// Design principle (after UX revision):
// AI hanya perlu menanyakan 2 hal:
//   1. Template surat mana yang akan dibuat
//   2. Warga mana untuk tiap slot W1, W2, ... yang dibutuhkan template
// Semua sisanya (tanggal, nomor surat, kepala desa, data desa) di-resolve
// otomatis lewat prepare_letter / preview_letter — AI tidak perlu nanya.

import type { AIToolDefinition } from './types'
import {
  buildPreparedLetter,
  listTemplatesForAI,
  searchWargaForAI,
} from './letterAutoResolver'
import { getTemplateById } from '../templateService'

export interface ToolContext {
  /**
   * Called when the model invokes preview_letter. The host UI listens to
   * this and opens the preview modal with the supplied template + values.
   * Returns a short status string fed back to the model.
   */
  onPreviewLetter?: (input: {
    templateId: string
    templateName: string
    values: Record<string, string>
  }) => Promise<string> | string
  /**
   * Notify host UI that a warga slot has been assigned (for breadcrumb display).
   */
  onSlotAssigned?: (input: { slot: number; wargaId: string; nama: string }) => void
}

export interface ToolExecutionResult {
  ok: boolean
  /** Stringified payload sent back to the model. */
  content: string
  /** Optional raw object retained for the host UI. */
  raw?: unknown
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
}

export function createSessionState(): SessionState {
  return { wargaSlots: {}, customValues: {} }
}

function ok(payload: unknown, raw?: unknown): ToolExecutionResult {
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
        description: 'Daftar semua template surat yang tersedia. Pakai untuk membantu user memilih template.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
    },
    handler: async () => {
      const templates = await listTemplatesForAI()
      return ok({ templates })
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'select_template',
        description:
          'Set template aktif untuk sesi ini. Setelah dipanggil, gunakan prepare_letter untuk lihat berapa slot warga yang perlu diisi. Tidak perlu konfirmasi tanggal/nomor surat — semua otomatis.',
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
      session.wargaSlots = {} // reset slot saat ganti template
      session.customValues = {}
      return ok({
        templateId: id,
        nama: t.nama,
        warga_count: t.warga_count,
        message: `Template "${t.nama}" dipilih. Lanjut panggil prepare_letter untuk melihat slot warga yang perlu diisi.`,
      })
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'search_warga',
        description:
          'Cari warga berdasarkan nama atau bagian NIK. NIK lengkap di-mask agar tidak terlihat AI sampai user konfirmasi pilihan via assign_warga.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 2 },
            limit: { type: 'number', description: 'Maks hasil (default 5)' },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args) => {
      const a = asObject(args)
      const query = typeof a.query === 'string' ? a.query.trim() : ''
      if (query.length < 2) return fail('Query minimal 2 karakter')
      const limit = typeof a.limit === 'number' && a.limit > 0 && a.limit <= 10 ? a.limit : 5
      const results = await searchWargaForAI(query, limit)
      return ok({
        note: 'NIK sudah di-mask. Untuk assign warga ke slot, panggil assign_warga dengan id-nya.',
        results,
      }, results)
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'assign_warga',
        description:
          'Assign warga (id dari search_warga) ke slot Wn (W1, W2, ...). Slot pertama W1 selalu untuk pemohon utama. Setelah semua slot terisi, panggil preview_letter.',
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

      // Verify by re-running the resolver so we know if assignment is valid
      const prepared = await buildPreparedLetter({
        templateId: session.templateId,
        wargaSlots: session.wargaSlots,
        customValues: session.customValues,
      })
      const slotInfo = prepared.wargaSlots.find((s) => s.slot === slot)
      if (slotInfo?.warga_id && slotInfo.nama) {
        ctx.onSlotAssigned?.({ slot, wargaId: slotInfo.warga_id, nama: slotInfo.nama })
      }
      return ok({
        slot,
        nama: slotInfo?.nama,
        remainingSlots: prepared.wargaSlots.filter((s) => !s.warga_id).map((s) => s.slot),
        missingCustom: prepared.missing.custom,
      })
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
      return ok({ token, value })
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'prepare_letter',
        description:
          'Hitung status pengisian template aktif: berapa slot warga sudah/belum, apakah ada custom kosong, dan apa preview default-nya. Tanggal otomatis hari ini, nomor otomatis dari config, kepala desa otomatis sebagai penandatangan. Panggil setelah select_template untuk tahu apa yang perlu ditanya ke user.',
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
      return ok({
        template: { id: prepared.template.id, nama: prepared.template.nama, warga_count: prepared.template.warga_count },
        wargaSlots: prepared.wargaSlots,
        missingWargaSlots: prepared.wargaSlots.filter((s) => !s.warga_id).map((s) => s.slot),
        missingCustom: prepared.missing.custom,
        defaultDate: prepared.defaultDate,
        nomorPreview: prepared.nomorPreview['NOMOR_SURAT'] || '',
        readyToPreview:
          prepared.missing.warga.every((m) => prepared.wargaSlots.find((s) => s.slot === m.slot)?.warga_id) &&
          prepared.missing.custom.length === 0,
      })
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'preview_letter',
        description:
          'Buka modal preview surat dengan semua data otomatis (tanggal hari ini, nomor surat dari config, kepala desa sebagai penandatangan) + warga & custom yang sudah di-set. Hanya panggil ketika prepare_letter mengembalikan readyToPreview=true.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
    },
    handler: async (_args, ctx, session) => {
      if (!session.templateId) return fail('Belum ada template aktif. Panggil select_template dulu.')
      const prepared = await buildPreparedLetter({
        templateId: session.templateId,
        wargaSlots: session.wargaSlots,
        customValues: session.customValues,
      })

      // Block preview if anything required is still empty
      const missingSlots = prepared.wargaSlots.filter((s) => !s.warga_id).map((s) => s.slot)
      if (missingSlots.length > 0) {
        return fail(`Slot warga belum lengkap: ${missingSlots.map((s) => `W${s}`).join(', ')}`)
      }
      if (prepared.missing.custom.length > 0) {
        return fail(`Custom token kosong: ${prepared.missing.custom.join(', ')}`)
      }

      const status = ctx.onPreviewLetter
        ? await ctx.onPreviewLetter({
            templateId: prepared.template.id,
            templateName: prepared.template.nama,
            values: prepared.values,
          })
        : 'Preview tidak tersedia.'
      return ok({ status, nomorSurat: prepared.nomorPreview['NOMOR_SURAT'] || '', tanggal: prepared.defaultDate })
    },
  },
]

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
