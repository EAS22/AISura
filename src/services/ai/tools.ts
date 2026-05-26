// AI tool registry — minimal sandbox + state-machine enforcement.
//
// Design principle:
// AI hanya perlu menanyakan 2 hal urut:
//   1. Template surat mana (state: ask_template)
//   2. Warga untuk tiap slot W1, W2, ... (state: ask_warga)
//   3. Custom value satu per satu kalau ada (state: ask_custom)
// Sisanya (tanggal, nomor surat, penandatangan, identitas desa)
// otomatis dari sistem.
//
// Server-side enforcement: setiap tool memvalidasi `state.currentStep`
// sebelum eksekusi. Tool yang dipanggil di luar urutan akan ditolak
// dengan pesan eksplisit yang AI baca sebagai instruksi koreksi.

import type {
  AIChoice,
  AILetterStatus,
  AIQuickReplies,
  AIToolDefinition,
  FlowStep,
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
  /** Tools allowed to run only at these steps. Empty = always allowed. */
  allowedSteps?: FlowStep[]
}

/** Per-conversation state — NOT exposed to the AI. */
export interface SessionState {
  currentStep: FlowStep
  templateId?: string
  /** key W1, W2, ... → wargaId */
  wargaSlots: Record<string, string>
  customValues: Record<string, string>
  /** Cache per-tool results so UI can reconstruct quick replies / status. */
  lastChoices?: AIQuickReplies
  lastStatus?: AILetterStatus
}

