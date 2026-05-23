import { select, execute } from './db';
import { v4 as uuid } from 'uuid';
import type { DataDesa } from '../types';

export async function getDataDesa(): Promise<DataDesa | null> {
  const rows = await select<DataDesa>('SELECT * FROM data_desa LIMIT 1');
  return rows.length > 0 ? rows[0] : null;
}

export async function saveDataDesa(data: Omit<DataDesa, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  const existing = await getDataDesa();
  const now = new Date().toISOString();

  if (existing) {
    await execute(
      `UPDATE data_desa SET desa=$1, kecamatan=$2, kabupaten=$3, provinsi=$4,
       kode_pos=$5, telepon=$6, email=$7, alamat_kantor=$8, logo_desa=$9, kop_surat=$10, updated_at=$11
       WHERE id=$12`,
      [data.desa, data.kecamatan, data.kabupaten, data.provinsi,
       data.kode_pos, data.telepon, data.email, data.alamat_kantor,
       data.logo_desa, data.kop_surat, now, existing.id]
    );
  } else {
    await execute(
      `INSERT INTO data_desa (id, desa, kecamatan, kabupaten, provinsi, kode_pos, telepon, email, alamat_kantor, logo_desa, kop_surat, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [uuid(), data.desa, data.kecamatan, data.kabupaten, data.provinsi,
       data.kode_pos, data.telepon, data.email, data.alamat_kantor,
       data.logo_desa, data.kop_surat, now, now]
    );
  }
}
