import { select, execute } from './db';
import { v4 as uuid } from 'uuid';
import { appConfigDir } from '@tauri-apps/api/path';
import { exists, mkdir, readFile, writeFile, remove, BaseDirectory } from '@tauri-apps/plugin-fs';
import type { TemplateSurat, TemplateLabel } from '../types';
import { detectPlaceholders, countWargaSlots } from '../utils/placeholderDetector';
import JSZip from 'jszip';

const TEMPLATES_SUBDIR = 'templates';

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
  prefixSurat: string = ''
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
    `INSERT INTO templates (id, nama, deskripsi, file_path, placeholders, warga_count, prefix_surat, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, nama, deskripsi, filePath, JSON.stringify(placeholders), wargaCount, prefixSurat, now, now]
  );

  return {
    id, nama, deskripsi, file_path: filePath,
    placeholders: JSON.stringify(placeholders),
    warga_count: wargaCount, prefix_surat: prefixSurat, created_at: now, updated_at: now,
  };
}

export async function updateTemplate(id: string, nama: string, deskripsi: string): Promise<void> {
  const now = new Date().toISOString();
  await execute('UPDATE templates SET nama=$1, deskripsi=$2, updated_at=$3 WHERE id=$4', [nama, deskripsi, now, id]);
}

export async function deleteTemplate(id: string): Promise<void> {
  const template = await getTemplateById(id);
  if (template) {
    try { await remove(template.file_path, { baseDir: BaseDirectory.AppConfig }); } catch { /* ignore */ }
  }
  await execute('DELETE FROM template_labels WHERE template_id = $1', [id]);
  await execute('DELETE FROM templates WHERE id = $1', [id]);
}

export async function getTemplateBlob(filePath: string): Promise<Uint8Array> {
  return await readFile(filePath, { baseDir: BaseDirectory.AppConfig });
}

async function detectPlaceholdersFromDocx(fileBytes: Uint8Array): Promise<ReturnType<typeof detectPlaceholders>> {
  const zip = await JSZip.loadAsync(fileBytes);
  let xmlContent = '';

  const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/footer1.xml', 'word/footer2.xml'];
  for (const f of xmlFiles) {
    const file = zip.file(f);
    if (file) {
      xmlContent += await file.async('text');
    }
  }

  return detectPlaceholders(xmlContent);
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
