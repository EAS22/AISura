import { select, getDatabase } from './db';

const TABLES = [
  'warga', 'data_desa', 'perangkat_desa', 'templates', 'template_labels',
  'placeholder_registry', 'nomor_surat_config', 'riwayat_surat', 'riwayat_surat_data', 'auth_config',
] as const;

interface BackupData {
  version: string;
  timestamp: string;
  tables: Record<string, unknown[]>;
}

export async function exportBackup(): Promise<boolean> {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');

  const data: BackupData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    tables: {},
  };

  for (const table of TABLES) {
    data.tables[table] = await select<Record<string, unknown>>(`SELECT * FROM ${table}`);
  }

  const json = JSON.stringify(data, null, 2);
  const filePath = await save({
    defaultPath: `aisura-backup-${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!filePath) return false;
  await writeFile(filePath, new TextEncoder().encode(json));
  return true;
}

export async function importBackup(): Promise<boolean> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const { readFile } = await import('@tauri-apps/plugin-fs');

  const filePath = await open({ filters: [{ name: 'JSON', extensions: ['json'] }], multiple: false });
  if (!filePath) return false;

  const bytes = await readFile(filePath as string);
  const json = new TextDecoder().decode(bytes);
  const data: BackupData = JSON.parse(json);

  if (!data.tables) throw new Error('Format backup tidak valid');

  const db = getDatabase();

  for (const table of [...TABLES].reverse()) {
    await db.execute(`DELETE FROM ${table}`);
  }

  for (const table of TABLES) {
    const rows = data.tables[table] || [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const record = row as Record<string, unknown>;
      const columns = Object.keys(record);
      if (columns.length === 0) continue;

      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const values = columns.map(c => record[c] ?? null);
      await db.execute(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }

  return true;
}

export async function resetAllData(): Promise<void> {
  const db = getDatabase();
  for (const table of [...TABLES].reverse()) {
    if (table === 'auth_config') continue;
    await db.execute(`DELETE FROM ${table}`);
  }
}
