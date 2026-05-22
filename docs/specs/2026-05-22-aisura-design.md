# AISura — Design Specification

**Version:** 1.0.0  
**Date:** 22 Mei 2026  
**Developer:** EAS Creative Studio  
**Email:** dev@eas.biz.id / eas.creative.studio@gmail.com  
**Web:** https://eas.biz.id

---

## 1. Overview

AISura adalah aplikasi desktop (Tauri v2) untuk pembuatan surat otomatis di tingkat desa. Menggunakan metode replace placeholder pada template format .docx. Terintegrasi dengan data kependudukan yang di-import dari file Excel/CSV.

**Fitur utama:**
- Manajemen template surat (.docx) dengan deteksi placeholder otomatis
- Import data warga dari Excel/CSV
- Generate surat otomatis dengan replace placeholder
- Sistem nomor surat otomatis
- Preview surat sebelum download
- Riwayat surat dengan re-generate dan laporan

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Tauri v2 (desktop) |
| Frontend | React + TypeScript + Vite |
| UI Components | React Aria Components + Tailwind CSS (JustD style) |
| Icons | Heroicons (`@heroicons/react`) |
| Animation | Framer Motion |
| Database | SQLite via `@tauri-apps/plugin-sql` |
| DOCX Processing | `easy-template-x` |
| DOCX Preview | `docx-preview` |
| Excel/CSV Import | `xlsx` |
| File System | `@tauri-apps/plugin-fs` + `@tauri-apps/plugin-dialog` |
| Auto-update | `@tauri-apps/plugin-updater` + GitHub Releases |
| Logo Font | Unica One (Google Fonts) |

---

## 3. UI/UX Specification

### 3.1 Design Tokens

| Property | Value |
|---|---|
| Font family | system-ui, -apple-system, sans-serif |
| Body text | 14px (`text-sm`) |
| Labels/secondary | 12px (`text-xs`) |
| Headings | 20-24px (`text-xl` / `text-2xl`) |
| Padding cards/sections | 12-16px (`p-3` / `p-4`) |
| Gap antar elemen | 8-12px (`gap-2` / `gap-3`) |
| Border radius | 8px (`rounded-lg`) |
| Density | Compact |
| Color scheme | Light + Dark mode toggle |
| Accent color | Blue (professional) |
| Font weight | 400 normal, 500 medium, 600 semibold |

### 3.2 Layout

