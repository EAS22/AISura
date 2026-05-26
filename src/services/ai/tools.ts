// AI tool registry — the only way the AI can interact with AISura data.
// Each tool has a JSON schema for arguments, validated before execution.

import type { AIToolDefinition } from './types'
import { searchWarga, getWargaById } from '../wargaService'
import { getAllTemplates, getTemplateById } from '../templateService'
import { getAllPerangkatDesa } from '../perangkatDesaService'
import { getDataDesa } from '../desaService'
import { summarizeWarga } from './privacy'
import type { Warga } from '@/types'

export interface ToolContext {
  /**
   * Called when the model invokes preview_letter. The host UI listens to
   * this and opens the preview modal with the supplied template + values.
   * Returns a short status string that's fed back to the model.
   */
  onPreviewLetter?: (input: {
    templateId: string
    values: Record<string, string>
  }) => Promise<string> | string
}

export interface ToolExecutionResult {
  ok: boolean
  /** Stringified payload sent back to the model. */
  content: string
  /** Optional raw object retained for the host UI (e.g. selected warga ids). */
  raw?: unknown
}

type ToolHandler = (args: unknown, ctx: ToolContext) => Promise<ToolExecutionResult>

interface RegisteredTool {
  definition: AIToolDefinition
  handler: ToolHandler
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
        description:
          'Daftar semua template surat yang tersedia di AISura. Pakai ini untuk membantu user memilih template.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
    },
    handler: async () => {
      const templates = await getAllTemplates()
      const summary = templates.map((t) => ({
        id: t.id,
        nama: t.nama,
        deskripsi: t.deskripsi || '',
        prefix_surat: t.prefix_surat || '',
        warga_count: t.warga_count,
      }))
      return ok({ templates: summary })
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_template',
        description:
          'Ambil detail template termasuk daftar placeholder yang harus diisi. Pakai sebelum mulai pengisian.',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Template id' } },
          required: ['id'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args) => {
      const a = asObject(args)
      const id = typeof a.id === 'string' ? a.id : ''
      if (!id) return fail('id wajib diisi')
      const t = await getTemplateById(id)
      if (!t) return fail('Template tidak ditemukan')
      let placeholders: unknown = []
      try { placeholders = JSON.parse(t.placeholders || '[]') } catch { /* ignore */ }
      return ok({
        id: t.id,
        nama: t.nama,
        deskripsi: t.deskripsi,
        prefix_surat: t.prefix_surat,
        warga_count: t.warga_count,
        placeholders,
      })
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'search_warga',
        description:
          'Cari warga berdasarkan nama atau NIK (parsial). NIK lengkap TIDAK pernah dikembalikan — hanya bentuk masked. Untuk mengambil NIK lengkap, user harus konfirmasi pilihan via UI.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Nama atau bagian NIK', minLength: 2 },
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
      const results = (await searchWarga(query, limit)).map(summarizeWarga)
      return ok(
        {
          note:
            'Data sudah di-mask untuk privasi. AI tidak boleh menebak NIK lengkap. Minta user konfirmasi pilih dari hasil ini.',
          results,
        },
        results,
      )
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_warga',
        description:
          'Ambil detail lengkap warga berdasarkan id (yang didapat dari search_warga). Hanya panggil setelah user konfirmasi pilih warga ini.',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args) => {
      const a = asObject(args)
      const id = typeof a.id === 'string' ? a.id : ''
      if (!id) return fail('id wajib diisi')
      const w = await getWargaById(id)
      if (!w) return fail('Warga tidak ditemukan')
      // Return only fields needed for letter generation (still includes full NIK,
      // since the user has confirmed selecting this warga and AI will need it
      // to fill placeholders).
      const result: Pick<
        Warga,
        | 'id'
        | 'no_kk'
        | 'nik'
        | 'nama'
        | 'jenis_kelamin'
        | 'tempat_lahir'
        | 'tanggal_lahir'
        | 'agama'
        | 'status'
        | 'hub_keluarga'
        | 'pendidikan'
        | 'pekerjaan'
        | 'nama_ibu'
        | 'nama_ayah'
        | 'alamat'
        | 'rt'
        | 'rw'
      > = {
        id: w.id,
        no_kk: w.no_kk,
        nik: w.nik,
        nama: w.nama,
        jenis_kelamin: w.jenis_kelamin,
        tempat_lahir: w.tempat_lahir,
        tanggal_lahir: w.tanggal_lahir,
        agama: w.agama,
        status: w.status,
        hub_keluarga: w.hub_keluarga,
        pendidikan: w.pendidikan,
        pekerjaan: w.pekerjaan,
        nama_ibu: w.nama_ibu,
        nama_ayah: w.nama_ayah,
        alamat: w.alamat,
        rt: w.rt,
        rw: w.rw,
      }
      return ok(result, w)
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'list_perangkat_desa',
        description: 'Daftar perangkat desa (Kepala Desa, Sekretaris, dst.).',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
    },
    handler: async () => {
      const list = await getAllPerangkatDesa()
      return ok({
        perangkat: list.map((pd) => ({
          urutan: pd.urutan,
          jabatan: pd.jabatan,
          nama: pd.nama,
          gelar_depan: pd.gelar_depan,
          gelar_belakang: pd.gelar_belakang,
          nipd: pd.nipd,
        })),
      })
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_data_desa',
        description: 'Ambil identitas desa (nama desa, kecamatan, kabupaten, dll).',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
    },
    handler: async () => {
      const d = await getDataDesa()
      if (!d) return ok({ note: 'Belum ada data desa, minta user mengisi di Pengaturan > Data Desa.' })
      return ok({
        desa: d.desa,
        kecamatan: d.kecamatan,
        kabupaten: d.kabupaten,
        provinsi: d.provinsi,
        kode_pos: d.kode_pos,
        telepon: d.telepon,
        email: d.email,
        alamat_kantor: d.alamat_kantor,
      })
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'preview_letter',
        description:
          'Buka modal preview surat untuk template tertentu dengan nilai placeholder yang sudah lengkap. Hanya panggil ketika SEMUA placeholder yang dibutuhkan sudah terisi.',
        parameters: {
          type: 'object',
          properties: {
            templateId: { type: 'string' },
            values: {
              type: 'object',
              description: 'Mapping placeholder token (tanpa kurung kurawal) ke nilai string.',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['templateId', 'values'],
          additionalProperties: false,
        },
      },
    },
    handler: async (args, ctx) => {
      const a = asObject(args)
      const templateId = typeof a.templateId === 'string' ? a.templateId : ''
      const values = (a.values && typeof a.values === 'object' && !Array.isArray(a.values))
        ? (a.values as Record<string, string>)
        : null
      if (!templateId || !values) return fail('templateId dan values wajib diisi')

      // Coerce all values to strings
      const normalized: Record<string, string> = {}
      for (const [k, v] of Object.entries(values)) {
        normalized[k] = v == null ? '' : String(v)
      }

      const status = ctx.onPreviewLetter
        ? await ctx.onPreviewLetter({ templateId, values: normalized })
        : 'Preview tidak tersedia di sesi ini.'
      return ok({ status })
    },
  },
]

export const TOOL_DEFINITIONS: AIToolDefinition[] = TOOLS.map((t) => t.definition)

export async function executeTool(
  name: string,
  argsJson: string,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  const tool = TOOLS.find((t) => t.definition.function.name === name)
  if (!tool) {
    return fail(`Tool '${name}' tidak dikenal. Pakai salah satu: ${TOOLS.map((t) => t.definition.function.name).join(', ')}.`)
  }
  let parsedArgs: unknown
  try {
    parsedArgs = argsJson ? JSON.parse(argsJson) : {}
  } catch {
    return fail('Argumen tool bukan JSON yang valid.')
  }
  try {
    return await tool.handler(parsedArgs, ctx)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Tool execution error'
    return fail(msg)
  }
}
