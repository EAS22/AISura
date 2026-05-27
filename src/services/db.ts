import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  db = await Database.load('sqlite:aisura.db');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS warga (
      id TEXT PRIMARY KEY,
      no_kk TEXT,
      nik TEXT UNIQUE,
      nama TEXT,
      jenis_kelamin TEXT,
      tempat_lahir TEXT,
      tanggal_lahir TEXT,
      agama TEXT,
      status TEXT,
      hub_keluarga TEXT,
      pendidikan TEXT,
      pekerjaan TEXT,
      nama_ibu TEXT,
      nama_ayah TEXT,
      alamat TEXT,
      rt TEXT,
      rw TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS data_desa (
      id TEXT PRIMARY KEY,
      desa TEXT,
      kecamatan TEXT,
      kabupaten TEXT,
      provinsi TEXT,
      kode_pos TEXT,
      telepon TEXT,
      email TEXT,
      alamat_kantor TEXT,
      logo_desa TEXT,
      kop_surat TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS perangkat_desa (
      id TEXT PRIMARY KEY,
      urutan INTEGER,
      warga_id TEXT,
      nama TEXT,
      gelar_depan TEXT,
      gelar_belakang TEXT,
      nik TEXT,
      nipd TEXT,
      jabatan TEXT,
      alamat TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (warga_id) REFERENCES warga(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      nama TEXT,
      deskripsi TEXT,
      file_path TEXT,
      placeholders TEXT,
      warga_count INTEGER DEFAULT 0,
      prefix_surat TEXT DEFAULT '',
      signer_urutan INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // Migration: add prefix_surat column if missing (for existing databases)
  try {
    await db.execute(`ALTER TABLE templates ADD COLUMN prefix_surat TEXT DEFAULT ''`);
  } catch { /* column already exists, ignore */ }

  // Migration: add signer_urutan column if missing
  try {
    await db.execute(`ALTER TABLE templates ADD COLUMN signer_urutan INTEGER DEFAULT 1`);
  } catch { /* column already exists, ignore */ }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS template_labels (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      slot TEXT,
      label TEXT,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS placeholder_registry (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE,
      deskripsi TEXT,
      default_value TEXT,
      created_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS nomor_surat_config (
      id TEXT PRIMARY KEY,
      format TEXT,
      kode_desa TEXT,
      counter INTEGER DEFAULT 1,
      tahun INTEGER,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS riwayat_surat (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      template_nama TEXT,
      nomor_surat TEXT,
      nomor_urut INTEGER,
      pemohon_nama TEXT DEFAULT '',
      pemohon_nik TEXT DEFAULT '',
      pemohon_alamat TEXT DEFAULT '',
      tanggal_generate TEXT,
      created_at TEXT,
      FOREIGN KEY (template_id) REFERENCES templates(id)
    )
  `);

  // Migration: add pemohon columns if missing
  try { await db.execute(`ALTER TABLE riwayat_surat ADD COLUMN pemohon_nama TEXT DEFAULT ''`); } catch {}
  try { await db.execute(`ALTER TABLE riwayat_surat ADD COLUMN pemohon_nik TEXT DEFAULT ''`); } catch {}
  try { await db.execute(`ALTER TABLE riwayat_surat ADD COLUMN pemohon_alamat TEXT DEFAULT ''`); } catch {}
  try { await db.execute(`ALTER TABLE riwayat_surat ADD COLUMN nomor_urut_akhir INTEGER DEFAULT 0`); } catch {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS riwayat_surat_data (
      id TEXT PRIMARY KEY,
      riwayat_id TEXT,
      placeholder_key TEXT,
      placeholder_value TEXT,
      FOREIGN KEY (riwayat_id) REFERENCES riwayat_surat(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS auth_config (
      id TEXT PRIMARY KEY,
      password_hash TEXT,
      display_name TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_config (
      id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      provider TEXT DEFAULT 'groq',
      base_url TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      model TEXT DEFAULT '',
      temperature REAL DEFAULT 0.3,
      privacy_acknowledged INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // Migration: legacy ai_config rows may have a use_default column from
  // pre-1.0.5 builds. We don't read it any more; leaving it untouched is
  // harmless (SQLite ignores extra columns on INSERT we omit).

  // Saved AI provider profiles (so users can switch between multiple
  // providers/keys easily without re-typing). Active profile is tracked
  // by ai_config (provider + base_url + api_key + model snapshot).
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_provider_profiles (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      provider TEXT NOT NULL,
      base_url TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      model TEXT DEFAULT '',
      temperature REAL DEFAULT 0.3,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // Migration: add is_favorite column to templates (for Favorit grouping
  // on Buat Surat page).
  try {
    await db.execute(`ALTER TABLE templates ADD COLUMN is_favorite INTEGER DEFAULT 0`);
  } catch { /* column already exists */ }

  return db;
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export async function select<T>(query: string, params: unknown[] = []): Promise<T[]> {
  const database = getDatabase();
  return await database.select<T[]>(query, params) as unknown as T[];
}

export async function execute(query: string, params: unknown[] = []): Promise<void> {
  const database = getDatabase();
  await database.execute(query, params);
}
