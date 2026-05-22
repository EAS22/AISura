# AISura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AISura — a Tauri v2 desktop app for automated village letter generation using docx template placeholder replacement.

**Architecture:** Tauri v2 desktop app with React frontend. SQLite database for local storage. Template docx files processed client-side using easy-template-x. Collapsible sidebar + sticky header bar layout with React Aria Components.

**Tech Stack:** Tauri v2, React 19, TypeScript, Vite, Tailwind CSS v4, React Aria Components, Heroicons, Framer Motion, SQLite (plugin-sql), easy-template-x, docx-preview, xlsx, Unica One font.

---

## File Structure

```
AISura/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── src/
│   │   └── lib.rs
│   └── icons/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── HeaderBar.tsx
│   │   │   └── Layout.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── TextField.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── SearchField.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── Toast.tsx
│   │   ├── shared/
│   │   │   ├── WargaSearchBox.tsx
│   │   │   ├── PlaceholderBadge.tsx
│   │   │   └── DocxPreview.tsx
│   │   └── forms/
│   │       ├── WargaForm.tsx
│   │       ├── PerangkatDesaForm.tsx
│   │       └── DataDesaForm.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── BuatSurat.tsx
│   │   ├── TemplateSurat.tsx
│   │   ├── Placeholder.tsx
│   │   ├── DataWarga.tsx
│   │   ├── RiwayatSurat.tsx
│   │   └── pengaturan/
│   │       ├── DataDesa.tsx
│   │       ├── NomorSurat.tsx
│   │       └── Aplikasi.tsx
│   ├── services/
│   │   ├── db.ts
│   │   ├── wargaService.ts
│   │   ├── templateService.ts
│   │   ├── desaService.ts
│   │   ├── perangkatDesaService.ts
│   │   ├── nomorSuratService.ts
│   │   ├── riwayatService.ts
│   │   ├── authService.ts
│   │   └── backupService.ts
│   ├── utils/
│   │   ├── docxProcessor.ts
│   │   ├── placeholderDetector.ts
│   │   ├── placeholderResolver.ts
│   │   ├── placeholderRegistry.ts
│   │   ├── excelImporter.ts
│   │   ├── excelExporter.ts
│   │   ├── nomorSuratGenerator.ts
│   │   └── textTransform.ts
│   ├── hooks/
│   │   ├── useDatabase.ts
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts
│   │   ├── useClock.ts
│   │   └── useUpdater.ts
│   ├── types/
│   │   └── index.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   └── constants/
│       └── placeholders.ts
├── public/
│   └── template-import-warga.xlsx
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.node.json
```

---

## Phase 1: Project Scaffolding & Core Infrastructure

### Task 1: Create Tauri v2 Project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `index.html`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Initialize Tauri v2 project**

```bash
cd /home/eas/Data/PROJECT/AISura
npm create tauri-app@latest . -- --template react-ts --manager npm
```

Select: TypeScript, React, npm

- [ ] **Step 2: Install core dependencies**

```bash
npm install react-aria-components @heroicons/react framer-motion
npm install @tauri-apps/plugin-sql @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-updater @tauri-apps/plugin-process
npm install easy-template-x docx-preview xlsx uuid jszip
npm install -D tailwindcss @tailwindcss/vite autoprefixer @types/uuid
```

- [ ] **Step 3: Add Tauri plugins in Cargo.toml**

In `src-tauri/Cargo.toml`, add under `[dependencies]`:

```toml
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
```

- [ ] **Step 4: Configure Tauri plugins in lib.rs**

`src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Configure tauri.conf.json**

`src-tauri/tauri.conf.json`:

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "AISura",
  "version": "1.0.0",
  "identifier": "id.biz.eas.aisura",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "AISura",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null,
      "capabilities": ["default"]
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis", "deb", "appimage"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "sql": {
      "preload": ["sqlite:aisura.db"]
    },
    "updater": {
      "endpoints": [
        "https://github.com/EAS22/AISura/releases/latest/download/latest.json"
      ]
    }
  }
}
```

- [ ] **Step 6: Configure capabilities**

`src-tauri/capabilities/default.json`:

```json
{
  "identifier": "default",
  "description": "Default capabilities for AISura",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-execute",
    "sql:allow-select",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read",
    "fs:allow-write",
    "fs:allow-exists",
    "fs:allow-mkdir",
    "fs:allow-remove",
    "fs:allow-stat",
    "fs:allow-app-write",
    "fs:allow-app-read",
    "updater:default",
    "process:default"
  ]
}
```

- [ ] **Step 7: Configure Vite with Tailwind**

`vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

- [ ] **Step 8: Verify project builds**

```bash
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Tauri v2 project with React + TypeScript + Vite"
```

---

### Task 2: Setup Tailwind CSS & Base Styles

**Files:**
- Create: `src/index.css`
- Create: `tailwind.config.ts`

- [ ] **Step 1: Create Tailwind CSS entry**

`src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-accent-light: #dbeafe;
  --color-surface: #ffffff;
  --color-surface-secondary: #f9fafb;
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  --font-sans: system-ui, -apple-system, sans-serif;
  --font-logo: 'Unica One', cursive;
}

/* Dark mode overrides */
.dark {
  --color-surface: #0f172a;
  --color-surface-secondary: #1e293b;
  --color-border: #334155;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-tertiary: #64748b;
  --color-accent-light: #1e3a5f;
}

/* Base styles */
body {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-primary);
  background-color: var(--color-surface);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}
```

- [ ] **Step 2: Add Unica One font to index.html**

`index.html`:

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Unica+One&display=swap" rel="stylesheet" />
    <title>AISura</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: setup Tailwind CSS with design tokens and Unica One font"
```

---

### Task 3: Types & Constants

**Files:**
- Create: `src/types/index.ts`
- Create: `src/constants/placeholders.ts`

- [ ] **Step 1: Define all TypeScript types**

`src/types/index.ts`:

```typescript
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
  placeholders: string; // JSON array
  warga_count: number;
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
  slot?: string; // "W1", "W2", "PD1", etc.
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

export interface NavItem {
  id: PageId;
  label: string;
  icon: string;
  children?: NavItem[];
}
```

- [ ] **Step 2: Define placeholder constants**

`src/constants/placeholders.ts`:

```typescript
import type { PlaceholderKategori } from '../types';

export interface PlaceholderDefinition {
  token: string;
  kategori: PlaceholderKategori;
  deskripsi: string;
  contoh: string;
}

// Placeholder Warga fields (tanpa prefix Wn_)
export const WARGA_FIELDS = [
  'NIK', 'NAMA', 'JENIS_KELAMIN', 'TEMPAT_LAHIR', 'TANGGAL_LAHIR',
  'UMUR', 'AGAMA', 'STATUS', 'HUB_KELUARGA', 'PENDIDIKAN',
  'PEKERJAAN', 'NAMA_IBU', 'NAMA_AYAH', 'ALAMAT', 'RT', 'RW',
  'NO_KK', 'ALAMAT_LENGKAP', 'TTL',
] as const;

export type WargaField = typeof WARGA_FIELDS[number];

// Placeholder Perangkat Desa fields (tanpa prefix PDn_)
export const PERANGKAT_DESA_FIELDS = [
  'NAMA', 'NAMA_LENGKAP', 'NIK', 'NIPD', 'JABATAN', 'ALAMAT',
] as const;

export type PerangkatDesaField = typeof PERANGKAT_DESA_FIELDS[number];

// Placeholder Desa
export const DESA_PLACEHOLDERS: PlaceholderDefinition[] = [
  { token: 'DESA', kategori: 'desa', deskripsi: 'Nama Desa', contoh: 'Girimulya' },
  { token: 'KECAMATAN', kategori: 'desa', deskripsi: 'Kecamatan', contoh: 'Sukahaji' },
  { token: 'KABUPATEN', kategori: 'desa', deskripsi: 'Kabupaten', contoh: 'Majalengka' },
  { token: 'PROVINSI', kategori: 'desa', deskripsi: 'Provinsi', contoh: 'Jawa Barat' },
  { token: 'KODE_POS', kategori: 'desa', deskripsi: 'Kode Pos', contoh: '45471' },
  { token: 'TELEPON_DESA', kategori: 'desa', deskripsi: 'Telepon Desa', contoh: '(0233) 123456' },
  { token: 'EMAIL_DESA', kategori: 'desa', deskripsi: 'Email Desa', contoh: 'desa@gmail.com' },
  { token: 'ALAMAT_KANTOR_DESA', kategori: 'desa', deskripsi: 'Alamat Kantor Desa', contoh: 'Jl. Raya No. 1' },
];

// Placeholder Nomor Surat
export const NOMOR_SURAT_PLACEHOLDERS: PlaceholderDefinition[] = [
  { token: 'NOMOR_SURAT', kategori: 'nomor_surat', deskripsi: 'Nomor surat lengkap (hasil format)', contoh: '001/DS-CKD/V/2026' },
  { token: 'S_NOMOR', kategori: 'nomor_surat', deskripsi: 'Nomor urut 3 digit', contoh: '001' },
  { token: 'S_BULAN', kategori: 'nomor_surat', deskripsi: 'Bulan 2 digit', contoh: '05' },
  { token: 'S_BULAN_ROM', kategori: 'nomor_surat', deskripsi: 'Bulan romawi', contoh: 'V' },
  { token: 'S_TAHUN', kategori: 'nomor_surat', deskripsi: 'Tahun 4 digit', contoh: '2026' },
  { token: 'S_KODE_DESA', kategori: 'nomor_surat', deskripsi: 'Kode desa', contoh: 'DS-CKD' },
  { token: 'S_TANGGAL', kategori: 'nomor_surat', deskripsi: 'Tanggal pembuatan (format Indonesia)', contoh: '22 Mei 2026' },
];

// Alias Perangkat Desa → resolve ke PDn
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

// Daftar semua token desa (untuk deteksi)
export const DESA_TOKENS = DESA_PLACEHOLDERS.map(p => p.token);

// Daftar semua token nomor surat (untuk deteksi)
export const NOMOR_SURAT_TOKENS = NOMOR_SURAT_PLACEHOLDERS.map(p => p.token);
```

