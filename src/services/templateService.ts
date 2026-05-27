import { select, execute } from './db';
import { v4 as uuid } from 'uuid';
import { appConfigDir } from '@tauri-apps/api/path';
import { exists, mkdir, readFile, writeFile, remove, BaseDirectory } from '@tauri-apps/plugin-fs';
import type { TemplateSurat, TemplateLabel } from '../types';
import { detectPlaceholders, countWargaSlots } from '../utils/placeholderDetector';
import JSZip from 'jszip';

const TEMPLATES_SUBDIR = 'templates';

interface TemplateUpdateInput {
  id: string;
  nama: string;
  deskripsi: string;
  prefixSurat: string;
  signerUrutan: number;
  updatedAt: string;
  placeholders?: ReturnType<typeof detectPlaceholders>;
  wargaCount?: number;
}

export function buildTemplateUpdateSql(input: TemplateUpdateInput): { sql: string; params: unknown[] } {
  if (input.placeholders && typeof input.wargaCount === 'number') {
    return {
      sql: 'UPDATE templates SET nama=$1, deskripsi=$2, prefix_surat=$3, signer_urutan=$4, placeholders=$5, warga_count=$6, updated_at=$7 WHERE id=$8',
      params: [input.nama, input.deskripsi, input.prefixSurat, input.signerUrutan, JSON.stringify(input.placeholders), input.wargaCount, input.updatedAt, input.id],
    };
  }

  return {
    sql: 'UPDATE templates SET nama=$1, deskripsi=$2, prefix_surat=$3, signer_urutan=$4, updated_at=$5 WHERE id=$6',
    params: [input.nama, input.deskripsi, input.prefixSurat, input.signerUrutan, input.updatedAt, input.id],
  };
}

async function ensureTemplatesDir(): Promise<void> {
  const dir = await appConfigDir();
  const templatesDir = `${dir}/${TEMPLATES_SUBDIR}`;
  if (!(await exists(templatesDir))) {
    await mkdir(TEMPLATES_SUBDIR, { baseDir: BaseDirectory.AppConfig, recursive: true });
  }
}

export async function getAllTemplates(): Promise<TemplateSurat[]> {
  return await select<TemplateSurat>('SELECT * FROM templates ORDER BY created_at DESC');
}

export async function getTemplateCount(): Promise<number> {
  const rows = await select<{ count: number }>('SELECT COUNT(*) as count FROM templates');
  return rows[0]?.count ?? 0;
}

