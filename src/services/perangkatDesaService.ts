import { select, execute } from './db';
import { v4 as uuid } from 'uuid';
import type { PerangkatDesa } from '../types';

export async function getAllPerangkatDesa(): Promise<PerangkatDesa[]> {
  return await select<PerangkatDesa>('SELECT * FROM perangkat_desa ORDER BY urutan ASC');
}

export async function getPerangkatDesaByUrutan(urutan: number): Promise<PerangkatDesa | null> {
  const rows = await select<PerangkatDesa>('SELECT * FROM perangkat_desa WHERE urutan = $1', [urutan]);
  return rows.length > 0 ? rows[0] : null;
}

export async function savePerangkatDesa(data: Omit<PerangkatDesa, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const existing = await getPerangkatDesaByUrutan(data.urutan);
  const now = new Date().toISOString();

  if (existing) {
    await execute(
      `UPDATE perangkat_desa SET warga_id=$1, nama=$2, gelar_depan=$3, gelar_belakang=$4,
       nik=$5, nipd=$6, jabatan=$7, alamat=$8, updated_at=$9 WHERE id=$10`,
      [data.warga_id, data.nama, data.gelar_depan, data.gelar_belakang,
       data.nik, data.nipd, data.jabatan, data.alamat, now, existing.id]
    );
    return existing.id;
  } else {
    const id = uuid();
    await execute(
      `INSERT INTO perangkat_desa (id, urutan, warga_id, nama, gelar_depan, gelar_belakang, nik, nipd, jabatan, alamat, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, data.urutan, data.warga_id, data.nama, data.gelar_depan, data.gelar_belakang,
       data.nik, data.nipd, data.jabatan, data.alamat, now, now]
    );
    return id;
  }
}

export async function deletePerangkatDesa(id: string): Promise<void> {
  await execute('DELETE FROM perangkat_desa WHERE id = $1', [id]);
}
