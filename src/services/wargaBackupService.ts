// Warga (resident) backup / restore service.
//
// File format: a single .json file with the following shape
//
//   {
//     "version": 1,
//     "format": "aisura-warga-backup",
//     "exportedAt": "<ISO>",
//     "appVersion": "1.2.x",
//     "count": <int>,
//     "warga": [{ ...full warga row... }]
//   }
//
// Choice of JSON over Excel here is deliberate:
//   - The dataset is purely tabular with no binary attachments.
//   - JSON is idempotent and human-inspectable (Notepad opens it cleanly).
//   - Schema-versioned via `version: 1` so future changes don't break
//     old backup files.
//   - Caller can also use the existing import-from-Excel flow on the
//     Data Warga page if they prefer Excel as a source of truth.
//
// Duplicate matching is by NIK (Indonesia's unique resident ID). Entries
// with empty/blank NIK are always treated as new inserts.

import { v4 as uuid } from 'uuid'
import { execute } from './db'
import { getAllWarga } from './wargaService'
import type { Warga } from '@/types'
import pkg from '../../package.json'

const BACKUP_FORMAT = 'aisura-warga-backup'
const BACKUP_VERSION = 1

// =================================================================
// Backup file schema
// =================================================================

interface WargaBackupV1 {
  version: 1
  format: typeof BACKUP_FORMAT
  exportedAt: string
  appVersion: string
  count: number
  warga: WargaBackupEntry[]
}

interface WargaBackupEntry {
  // Use the full Warga shape minus id (we always assign a fresh local id
  // on insert). Timestamps are kept so users can tell when each row was
  // originally captured.
  no_kk: string
  nik: string
  nama: string
  jenis_kelamin: string
  tempat_lahir: string
  tanggal_lahir: string
  agama: string
  status: string
  hub_keluarga: string
  pendidikan: string
  pekerjaan: string
  nama_ibu: string
  nama_ayah: string
  alamat: string
  rt: string
  rw: string
  created_at?: string
  updated_at?: string
}

// =================================================================
// Export
// =================================================================

export interface ExportResult {
  blob: Blob
  filename: string
  count: number
}

export async function exportWargaBackup(): Promise<ExportResult> {
  const all = await getAllWarga()
  const entries: WargaBackupEntry[] = all.map((w) => ({
    no_kk: w.no_kk || '',
    nik: w.nik || '',
    nama: w.nama || '',
    jenis_kelamin: w.jenis_kelamin || '',
    tempat_lahir: w.tempat_lahir || '',
    tanggal_lahir: w.tanggal_lahir || '',
    agama: w.agama || '',
    status: w.status || '',
    hub_keluarga: w.hub_keluarga || '',
    pendidikan: w.pendidikan || '',
    pekerjaan: w.pekerjaan || '',
    nama_ibu: w.nama_ibu || '',
    nama_ayah: w.nama_ayah || '',
    alamat: w.alamat || '',
    rt: w.rt || '',
    rw: w.rw || '',
    created_at: w.created_at,
    updated_at: w.updated_at,
  }))

  const payload: WargaBackupV1 = {
    version: BACKUP_VERSION,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    appVersion: pkg.version,
    count: entries.length,
    warga: entries,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })

  const datePart = new Date().toISOString().slice(0, 10)
  const filename = `aisura-warga-backup-${datePart}.json`
  return { blob, filename, count: entries.length }
}

// =================================================================
// Inspect (read-only validation before actual import)
// =================================================================

export interface BackupInspection {
  manifest: WargaBackupV1
  /** Non-blocking issues caller should surface to the user. */
  warnings: string[]
}

