// Template-only backup / restore service.
//
// File format: ZIP archive (.zip) with the following layout
//
//   manifest.json
//     {
//       "version": 1,
//       "format": "aisura-template-backup",
//       "exportedAt": "<ISO date>",
//       "appVersion": "1.2.1",
//       "templates": [
//         {
//           "id": "<uuid>",
//           "nama": "...",
//           "deskripsi": "...",
//           "prefix_surat": "...",
//           "signer_urutan": 1,
//           "is_favorite": 0,
//           "placeholders": "<JSON-encoded array>",
//           "warga_count": 1,
//           "created_at": "<ISO>",
//           "updated_at": "<ISO>",
//           "file": "templates/<id>.docx"   // path inside the zip
//         }
//       ]
//     }
//   templates/<id>.docx                      // physical .docx file per template
//
// The .zip extension was chosen because it's natively supported by Windows
// Explorer (no third-party tool needed for the user to inspect/extract
// contents manually) and we already ship JSZip in dependencies.

import JSZip from 'jszip'
import { v4 as uuid } from 'uuid'
import { exists, mkdir, readFile, writeFile, BaseDirectory } from '@tauri-apps/plugin-fs'
import { appConfigDir } from '@tauri-apps/api/path'
import { execute } from './db'
import { getAllTemplates, getTemplateBlob } from './templateService'
import type { TemplateSurat } from '@/types'
import pkg from '../../package.json'

const TEMPLATES_SUBDIR = 'templates'
const MANIFEST_NAME = 'manifest.json'
const BACKUP_FORMAT = 'aisura-template-backup'
const BACKUP_VERSION = 1

// =================================================================
// Manifest types (versioned, stored inside the zip)
// =================================================================

interface BackupManifestV1 {
  version: 1
  format: typeof BACKUP_FORMAT
  exportedAt: string
  appVersion: string
  templates: BackupTemplateEntry[]
}

interface BackupTemplateEntry {
  id: string
  nama: string
  deskripsi: string
  prefix_surat: string
  signer_urutan: number
  is_favorite: number
  placeholders: string
  warga_count: number
  created_at: string
  updated_at: string
  /** Path inside the zip where the .docx lives. Relative. */
  file: string
}

// =================================================================
// Export
// =================================================================

export interface ExportResult {
  blob: Blob
  filename: string
  count: number
}

/**
 * Build a zip blob containing every template currently in the database
 * + their physical .docx files. Caller is responsible for prompting the
 * user with a save dialog and writing the blob to disk.
 */
export async function exportTemplatesBackup(): Promise<ExportResult> {
  const templates = await getAllTemplates()
  const zip = new JSZip()

  const entries: BackupTemplateEntry[] = []
  for (const t of templates) {
    let bytes: Uint8Array | null = null
    try {
      bytes = await getTemplateBlob(t.file_path)
    } catch (err) {
      console.warn(`[TemplateBackup] missing file for template "${t.nama}" (${t.id}), skipping`, err)
      continue
    }
    const fileInZip = `${TEMPLATES_SUBDIR}/${t.id}.docx`
    zip.file(fileInZip, bytes)
    entries.push({
      id: t.id,
      nama: t.nama,
      deskripsi: t.deskripsi || '',
      prefix_surat: t.prefix_surat || '',
      signer_urutan: t.signer_urutan || 1,
      is_favorite: t.is_favorite || 0,
      placeholders: t.placeholders || '[]',
      warga_count: t.warga_count || 0,
      created_at: t.created_at,
      updated_at: t.updated_at,
      file: fileInZip,
    })
  }

  const manifest: BackupManifestV1 = {
    version: BACKUP_VERSION,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    appVersion: pkg.version,
    templates: entries,
  }
  zip.file(MANIFEST_NAME, JSON.stringify(manifest, null, 2))

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  const datePart = new Date().toISOString().slice(0, 10)
  const filename = `aisura-templates-backup-${datePart}.zip`
  return { blob, filename, count: entries.length }
}

// =================================================================
// Import / Restore
// =================================================================

export type ConflictStrategy = 'skip' | 'overwrite'

export interface ImportOptions {
  /** What to do when a template with the same NAMA already exists locally.
   *  Default: 'skip'. */
  onDuplicate?: ConflictStrategy
}

export interface ImportSummary {
  /** How many templates were inserted (new). */
  inserted: number
  /** How many existing templates were overwritten in place (mode=overwrite). */
  overwritten: number
  /** How many templates were skipped due to merge mode + onDuplicate=skip. */
  skipped: number
  /** Items that failed validation. */
  errors: { name?: string; reason: string }[]
}

/**
 * Inspect the contents of a backup zip without writing anything.
 * Useful for the import preview UI ("Backup berisi N template").
 */
export async function inspectTemplatesBackup(file: ArrayBuffer | Uint8Array | Blob): Promise<{
  manifest: BackupManifestV1
  /** Warnings that don't block import — missing .docx for an entry, etc. */
  warnings: string[]
}> {
  const zip = await JSZip.loadAsync(file)
  const manifestFile = zip.file(MANIFEST_NAME)
  if (!manifestFile) {
    throw new Error('File backup tidak valid: manifest.json tidak ditemukan.')
  }
  let manifest: BackupManifestV1
  try {
    manifest = JSON.parse(await manifestFile.async('text'))
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'JSON parse error'
    throw new Error(`manifest.json rusak: ${reason}`)
  }
  if (manifest.format !== BACKUP_FORMAT) {
    throw new Error(`Format backup tidak dikenali: "${manifest.format}". Diharapkan "${BACKUP_FORMAT}".`)
  }
  if (manifest.version !== BACKUP_VERSION) {
    throw new Error(`Versi backup tidak didukung: v${manifest.version}. Aplikasi hanya mendukung v${BACKUP_VERSION}.`)
  }

  const warnings: string[] = []
  for (const entry of manifest.templates) {
    if (!zip.file(entry.file)) {
      warnings.push(`File "${entry.file}" untuk template "${entry.nama}" tidak ada di backup.`)
    }
  }

  return { manifest, warnings }
}