```
┌──────────┬──────────────────────────────────────────────┐
│          │ Header Bar (sticky, 1 baris, compact)         │
│          ├──────────────────────────────────────────────┤
│ Sidebar  │                                              │
│ (fixed)  │  Content Area (scrollable)                   │
│          │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

- **Sidebar:** fixed, ~220px expanded, ~60px collapsed (icon only), collapsible/minimize
- **Header Bar:** sticky top, tidak ikut scroll. Isi: breadcrumb (kiri), search bar (tengah), dark mode toggle + tanggal/jam realtime + avatar profile (kanan)
- **Content Area:** scrollable, satu-satunya area yang scroll

### 3.3 Branding / Logo

- Font: **Unica One** (Google Fonts)
- "AI" → warna biru (accent color)
- "Sura" → warna hitam (light mode) / putih (dark mode)
- Text-based, tidak pakai image
- Ditampilkan di sidebar bagian bawah + halaman login

### 3.4 Sidebar Branding (bawah)

```
┌──────────────────────┐
│ [AISura]  v1.0.0     │
│ EAS Creative Studio  │
└──────────────────────┘
```

Klik area ini buka modal "About" (info lengkap: nama, dev, email, web, versi).

### 3.5 Animation

- **Framer Motion** untuk login page (fade-in form, logo animation) dan dashboard (stagger cards, counter count-up)
- **Tailwind transitions** untuk interaksi kecil (hover, toggle sidebar, dropdown)

---

## 4. Navigation

### 4.1 Sidebar

```
├── Dashboard
├── Buat Surat
├── Template
│   ├── Template Surat
│   └── Placeholder (Kamus Placeholder)
├── Data Warga
├── Riwayat Surat
├── Pengaturan
│   ├── Data Desa (+ Perangkat Desa)
│   ├── Nomor Surat
│   └── Aplikasi
└── [Branding: AISura logo + versi]
```

### 4.2 Header Bar

| Komponen | Posisi | Keterangan |
|---|---|---|
| Breadcrumb | Kiri | Navigasi kontekstual (misal: Template > Template Surat) |
| Search bar | Tengah | Quick navigate ke semua halaman |
| Dark mode toggle | Kanan | Icon sun/moon |
| Tanggal & Jam | Kanan | Realtime, format Indonesia |
| Avatar profile | Kanan ujung | Dropdown: Profil, Logout |

### 4.3 Profil

Diakses via avatar dropdown di header bar. Fitur:
- Ganti password/PIN masuk aplikasi
- Nama pengguna (display name, opsional)

---

## 5. Halaman & Fitur

### 5.1 Login

- Single password (bukan multi-user)
- First launch: user set password
- Selanjutnya: login dengan password
- Animasi entrance (Framer Motion)
- Logo AISura (Unica One font)

### 5.2 Dashboard

- Statistik ringkas: jumlah template, jumlah data warga, surat terakhir di-generate
- Quick action: Buat Surat, Import Data Warga
- Animasi: stagger cards masuk, counter count-up

### 5.3 Buat Surat

**Flow:**
1. Pilih template dari daftar
2. Aplikasi tampilkan form berdasarkan placeholder terdeteksi:
   - **Placeholder warga** (`{W1_...}`, `{W2_...}`) → search box + form editable
   - **Placeholder perangkat desa** (`{PD1_...}`, alias `{KEPALA_DESA}`, dll.) → auto-fill dari data perangkat desa
   - **Placeholder desa** (`{DESA}`, `{KECAMATAN}`, dll.) → auto-fill dari pengaturan
   - **Placeholder nomor surat** (`{NOMOR_SURAT}`, `{S_NOMOR}`, dll.) → auto-generate, user bisa override
   - **Placeholder custom/unknown** → input text kosong
3. Preview hasil surat (`docx-preview`, render HTML)
4. Download .docx
5. Metadata tersimpan ke riwayat, counter nomor surat naik

**Validasi:** Minimal PD1 (Kepala Desa) harus sudah diinput sebelum bisa buat surat.

**Form pengisian data warga:**
- Hanya tampilkan field yang placeholder-nya terdeteksi di template
- Search box selalu ada di atas setiap section warga
- Hasil pencarian tampilkan: Nama, NIK, Alamat, RT, RW, Umur
- Pilih dari dropdown → auto-fill field
- Field selalu editable (user bisa edit setelah auto-fill atau langsung ketik manual)
- Shortcut link ke halaman Placeholder dari halaman ini

### 5.4 Template Surat

- Upload file .docx sebagai template baru
- Otomatis scan & deteksi placeholder saat upload (regex pada konten XML di docx)
- Daftar template: nama, deskripsi, jumlah placeholder, tanggal upload
- Edit nama/deskripsi
- Set label peran warga (W1 = "Pemohon", W2 = "Saksi 1", dst.)
- Preview daftar placeholder yang terdeteksi (grouped by jenis)
- Hapus template
- Shortcut link ke halaman Placeholder

### 5.5 Placeholder (Kamus Placeholder)

- Daftar semua placeholder tersedia, grouped by kategori:
  - Warga (`{Wn_...}`)
  - Perangkat Desa (`{PDn_...}` + alias)
  - Desa (`{DESA}`, `{KECAMATAN}`, dll.)
  - Nomor Surat (`{S_...}`)
  - Custom (user-defined)
- Penjelasan aturan suffix style: `_U` (UPPERCASE), `_L` (lowercase), `_P` (Propercase)
- Contoh penggunaan per placeholder
- Search/filter placeholder
- Tambah/edit/hapus placeholder custom

### 5.6 Data Warga

- Import dari file Excel (.xlsx) atau CSV
- Format 16 kolom standar
- Sediakan file template Excel kosong untuk download (bundled di `public/`)
- Tabel data warga: search/filter berdasarkan nama, NIK, alamat
- Detail warga (view)

**Kolom standar (16 kolom):**
```
NOMOR KK, NIK, NAMA, JENIS KELAMIN, TEMPAT LAHIR, TANGGAL LAHIR,
AGAMA, STATUS, HUBUNGAN KELUARGA, PENDIDIKAN, PEKERJAAN,
NAMA IBU, NAMA AYAH, ALAMAT, RT, RW
```

### 5.7 Riwayat Surat

- Daftar surat yang pernah di-generate
- Metadata: tanggal, template yang dipakai, nomor surat, warga yang terlibat
- Tombol "Generate Ulang" — re-generate dari metadata tersimpan
- **Hapus riwayat** — per baris (single) atau semua sekaligus (bulk)
- **Download laporan Excel (.xlsx)** — export daftar surat yang sudah di-generate
- Tidak menyimpan file .docx

**Logika nomor surat saat hapus:**
- Hapus di ujung (nomor tertinggi) → counter turun
- Hapus di tengah → counter tetap (nomor tidak bisa dipakai lagi kecuali semua nomor di atasnya dihapus)
- Counter = nomor tertinggi yang masih ada di riwayat + 1

### 5.8 Pengaturan — Data Desa

Satu halaman gabungan:

**Identitas Desa:**
- Nama Desa, Kecamatan, Kabupaten, Provinsi
- Kode Pos, Telepon, Email
- Alamat Kantor Desa
- Logo Desa (image upload)
- Kop Surat (image upload)

**Perangkat Desa (list, dinamis):**

| Urutan | Jabatan Default |
|---|---|
| PD1 | Kepala Desa |
| PD2 | Sekretaris Desa |
| PD3 | Kaur TU & Umum |
| PD4 | Kaur Keuangan |
| PD5 | Kaur Perencanaan |
| PD6 | Kasi Pemerintahan |
| PD7 | Kasi Kesejahteraan |
| PD8 | Kasi Pelayanan |
| PD9+ | Kadus (dinamis, user bisa tambah) |

**Field per perangkat desa:**
- Nama (dari data warga / manual)
- Gelar Depan, Gelar Belakang
- NIK (dari data warga / manual)
- NIPD
- Jabatan
- Alamat (dari data warga / manual)

Input bisa dari data warga (search → auto-fill, form tetap editable) atau manual tanpa data warga.

### 5.9 Pengaturan — Nomor Surat

- Format configurable: contoh `{S_NOMOR}/{S_KODE_DESA}/{S_BULAN_ROM}/{S_TAHUN}`
- Kode desa (user set)
- Counter saat ini (display)
- Set nomor awal (manual override)
- Counter global, auto-increment per tahun
- Reset counter otomatis tiap tahun baru
- User bisa override nomor saat generate surat

### 5.10 Pengaturan — Aplikasi

- Backup database (export)
- Restore database (import)
- Reset data
- Info versi aplikasi
- Cek update

---

## 6. Placeholder System

### 6.1 Jenis Placeholder

| Jenis | Pattern | Sumber | Auto-fill |
|---|---|---|---|
| Warga | `{W1_NAMA}`, `{W2_NIK}`, dst. | Database warga | Ya (editable) |
| Perangkat Desa | `{PD1_NAMA}`, `{PD2_NIPD}`, dst. | Data perangkat desa | Ya |
| Alias Perangkat | `{KEPALA_DESA}`, `{SEKRETARIS_DESA}`, dst. | Resolve ke PDn | Ya |
| Desa | `{DESA}`, `{KECAMATAN}`, dst. | Pengaturan identitas desa | Ya |
| Nomor Surat | `{NOMOR_SURAT}`, `{S_NOMOR}`, dst. | Auto-generate | Ya (overridable) |
| Custom | Apapun yang tidak match di atas | Manual input | Tidak |

### 6.2 Suffix Style Modifier

Berlaku untuk SEMUA jenis placeholder:

| Suffix | Fungsi | Contoh Input → Output |
|---|---|---|
| (tanpa suffix) | Apa adanya dari data | `{W1_NAMA}` → Sena |
| `_U` | UPPERCASE | `{W1_NAMA_U}` → SENA |
| `_L` | lowercase | `{W1_NAMA_L}` → sena |
| `_P` | Propercase (Title Case) | `{W1_NAMA_P}` → Sena |

Deteksi regex: `/\{([A-Z0-9_]+?)(?:_(U|L|P))?\}/g`

### 6.3 Placeholder Warga (per slot Wn)

| Placeholder | Field | Contoh |
|---|---|---|
| `{Wn_NIK}` | NIK | 3210221506570081 |
| `{Wn_NAMA}` | Nama | SENA |
| `{Wn_JENIS_KELAMIN}` | Jenis Kelamin | Laki-laki |
| `{Wn_TEMPAT_LAHIR}` | Tempat Lahir | Majalengka |
| `{Wn_TANGGAL_LAHIR}` | Tanggal Lahir | 15-06-1957 |
| `{Wn_UMUR}` | Computed dari tanggal lahir | 67 |
| `{Wn_AGAMA}` | Agama | Islam |
| `{Wn_STATUS}` | Status Perkawinan | Kawin |
| `{Wn_HUB_KELUARGA}` | Hubungan Keluarga | Kepala Keluarga |
| `{Wn_PENDIDIKAN}` | Pendidikan | Tamat SD/Sederajat |
| `{Wn_PEKERJAAN}` | Pekerjaan | Petani/Pekebun |
| `{Wn_NAMA_IBU}` | Nama Ibu | SAWIT |
| `{Wn_NAMA_AYAH}` | Nama Ayah | ARTANI |
| `{Wn_ALAMAT}` | Alamat | Blok Desa |
| `{Wn_RT}` | RT | 001 |
| `{Wn_RW}` | RW | 001 |
| `{Wn_NO_KK}` | Nomor KK | 3210221601060011 |
| `{Wn_ALAMAT_LENGKAP}` | Computed: ALAMAT RT RW | Blok Desa RT 001 RW 001 |
| `{Wn_TTL}` | Computed: Tempat, Tgl Lahir | Majalengka, 15 Juni 1957 |

### 6.4 Placeholder Perangkat Desa (per slot PDn)

| Placeholder | Field | Contoh |
|---|---|---|
| `{PDn_NAMA}` | Nama tanpa gelar | WAHYU SUTRISNO |
| `{PDn_NAMA_LENGKAP}` | Gelar depan + Nama + Gelar belakang | H. Wahyu Sutrisno, S.Pd. |
| `{PDn_NIK}` | NIK | 3210221506570081 |
| `{PDn_NIPD}` | NIPD | 20.01.001 |
| `{PDn_JABATAN}` | Jabatan | Kepala Desa |
| `{PDn_ALAMAT}` | Alamat | Blok Desa RT 001 RW 001 |

**Alias (intuitif → resolve):**

| Alias | Resolve ke |
|---|---|
| `{KEPALA_DESA}` | `{PD1_NAMA_LENGKAP}` |
| `{NIK_KEPALA_DESA}` | `{PD1_NIK}` |
| `{NIPD_KEPALA_DESA}` | `{PD1_NIPD}` |
| `{JABATAN_KEPALA_DESA}` | `{PD1_JABATAN}` |
| `{ALAMAT_KEPALA_DESA}` | `{PD1_ALAMAT}` |
| `{SEKRETARIS_DESA}` | `{PD2_NAMA_LENGKAP}` |
| `{NIK_SEKRETARIS_DESA}` | `{PD2_NIK}` |
| `{NIPD_SEKRETARIS_DESA}` | `{PD2_NIPD}` |
| `{JABATAN_SEKRETARIS_DESA}` | `{PD2_JABATAN}` |
| `{ALAMAT_SEKRETARIS_DESA}` | `{PD2_ALAMAT}` |

### 6.5 Placeholder Desa

| Placeholder | Field |
|---|---|
| `{DESA}` | Nama Desa |
| `{KECAMATAN}` | Kecamatan |
| `{KABUPATEN}` | Kabupaten |
| `{PROVINSI}` | Provinsi |
| `{KODE_POS}` | Kode Pos |
| `{TELEPON_DESA}` | Telepon |
| `{EMAIL_DESA}` | Email |
| `{ALAMAT_KANTOR_DESA}` | Alamat Kantor |

### 6.6 Placeholder Nomor Surat

| Placeholder | Deskripsi | Contoh |
|---|---|---|
| `{NOMOR_SURAT}` | Nomor surat lengkap (hasil format) | 001/DS-CKD/V/2026 |
| `{S_NOMOR}` | Nomor urut 3 digit | 001 |
| `{S_BULAN}` | Bulan 2 digit | 05 |
| `{S_BULAN_ROM}` | Bulan romawi | V |
| `{S_TAHUN}` | Tahun 4 digit | 2026 |
| `{S_KODE_DESA}` | Kode desa (user set di pengaturan) | DS-CKD |
| `{S_TANGGAL}` | Tanggal pembuatan (format Indonesia) | 22 Mei 2026 |

### 6.7 Deteksi Placeholder

Saat upload template:
1. Parse konten XML di dalam file .docx
2. Regex scan: `/\{([A-Z0-9_]+)\}/g`
3. Klasifikasi otomatis berdasarkan prefix/match:
   - Pattern `W\d+_` → warga
   - Pattern `PD\d+_` → perangkat desa
   - Match alias (KEPALA_DESA, SEKRETARIS_DESA, dll.) → perangkat desa
   - Pattern `S_` atau exact `NOMOR_SURAT` → nomor surat
   - Match daftar desa (DESA, KECAMATAN, KABUPATEN, dll.) → desa
   - Sisanya → custom (form input manual)

---

## 7. Database Schema

```sql
-- Data warga (import dari Excel/CSV)
CREATE TABLE warga (
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
);

