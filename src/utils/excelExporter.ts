import * as XLSX from 'xlsx';
import type { RiwayatSurat } from '../types';

export function exportRiwayatToExcel(riwayatList: RiwayatSurat[]): ArrayBuffer {
  const data = riwayatList.map((r, i) => ({
    'No': i + 1,
    'Tanggal': r.tanggal_generate,
    'Nomor Surat': r.nomor_surat,
    'Template': r.template_nama,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Surat');

  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 20 },
    { wch: 30 },
    { wch: 40 },
  ];

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

export function generateTemplateWargaExcel(): ArrayBuffer {
  const headers = [
    'NOMOR KK', 'NIK', 'NAMA', 'JENIS KELAMIN', 'TEMPAT LAHIR', 'TANGGAL LAHIR',
    'AGAMA', 'STATUS', 'HUBUNGAN KELUARGA', 'PENDIDIKAN', 'PEKERJAAN',
    'NAMA IBU', 'NAMA AYAH', 'ALAMAT', 'RT', 'RW',
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Warga');

  worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
