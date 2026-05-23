import { select, execute } from './db';
import { v4 as uuid } from 'uuid';
import type { Warga } from '../types';

export async function getAllWarga(): Promise<Warga[]> {
  return await select<Warga>('SELECT * FROM warga ORDER BY nama ASC');
}

export async function getWargaCount(): Promise<number> {
  const rows = await select<{ count: number }>('SELECT COUNT(*) as count FROM warga');
  return rows[0]?.count ?? 0;
}

export async function searchWarga(query: string, limit: number = 10): Promise<Warga[]> {
  const q = `%${query}%`;
  return await select<Warga>(
    'SELECT * FROM warga WHERE nama LIKE $1 OR nik LIKE $2 ORDER BY nama ASC LIMIT $3',
    [q, q, limit]
  );
}

export async function getWargaById(id: string): Promise<Warga | null> {
  const rows = await select<Warga>('SELECT * FROM warga WHERE id = $1', [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function importWargaBatch(wargaList: Omit<Warga, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
  const now = new Date().toISOString();
  let imported = 0;

  for (const warga of wargaList) {
    try {
      await execute(
        `INSERT OR REPLACE INTO warga (id, no_kk, nik, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, status, hub_keluarga, pendidikan, pekerjaan, nama_ibu, nama_ayah, alamat, rt, rw, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [uuid(), warga.no_kk, warga.nik, warga.nama, warga.jenis_kelamin,
         warga.tempat_lahir, warga.tanggal_lahir, warga.agama, warga.status,
         warga.hub_keluarga, warga.pendidikan, warga.pekerjaan,
         warga.nama_ibu, warga.nama_ayah, warga.alamat, warga.rt, warga.rw,
         now, now]
      );
      imported++;
    } catch (err) {
      console.warn('Skip duplicate NIK:', warga.nik, err);
    }
  }

  return imported;
}

export async function deleteAllWarga(): Promise<void> {
  await execute('DELETE FROM warga');
}