-- Identitas desa
CREATE TABLE data_desa (
  id TEXT PRIMARY KEY,
  desa TEXT,
  kecamatan TEXT,
  kabupaten TEXT,
  provinsi TEXT,
  kode_pos TEXT,
  telepon TEXT,
  email TEXT,
  alamat_kantor TEXT,
  logo_desa TEXT,      -- base64 image
  kop_surat TEXT,      -- base64 image
  created_at TEXT,
  updated_at TEXT
);

-- Perangkat desa
CREATE TABLE perangkat_desa (
  id TEXT PRIMARY KEY,
  urutan INTEGER,      -- nomor urut (1=Kades, 2=Sekdes, dst.)
  warga_id TEXT,       -- FK ke warga (nullable, bisa input manual)
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
);

-- Template surat
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  nama TEXT,
  deskripsi TEXT,
  file_path TEXT,      -- path ke file docx di $APPCONFIG/templates/
  placeholders TEXT,   -- JSON array of detected placeholders
  warga_count INTEGER DEFAULT 0,  -- jumlah slot warga terdeteksi
  created_at TEXT,
  updated_at TEXT
);

-- Label peran warga per template
CREATE TABLE template_labels (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  slot TEXT,           -- "W1", "W2", dst.
  label TEXT,          -- "Pemohon", "Saksi 1", dst.
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- Placeholder custom (user-defined)
CREATE TABLE placeholder_registry (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE,   -- misal "PERIHAL"
  deskripsi TEXT,
  default_value TEXT,
  created_at TEXT
);

-- Konfigurasi nomor surat
CREATE TABLE nomor_surat_config (
  id TEXT PRIMARY KEY,
  format TEXT,         -- "{S_NOMOR}/{S_KODE_DESA}/{S_BULAN_ROM}/{S_TAHUN}"
  kode_desa TEXT,
  counter INTEGER DEFAULT 1,
  tahun INTEGER,
  created_at TEXT,
  updated_at TEXT
);

-- Riwayat surat
CREATE TABLE riwayat_surat (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  template_nama TEXT,  -- snapshot nama template saat generate
  nomor_surat TEXT,    -- nomor surat lengkap yang dipakai
  nomor_urut INTEGER,  -- nomor urut saja (untuk logika counter)
  tanggal_generate TEXT,
  created_at TEXT,
  FOREIGN KEY (template_id) REFERENCES templates(id)
);

-- Data placeholder per riwayat (key-value)
CREATE TABLE riwayat_surat_data (
  id TEXT PRIMARY KEY,
  riwayat_id TEXT,
  placeholder_key TEXT,
  placeholder_value TEXT,
  FOREIGN KEY (riwayat_id) REFERENCES riwayat_surat(id) ON DELETE CASCADE
);
```

---

## 8. File Storage

| Item | Lokasi |
|---|---|
| Template .docx (user upload) | `$APPCONFIG/templates/` |
| Logo desa & Kop surat | Base64 di database (`data_desa` table) |
| File template Excel kosong (download) | Bundled di `public/template-import-warga.xlsx` |
| Database SQLite | `$APPDATA/aisura.db` |

---

## 9. Auto-update

- Plugin: `@tauri-apps/plugin-updater`
- Source: GitHub Releases
- Versioning: Semantic Versioning (SemVer) — `v{MAJOR}.{MINOR}.{PATCH}`
- Versi awal: `v1.0.0`
- Versi ditampilkan di sidebar (branding area) dan Pengaturan > Aplikasi
- Notifikasi update saat app dibuka (jika ada versi baru)
- Database migration system — jalankan migration otomatis saat app start setelah update jika ada perubahan schema

---

## 10. Identitas Aplikasi

| Field | Value |
|---|---|
| Nama | AISura |
| Developer | EAS Creative Studio |
| Email | dev@eas.biz.id / eas.creative.studio@gmail.com |
| Web | https://eas.biz.id |
| Logo | Text-based: "AI" (biru) + "Sura" (hitam/putih adaptive) |
| Logo Font | Unica One (Google Fonts) |
| Versi Awal | v1.0.0 |

---

## 11. Authentication

- Single password (bukan multi-user)
- First launch: user set password
- Login page dengan animasi (Framer Motion)
- Ganti password via Profil (akses dari avatar dropdown di header)
- Tidak ada fitur lupa password (reset via Pengaturan > Aplikasi → reset data)

---

## 12. Constraints & Decisions

1. **Tauri v2 desktop only** — tidak ada web version
2. **SQLite** — single-file database, no server needed
3. **easy-template-x** — library utama untuk replace placeholder di docx
4. **docx-preview** — preview sederhana (tidak 100% akurat, cukup untuk lihat narasi/data)
5. **Counter nomor surat global** — satu counter untuk semua jenis surat
6. **Riwayat tidak simpan file** — hanya metadata, re-generate dari data tersimpan
7. **Placeholder suffix style** — `_U`, `_L`, `_P` berlaku untuk semua placeholder
8. **Perangkat desa dinamis** — user bisa tambah slot (terutama Kadus)
9. **Data warga dari import saja** — tidak ada input manual per-warga (tapi form saat buat surat bisa diisi manual)
10. **Header bar sticky** — tidak ikut scroll, sidebar fixed
