import { select, execute } from './db';
import { v4 as uuid } from 'uuid';
import type { NomorSuratConfig } from '../types';

export async function getNomorSuratConfig(): Promise<NomorSuratConfig | null> {
  const rows = await select<NomorSuratConfig>('SELECT * FROM nomor_surat_config LIMIT 1');
  return rows.length > 0 ? rows[0] : null;
}

export async function saveNomorSuratConfig(data: { format: string; kode_desa: string; counter?: number }): Promise<void> {
  const existing = await getNomorSuratConfig();
  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();

  if (existing) {
    await execute(
      `UPDATE nomor_surat_config SET format=$1, kode_desa=$2, counter=$3, tahun=$4, updated_at=$5 WHERE id=$6`,
      [data.format, data.kode_desa, data.counter ?? existing.counter, currentYear, now, existing.id]
    );
  } else {
    await execute(
      `INSERT INTO nomor_surat_config (id, format, kode_desa, counter, tahun, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [uuid(), data.format, data.kode_desa, data.counter ?? 1, currentYear, now, now]
    );
  }
}

export async function incrementCounter(): Promise<number> {
  const config = await getNomorSuratConfig();
  if (!config) throw new Error('Nomor surat config not found');

  const currentYear = new Date().getFullYear();
  let newCounter: number;

  if (config.tahun !== currentYear) {
    newCounter = 1;
    await execute(
      'UPDATE nomor_surat_config SET counter=$1, tahun=$2, updated_at=$3 WHERE id=$4',
      [newCounter + 1, currentYear, new Date().toISOString(), config.id]
    );
  } else {
    newCounter = config.counter;
    await execute(
      'UPDATE nomor_surat_config SET counter=$1, updated_at=$2 WHERE id=$3',
      [newCounter + 1, new Date().toISOString(), config.id]
    );
  }

  return newCounter;
}

export async function getCurrentCounter(): Promise<number> {
  const config = await getNomorSuratConfig();
  return config?.counter ?? 1;
}

export async function recalculateCounter(): Promise<void> {
  const currentYear = new Date().getFullYear();
  const rows = await select<{ max_nomor: number | null }>(
    `SELECT MAX(nomor_urut) as max_nomor FROM riwayat_surat
     WHERE strftime('%Y', tanggal_generate) = $1`,
    [currentYear.toString()]
  );

  const maxNomor = rows[0]?.max_nomor ?? 0;
  const config = await getNomorSuratConfig();
  if (config) {
    await execute(
      'UPDATE nomor_surat_config SET counter=$1, updated_at=$2 WHERE id=$3',
      [maxNomor + 1, new Date().toISOString(), config.id]
    );
  }
}
