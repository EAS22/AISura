import { select, execute } from './db';
import { v4 as uuid } from 'uuid';
import type { RiwayatSurat, RiwayatSuratData } from '../types';
import { recalculateCounter } from './nomorSuratService';

export async function getAllRiwayat(): Promise<RiwayatSurat[]> {
  return await select<RiwayatSurat>('SELECT * FROM riwayat_surat ORDER BY created_at DESC');
}

export async function getRiwayatCount(): Promise<number> {
  const rows = await select<{ count: number }>('SELECT COUNT(*) as count FROM riwayat_surat');
  return rows[0]?.count ?? 0;
}

export async function getRiwayatData(riwayatId: string): Promise<Record<string, string>> {
  const rows = await select<RiwayatSuratData>(
    'SELECT * FROM riwayat_surat_data WHERE riwayat_id = $1', [riwayatId]
  );
  const data: Record<string, string> = {};
  for (const row of rows) {
    data[row.placeholder_key] = row.placeholder_value;
  }
  return data;
}

export async function saveRiwayat(
  templateId: string,
  templateNama: string,
  nomorSurat: string,
  nomorUrut: number,
  placeholderData: Record<string, string>,
  pemohon?: { nama: string; nik: string; alamat: string }
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO riwayat_surat (id, template_id, template_nama, nomor_surat, nomor_urut, pemohon_nama, pemohon_nik, pemohon_alamat, tanggal_generate, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, templateId, templateNama, nomorSurat, nomorUrut, pemohon?.nama || '', pemohon?.nik || '', pemohon?.alamat || '', now, now]
  );

  for (const [key, value] of Object.entries(placeholderData)) {
    await execute(
      'INSERT INTO riwayat_surat_data (id, riwayat_id, placeholder_key, placeholder_value) VALUES ($1,$2,$3,$4)',
      [uuid(), id, key, value]
    );
  }

  return id;
}

export async function deleteRiwayat(id: string): Promise<void> {
  await execute('DELETE FROM riwayat_surat_data WHERE riwayat_id = $1', [id]);
  await execute('DELETE FROM riwayat_surat WHERE id = $1', [id]);
  await recalculateCounter();
}

export async function deleteAllRiwayat(): Promise<void> {
  await execute('DELETE FROM riwayat_surat_data');
  await execute('DELETE FROM riwayat_surat');
  await recalculateCounter();
}