export async function inspectWargaBackup(file: ArrayBuffer | Uint8Array | Blob): Promise<BackupInspection> {
  let text: string
  if (file instanceof Blob) {
    text = await file.text()
  } else if (file instanceof Uint8Array) {
    text = new TextDecoder().decode(file)
  } else {
    text = new TextDecoder().decode(new Uint8Array(file))
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'JSON parse error'
    throw new Error(`File backup tidak valid: ${reason}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('File backup tidak valid: bukan objek JSON.')
  }

  const obj = parsed as Partial<WargaBackupV1>
  if (obj.format !== BACKUP_FORMAT) {
    throw new Error(`Format backup tidak dikenali: "${obj.format}". Diharapkan "${BACKUP_FORMAT}".`)
  }
  if (obj.version !== BACKUP_VERSION) {
    throw new Error(`Versi backup tidak didukung: v${obj.version}. Aplikasi hanya mendukung v${BACKUP_VERSION}.`)
  }
  if (!Array.isArray(obj.warga)) {
    throw new Error('File backup tidak valid: properti "warga" bukan array.')
  }

  const manifest: WargaBackupV1 = {
    version: BACKUP_VERSION,
    format: BACKUP_FORMAT,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    appVersion: typeof obj.appVersion === 'string' ? obj.appVersion : '',
    count: typeof obj.count === 'number' ? obj.count : obj.warga.length,
    warga: obj.warga as WargaBackupEntry[],
  }

  const warnings: string[] = []
  const seenNiks = new Map<string, number>()
  let blankNikCount = 0
  for (const entry of manifest.warga) {
    if (!entry || typeof entry !== 'object') continue
    const nik = (entry.nik || '').trim()
    if (!nik) {
      blankNikCount += 1
      continue
    }
    seenNiks.set(nik, (seenNiks.get(nik) ?? 0) + 1)
  }
  for (const [nik, count] of seenNiks) {
    if (count > 1) warnings.push(`NIK ${nik} muncul ${count}x dalam file backup.`)
  }
  if (blankNikCount > 0) {
    warnings.push(`${blankNikCount} entry tanpa NIK akan selalu di-insert sebagai data baru.`)
  }

  return { manifest, warnings }
}

// =================================================================
// Import / Restore
// =================================================================

export type ConflictStrategy = 'skip' | 'overwrite'

export interface ImportOptions {
  /** What to do when a warga with the same NIK already exists locally.
   *  Default: 'skip'. */
  onDuplicate?: ConflictStrategy
}

export interface ImportSummary {
  inserted: number
  overwritten: number
  skipped: number
  errors: { nama?: string; nik?: string; reason: string }[]
}

export async function importWargaBackup(
  file: ArrayBuffer | Uint8Array | Blob,
  options: ImportOptions = {},
): Promise<ImportSummary> {
  const onDuplicate = options.onDuplicate ?? 'skip'
  const { manifest } = await inspectWargaBackup(file)

  const existing = await getAllWarga()
  const byNik = new Map<string, Warga>()
  for (const w of existing) {
    if (w.nik && w.nik.trim()) byNik.set(w.nik.trim(), w)
  }

  const summary: ImportSummary = { inserted: 0, overwritten: 0, skipped: 0, errors: [] }

  for (const raw of manifest.warga) {
    const entry = sanitizeEntry(raw)
    try {
      const nik = entry.nik.trim()
      const duplicate = nik ? byNik.get(nik) : undefined

      if (duplicate && onDuplicate === 'skip') {
        summary.skipped += 1
        continue
      }

      if (duplicate && onDuplicate === 'overwrite') {
        const now = new Date().toISOString()
        await execute(
          `UPDATE warga SET no_kk=$1, nik=$2, nama=$3, jenis_kelamin=$4, tempat_lahir=$5,
                            tanggal_lahir=$6, agama=$7, status=$8, hub_keluarga=$9,
                            pendidikan=$10, pekerjaan=$11, nama_ibu=$12, nama_ayah=$13,
                            alamat=$14, rt=$15, rw=$16, updated_at=$17 WHERE id=$18`,
          [
            entry.no_kk,
            entry.nik,
            entry.nama,
            entry.jenis_kelamin,
            entry.tempat_lahir,
            entry.tanggal_lahir,
            entry.agama,
            entry.status,
            entry.hub_keluarga,
            entry.pendidikan,
            entry.pekerjaan,
            entry.nama_ibu,
            entry.nama_ayah,
            entry.alamat,
            entry.rt,
            entry.rw,
            now,
            duplicate.id,
          ],
        )
        summary.overwritten += 1
        continue
      }

      // Insert new row with a fresh id.
      const id = uuid()
      const now = new Date().toISOString()
      await execute(
        `INSERT INTO warga (id, no_kk, nik, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, status, hub_keluarga, pendidikan, pekerjaan, nama_ibu, nama_ayah, alamat, rt, rw, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          id,
          entry.no_kk,
          entry.nik,
          entry.nama,
          entry.jenis_kelamin,
          entry.tempat_lahir,
          entry.tanggal_lahir,
          entry.agama,
          entry.status,
          entry.hub_keluarga,
          entry.pendidikan,
          entry.pekerjaan,
          entry.nama_ibu,
          entry.nama_ayah,
          entry.alamat,
          entry.rt,
          entry.rw,
          now,
          now,
        ],
      )
      // Add to local map so subsequent rows in the same backup with the
      // same NIK also see the duplicate.
      if (entry.nik) {
        byNik.set(entry.nik, {
          id,
          no_kk: entry.no_kk,
          nik: entry.nik,
          nama: entry.nama,
          jenis_kelamin: entry.jenis_kelamin,
          tempat_lahir: entry.tempat_lahir,
          tanggal_lahir: entry.tanggal_lahir,
          agama: entry.agama,
          status: entry.status,
          hub_keluarga: entry.hub_keluarga,
          pendidikan: entry.pendidikan,
          pekerjaan: entry.pekerjaan,
          nama_ibu: entry.nama_ibu,
          nama_ayah: entry.nama_ayah,
          alamat: entry.alamat,
          rt: entry.rt,
          rw: entry.rw,
          created_at: now,
          updated_at: now,
        })
      }
      summary.inserted += 1
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      summary.errors.push({ nama: entry.nama, nik: entry.nik, reason })
    }
  }

  return summary
}