export async function getTemplateById(id: string): Promise<TemplateSurat | null> {
  const rows = await select<TemplateSurat>('SELECT * FROM templates WHERE id = $1', [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function uploadTemplate(
  fileBytes: Uint8Array,
  nama: string,
  deskripsi: string,
  prefixSurat: string = '',
  signerUrutan: number = 1,
): Promise<TemplateSurat> {
  const id = uuid();
  const filename = `${id}.docx`;
  await ensureTemplatesDir();
  const filePath = `${TEMPLATES_SUBDIR}/${filename}`;

  // Write to AppConfig directory
  await writeFile(filePath, fileBytes, { baseDir: BaseDirectory.AppConfig });

  const placeholders = await detectPlaceholdersFromDocx(fileBytes);
  const wargaCount = countWargaSlots(placeholders);
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO templates (id, nama, deskripsi, file_path, placeholders, warga_count, prefix_surat, signer_urutan, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, nama, deskripsi, filePath, JSON.stringify(placeholders), wargaCount, prefixSurat, signerUrutan, now, now]
  );

  return {
    id, nama, deskripsi, file_path: filePath,
    placeholders: JSON.stringify(placeholders),
    warga_count: wargaCount, prefix_surat: prefixSurat, signer_urutan: signerUrutan,
    is_favorite: 0,
    created_at: now, updated_at: now,
  };
}

export async function updateTemplate(
  id: string,
  nama: string,
  deskripsi: string,
  prefixSurat: string,
  signerUrutan: number = 1,
  fileBytes?: Uint8Array
): Promise<void> {
  const now = new Date().toISOString();
  const template = fileBytes ? await getTemplateById(id) : null;

  if (fileBytes && template) {
    await writeFile(template.file_path, fileBytes, { baseDir: BaseDirectory.AppConfig });
    const placeholders = await detectPlaceholdersFromDocx(fileBytes);
    const wargaCount = countWargaSlots(placeholders);
    const update = buildTemplateUpdateSql({ id, nama, deskripsi, prefixSurat, signerUrutan, updatedAt: now, placeholders, wargaCount });
    await execute(update.sql, update.params);
    return;
  }

  const update = buildTemplateUpdateSql({ id, nama, deskripsi, prefixSurat, signerUrutan, updatedAt: now });
  await execute(update.sql, update.params);
}

export async function deleteTemplate(id: string): Promise<void> {
  const template = await getTemplateById(id);
  if (template) {
    try { await remove(template.file_path, { baseDir: BaseDirectory.AppConfig }); } catch { /* ignore */ }
  }
  // Clear foreign key references in riwayat_surat
  await execute('UPDATE riwayat_surat SET template_id = NULL WHERE template_id = $1', [id]);
  await execute('DELETE FROM template_labels WHERE template_id = $1', [id]);
  await execute('DELETE FROM templates WHERE id = $1', [id]);
}

/**
 * Toggle favorite flag on a template. Used by Buat Surat to promote frequently
 * used templates to a "Favorit" section above the regular grid.
 */
export async function setTemplateFavorite(id: string, favorite: boolean): Promise<void> {
  const now = new Date().toISOString();
  await execute(
    'UPDATE templates SET is_favorite=$1, updated_at=$2 WHERE id=$3',
    [favorite ? 1 : 0, now, id],
  );
}

/**
 * Re-scan placeholders inside a template's stored .docx file and overwrite
 * the cached placeholders + warga_count columns.
 *
 * Used to repair template metadata after a placeholder-detection bug fix —
 * notably the case where {KOP_SURAT} living inside header3.xml (Word 2021
 * "Different First Page" header) was missed by the earlier hardcoded
 * header1/header2 scan, leaving uploaded templates with stale metadata.
 */
export async function rescanTemplatePlaceholders(id: string): Promise<TemplateSurat> {
  const template = await getTemplateById(id);
  if (!template) throw new Error('Template tidak ditemukan');

  const fileBytes = await getTemplateBlob(template.file_path);
  const placeholders = await detectPlaceholdersFromDocx(fileBytes);
  const wargaCount = countWargaSlots(placeholders);
  const now = new Date().toISOString();

  await execute(
    'UPDATE templates SET placeholders=$1, warga_count=$2, updated_at=$3 WHERE id=$4',
    [JSON.stringify(placeholders), wargaCount, now, id],
  );

  return {
    ...template,
    placeholders: JSON.stringify(placeholders),
    warga_count: wargaCount,
    updated_at: now,
  };
}

export async function getTemplateBlob(filePath: string): Promise<Uint8Array> {
  return await readFile(filePath, { baseDir: BaseDirectory.AppConfig });
}

export async function downloadTemplateToPath(filePath: string, destinationPath: string): Promise<void> {
  const bytes = await getTemplateBlob(filePath);
  await writeFile(destinationPath, bytes);
}

async function detectPlaceholdersFromDocx(fileBytes: Uint8Array): Promise<ReturnType<typeof detectPlaceholders>> {
  const zip = await JSZip.loadAsync(fileBytes);
  let xmlContent = '';

  // Scan main document + ALL header/footer parts. Word 2021 (and modern Word
  // in general) creates separate header parts when "Different First Page" or
  // "Different Odd & Even Pages" is enabled — typically header1.xml,
  // header2.xml, header3.xml. Hardcoding the first two missed any placeholder
  // that ended up in header3+ (e.g. {KOP_SURAT} on the first-page header),
  // which then broke replacement at generate time.
  const candidatePaths = collectDocxPlaceholderXmlPaths(Object.keys(zip.files))

  for (const f of candidatePaths) {
    const file = zip.file(f);
    if (file) {
      xmlContent += await file.async('text');
    }
  }

  return detectPlaceholders(xmlContent);
}

/**
 * From the list of file names inside a .docx zip, pick the XML parts where
 * placeholders may live: the main document, and every header/footer part
 * (header1.xml ... headerN.xml, footer1.xml ... footerN.xml).
 *
 * Exported for unit testing — keeps the file selection logic verifiable
 * without spinning up the SQLite + Tauri filesystem layer.
 */
export function collectDocxPlaceholderXmlPaths(zipEntries: string[]): string[] {
  const out: string[] = []
  if (zipEntries.includes('word/document.xml')) out.push('word/document.xml')
  for (const name of zipEntries) {
    if (/^word\/(header|footer)\d+\.xml$/i.test(name)) out.push(name)
  }
  return out
}

export async function getTemplateLabels(templateId: string): Promise<TemplateLabel[]> {
  return await select<TemplateLabel>('SELECT * FROM template_labels WHERE template_id = $1', [templateId]);
}

export async function saveTemplateLabel(templateId: string, slot: string, label: string): Promise<void> {
  const existing = await select<TemplateLabel>(
    'SELECT * FROM template_labels WHERE template_id = $1 AND slot = $2', [templateId, slot]
  );

  if (existing.length > 0) {
    await execute('UPDATE template_labels SET label = $1 WHERE id = $2', [label, existing[0].id]);
  } else {
    await execute(
      'INSERT INTO template_labels (id, template_id, slot, label) VALUES ($1,$2,$3,$4)',
      [uuid(), templateId, slot, label]
    );
  }
}
