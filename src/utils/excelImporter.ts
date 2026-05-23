import * as XLSX from 'xlsx';
import type { Warga } from '../types';

const COLUMN_MAP: Record<string, keyof Omit<Warga, 'id' | 'created_at' | 'updated_at'>> = {
  'nomor kk': 'no_kk',
  'nik': 'nik',
  'nama': 'nama',
  'jenis kelamin': 'jenis_kelamin',
  'tempat lahir': 'tempat_lahir',
  'tanggal lahir': 'tanggal_lahir',
  'agama': 'agama',
  'status': 'status',
  'hubungan keluarga': 'hub_keluarga',
  'pendidikan': 'pendidikan',
  'pekerjaan': 'pekerjaan',
  'nama ibu': 'nama_ibu',
  'nama ayah': 'nama_ayah',
  'alamat': 'alamat',
  'rt': 'rt',
  'rw': 'rw',
};

export interface ImportResult {
  success: boolean;
  data: Omit<Warga, 'id' | 'created_at' | 'updated_at'>[];
  errors: string[];
  totalRows: number;
}

export function parseExcelOrCsv(buffer: ArrayBuffer): ImportResult {
  const errors: string[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (rawData.length === 0) {
      return { success: false, data: [], errors: ['File kosong'], totalRows: 0 };
    }

    const firstRow = rawData[0];
    const headerMap: Record<string, string> = {};
    for (const key of Object.keys(firstRow)) {
      const normalized = key.toLowerCase().trim();
      if (COLUMN_MAP[normalized]) {
        headerMap[key] = COLUMN_MAP[normalized];
      }
    }

    const requiredFields = ['nik', 'nama'];
    for (const field of requiredFields) {
      if (!Object.values(headerMap).includes(field)) {
        errors.push(`Kolom "${field}" tidak ditemukan`);
      }
    }

    if (errors.length > 0) {
      return { success: false, data: [], errors, totalRows: rawData.length };
    }

    const data: Omit<Warga, 'id' | 'created_at' | 'updated_at'>[] = [];
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const warga: Record<string, string> = {};

      for (const [originalKey, mappedKey] of Object.entries(headerMap)) {
        warga[mappedKey] = String(row[originalKey] ?? '').trim();
      }

      if (!warga.nik || warga.nik.length < 10) {
        errors.push(`Baris ${i + 2}: NIK tidak valid`);
        continue;
      }

      // Pad RT/RW to 3 digits
      if (warga.rt) warga.rt = warga.rt.padStart(3, '0');
      if (warga.rw) warga.rw = warga.rw.padStart(3, '0');

      data.push(warga as unknown as Omit<Warga, 'id' | 'created_at' | 'updated_at'>);
    }

    return { success: true, data, errors, totalRows: rawData.length };
  } catch (err) {
    return { success: false, data: [], errors: [`Gagal membaca file: ${err}`], totalRows: 0 };
  }
}