function sanitizeEntry(raw: WargaBackupEntry | undefined | null): WargaBackupEntry {
  // Defensive: tolerate missing properties from older backups or
  // hand-edited files. Pad RT/RW to 3 digits to match the rest of the app.
  const r = (raw ?? {}) as Partial<WargaBackupEntry>
  const padRtRw = (s: string | undefined) => (s ? String(s).padStart(3, '0') : '')
  return {
    no_kk: r.no_kk ?? '',
    nik: (r.nik ?? '').trim(),
    nama: r.nama ?? '',
    jenis_kelamin: r.jenis_kelamin ?? '',
    tempat_lahir: r.tempat_lahir ?? '',
    tanggal_lahir: r.tanggal_lahir ?? '',
    agama: r.agama ?? '',
    status: r.status ?? '',
    hub_keluarga: r.hub_keluarga ?? '',
    pendidikan: r.pendidikan ?? '',
    pekerjaan: r.pekerjaan ?? '',
    nama_ibu: r.nama_ibu ?? '',
    nama_ayah: r.nama_ayah ?? '',
    alamat: r.alamat ?? '',
    rt: padRtRw(r.rt),
    rw: padRtRw(r.rw),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

// =================================================================
// Pure helpers (unit-tested)
// =================================================================

/**
 * Decide what to do for a single backup entry given the current local
 * NIK index + conflict strategy. Pure function — no side effects.
 *
 * Returns one of:
 *   - 'insert'    — no conflict (or empty NIK), insert as new row
 *   - 'overwrite' — conflict + overwrite mode
 *   - 'skip'      — conflict + skip mode
 */
export function planRestoreAction(
  entryNik: string,
  existingNiks: ReadonlyArray<string>,
  onDuplicate: ConflictStrategy,
): 'insert' | 'overwrite' | 'skip' {
  const trimmed = (entryNik || '').trim()
  if (!trimmed) return 'insert'
  if (!existingNiks.includes(trimmed)) return 'insert'
  return onDuplicate === 'overwrite' ? 'overwrite' : 'skip'
}