- [ ] **Step 3: Commit**

```bash
git add src/types/ src/constants/
git commit -m "feat: add TypeScript types and placeholder constants"
```

---

### Task 4: Database Service

**Files:**
- Create: `src/services/db.ts`

- [ ] **Step 1: Create database initialization service**

`src/services/db.ts`:

```typescript
import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  db = await Database.load('sqlite:aisura.db');

  // === Tabel Warga ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS warga (
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
    )
  `);

  // === Tabel Data Desa ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS data_desa (
      id TEXT PRIMARY KEY,
      desa TEXT,
      kecamatan TEXT,
      kabupaten TEXT,
      provinsi TEXT,
      kode_pos TEXT,
      telepon TEXT,
      email TEXT,
      alamat_kantor TEXT,
      logo_desa TEXT,
      kop_surat TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // === Tabel Perangkat Desa ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS perangkat_desa (
      id TEXT PRIMARY KEY,
      urutan INTEGER,
      warga_id TEXT,
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
    )
  `);

  // === Tabel Templates ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      nama TEXT,
      deskripsi TEXT,
      file_path TEXT,
      placeholders TEXT,
      warga_count INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // === Tabel Template Labels ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS template_labels (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      slot TEXT,
      label TEXT,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    )
  `);

  // === Tabel Placeholder Registry (custom) ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS placeholder_registry (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE,
      deskripsi TEXT,
      default_value TEXT,
      created_at TEXT
    )
  `);

  // === Tabel Nomor Surat Config ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS nomor_surat_config (
      id TEXT PRIMARY KEY,
      format TEXT,
      kode_desa TEXT,
      counter INTEGER DEFAULT 1,
      tahun INTEGER,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // === Tabel Riwayat Surat ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS riwayat_surat (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      template_nama TEXT,
      nomor_surat TEXT,
      nomor_urut INTEGER,
      tanggal_generate TEXT,
      created_at TEXT,
      FOREIGN KEY (template_id) REFERENCES templates(id)
    )
  `);

  // === Tabel Riwayat Surat Data ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS riwayat_surat_data (
      id TEXT PRIMARY KEY,
      riwayat_id TEXT,
      placeholder_key TEXT,
      placeholder_value TEXT,
      FOREIGN KEY (riwayat_id) REFERENCES riwayat_surat(id) ON DELETE CASCADE
    )
  `);

  // === Tabel Auth ===
  await db.execute(`
    CREATE TABLE IF NOT EXISTS auth_config (
      id TEXT PRIMARY KEY,
      password_hash TEXT,
      display_name TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  return db;
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export async function select<T>(query: string, params: unknown[] = []): Promise<T[]> {
  const database = getDatabase();
  return await database.select<T[]>(query, params) as unknown as T[];
}

export async function execute(query: string, params: unknown[] = []): Promise<void> {
  const database = getDatabase();
  await database.execute(query, params);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db.ts
git commit -m "feat: add database service with all table schemas"
```

---

### Task 5: Theme Context & Dark Mode

**Files:**
- Create: `src/context/ThemeContext.tsx`
- Create: `src/hooks/useTheme.ts`

- [ ] **Step 1: Create ThemeContext**

`src/context/ThemeContext.tsx`:

```typescript
import { createContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('aisura-theme');
    return (stored as Theme) || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('aisura-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 2: Create useTheme hook**

`src/hooks/useTheme.ts`:

```typescript
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export function useTheme() {
  return useContext(ThemeContext);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/context/ThemeContext.tsx src/hooks/useTheme.ts
git commit -m "feat: add dark mode theme context and hook"
```

---

### Task 6: Auth Context & Service

**Files:**
- Create: `src/services/authService.ts`
- Create: `src/context/AuthContext.tsx`
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Create auth service**

`src/services/authService.ts`:

```typescript
import { select, execute } from './db';
import { v4 as uuid } from 'uuid';

// Simple hash using SubtleCrypto (no external deps)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hasPassword(): Promise<boolean> {
  const rows = await select<{ id: string }>('SELECT id FROM auth_config LIMIT 1');
  return rows.length > 0;
}

export async function createPassword(password: string, displayName?: string): Promise<void> {
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  await execute(
    'INSERT INTO auth_config (id, password_hash, display_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
    [uuid(), hash, displayName || 'Admin', now, now]
  );
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = await hashPassword(password);
  const rows = await select<{ password_hash: string }>('SELECT password_hash FROM auth_config LIMIT 1');
  if (rows.length === 0) return false;
  return rows[0].password_hash === hash;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const valid = await verifyPassword(oldPassword);
  if (!valid) return false;
  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  await execute('UPDATE auth_config SET password_hash = $1, updated_at = $2', [newHash, now]);
  return true;
}

export async function getDisplayName(): Promise<string> {
  const rows = await select<{ display_name: string }>('SELECT display_name FROM auth_config LIMIT 1');
  return rows.length > 0 ? rows[0].display_name : 'Admin';
}

export async function updateDisplayName(name: string): Promise<void> {
  const now = new Date().toISOString();
  await execute('UPDATE auth_config SET display_name = $1, updated_at = $2', [name, now]);
}
```

- [ ] **Step 2: Create AuthContext**

`src/context/AuthContext.tsx`:

```typescript
import { createContext, useState, type ReactNode } from 'react';

type AuthStatus = 'checking' | 'setup' | 'login' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  setStatus: (status: AuthStatus) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  status: 'checking',
  setStatus: () => {},
  displayName: 'Admin',
  setDisplayName: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [displayName, setDisplayName] = useState('Admin');

  return (
    <AuthContext.Provider value={{ status, setStatus, displayName, setDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 3: Create useAuth hook**

`src/hooks/useAuth.ts`:

```typescript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/authService.ts src/context/AuthContext.tsx src/hooks/useAuth.ts
git commit -m "feat: add authentication service and context"
```

---

### Task 7: UI Components (Base)

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/TextField.tsx`
- Create: `src/components/ui/SearchField.tsx`
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Switch.tsx`
- Create: `src/components/ui/Toast.tsx`

- [ ] **Step 1: Create Button component**

`src/components/ui/Button.tsx`:

```typescript
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';

interface ButtonProps extends AriaButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-surface-secondary text-text-primary border border-border hover:bg-border/50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
};

const sizes = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-1.5',
  lg: 'px-4 py-2 text-sm gap-2',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <AriaButton
      className={`inline-flex items-center justify-center font-medium rounded-md transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Create TextField component**

`src/components/ui/TextField.tsx`:

```typescript
import {
  TextField as AriaTextField,
  Label,
  Input,
  Text,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';

interface TextFieldProps extends AriaTextFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
}

export function TextField({ label, description, errorMessage, placeholder, ...props }: TextFieldProps) {
  return (
    <AriaTextField className="flex flex-col gap-1" {...props}>
      {label && <Label className="text-xs font-medium text-text-secondary">{label}</Label>}
      <Input
        placeholder={placeholder}
        className="px-2.5 py-1.5 text-sm bg-surface border border-border rounded-md
          text-text-primary placeholder:text-text-tertiary
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
          transition-colors"
      />
      {description && <Text slot="description" className="text-xs text-text-tertiary">{description}</Text>}
      {errorMessage && <Text slot="errorMessage" className="text-xs text-red-500">{errorMessage}</Text>}
    </AriaTextField>
  );
}
```

- [ ] **Step 3: Create SearchField component**

`src/components/ui/SearchField.tsx`:

```typescript
import {
  SearchField as AriaSearchField,
  Input,
  Button as AriaButton,
} from 'react-aria-components';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';

interface SearchFieldProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SearchField({ placeholder = 'Cari...', value, onChange, className = '' }: SearchFieldProps) {
  return (
    <AriaSearchField
      value={value}
      onChange={onChange}
      className={`relative flex items-center ${className}`}
    >
      <MagnifyingGlassIcon className="absolute left-2 w-4 h-4 text-text-tertiary pointer-events-none" />
      <Input
        placeholder={placeholder}
        className="w-full pl-8 pr-8 py-1.5 text-sm bg-surface-secondary border border-border rounded-md
          text-text-primary placeholder:text-text-tertiary
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
          transition-colors"
      />
      <AriaButton className="absolute right-2 p-0.5 rounded hover:bg-border/50 transition-colors">
        <XMarkIcon className="w-3.5 h-3.5 text-text-tertiary" />
      </AriaButton>
    </AriaSearchField>
  );
}
```

- [ ] **Step 4: Create Modal component**

`src/components/ui/Modal.tsx`:

```typescript
import {
  Modal as AriaModal,
  ModalOverlay,
  Dialog,
  Heading,
  type ModalOverlayProps,
} from 'react-aria-components';
import type { ReactNode } from 'react';

interface ModalProps extends ModalOverlayProps {
  title?: string;
  children: ReactNode;
}

export function Modal({ title, children, ...props }: ModalProps) {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      {...props}
    >
      <AriaModal className="w-full max-w-lg mx-4 bg-surface border border-border rounded-lg shadow-xl">
        <Dialog className="p-4 outline-none">
          {title && (
            <Heading slot="title" className="text-lg font-semibold text-text-primary mb-3">
              {title}
            </Heading>
          )}
          {children}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
```

- [ ] **Step 5: Create Card component**

`src/components/ui/Card.tsx`:

```typescript
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-surface border border-border rounded-lg p-3 ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Create Badge component**

`src/components/ui/Badge.tsx`:

```typescript
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variants = {
  default: 'bg-surface-secondary text-text-secondary border-border',
  accent: 'bg-accent-light text-accent border-accent/20',
  success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 7: Create Switch component**

`src/components/ui/Switch.tsx`:

```typescript
import { Switch as AriaSwitch, type SwitchProps as AriaSwitchProps } from 'react-aria-components';

interface SwitchProps extends AriaSwitchProps {
  label?: string;
}

export function Switch({ label, ...props }: SwitchProps) {
  return (
    <AriaSwitch
      className="flex items-center gap-2 cursor-pointer group"
      {...props}
    >
      <div className="w-8 h-4 rounded-full bg-border transition-colors
        group-data-[selected]:bg-accent">
        <div className="w-3.5 h-3.5 mt-[1px] ml-[1px] rounded-full bg-white shadow transition-transform
          group-data-[selected]:translate-x-4" />
      </div>
      {label && <span className="text-sm text-text-primary">{label}</span>}
    </AriaSwitch>
  );
}
```

- [ ] **Step 8: Create Toast component**

`src/components/ui/Toast.tsx`:

```typescript
import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/20/solid';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem['type']) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <ToastItem key={t.id} item={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = {
    success: <CheckCircleIcon className="w-4 h-4 text-green-500" />,
    error: <ExclamationCircleIcon className="w-4 h-4 text-red-500" />,
    info: <CheckCircleIcon className="w-4 h-4 text-accent" />,
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg shadow-lg text-sm text-text-primary animate-in slide-in-from-right">
      {icons[item.type]}
      <span className="flex-1">{item.message}</span>
      <button onClick={onDismiss} className="p-0.5 hover:bg-surface-secondary rounded">
        <XMarkIcon className="w-3.5 h-3.5 text-text-tertiary" />
      </button>
    </div>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add base UI components (Button, TextField, SearchField, Modal, Card, Badge, Switch, Toast)"
```

---

### Task 8: Layout Components (Sidebar + Header Bar)

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/HeaderBar.tsx`
- Create: `src/components/layout/Layout.tsx`
- Create: `src/hooks/useClock.ts`

- [ ] **Step 1: Create useClock hook**

`src/hooks/useClock.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatted = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  const time = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return { date: formatted, time, now };
}
```

- [ ] **Step 2: Create Sidebar component**

`src/components/layout/Sidebar.tsx`:

```typescript
import { useState } from 'react';
import {
  HomeIcon,
  DocumentPlusIcon,
  DocumentDuplicateIcon,
  TagIcon,
  UsersIcon,
  ClockIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  HashtagIcon,
  ComputerDesktopIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import type { PageId } from '../../types';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'buat-surat', label: 'Buat Surat', icon: DocumentPlusIcon },
  {
    id: 'template-surat', label: 'Template', icon: DocumentDuplicateIcon,
    children: [
      { id: 'template-surat', label: 'Template Surat', icon: DocumentDuplicateIcon },
      { id: 'placeholder', label: 'Placeholder', icon: TagIcon },
    ],
  },
  { id: 'data-warga', label: 'Data Warga', icon: UsersIcon },
  { id: 'riwayat-surat', label: 'Riwayat Surat', icon: ClockIcon },
  {
    id: 'pengaturan-data-desa', label: 'Pengaturan', icon: Cog6ToothIcon,
    children: [
      { id: 'pengaturan-data-desa', label: 'Data Desa', icon: BuildingOfficeIcon },
      { id: 'pengaturan-nomor-surat', label: 'Nomor Surat', icon: HashtagIcon },
      { id: 'pengaturan-aplikasi', label: 'Aplikasi', icon: ComputerDesktopIcon },
    ],
  },
];

export function Sidebar({ currentPage, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['template-surat', 'pengaturan-data-desa']);

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const isActive = (item: MenuItem): boolean => {
    if (item.id === currentPage) return true;
    if (item.children) return item.children.some(c => c.id === currentPage);
    return false;
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-surface border-r border-border flex flex-col transition-all duration-200 z-40
      ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}>
      {/* Logo */}
      <div className="flex items-center h-12 px-3 border-b border-border">
        {!collapsed && (
          <span className="font-logo text-xl">
            <span className="text-accent">AI</span>
            <span className="text-text-primary">Sura</span>
          </span>
        )}
        {collapsed && (
          <span className="font-logo text-lg mx-auto">
            <span className="text-accent">A</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {menuItems.map(item => (
          <div key={item.id}>
            {item.children ? (
              <>
                <button
                  onClick={() => collapsed ? onNavigate(item.children![0].id) : toggleMenu(item.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors
                    ${isActive(item) ? 'text-accent bg-accent-light' : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'}`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDownIcon className={`w-3 h-3 transition-transform ${expandedMenus.includes(item.id) ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
                {!collapsed && expandedMenus.includes(item.id) && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors
                          ${currentPage === child.id ? 'text-accent bg-accent-light' : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'}`}
                      >
                        <child.icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors
                  ${currentPage === item.id ? 'text-accent bg-accent-light' : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* Footer: Branding + Collapse toggle */}
      <div className="border-t border-border p-2">
        {!collapsed && (
          <div className="flex items-center justify-between px-1 mb-2">
            <div>
              <span className="font-logo text-sm">
                <span className="text-accent">AI</span>
                <span className="text-text-primary">Sura</span>
              </span>
              <p className="text-[10px] text-text-tertiary">EAS Creative Studio</p>
            </div>
            <span className="text-[10px] text-text-tertiary">v1.0.0</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center py-1 rounded-md text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors"
        >
          {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create HeaderBar component**

`src/components/layout/HeaderBar.tsx`:

```typescript
import { SunIcon, MoonIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';
import { useClock } from '../../hooks/useClock';
import { useAuth } from '../../hooks/useAuth';
import { SearchField } from '../ui/SearchField';
import type { PageId } from '../../types';

interface HeaderBarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
}

const PAGE_LABELS: Record<PageId, string> = {
  'dashboard': 'Dashboard',
  'buat-surat': 'Buat Surat',
  'template-surat': 'Template Surat',
  'placeholder': 'Placeholder',
  'data-warga': 'Data Warga',
  'riwayat-surat': 'Riwayat Surat',
  'pengaturan-data-desa': 'Data Desa',
  'pengaturan-nomor-surat': 'Nomor Surat',
  'pengaturan-aplikasi': 'Aplikasi',
  'profil': 'Profil',
};

const BREADCRUMBS: Partial<Record<PageId, string[]>> = {
  'template-surat': ['Template', 'Template Surat'],
  'placeholder': ['Template', 'Placeholder'],
  'pengaturan-data-desa': ['Pengaturan', 'Data Desa'],
  'pengaturan-nomor-surat': ['Pengaturan', 'Nomor Surat'],
  'pengaturan-aplikasi': ['Pengaturan', 'Aplikasi'],
};

export function HeaderBar({ currentPage, onNavigate, onLogout }: HeaderBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { date, time } = useClock();
  const { displayName } = useAuth();

  const breadcrumb = BREADCRUMBS[currentPage];
  const pageLabel = PAGE_LABELS[currentPage] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 h-10 bg-surface border-b border-border flex items-center px-3 gap-3">
      {/* Breadcrumb / Page title */}
      <div className="flex items-center gap-1 text-xs min-w-0">
        {breadcrumb ? (
          breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-tertiary">/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                {crumb}
              </span>
            </span>
          ))
        ) : (
          <span className="text-text-primary font-medium">{pageLabel}</span>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xs mx-auto">
        <SearchField placeholder="Cari halaman..." className="w-full" />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-1 rounded-md text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors"
        >
          {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
        </button>

        {/* Date & Time */}
        <span className="text-[11px] text-text-tertiary tabular-nums">
          {date} {time}
        </span>

        {/* Avatar / Profile dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1 p-1 rounded-md hover:bg-surface-secondary transition-colors">
            <UserCircleIcon className="w-5 h-5 text-text-secondary" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-medium text-text-primary truncate">{displayName}</p>
            </div>
            <button
              onClick={() => onNavigate('profil')}
              className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-secondary transition-colors"
            >
              Profil
            </button>
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-surface-secondary transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create Layout component**

`src/components/layout/Layout.tsx`:

```typescript
import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { HeaderBar } from './HeaderBar';
import type { PageId } from '../../types';

interface LayoutProps {
  children: ReactNode;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
}

export function Layout({ children, currentPage, onNavigate, onLogout }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`flex-1 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'ml-[60px]' : 'ml-[220px]'}`}>
        <HeaderBar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/hooks/useClock.ts
git commit -m "feat: add layout components (Sidebar collapsible, HeaderBar sticky, Layout)"
```

---

### Task 9: App Shell & Routing

**Files:**
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/pages/Login.tsx`
- Create: `src/pages/Dashboard.tsx` (placeholder)

- [ ] **Step 1: Create Login page**

`src/pages/Login.tsx`:

```typescript
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { createPassword, verifyPassword } from '../services/authService';

interface LoginProps {
  isSetup: boolean;
  onSuccess: () => void;
}

export function Login({ isSetup, onSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSetup) {
        if (password.length < 4) {
          setError('Password minimal 4 karakter');
          return;
        }
        if (password !== confirmPassword) {
          setError('Password tidak cocok');
          return;
        }
        await createPassword(password);
        onSuccess();
      } else {
        const valid = await verifyPassword(password);
        if (valid) {
          onSuccess();
        } else {
          setError('Password salah');
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-center mb-6"
          >
            <h1 className="font-logo text-3xl">
              <span className="text-accent">AI</span>
              <span className="text-text-primary">Sura</span>
            </h1>
            <p className="text-xs text-text-tertiary mt-1">Aplikasi Surat Otomatis Desa</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <TextField
              label={isSetup ? 'Buat Password' : 'Password'}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Masukkan password"
            />

            {isSetup && (
              <TextField
                label="Konfirmasi Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Ulangi password"
              />
            )}

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <Button type="submit" className="w-full" isDisabled={loading}>
              {loading ? 'Loading...' : isSetup ? 'Buat Password' : 'Masuk'}
            </Button>
          </form>

          <p className="text-[10px] text-text-tertiary text-center mt-4">
            EAS Creative Studio • v1.0.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Create Dashboard placeholder**

`src/pages/Dashboard.tsx`:

```typescript
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import {
  DocumentDuplicateIcon,
  UsersIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function Dashboard() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Dashboard</h1>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-light rounded-md">
                <DocumentDuplicateIcon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Template Surat</p>
                <p className="text-lg font-semibold text-text-primary">0</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                <UsersIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Data Warga</p>
                <p className="text-lg font-semibold text-text-primary">0</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <ClockIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Surat Dibuat</p>
                <p className="text-lg font-semibold text-text-primary">0</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Create App.tsx**

`src/App.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { initDatabase } from './services/db';
import { hasPassword, getDisplayName } from './services/authService';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import type { PageId } from './types';

export function App() {
  const [isReady, setIsReady] = useState(false);
  const { status, setStatus, setDisplayName } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase();
        const passwordExists = await hasPassword();
        if (passwordExists) {
          const name = await getDisplayName();
          setDisplayName(name);
          setStatus('login');
        } else {
          setStatus('setup');
        }
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };
    bootstrap();
  }, []);

  const handleLoginSuccess = async () => {
    const name = await getDisplayName();
    setDisplayName(name);
    setStatus('authenticated');
  };

  const handleLogout = () => {
    setStatus('login');
    setCurrentPage('dashboard');
  };

  if (!isReady || status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <span className="font-logo text-2xl">
            <span className="text-accent">AI</span>
            <span className="text-text-primary">Sura</span>
          </span>
          <p className="text-xs text-text-tertiary mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'setup' || status === 'login') {
    return <Login isSetup={status === 'setup'} onSuccess={handleLoginSuccess} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      // Other pages will be added in later phases
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
}
```

- [ ] **Step 4: Create main.tsx**

`src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/main.tsx src/pages/
git commit -m "feat: add app shell with login, dashboard, and routing"
```

- [ ] **Step 7: Push Phase 1**

```bash
git push -u origin main
```

---

## Phase 2: Pengaturan (Data Desa, Nomor Surat, Aplikasi, Profil)

### Task 10: Data Desa Service

**Files:**
- Create: `src/services/desaService.ts`
- Create: `src/services/perangkatDesaService.ts`

- [ ] **Step 1: Create desaService**

`src/services/desaService.ts`:

```typescript
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
```

- [ ] **Step 2: Create perangkatDesaService**

`src/services/perangkatDesaService.ts`:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/services/desaService.ts src/services/perangkatDesaService.ts
git commit -m "feat: add data desa and perangkat desa services"
```

---

### Task 11: Nomor Surat Service

**Files:**
- Create: `src/services/nomorSuratService.ts`
- Create: `src/utils/nomorSuratGenerator.ts`

- [ ] **Step 1: Create nomorSuratGenerator utility**

`src/utils/nomorSuratGenerator.ts`:

```typescript
const BULAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export interface NomorSuratParts {
  NOMOR_SURAT: string;
  S_NOMOR: string;
  S_BULAN: string;
  S_BULAN_ROM: string;
  S_TAHUN: string;
  S_KODE_DESA: string;
  S_TANGGAL: string;
}

export function generateNomorSuratParts(
  format: string,
  counter: number,
  kodeDesa: string,
  date: Date = new Date()
): NomorSuratParts {
  const nomor = counter.toString().padStart(3, '0');
  const bulan = (date.getMonth() + 1).toString().padStart(2, '0');
  const bulanRom = BULAN_ROMAWI[date.getMonth()];
  const tahun = date.getFullYear().toString();
  const tanggal = `${date.getDate()} ${BULAN_INDONESIA[date.getMonth()]} ${tahun}`;

  const parts: NomorSuratParts = {
    S_NOMOR: nomor,
    S_BULAN: bulan,
    S_BULAN_ROM: bulanRom,
    S_TAHUN: tahun,
    S_KODE_DESA: kodeDesa,
    S_TANGGAL: tanggal,
    NOMOR_SURAT: '',
  };

  // Generate NOMOR_SURAT dari format
  let result = format;
  result = result.replace('{S_NOMOR}', nomor);
  result = result.replace('{S_BULAN}', bulan);
  result = result.replace('{S_BULAN_ROM}', bulanRom);
  result = result.replace('{S_TAHUN}', tahun);
  result = result.replace('{S_KODE_DESA}', kodeDesa);
  parts.NOMOR_SURAT = result;

  return parts;
}
```

- [ ] **Step 2: Create nomorSuratService**

`src/services/nomorSuratService.ts`:

```typescript
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

  // Auto-reset jika tahun berubah
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

export async function recalculateCounter(): Promise<void> {
  // Cari nomor_urut tertinggi yang masih ada di riwayat tahun ini
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
```

- [ ] **Step 3: Commit**

```bash
git add src/services/nomorSuratService.ts src/utils/nomorSuratGenerator.ts
git commit -m "feat: add nomor surat service and generator utility"
```

---

### Task 12: Pengaturan Pages (Data Desa, Nomor Surat, Aplikasi)

**Files:**
- Create: `src/pages/pengaturan/DataDesa.tsx`
- Create: `src/pages/pengaturan/NomorSurat.tsx`
- Create: `src/pages/pengaturan/Aplikasi.tsx`
- Create: `src/components/forms/PerangkatDesaForm.tsx`

- [ ] **Step 1: Create PerangkatDesaForm component**

`src/components/forms/PerangkatDesaForm.tsx`:

```typescript
import { useState } from 'react';
import { TextField } from '../ui/TextField';
import { Button } from '../ui/Button';
import { SearchField } from '../ui/SearchField';
import type { PerangkatDesa, Warga } from '../../types';
import { searchWarga } from '../../services/wargaService';

interface PerangkatDesaFormProps {
  data: Partial<PerangkatDesa>;
  urutan: number;
  jabatanDefault: string;
  onChange: (data: Partial<PerangkatDesa>) => void;
}

export function PerangkatDesaForm({ data, urutan, jabatanDefault, onChange }: PerangkatDesaFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Warga[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = await searchWarga(query);
      setSearchResults(results);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectWarga = (warga: Warga) => {
    onChange({
      ...data,
      warga_id: warga.id,
      nama: warga.nama,
      nik: warga.nik,
      alamat: `${warga.alamat} RT ${warga.rt} RW ${warga.rw}`,
    });
    setShowResults(false);
    setSearchQuery('');
  };

  const computeUmur = (tanggalLahir: string): number => {
    const birth = new Date(tanggalLahir.split('-').reverse().join('-'));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          PD{urutan} — {data.jabatan || jabatanDefault}
        </span>
      </div>

      {/* Search warga */}
      <div className="relative">
        <SearchField
          placeholder="Cari warga (nama/NIK)..."
          value={searchQuery}
          onChange={handleSearch}
        />
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
            {searchResults.map(warga => (
              <button
                key={warga.id}
                onClick={() => handleSelectWarga(warga)}
                className="w-full text-left px-3 py-2 hover:bg-surface-secondary transition-colors border-b border-border last:border-0"
              >
                <p className="text-sm font-medium text-text-primary">{warga.nama}</p>
                <p className="text-xs text-text-tertiary">
                  NIK: {warga.nik} • {warga.alamat} RT {warga.rt} RW {warga.rw} • {computeUmur(warga.tanggal_lahir)} thn
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Gelar Depan"
          value={data.gelar_depan || ''}
          onChange={(v) => onChange({ ...data, gelar_depan: v })}
          placeholder="H., Drs., dll."
        />
        <TextField
          label="Gelar Belakang"
          value={data.gelar_belakang || ''}
          onChange={(v) => onChange({ ...data, gelar_belakang: v })}
          placeholder="S.Pd., M.Si., dll."
        />
      </div>
      <TextField
        label="Nama"
        value={data.nama || ''}
        onChange={(v) => onChange({ ...data, nama: v })}
        placeholder="Nama lengkap"
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="NIK"
          value={data.nik || ''}
          onChange={(v) => onChange({ ...data, nik: v })}
          placeholder="NIK"
        />
        <TextField
          label="NIPD"
          value={data.nipd || ''}
          onChange={(v) => onChange({ ...data, nipd: v })}
          placeholder="NIPD"
        />
      </div>
      <TextField
        label="Jabatan"
        value={data.jabatan || jabatanDefault}
        onChange={(v) => onChange({ ...data, jabatan: v })}
      />
      <TextField
        label="Alamat"
        value={data.alamat || ''}
        onChange={(v) => onChange({ ...data, alamat: v })}
        placeholder="Alamat lengkap"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create DataDesa page**

`src/pages/pengaturan/DataDesa.tsx`:

Create a page with two sections: Identitas Desa (form fields for desa, kecamatan, kabupaten, provinsi, kode_pos, telepon, email, alamat_kantor, logo_desa upload, kop_surat upload) and Perangkat Desa (dynamic list of PerangkatDesaForm components with add/remove buttons). Load data on mount, save on button click. Use `desaService` and `perangkatDesaService`.

- [ ] **Step 3: Create NomorSurat page**

`src/pages/pengaturan/NomorSurat.tsx`:

Create a page with: format input (text field showing format pattern), kode_desa input, current counter display, set nomor awal input, preview of generated nomor surat. Use `nomorSuratService` and `nomorSuratGenerator`.

- [ ] **Step 4: Create Aplikasi page**

`src/pages/pengaturan/Aplikasi.tsx`:

Create a page with: Backup (export database to JSON file via dialog save), Restore (import JSON file via dialog open), Reset Data (confirm modal then clear all tables), App version display, Check update button.

- [ ] **Step 5: Commit**

```bash
git add src/pages/pengaturan/ src/components/forms/PerangkatDesaForm.tsx
git commit -m "feat: add pengaturan pages (Data Desa, Nomor Surat, Aplikasi)"
```

---

### Task 13: Profil Page

**Files:**
- Create: `src/pages/Profil.tsx`

- [ ] **Step 1: Create Profil page**

`src/pages/Profil.tsx`:

```typescript
import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { changePassword, updateDisplayName } from '../services/authService';

export function Profil() {
  const { displayName, setDisplayName } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(displayName);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveName = async () => {
    await updateDisplayName(name);
    setDisplayName(name);
    toast('Nama berhasil diubah', 'success');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) {
      toast('Password minimal 4 karakter', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Password baru tidak cocok', 'error');
      return;
    }
    const success = await changePassword(oldPassword, newPassword);
    if (success) {
      toast('Password berhasil diubah', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast('Password lama salah', 'error');
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">Profil</h1>

      <Card>
        <h2 className="text-sm font-medium text-text-primary mb-2">Nama Pengguna</h2>
        <div className="flex gap-2">
          <TextField value={name} onChange={setName} className="flex-1" />
          <Button onPress={handleSaveName} size="sm">Simpan</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-text-primary mb-2">Ganti Password</h2>
        <div className="space-y-2">
          <TextField label="Password Lama" type="password" value={oldPassword} onChange={setOldPassword} />
          <TextField label="Password Baru" type="password" value={newPassword} onChange={setNewPassword} />
          <TextField label="Konfirmasi Password Baru" type="password" value={confirmPassword} onChange={setConfirmPassword} />
          <Button onPress={handleChangePassword} size="sm">Ganti Password</Button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Profil.tsx
git commit -m "feat: add profil page (change name, change password)"
```

---

## Phase 3: Data Warga

### Task 14: Warga Service & Excel Importer

**Files:**
- Create: `src/services/wargaService.ts`
- Create: `src/utils/excelImporter.ts`

- [ ] **Step 1: Create wargaService**

`src/services/wargaService.ts`:

```typescript
import { select, execute, getDatabase } from './db';
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

export async function getWargaByNik(nik: string): Promise<Warga | null> {
  const rows = await select<Warga>('SELECT * FROM warga WHERE nik = $1', [nik]);
  return rows.length > 0 ? rows[0] : null;
}

export async function importWargaBatch(wargaList: Omit<Warga, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();
  let imported = 0;

  for (const warga of wargaList) {
    try {
      await db.execute(
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
```

- [ ] **Step 2: Create excelImporter utility**

`src/utils/excelImporter.ts`:

```typescript
import * as XLSX from 'xlsx';
import type { Warga } from '../types';

// Expected column headers (case-insensitive match)
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

export function parseExcelOrCsv(buffer: ArrayBuffer, filename: string): ImportResult {
  const errors: string[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (rawData.length === 0) {
      return { success: false, data: [], errors: ['File kosong'], totalRows: 0 };
    }

    // Map headers
    const firstRow = rawData[0];
    const headerMap: Record<string, string> = {};
    for (const key of Object.keys(firstRow)) {
      const normalized = key.toLowerCase().trim();
      if (COLUMN_MAP[normalized]) {
        headerMap[key] = COLUMN_MAP[normalized];
      }
    }

    // Validate required columns
    const requiredFields = ['nik', 'nama'];
    for (const field of requiredFields) {
      if (!Object.values(headerMap).includes(field)) {
        errors.push(`Kolom "${field}" tidak ditemukan`);
      }
    }

    if (errors.length > 0) {
      return { success: false, data: [], errors, totalRows: rawData.length };
    }

    // Parse rows
    const data: Omit<Warga, 'id' | 'created_at' | 'updated_at'>[] = [];
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const warga: Record<string, string> = {};

      for (const [originalKey, mappedKey] of Object.entries(headerMap)) {
        warga[mappedKey] = String(row[originalKey] ?? '').trim();
      }

      // Validate NIK
      if (!warga.nik || warga.nik.length < 10) {
        errors.push(`Baris ${i + 2}: NIK tidak valid`);
        continue;
      }

      data.push(warga as unknown as Omit<Warga, 'id' | 'created_at' | 'updated_at'>);
    }

    return { success: true, data, errors, totalRows: rawData.length };
  } catch (err) {
    return { success: false, data: [], errors: [`Gagal membaca file: ${err}`], totalRows: 0 };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/wargaService.ts src/utils/excelImporter.ts
git commit -m "feat: add warga service and Excel/CSV importer"
```

---

### Task 15: Data Warga Page

**Files:**
- Create: `src/pages/DataWarga.tsx`

- [ ] **Step 1: Create DataWarga page**

`src/pages/DataWarga.tsx`:

Create a page with:
- Header: title + "Import Data" button + "Download Template" button
- Import: open file dialog (xlsx/csv), parse with excelImporter, show preview/summary, confirm import
- Table: display warga data with columns (No, NIK, Nama, Jenis Kelamin, Alamat, RT, RW)
- Search/filter: SearchField at top of table
- Pagination or virtual scroll for large datasets (2600+ rows)
- Use `wargaService` for data operations

- [ ] **Step 2: Create template Excel file**

Generate `public/template-import-warga.xlsx` — an empty Excel file with the 16 column headers:
`NOMOR KK, NIK, NAMA, JENIS KELAMIN, TEMPAT LAHIR, TANGGAL LAHIR, AGAMA, STATUS, HUBUNGAN KELUARGA, PENDIDIKAN, PEKERJAAN, NAMA IBU, NAMA AYAH, ALAMAT, RT, RW`

This file is generated programmatically during build or bundled as a static asset.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DataWarga.tsx public/
git commit -m "feat: add data warga page with import and search"
```

---

## Phase 4: Template Surat & Placeholder

### Task 16: Template Service & Placeholder Detector

**Files:**
- Create: `src/services/templateService.ts`
- Create: `src/utils/placeholderDetector.ts`
- Create: `src/utils/textTransform.ts`

- [ ] **Step 1: Create textTransform utility**

`src/utils/textTransform.ts`:

```typescript
export type TextModifier = 'U' | 'L' | 'P';

export function applyTextModifier(text: string, modifier?: TextModifier): string {
  if (!modifier) return text;
  switch (modifier) {
    case 'U': return text.toUpperCase();
    case 'L': return text.toLowerCase();
    case 'P': return toProperCase(text);
    default: return text;
  }
}

function toProperCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

- [ ] **Step 2: Create placeholderDetector utility**

`src/utils/placeholderDetector.ts`:

```typescript
import type { DetectedPlaceholder, PlaceholderKategori } from '../types';
import { DESA_TOKENS, NOMOR_SURAT_TOKENS, PERANGKAT_DESA_ALIASES, WARGA_FIELDS, PERANGKAT_DESA_FIELDS } from '../constants/placeholders';
import type { TextModifier } from './textTransform';

// Regex to match {PLACEHOLDER} or {PLACEHOLDER_U/L/P}
const PLACEHOLDER_REGEX = /\{([A-Z0-9_]+)\}/g;

// Regex to detect modifier suffix
const MODIFIER_REGEX = /^(.+?)_(U|L|P)$/;

export function detectPlaceholders(xmlContent: string): DetectedPlaceholder[] {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_REGEX.exec(xmlContent)) !== null) {
    matches.add(match[1]);
  }

  const placeholders: DetectedPlaceholder[] = [];

  for (const raw of matches) {
    // Check for modifier suffix
    let token = raw;
    let modifier: TextModifier | undefined;
    const modMatch = MODIFIER_REGEX.exec(raw);
    if (modMatch) {
      const possibleToken = modMatch[1];
      const possibleMod = modMatch[2] as TextModifier;
      // Only treat as modifier if the base token is recognizable
      if (isKnownToken(possibleToken)) {
        token = possibleToken;
        modifier = possibleMod;
      }
    }

    const kategori = classifyToken(token);
    const slot = extractSlot(token);
    const field = extractField(token);

    placeholders.push({ token: raw, kategori, field, modifier, slot });
  }

  return placeholders;
}

function isKnownToken(token: string): boolean {
  // Check warga pattern
  if (/^W\d+_/.test(token)) return true;
  // Check perangkat desa pattern
  if (/^PD\d+_/.test(token)) return true;
  // Check desa tokens
  if (DESA_TOKENS.includes(token)) return true;
  // Check nomor surat tokens
  if (NOMOR_SURAT_TOKENS.includes(token)) return true;
  // Check aliases
  if (token in PERANGKAT_DESA_ALIASES) return true;
  return false;
}

function classifyToken(token: string): PlaceholderKategori {
  // Warga: W1_NAMA, W2_NIK, etc.
  if (/^W\d+_/.test(token)) return 'warga';

  // Perangkat Desa: PD1_NAMA, PD2_NIPD, etc.
  if (/^PD\d+_/.test(token)) return 'perangkat_desa';

  // Alias perangkat desa
  if (token in PERANGKAT_DESA_ALIASES) return 'perangkat_desa';

  // Nomor surat
  if (NOMOR_SURAT_TOKENS.includes(token) || token === 'NOMOR_SURAT') return 'nomor_surat';

  // Desa
  if (DESA_TOKENS.includes(token)) return 'desa';

  // Custom
  return 'custom';
}

function extractSlot(token: string): string | undefined {
  const wargaMatch = token.match(/^(W\d+)_/);
  if (wargaMatch) return wargaMatch[1];

  const pdMatch = token.match(/^(PD\d+)_/);
  if (pdMatch) return pdMatch[1];

  // Alias → resolve slot
  if (token in PERANGKAT_DESA_ALIASES) {
    const resolved = PERANGKAT_DESA_ALIASES[token];
    const m = resolved.match(/^(PD\d+)_/);
    return m ? m[1] : undefined;
  }

  return undefined;
}

function extractField(token: string): string {
  const wargaMatch = token.match(/^W\d+_(.+)$/);
  if (wargaMatch) return wargaMatch[1];

  const pdMatch = token.match(/^PD\d+_(.+)$/);
  if (pdMatch) return pdMatch[1];

  return token;
}

export function countWargaSlots(placeholders: DetectedPlaceholder[]): number {
  const slots = new Set<string>();
  for (const p of placeholders) {
    if (p.kategori === 'warga' && p.slot) {
      slots.add(p.slot);
    }
  }
  return slots.size;
}
```

- [ ] **Step 3: Create templateService**

`src/services/templateService.ts`:

```typescript
import { select, execute } from './db';
import { v4 as uuid } from 'uuid';
import { appConfigDir } from '@tauri-apps/api/path';
import { exists, mkdir, readFile, writeFile, remove } from '@tauri-apps/plugin-fs';
import type { TemplateSurat, TemplateLabel } from '../types';
import { detectPlaceholders, countWargaSlots } from '../utils/placeholderDetector';

async function getTemplatesDir(): Promise<string> {
  const dir = await appConfigDir();
  const templatesDir = `${dir}/templates`;
  if (!(await exists(templatesDir))) {
    await mkdir(templatesDir, { recursive: true });
  }
  return templatesDir;
}

export async function getAllTemplates(): Promise<TemplateSurat[]> {
  return await select<TemplateSurat>('SELECT * FROM templates ORDER BY created_at DESC');
}

export async function getTemplateCount(): Promise<number> {
  const rows = await select<{ count: number }>('SELECT COUNT(*) as count FROM templates');
  return rows[0]?.count ?? 0;
}

export async function getTemplateById(id: string): Promise<TemplateSurat | null> {
  const rows = await select<TemplateSurat>('SELECT * FROM templates WHERE id = $1', [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function uploadTemplate(
  fileBytes: Uint8Array,
  nama: string,
  deskripsi: string
): Promise<TemplateSurat> {
  const id = uuid();
  const filename = `${id}.docx`;
  const dir = await getTemplatesDir();
  const filePath = `${dir}/${filename}`;

  // Save file
  await writeFile(filePath, fileBytes);

  // Detect placeholders from docx XML content
  const placeholders = await detectPlaceholdersFromDocx(fileBytes);
  const wargaCount = countWargaSlots(placeholders);
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO templates (id, nama, deskripsi, file_path, placeholders, warga_count, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, nama, deskripsi, filePath, JSON.stringify(placeholders), wargaCount, now, now]
  );

  return {
    id, nama, deskripsi, file_path: filePath,
    placeholders: JSON.stringify(placeholders),
    warga_count: wargaCount, created_at: now, updated_at: now,
  };
}

export async function updateTemplate(id: string, nama: string, deskripsi: string): Promise<void> {
  const now = new Date().toISOString();
  await execute('UPDATE templates SET nama=$1, deskripsi=$2, updated_at=$3 WHERE id=$4', [nama, deskripsi, now, id]);
}

export async function deleteTemplate(id: string): Promise<void> {
  const template = await getTemplateById(id);
  if (template) {
    try { await remove(template.file_path); } catch {}
  }
  await execute('DELETE FROM template_labels WHERE template_id = $1', [id]);
  await execute('DELETE FROM templates WHERE id = $1', [id]);
}

export async function getTemplateBlob(filePath: string): Promise<Uint8Array> {
  return await readFile(filePath);
}

// Extract XML text from docx (zip) to scan placeholders
async function detectPlaceholdersFromDocx(fileBytes: Uint8Array): Promise<ReturnType<typeof detectPlaceholders>> {
  // easy-template-x uses JSZip internally; we can use it to read document.xml
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(fileBytes);
  let xmlContent = '';

  // Read all XML parts that might contain text
  const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/footer1.xml', 'word/footer2.xml'];
  for (const f of xmlFiles) {
    const file = zip.file(f);
    if (file) {
      xmlContent += await file.async('text');
    }
  }

  return detectPlaceholders(xmlContent);
}

// === Template Labels ===
export async function getTemplateLabels(templateId: string): Promise<TemplateLabel[]> {
  return await select<TemplateLabel>('SELECT * FROM template_labels WHERE template_id = $1', [templateId]);
}

export async function saveTemplateLabel(templateId: string, slot: string, label: string): Promise<void> {
  const existing = await select<TemplateLabel>(
    'SELECT * FROM template_labels WHERE template_id = $1 AND slot = $2', [templateId, slot]
  );

  if (existing.length > 0) {
    await execute('UPDATE template_labels SET label = $1 WHERE id = $2', [label, existing[0].id]);
  } else {
    await execute(
      'INSERT INTO template_labels (id, template_id, slot, label) VALUES ($1,$2,$3,$4)',
      [uuid(), templateId, slot, label]
    );
  }
}
```

- [ ] **Step 4: Install jszip dependency**

```bash
npm install jszip
npm install -D @types/jszip
```

- [ ] **Step 5: Commit**

```bash
git add src/services/templateService.ts src/utils/placeholderDetector.ts src/utils/textTransform.ts package.json package-lock.json
git commit -m "feat: add template service with placeholder detection from docx"
```

---

### Task 17: Template Surat Page

**Files:**
- Create: `src/pages/TemplateSurat.tsx`

- [ ] **Step 1: Create TemplateSurat page**

`src/pages/TemplateSurat.tsx`:

Create a page with:
- Header: title + "Upload Template" button
- Upload flow: open file dialog (.docx), enter nama + deskripsi, upload via templateService
- Template list: cards showing nama, deskripsi, jumlah placeholder, warga_count, tanggal upload
- Each card has actions: Edit (nama/deskripsi), Set Label (modal to set W1=Pemohon, etc.), View Placeholders (modal showing detected placeholders grouped by kategori), Delete (confirm modal)
- Link/shortcut to Placeholder page

- [ ] **Step 2: Commit**

```bash
git add src/pages/TemplateSurat.tsx
git commit -m "feat: add template surat page with upload and management"
```

---

### Task 18: Placeholder (Kamus) Page

**Files:**
- Create: `src/pages/Placeholder.tsx`

- [ ] **Step 1: Create Placeholder page**

`src/pages/Placeholder.tsx`:

Create a page with:
- Tabs or sections grouped by kategori: Warga, Perangkat Desa, Desa, Nomor Surat, Custom
- Each section shows table: Token, Deskripsi, Contoh, Modifier support
- Explanation section for suffix rules (_U, _L, _P) with examples
- Custom placeholder section: add/edit/delete custom placeholders (token, deskripsi, default_value)
- Search/filter across all placeholders
- Use `placeholderRegistry` constants + custom from database

- [ ] **Step 2: Commit**

```bash
git add src/pages/Placeholder.tsx
git commit -m "feat: add placeholder kamus page"
```

---

## Phase 5: Buat Surat (Core Feature)

### Task 19: Placeholder Resolver & DOCX Processor

**Files:**
- Create: `src/utils/placeholderResolver.ts`
- Create: `src/utils/docxProcessor.ts`

- [ ] **Step 1: Create placeholderResolver**

`src/utils/placeholderResolver.ts`:

```typescript
import type { DetectedPlaceholder, Warga, PerangkatDesa, DataDesa } from '../types';
import type { NomorSuratParts } from './nomorSuratGenerator';
import { applyTextModifier, type TextModifier } from './textTransform';
import { PERANGKAT_DESA_ALIASES } from '../constants/placeholders';

interface ResolveContext {
  wargaData: Record<string, Record<string, string>>; // { "W1": { NAMA: "...", NIK: "..." }, "W2": {...} }
  perangkatDesa: PerangkatDesa[];
  dataDesa: DataDesa | null;
  nomorSurat: NomorSuratParts;
  customValues: Record<string, string>; // { "PERIHAL": "..." }
}

export function resolveAllPlaceholders(
  placeholders: DetectedPlaceholder[],
  context: ResolveContext
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const p of placeholders) {
    const value = resolveSingle(p, context);
    resolved[p.token] = applyTextModifier(value, p.modifier);
  }

  return resolved;
}

function resolveSingle(p: DetectedPlaceholder, ctx: ResolveContext): string {
  switch (p.kategori) {
    case 'warga':
      return resolveWarga(p, ctx);
    case 'perangkat_desa':
      return resolvePerangkatDesa(p, ctx);
    case 'desa':
      return resolveDesa(p, ctx);
    case 'nomor_surat':
      return resolveNomorSurat(p, ctx);
    case 'custom':
      return ctx.customValues[p.field] || '';
    default:
      return '';
  }
}

function resolveWarga(p: DetectedPlaceholder, ctx: ResolveContext): string {
  if (!p.slot) return '';
  const warga = ctx.wargaData[p.slot];
  if (!warga) return '';

  // Handle computed fields
  if (p.field === 'ALAMAT_LENGKAP') {
    return `${warga.ALAMAT || ''} RT ${warga.RT || ''} RW ${warga.RW || ''}`.trim();
  }
  if (p.field === 'TTL') {
    return `${warga.TEMPAT_LAHIR || ''}, ${formatTanggal(warga.TANGGAL_LAHIR || '')}`;
  }
  if (p.field === 'UMUR') {
    return computeUmur(warga.TANGGAL_LAHIR || '').toString();
  }

  return warga[p.field] || '';
}

function resolvePerangkatDesa(p: DetectedPlaceholder, ctx: ResolveContext): string {
  let token = p.field;
  let slot = p.slot;

  // Handle alias
  const baseToken = p.token.replace(/_(U|L|P)$/, '');
  if (baseToken in PERANGKAT_DESA_ALIASES) {
    const resolved = PERANGKAT_DESA_ALIASES[baseToken];
    const match = resolved.match(/^PD(\d+)_(.+)$/);
    if (match) {
      slot = `PD${match[1]}`;
      token = match[2];
    }
  }

  if (!slot) return '';
  const urutanMatch = slot.match(/^PD(\d+)$/);
  if (!urutanMatch) return '';
  const urutan = parseInt(urutanMatch[1]);

  const pd = ctx.perangkatDesa.find(p => p.urutan === urutan);
  if (!pd) return '';

  switch (token) {
    case 'NAMA': return pd.nama || '';
    case 'NAMA_LENGKAP': {
      const parts = [pd.gelar_depan, pd.nama, pd.gelar_belakang].filter(Boolean);
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    }
    case 'NIK': return pd.nik || '';
    case 'NIPD': return pd.nipd || '';
    case 'JABATAN': return pd.jabatan || '';
    case 'ALAMAT': return pd.alamat || '';
    default: return '';
  }
}

function resolveDesa(p: DetectedPlaceholder, ctx: ResolveContext): string {
  if (!ctx.dataDesa) return '';
  const fieldMap: Record<string, keyof DataDesa> = {
    'DESA': 'desa',
    'KECAMATAN': 'kecamatan',
    'KABUPATEN': 'kabupaten',
    'PROVINSI': 'provinsi',
    'KODE_POS': 'kode_pos',
    'TELEPON_DESA': 'telepon',
    'EMAIL_DESA': 'email',
    'ALAMAT_KANTOR_DESA': 'alamat_kantor',
  };
  const key = fieldMap[p.field];
  return key ? (ctx.dataDesa[key] as string) || '' : '';
}

function resolveNomorSurat(p: DetectedPlaceholder, ctx: ResolveContext): string {
  const key = p.field as keyof NomorSuratParts;
  return ctx.nomorSurat[key] || '';
}

function formatTanggal(dateStr: string): string {
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  const monthIdx = parseInt(month) - 1;
  return `${parseInt(day)} ${bulan[monthIdx] || month} ${year}`;
}

function computeUmur(dateStr: string): number {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const [day, month, year] = parts;
  const birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
```

- [ ] **Step 2: Create docxProcessor**

`src/utils/docxProcessor.ts`:

```typescript
import { TemplateHandler, type TemplateData } from 'easy-template-x';

export async function processDocxTemplate(
  templateBytes: Uint8Array,
  data: Record<string, string>
): Promise<ArrayBuffer> {
  // Convert flat key-value to TemplateData format
  // easy-template-x expects {key: value} where key matches {key} in template
  const templateData: TemplateData = {};
  for (const [key, value] of Object.entries(data)) {
    templateData[key] = value;
  }

  const handler = new TemplateHandler();
  const blob = new Blob([templateBytes]);
  const doc = await handler.process(blob, templateData);
  return await doc.arrayBuffer();
}

export async function downloadDocx(buffer: ArrayBuffer, filename: string): Promise<void> {
  // Check if running in Tauri
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    });
    if (!filePath) return;
    await writeFile(filePath, new Uint8Array(buffer));
  } else {
    // Browser fallback
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/placeholderResolver.ts src/utils/docxProcessor.ts
git commit -m "feat: add placeholder resolver and docx processor"
```

---

### Task 20: Riwayat Service

**Files:**
- Create: `src/services/riwayatService.ts`

- [ ] **Step 1: Create riwayatService**

`src/services/riwayatService.ts`:

```typescript
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

export async function getRiwayatById(id: string): Promise<RiwayatSurat | null> {
  const rows = await select<RiwayatSurat>('SELECT * FROM riwayat_surat WHERE id = $1', [id]);
  return rows.length > 0 ? rows[0] : null;
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
  placeholderData: Record<string, string>
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO riwayat_surat (id, template_id, template_nama, nomor_surat, nomor_urut, tanggal_generate, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, templateId, templateNama, nomorSurat, nomorUrut, now, now]
  );

  // Save placeholder data
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
  // Recalculate counter after deletion
  await recalculateCounter();
}

export async function deleteAllRiwayat(): Promise<void> {
  await execute('DELETE FROM riwayat_surat_data');
  await execute('DELETE FROM riwayat_surat');
  await recalculateCounter();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/riwayatService.ts
git commit -m "feat: add riwayat surat service"
```

---

### Task 21: Buat Surat Page

**Files:**
- Create: `src/pages/BuatSurat.tsx`
- Create: `src/components/shared/WargaSearchBox.tsx`
- Create: `src/components/shared/DocxPreview.tsx`

- [ ] **Step 1: Create WargaSearchBox component**

`src/components/shared/WargaSearchBox.tsx`:

```typescript
import { useState } from 'react';
import { SearchField } from '../ui/SearchField';
import { searchWarga } from '../../services/wargaService';
import type { Warga } from '../../types';

interface WargaSearchBoxProps {
  onSelect: (warga: Warga) => void;
}

export function WargaSearchBox({ onSelect }: WargaSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Warga[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      const data = await searchWarga(value);
      setResults(data);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const computeUmur = (tanggalLahir: string): number => {
    const parts = tanggalLahir.split('-');
    if (parts.length !== 3) return 0;
    const [day, month, year] = parts;
    const birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSelect = (warga: Warga) => {
    onSelect(warga);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative">
      <SearchField
        placeholder="Cari warga (nama/NIK)..."
        value={query}
        onChange={handleSearch}
      />
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
          {results.map(warga => (
            <button
              key={warga.id}
              onClick={() => handleSelect(warga)}
              className="w-full text-left px-3 py-2 hover:bg-surface-secondary transition-colors border-b border-border last:border-0"
            >
              <p className="text-sm font-medium text-text-primary">{warga.nama}</p>
              <p className="text-xs text-text-tertiary">
                NIK: {warga.nik} • {warga.alamat} RT {warga.rt} RW {warga.rw} • {computeUmur(warga.tanggal_lahir)} thn
              </p>
            </button>
          ))}
        </div>
      )}
      {showResults && results.length === 0 && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-20 px-3 py-2">
          <p className="text-xs text-text-tertiary">Tidak ditemukan</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create DocxPreview component**

`src/components/shared/DocxPreview.tsx`:

```typescript
import { useEffect, useRef } from 'react';

interface DocxPreviewProps {
  docxBuffer: ArrayBuffer | null;
}

export function DocxPreview({ docxBuffer }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!docxBuffer || !containerRef.current) return;

    const render = async () => {
      const { renderAsync } = await import('docx-preview');
      containerRef.current!.innerHTML = '';
      await renderAsync(docxBuffer, containerRef.current!, {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
      });
    };

    render().catch(console.error);
  }, [docxBuffer]);

  if (!docxBuffer) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface-secondary rounded-md border border-border">
        <p className="text-sm text-text-tertiary">Belum ada preview</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="border border-border rounded-md overflow-auto max-h-[500px] bg-white"
    />
  );
}
```

- [ ] **Step 3: Create BuatSurat page**

`src/pages/BuatSurat.tsx`:

Create a page with the full flow:
1. Step 1: Select template (list of available templates)
2. Step 2: Form generation based on detected placeholders:
   - Group by warga slots (W1, W2, etc.) — each with WargaSearchBox + editable fields
   - Perangkat desa fields — auto-filled, shown as read-only or editable
   - Desa fields — auto-filled from settings
   - Nomor surat — auto-generated with override option
   - Custom fields — empty text inputs
3. Step 3: Preview (DocxPreview component showing rendered result)
4. Step 4: Download button + save to riwayat

Key logic:
- On template select, parse placeholders JSON, group by kategori and slot
- Only show fields that have placeholders in the template
- WargaSearchBox auto-fills relevant fields, all remain editable
- Generate button: resolve all placeholders → process docx → show preview
- Download button: save file + increment counter + save riwayat metadata

- [ ] **Step 4: Commit**

```bash
git add src/pages/BuatSurat.tsx src/components/shared/
git commit -m "feat: add buat surat page with full generation flow"
```

---

## Phase 6: Riwayat Surat

### Task 22: Riwayat Surat Page

**Files:**
- Create: `src/pages/RiwayatSurat.tsx`
- Create: `src/utils/excelExporter.ts`

- [ ] **Step 1: Create excelExporter utility**

`src/utils/excelExporter.ts`:

```typescript
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

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 20 }, // Tanggal
    { wch: 30 }, // Nomor Surat
    { wch: 40 }, // Template
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

  // Set column widths
  worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
```

- [ ] **Step 2: Create RiwayatSurat page**

`src/pages/RiwayatSurat.tsx`:

Create a page with:
- Header: title + "Download Laporan" button (export to xlsx) + "Hapus Semua" button (confirm modal)
- Table: No, Tanggal, Nomor Surat, Template, Aksi (Generate Ulang, Hapus)
- "Generate Ulang" button: load riwayat data → re-process template → preview → download (does NOT create new riwayat entry, does NOT increment counter)
- "Hapus" per row: confirm modal → delete → recalculate counter
- "Hapus Semua": confirm modal → delete all → reset counter
- Search/filter by nomor surat or template nama
- Use `riwayatService` and `excelExporter`

- [ ] **Step 3: Commit**

```bash
git add src/pages/RiwayatSurat.tsx src/utils/excelExporter.ts
git commit -m "feat: add riwayat surat page with export and delete logic"
```

---

## Phase 7: Dashboard, Polish & Auto-update

### Task 23: Dashboard with Live Data

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Update Dashboard with real data**

Update `src/pages/Dashboard.tsx` to:
- Fetch real counts from services (getTemplateCount, getWargaCount, getRiwayatCount)
- Show last 5 generated surat in a mini table
- Quick action buttons: "Buat Surat" (navigate), "Import Data Warga" (navigate)
- Counter animation using Framer Motion (animate from 0 to actual count)
- Stagger card entrance animation

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: update dashboard with live data and animations"
```

---

### Task 24: Wire Up All Pages in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import and wire all pages**

Update `src/App.tsx` to import all page components and add them to the `renderPage()` switch statement:

```typescript
// Add imports for all pages
import { Dashboard } from './pages/Dashboard';
import { BuatSurat } from './pages/BuatSurat';
import { TemplateSurat } from './pages/TemplateSurat';
import { Placeholder } from './pages/Placeholder';
import { DataWarga } from './pages/DataWarga';
import { RiwayatSurat } from './pages/RiwayatSurat';
import { DataDesa } from './pages/pengaturan/DataDesa';
import { NomorSurat } from './pages/pengaturan/NomorSurat';
import { Aplikasi } from './pages/pengaturan/Aplikasi';
import { Profil } from './pages/Profil';

// In renderPage():
const renderPage = () => {
  switch (currentPage) {
    case 'dashboard': return <Dashboard />;
    case 'buat-surat': return <BuatSurat />;
    case 'template-surat': return <TemplateSurat />;
    case 'placeholder': return <Placeholder />;
    case 'data-warga': return <DataWarga />;
    case 'riwayat-surat': return <RiwayatSurat />;
    case 'pengaturan-data-desa': return <DataDesa />;
    case 'pengaturan-nomor-surat': return <NomorSurat />;
    case 'pengaturan-aplikasi': return <Aplikasi />;
    case 'profil': return <Profil />;
    default: return <Dashboard />;
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up all pages in app router"
```

---

### Task 25: Auto-update Hook

**Files:**
- Create: `src/hooks/useUpdater.ts`

- [ ] **Step 1: Create useUpdater hook**

`src/hooks/useUpdater.ts`:

```typescript
import { useState, useEffect } from 'react';

interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false });
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);

  const checkForUpdate = async () => {
    setChecking(true);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        setUpdateInfo({
          available: true,
          version: update.version,
          body: update.body || undefined,
        });
      } else {
        setUpdateInfo({ available: false });
      }
    } catch (err) {
      console.error('Update check failed:', err);
    } finally {
      setChecking(false);
    }
  };

  const installUpdate = async () => {
    setInstalling(true);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process');
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch (err) {
      console.error('Update install failed:', err);
      setInstalling(false);
    }
  };

  // Check on mount
  useEffect(() => {
    checkForUpdate();
  }, []);

  return { updateInfo, checking, installing, checkForUpdate, installUpdate };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useUpdater.ts
git commit -m "feat: add auto-update hook"
```

---

### Task 26: Backup & Restore Service

**Files:**
- Create: `src/services/backupService.ts`

- [ ] **Step 1: Create backupService**

`src/services/backupService.ts`:

```typescript
import { select, execute, getDatabase } from './db';
import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';

const TABLES = [
  'warga', 'data_desa', 'perangkat_desa', 'templates', 'template_labels',
  'placeholder_registry', 'nomor_surat_config', 'riwayat_surat', 'riwayat_surat_data', 'auth_config',
] as const;

interface BackupData {
  version: string;
  timestamp: string;
  tables: Record<string, unknown[]>;
}

export async function exportBackup(): Promise<boolean> {
  const data: BackupData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    tables: {},
  };

  for (const table of TABLES) {
    data.tables[table] = await select<Record<string, unknown>>(`SELECT * FROM ${table}`);
  }

  const json = JSON.stringify(data, null, 2);
  const filePath = await saveDialog({
    defaultPath: `aisura-backup-${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!filePath) return false;
  await writeFile(filePath, new TextEncoder().encode(json));
  return true;
}

export async function importBackup(): Promise<boolean> {
  const filePath = await openDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    multiple: false,
  });

  if (!filePath) return false;
  const bytes = await readFile(filePath as string);
  const json = new TextDecoder().decode(bytes);
  const data: BackupData = JSON.parse(json);

  if (!data.tables) throw new Error('Format backup tidak valid');

  const db = getDatabase();

  // Clear all tables (reverse order for FK)
  for (const table of [...TABLES].reverse()) {
    await db.execute(`DELETE FROM ${table}`);
  }

  // Import data
  for (const table of TABLES) {
    const rows = data.tables[table] || [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const record = row as Record<string, unknown>;
      const columns = Object.keys(record);
      if (columns.length === 0) continue;

      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const values = columns.map(c => record[c] ?? null);
      await db.execute(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }

  return true;
}

export async function resetAllData(): Promise<void> {
  const db = getDatabase();
  for (const table of [...TABLES].reverse()) {
    if (table === 'auth_config') continue; // Keep auth
    await db.execute(`DELETE FROM ${table}`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/backupService.ts
git commit -m "feat: add backup and restore service"
```

---

### Task 27: Final Integration & Build Verification

- [ ] **Step 1: Update .gitignore**

Ensure `.gitignore` includes:
```
node_modules/
dist/
src-tauri/target/
ACCESS_TOKENS.md
*.db
```

- [ ] **Step 2: Verify full build**

```bash
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Test Tauri dev mode**

```bash
npm run tauri dev
```

Expected: App launches, shows login screen, sidebar and header render correctly.

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "feat: complete AISura v1.0.0 initial implementation"
git push origin main
```

---

## Summary

| Phase | Tasks | Description |
|---|---|---|
| 1 | 1-9 | Project scaffolding, DB, UI components, layout, auth, routing |
| 2 | 10-13 | Pengaturan (Data Desa, Perangkat Desa, Nomor Surat, Aplikasi, Profil) |
| 3 | 14-15 | Data Warga (import Excel/CSV, search, table) |
| 4 | 16-18 | Template Surat (upload, detect placeholders, kamus) |
| 5 | 19-21 | Buat Surat (core flow: select → fill → preview → download) |
| 6 | 22 | Riwayat Surat (list, re-generate, delete, export) |
| 7 | 23-27 | Dashboard live data, auto-update, backup/restore, final integration |

Total: 27 tasks across 7 phases.
