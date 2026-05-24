import type { PlaceholderKategori } from '../types';

export interface PlaceholderDefinition {
  token: string;
  kategori: PlaceholderKategori;
  deskripsi: string;
  contoh: string;
}

export const WARGA_FIELDS = [
  'NIK', 'NAMA', 'JENIS_KELAMIN', 'TEMPAT_LAHIR', 'TANGGAL_LAHIR',
  'TANGGAL_LAHIR_PANJANG', 'UMUR', 'AGAMA', 'STATUS', 'HUB_KELUARGA',
  'PENDIDIKAN', 'PEKERJAAN', 'NAMA_IBU', 'NAMA_AYAH', 'ALAMAT', 'RT', 'RW',
  'NO_KK', 'ALAMAT_LENGKAP', 'TTL', 'KEPALA_KELUARGA',
] as const;

export type WargaField = typeof WARGA_FIELDS[number];

export const PERANGKAT_DESA_FIELDS = [
  'NAMA', 'NAMA_LENGKAP', 'NIK', 'NIPD', 'JABATAN', 'ALAMAT',
] as const;

export type PerangkatDesaField = typeof PERANGKAT_DESA_FIELDS[number];

export const NOMOR_SURAT_FIELDS = [
  'NOMOR_SURAT', 'S_NOMOR', 'S_PREFIX', 'S_BULAN', 'S_BULAN_ROM',
  'S_TAHUN', 'S_KODE_DESA', 'S_TANGGAL',
] as const;

export type NomorSuratField = typeof NOMOR_SURAT_FIELDS[number];

export const DESA_PLACEHOLDERS: PlaceholderDefinition[] = [
  { token: 'DESA', kategori: 'desa', deskripsi: 'Nama Desa', contoh: 'Girimulya' },
  { token: 'KECAMATAN', kategori: 'desa', deskripsi: 'Kecamatan', contoh: 'Sukahaji' },
  { token: 'KABUPATEN', kategori: 'desa', deskripsi: 'Kabupaten', contoh: 'Majalengka' },
  { token: 'PROVINSI', kategori: 'desa', deskripsi: 'Provinsi', contoh: 'Jawa Barat' },
  { token: 'KODE_POS', kategori: 'desa', deskripsi: 'Kode Pos', contoh: '45471' },
  { token: 'TELEPON_DESA', kategori: 'desa', deskripsi: 'Telepon Desa', contoh: '(0233) 123456' },
  { token: 'EMAIL_DESA', kategori: 'desa', deskripsi: 'Email Desa', contoh: 'desa@gmail.com' },
  { token: 'ALAMAT_KANTOR_DESA', kategori: 'desa', deskripsi: 'Alamat Kantor Desa', contoh: 'Jl. Raya No. 1' },
  { token: 'KOP_SURAT', kategori: 'desa', deskripsi: 'Gambar kop surat (image)', contoh: '(image)' },
];

export const NOMOR_SURAT_PLACEHOLDERS: PlaceholderDefinition[] = [
  { token: 'NOMOR_SURAT', kategori: 'nomor_surat', deskripsi: 'Nomor surat lengkap (hasil format)', contoh: '001/SKD/DS-CKD/V/2026' },
  { token: 'S_NOMOR', kategori: 'nomor_surat', deskripsi: 'Nomor urut 3 digit', contoh: '001' },
  { token: 'S_PREFIX', kategori: 'nomor_surat', deskripsi: 'Prefix surat (dari template)', contoh: 'SKD' },
  { token: 'S_BULAN', kategori: 'nomor_surat', deskripsi: 'Bulan 2 digit', contoh: '05' },
  { token: 'S_BULAN_ROM', kategori: 'nomor_surat', deskripsi: 'Bulan romawi', contoh: 'V' },
  { token: 'S_TAHUN', kategori: 'nomor_surat', deskripsi: 'Tahun 4 digit', contoh: '2026' },
  { token: 'S_KODE_DESA', kategori: 'nomor_surat', deskripsi: 'Kode desa', contoh: 'DS-CKD' },
  { token: 'S_TANGGAL', kategori: 'nomor_surat', deskripsi: 'Tanggal pembuatan (format Indonesia)', contoh: '22 Mei 2026' },
];

export const PERANGKAT_DESA_ALIASES: Record<string, string> = {
  'KEPALA_DESA': 'PD1_NAMA_LENGKAP',
  'NIK_KEPALA_DESA': 'PD1_NIK',
  'NIPD_KEPALA_DESA': 'PD1_NIPD',
  'JABATAN_KEPALA_DESA': 'PD1_JABATAN',
  'ALAMAT_KEPALA_DESA': 'PD1_ALAMAT',
  'SEKRETARIS_DESA': 'PD2_NAMA_LENGKAP',
  'NIK_SEKRETARIS_DESA': 'PD2_NIK',
  'NIPD_SEKRETARIS_DESA': 'PD2_NIPD',
  'JABATAN_SEKRETARIS_DESA': 'PD2_JABATAN',
  'ALAMAT_SEKRETARIS_DESA': 'PD2_ALAMAT',
};

export const DESA_TOKENS = DESA_PLACEHOLDERS.map(p => p.token);
export const NOMOR_SURAT_TOKENS = NOMOR_SURAT_PLACEHOLDERS.map(p => p.token);
