// === Data Warga ===
export interface Warga {
  id: string;
  no_kk: string;
  nik: string;
  nama: string;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  agama: string;
  status: string;
  hub_keluarga: string;
  pendidikan: string;
  pekerjaan: string;
  nama_ibu: string;
  nama_ayah: string;
  alamat: string;
  rt: string;
  rw: string;
  created_at: string;
  updated_at: string;
}

// === Data Desa ===
export interface DataDesa {
  id: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kode_pos: string;
  telepon: string;
  email: string;
  alamat_kantor: string;
  logo_desa: string;
  kop_surat: string;
  created_at: string;
  updated_at: string;
}

// === Perangkat Desa ===
export interface PerangkatDesa {
  id: string;
  urutan: number;
  warga_id: string | null;
  nama: string;
  gelar_depan: string;
  gelar_belakang: string;
  nik: string;
  nipd: string;
  jabatan: string;
  alamat: string;
  created_at: string;
  updated_at: string;
}

// === Template Surat ===
export interface TemplateSurat {
  id: string;
  nama: string;
  deskripsi: string;
  file_path: string;
  placeholders: string;
  warga_count: number;
  prefix_surat: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateLabel {
  id: string;
  template_id: string;
  slot: string;
  label: string;
}

// === Placeholder ===
export interface PlaceholderCustom {
  id: string;
  token: string;
  deskripsi: string;
  default_value: string;
  created_at: string;
}

export type PlaceholderKategori = 'warga' | 'perangkat_desa' | 'desa' | 'nomor_surat' | 'custom';

export interface DetectedPlaceholder {
  token: string;
  kategori: PlaceholderKategori;
  field: string;
  modifier?: 'U' | 'L' | 'P';
  slot?: string;
}

// === Nomor Surat ===
export interface NomorSuratConfig {
  id: string;
  format: string;
  kode_desa: string;
  counter: number;
  tahun: number;
  created_at: string;
  updated_at: string;
}

// === Riwayat Surat ===
export interface RiwayatSurat {
  id: string;
  template_id: string;
  template_nama: string;
  nomor_surat: string;
  nomor_urut: number;
  nomor_urut_akhir: number;
  pemohon_nama: string;
  pemohon_nik: string;
  pemohon_alamat: string;
  tanggal_generate: string;
  created_at: string;
}

export interface RiwayatSuratData {
  id: string;
  riwayat_id: string;
  placeholder_key: string;
  placeholder_value: string;
}

// === Auth ===
export interface AuthConfig {
  password_hash: string;
  display_name: string;
}

// === Navigation ===
export type PageId =
  | 'dashboard'
  | 'buat-surat'
  | 'template-surat'
  | 'placeholder'
  | 'data-warga'
  | 'riwayat-surat'
  | 'pengaturan-data-desa'
  | 'pengaturan-nomor-surat'
  | 'pengaturan-aplikasi'
  | 'profil';