/**
 * Restore templates from a backup zip. Always merges into the existing
 * library — does NOT delete templates that aren't in the backup.
 *
 * Conflict handling (matched by exact NAMA, case-sensitive):
 *   - onDuplicate = 'skip'      : keep local, ignore backup entry
 *   - onDuplicate = 'overwrite' : update local row + replace .docx file
 *
 * Templates that don't conflict are always inserted as new rows with a
 * fresh UUID (so we never clash with the backup's original IDs).
 */
export async function importTemplatesBackup(
  file: ArrayBuffer | Uint8Array | Blob,
  options: ImportOptions = {},
): Promise<ImportSummary> {
  const onDuplicate = options.onDuplicate ?? 'skip'
  const { manifest } = await inspectTemplatesBackup(file)
  const zip = await JSZip.loadAsync(file)

  await ensureTemplatesDir()

  // Load current template list once so we can match duplicates by name.
  const existing = await getAllTemplates()
  const byName = new Map<string, TemplateSurat>()
  for (const t of existing) byName.set(t.nama, t)

  const summary: ImportSummary = { inserted: 0, overwritten: 0, skipped: 0, errors: [] }

  for (const entry of manifest.templates) {
    try {
      const docxFile = zip.file(entry.file)
      if (!docxFile) {
        summary.errors.push({ name: entry.nama, reason: `File "${entry.file}" tidak ada di backup.` })
        continue
      }
      const bytes = new Uint8Array(await docxFile.async('uint8array'))
      const duplicate = byName.get(entry.nama)

      if (duplicate && onDuplicate === 'skip') {
        summary.skipped += 1
        continue
      }

      if (duplicate && onDuplicate === 'overwrite') {
        // Replace the bytes on disk + update the row in place. Reuse the
        // existing local id + file_path so foreign keys (riwayat_surat,
        // template_labels) stay intact.
        await writeFile(duplicate.file_path, bytes, { baseDir: BaseDirectory.AppConfig })
        const now = new Date().toISOString()
        await execute(
          `UPDATE templates
              SET deskripsi = $1,
                  placeholders = $2,
                  warga_count = $3,
                  prefix_surat = $4,
                  signer_urutan = $5,
                  is_favorite = $6,
                  updated_at = $7
            WHERE id = $8`,
          [
            entry.deskripsi || '',
            entry.placeholders || '[]',
            entry.warga_count || 0,
            entry.prefix_surat || '',
            entry.signer_urutan || 1,
            entry.is_favorite || 0,
            now,
            duplicate.id,
          ],
        )
        summary.overwritten += 1
        continue
      }

      // New template — assign a fresh local id + file_path so we never
      // collide with anything that ever lived in the local database.
      const newId = uuid()
      const newFilePath = `${TEMPLATES_SUBDIR}/${newId}.docx`
      await writeFile(newFilePath, bytes, { baseDir: BaseDirectory.AppConfig })

      const now = new Date().toISOString()
      await execute(
        `INSERT INTO templates
            (id, nama, deskripsi, file_path, placeholders, warga_count,
             prefix_surat, signer_urutan, is_favorite, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          newId,
          entry.nama,
          entry.deskripsi || '',
          newFilePath,
          entry.placeholders || '[]',
          entry.warga_count || 0,
          entry.prefix_surat || '',
          entry.signer_urutan || 1,
          entry.is_favorite || 0,
          now,
          now,
        ],
      )
      summary.inserted += 1
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      summary.errors.push({ name: entry.nama, reason })
    }
  }

  return summary
}

async function ensureTemplatesDir(): Promise<void> {
  const dir = await appConfigDir()
  const templatesDir = `${dir}/${TEMPLATES_SUBDIR}`
  if (!(await exists(templatesDir))) {
    await mkdir(TEMPLATES_SUBDIR, { baseDir: BaseDirectory.AppConfig, recursive: true })
  }
}

// =================================================================
// Tiny exported helpers (covered by unit tests)
// =================================================================

/**
 * Decide what to do for a single backup entry given the current local
 * library + conflict strategy. Pure function — no side effects.
 *
 * Exposed for unit testing. Returns one of:
 *   - 'insert'    — no conflict, insert as new row
 *   - 'overwrite' — conflict + overwrite mode
 *   - 'skip'      — conflict + skip mode
 */
export function planRestoreAction(
  entryName: string,
  existingNames: ReadonlyArray<string>,
  onDuplicate: ConflictStrategy,
): 'insert' | 'overwrite' | 'skip' {
  if (!existingNames.includes(entryName)) return 'insert'
  return onDuplicate === 'overwrite' ? 'overwrite' : 'skip'
}

// Internal helper used in inspectTemplatesBackup, also useful in tests.
export const __testing = {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  MANIFEST_NAME,
}
