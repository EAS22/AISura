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
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // Migration: add prefix_surat column if missing (for existing databases)
  try {
    await db.execute(`ALTER TABLE templates ADD COLUMN prefix_surat TEXT DEFAULT ''`);
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
      tanggal_generate TEXT,
      created_at TEXT,
      FOREIGN KEY (template_id) REFERENCES templates(id)
    )
  `);

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