export function createSessionState(): SessionState {
  return { currentStep: 'ask_template', wargaSlots: {}, customValues: {} }
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

const STEP_LABELS: Record<FlowStep, string> = {
  ask_template: 'memilih template',
  ask_warga: 'memilih warga',
  ask_custom: 'mengisi data tambahan',
  ready: 'menampilkan tombol preview',
}

/** Build status snapshot + advance currentStep based on what's left. */
async function refreshStatus(session: SessionState): Promise<AILetterStatus> {
  if (!session.templateId) {
    throw new Error('refreshStatus called before template selected')
  }
  const prepared = await buildPreparedLetter({
    templateId: session.templateId,
    wargaSlots: session.wargaSlots,
    customValues: session.customValues,
  })
  const slots = prepared.wargaSlots.map((s) => ({ slot: s.slot, nama: s.nama }))
  const missingWargaSlots = slots.filter((s) => !s.nama)
  const missingCustomBases = prepared.missingCustomBases

  let nextStep: FlowStep
  let nextWargaSlot: number | undefined
  let nextCustomToken: string | undefined

  if (missingWargaSlots.length > 0) {
    nextStep = 'ask_warga'
    nextWargaSlot = missingWargaSlots[0].slot
  } else if (missingCustomBases.length > 0) {
    nextStep = 'ask_custom'
    nextCustomToken = missingCustomBases[0]
  } else {
    nextStep = 'ready'
  }
  session.currentStep = nextStep

  const status: AILetterStatus = {
    templateId: prepared.template.id,
    templateName: prepared.template.nama,
    slots,
    missingCustom: missingCustomBases,
    allCustomTokens: prepared.allCustomBases,
    defaultDate: prepared.defaultDate,
    nomorPreview: prepared.nomorPreview['NOMOR_SURAT'] || '',
    readyToPreview: nextStep === 'ready',
    values: nextStep === 'ready' ? prepared.values : undefined,
    currentStep: nextStep,
    nextWargaSlot,
    nextCustomToken,
  }
  session.lastStatus = status
  return status
}

const TOOLS: RegisteredTool[] = [
  {
    allowedSteps: ['ask_template'],
    definition: {
      type: 'function',
      function: {
        name: 'list_templates',
        description: 'Daftar template surat yang tersedia. Pakai HANYA di awal sesi (state ask_template). UI akan menampilkan kartu pilihan otomatis — JANGAN tulis ulang daftar di chat.',
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
      return ok(
        {
          count: templates.length,
          step: 'ask_template',
          hint: choices.length === 0
            ? 'Tidak ada template. Beritahu user untuk upload template lewat halaman Template Surat dulu.'
            : 'UI sudah menampilkan kartu pilihan template. Tulis 1 kalimat ringkas saja, JANGAN ulang daftar. Tunggu user pilih.',
        },
        { quickReplies },
      )
    },
  },
  {
    allowedSteps: ['ask_template'],
    definition: {
      type: 'function',
      function: {
        name: 'select_template',
        description:
          'Set template aktif setelah user memilih. Hanya valid setelah list_templates.',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Template id' } },
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
      // Kick the state machine forward.
      const status = await refreshStatus(session)
      const nextLabel = STEP_LABELS[status.currentStep]
      const message =
        status.currentStep === 'ask_warga'
          ? `Template "${t.nama}" dipilih. Lanjut ke langkah ${nextLabel}: minta user sebutkan nama atau NIK warga untuk slot W${status.nextWargaSlot}.`
          : status.currentStep === 'ask_custom'
            ? `Template "${t.nama}" dipilih. Tidak butuh slot warga. Lanjut ke langkah ${nextLabel}: tanyakan field "${status.nextCustomToken}".`
            : `Template "${t.nama}" dipilih. Surat siap — beritahu user untuk klik tombol "Preview Surat" yang sudah aktif.`
      return ok(
        {
          templateId: id,
          nama: t.nama,
          warga_count: t.warga_count,
          currentStep: status.currentStep,
          nextWargaSlot: status.nextWargaSlot,
          nextCustomToken: status.nextCustomToken,
          message,
        },
        { status },
      )
    },
  },
  {
    allowedSteps: ['ask_warga'],
    definition: {
      type: 'function',
      function: {
        name: 'search_warga',
        description:
          'Cari warga (state ask_warga). Hasil ditampilkan sebagai kartu pilihan. JANGAN tulis ulang daftar.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 2 },
            slot: { type: 'number', description: 'Slot warga yang sedang dicari (W1, W2, ...).' },
            limit: { type: 'number', description: 'Maks hasil (default 5)' },
          },
          required: ['query', 'slot'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args, _ctx, session) => {
      const a = asObject(args)
      const query = typeof a.query === 'string' ? a.query.trim() : ''
      if (query.length < 2) return fail('Query minimal 2 karakter')
      const slot = typeof a.slot === 'number' ? Math.floor(a.slot) : NaN
      if (!Number.isFinite(slot) || slot < 1) return fail('Argumen slot wajib (1, 2, ...)')

      const expectedSlot = session.lastStatus?.nextWargaSlot
      if (expectedSlot && slot !== expectedSlot) {
        return fail(
          `Slot harus ${expectedSlot} (sesuai progress). Sekarang sedang mengisi W${expectedSlot}, bukan W${slot}.`,
        )
      }

      const limit = typeof a.limit === 'number' && a.limit > 0 && a.limit <= 10 ? a.limit : 5
      const results = await searchWargaForAI(query, limit)

      const choices: AIChoice[] = results.map((w) => {
        const ageText = w.umur ? `${w.umur} thn` : ''
        const jkText = w.jenis_kelamin === 'Laki-laki' ? 'L' : w.jenis_kelamin === 'Perempuan' ? 'P' : ''
        const subParts = [`NIK ${w.nik_masked}`, jkText, ageText].filter(Boolean)
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
        slot,
        prompt: choices.length === 0
          ? 'Tidak ditemukan warga yang cocok.'
          : `Pilih warga untuk slot W${slot} dari kartu di bawah:`,
        choices,
        needsRefine: choices.length >= limit,
      }
      session.lastChoices = quickReplies

      return ok(
        {
          count: results.length,
          slot,
          hint:
            results.length === 0
              ? 'Tidak ada hasil. Sarankan user ketik nama berbeda atau lebih spesifik. JANGAN lanjut ke step lain.'
              : results.length >= limit
                ? `Hasil banyak (>${limit}). Sarankan user pilih dari kartu di bawah, atau ketik nama lebih spesifik. JANGAN tulis ulang daftar.`
                : 'UI sudah menampilkan kartu pilihan warga. Tulis 1 kalimat ringkas saja. Tunggu user pilih lewat kartu.',
        },
        { quickReplies },
      )
    },
  },
  {
    allowedSteps: ['ask_warga'],
    definition: {
      type: 'function',
      function: {
        name: 'assign_warga',
        description:
          'Assign warga ke slot Wn setelah user pilih. Setelah ini sistem akan memberitahu langkah berikutnya (slot warga lain, custom value, atau ready preview).',
        parameters: {
          type: 'object',
          properties: {
            slot: { type: 'number' },
            wargaId: { type: 'string' },
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

      const expectedSlot = session.lastStatus?.nextWargaSlot
      if (expectedSlot && slot !== expectedSlot) {
        return fail(
          `Urutan tidak benar. Saat ini sedang mengisi slot W${expectedSlot}, bukan W${slot}.`,
        )
      }

      session.wargaSlots[`W${slot}`] = wargaId
      session.lastChoices = undefined

      const status = await refreshStatus(session)
      const slotInfo = status.slots.find((s) => s.slot === slot)
      if (slotInfo?.nama) {
        ctx.onSlotAssigned?.({ slot, wargaId, nama: slotInfo.nama })
      }

      const nextLabel = STEP_LABELS[status.currentStep]
      const message =
        status.currentStep === 'ask_warga'
          ? `Slot W${slot} (${slotInfo?.nama}) terisi. Lanjut ke ${nextLabel}: minta user sebutkan nama/NIK untuk slot W${status.nextWargaSlot}.`
          : status.currentStep === 'ask_custom'
            ? `Slot W${slot} (${slotInfo?.nama}) terisi. Lanjut ke ${nextLabel}: tanyakan field "${status.nextCustomToken}".`
            : `Slot W${slot} (${slotInfo?.nama}) terisi. Surat siap — beritahu user untuk klik tombol "Preview Surat".`

      return ok(
        {
          slot,
          nama: slotInfo?.nama,
          currentStep: status.currentStep,
          nextWargaSlot: status.nextWargaSlot,
          nextCustomToken: status.nextCustomToken,
          message,
        },
        { status },
      )
    },
  },
  {
    allowedSteps: ['ask_custom'],
    definition: {
      type: 'function',
      function: {
        name: 'set_custom_value',
        description:
          'Isi field custom (state ask_custom) satu per satu. Wajib pakai token yang sama persis dengan nextCustomToken yang dikembalikan sistem.',
        parameters: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Token base TANPA kurung kurawal dan TANPA suffix _U/_L/_P. Contoh: TUJUAN, PERIHAL.' },
            value: { type: 'string' },
          },
          required: ['token', 'value'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args, _ctx, session) => {
      const a = asObject(args)
      const tokenRaw = typeof a.token === 'string' ? a.token.replace(/^\{|\}$/g, '').trim() : ''
      const value = typeof a.value === 'string' ? a.value.trim() : ''
      if (!tokenRaw) return fail('token wajib diisi')
      if (!value) return fail('value tidak boleh kosong. Tanyakan ulang ke user.')
      if (!session.templateId) return fail('Belum ada template aktif.')

      // Strip any modifier suffix the AI mistakenly added.
      const tokenBase = tokenRaw.replace(/_(U|L|P)$/, '')

      const expectedToken = session.lastStatus?.nextCustomToken
      if (expectedToken && tokenBase.toUpperCase() !== expectedToken.toUpperCase()) {
        return fail(
          `Token harus "${expectedToken}" (sesuai progress). Anda mengirim "${tokenBase}".`,
        )
      }

      // Store using the original casing that the template uses (from
      // status.allCustomTokens), preserving exact match so resolver hits.
      const matched = session.lastStatus?.allCustomTokens.find(
        (t) => t.toUpperCase() === tokenBase.toUpperCase(),
      )
      const storeKey = matched ?? tokenBase
      session.customValues[storeKey] = value

      const status = await refreshStatus(session)
      const nextLabel = STEP_LABELS[status.currentStep]
      const message =
        status.currentStep === 'ask_custom'
          ? `Field "${storeKey}" terisi: "${value}". Lanjut ke ${nextLabel}: tanyakan field "${status.nextCustomToken}".`
          : `Field "${storeKey}" terisi: "${value}". Surat siap — beritahu user untuk klik tombol "Preview Surat".`
      return ok(
        {
          token: storeKey,
          value,
          currentStep: status.currentStep,
          nextCustomToken: status.nextCustomToken,
          message,
        },
        { status },
      )
    },
  },
  {
    // Always allowed — read-only progress check.
    definition: {
      type: 'function',
      function: {
        name: 'prepare_letter',
        description:
          'Cek progress pengisian surat. Boleh dipanggil kapan saja untuk lihat currentStep, slot warga, custom token yang missing, dan apakah readyToPreview. Tombol Preview Surat dipicu user manual — Anda TIDAK perlu memanggil tool preview.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
    },
    handler: async (_args, _ctx, session) => {
      if (!session.templateId) return fail('Belum ada template aktif. Panggil list_templates dulu.')
      const status = await refreshStatus(session)
      const message =
        status.currentStep === 'ready'
          ? 'Semua data sudah lengkap. UI menampilkan tombol "Preview Surat" — beritahu user untuk klik.'
          : status.currentStep === 'ask_warga'
            ? `Masih perlu mengisi slot W${status.nextWargaSlot}. Tanyakan ke user.`
            : `Masih perlu mengisi field custom "${status.nextCustomToken}". Tanyakan ke user.`
      return ok(
        {
          template: { id: status.templateId, nama: status.templateName },
          currentStep: status.currentStep,
          nextWargaSlot: status.nextWargaSlot,
          nextCustomToken: status.nextCustomToken,
          missingWargaSlots: status.slots.filter((s) => !s.nama).map((s) => s.slot),
          missingCustomTokens: status.missingCustom,
          allCustomTokens: status.allCustomTokens,
          readyToPreview: status.readyToPreview,
          message,
        },
        { status },
      )
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

  // State machine enforcement
  if (tool.allowedSteps && tool.allowedSteps.length > 0) {
    if (!tool.allowedSteps.includes(session.currentStep)) {
      const expectedLabel = STEP_LABELS[session.currentStep]
      const expected = (() => {
        switch (session.currentStep) {
          case 'ask_template': return 'list_templates atau select_template'
          case 'ask_warga': return 'search_warga atau assign_warga'
          case 'ask_custom': return 'set_custom_value'
          case 'ready': return 'tidak ada — beritahu user untuk klik tombol Preview Surat'
        }
      })()
      return fail(
        `Tool '${name}' tidak diizinkan saat ini. Sekarang sedang ${expectedLabel} (state: ${session.currentStep}). Pakai: ${expected}.`,
      )
    }
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
