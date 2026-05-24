# Multi-Nomor Surat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support templates that require multiple nomor surat, using sequential counter increments from a single global counter.

**Architecture:** Extend the existing slot pattern (like `W1`, `PD1`) to nomor surat with `N1`, `N2`, etc. Unslotted tokens (`{NOMOR_SURAT}`, `{S_NOMOR}`) remain backward-compatible as aliases for `N1`. The counter increments by the number of nomor slots detected. Riwayat stores the first nomor for display and all nomor values in placeholder data.

**Tech Stack:** TypeScript, SQLite (via @tauri-apps/plugin-sql), React

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/constants/placeholders.ts` | Modify | Add `NOMOR_SURAT_FIELDS` array, update `NOMOR_SURAT_TOKENS` |
| `src/utils/placeholderDetector.ts` | Modify | Detect `N\d+_` prefix, classify as `nomor_surat` with slot |
| `src/utils/nomorSuratGenerator.ts` | Modify | Accept slot count, return array of parts per slot |
| `src/services/nomorSuratService.ts` | Modify | `incrementCounter(count)` to increment by N |
| `src/services/db.ts` | Modify | Migration: add `nomor_urut_akhir` column to `riwayat_surat` |
| `src/services/riwayatService.ts` | Modify | Store `nomor_urut_akhir`, update `recalculateCounter` |
| `src/types/index.ts` | Modify | Add `nomor_urut_akhir` to `RiwayatSurat` |
| `src/pages/BuatSurat.tsx` | Modify | Generate multiple nomor parts, fill all N slots, preview all |
| `src/pages/Placeholder.tsx` | Modify | Show `{Nn_FIELD}` section for multi-nomor |
| `src/pages/RiwayatSurat.tsx` | Modify | Display nomor range if multi |
| `src/pages/TemplateSurat.tsx` | Modify | Show nomor slot count badge |

---

### Task 1: Update Constants — Add NOMOR_SURAT_FIELDS

**Files:**
- Modify: `src/constants/placeholders.ts`

- [ ] **Step 1: Add NOMOR_SURAT_FIELDS array**

```typescript
export const NOMOR_SURAT_FIELDS = [
  'NOMOR_SURAT', 'S_NOMOR', 'S_PREFIX', 'S_BULAN', 'S_BULAN_ROM',
  'S_TAHUN', 'S_KODE_DESA', 'S_TANGGAL',
] as const;

export type NomorSuratField = typeof NOMOR_SURAT_FIELDS[number];
```

- [ ] **Step 2: Keep NOMOR_SURAT_TOKENS for backward compat (unslotted tokens still recognized)**

No change needed to `NOMOR_SURAT_TOKENS` — it stays as-is for detecting unslotted `{NOMOR_SURAT}`, `{S_NOMOR}` etc.

- [ ] **Step 3: Commit**

```bash
git add src/constants/placeholders.ts
git commit -m "feat: add NOMOR_SURAT_FIELDS constant for multi-nomor support"
```

---

### Task 2: Update Placeholder Detector — Recognize N-slots

**Files:**
- Modify: `src/utils/placeholderDetector.ts`

- [ ] **Step 1: Update `classifyToken` to detect `N\d+_` prefix**

```typescript
function classifyToken(token: string): PlaceholderKategori {
  if (/^W\d+_/.test(token)) return 'warga';
  if (/^PD\d+_/.test(token)) return 'perangkat_desa';
  if (token in PERANGKAT_DESA_ALIASES) return 'perangkat_desa';
  if (/^N\d+_/.test(token)) return 'nomor_surat';
  if (NOMOR_SURAT_TOKENS.includes(token) || token === 'NOMOR_SURAT') return 'nomor_surat';
  if (DESA_TOKENS.includes(token)) return 'desa';
  return 'custom';
}
```

- [ ] **Step 2: Update `extractSlot` to handle `N\d+_` prefix**

```typescript
function extractSlot(token: string): string | undefined {
  const wargaMatch = token.match(/^(W\d+)_/);
  if (wargaMatch) return wargaMatch[1];

  const pdMatch = token.match(/^(PD\d+)_/);
  if (pdMatch) return pdMatch[1];

  const nomorMatch = token.match(/^(N\d+)_/);
  if (nomorMatch) return nomorMatch[1];

  if (token in PERANGKAT_DESA_ALIASES) {
    const resolved = PERANGKAT_DESA_ALIASES[token];
    const m = resolved.match(/^(PD\d+)_/);
    return m ? m[1] : undefined;
  }

  // Unslotted nomor surat tokens → slot N1
  if (NOMOR_SURAT_TOKENS.includes(token) || token === 'NOMOR_SURAT') return 'N1';

  return undefined;
}
```

- [ ] **Step 3: Update `extractField` to handle `N\d+_` prefix**

```typescript
function extractField(token: string): string {
  const wargaMatch = token.match(/^W\d+_(.+)$/);
  if (wargaMatch) return wargaMatch[1];

  const pdMatch = token.match(/^PD\d+_(.+)$/);
  if (pdMatch) return pdMatch[1];

  const nomorMatch = token.match(/^N\d+_(.+)$/);
  if (nomorMatch) return nomorMatch[1];

  return token;
}
```

- [ ] **Step 4: Update `isKnownBaseToken` to recognize `N\d+_` tokens**

Add after the PD check:

```typescript
const nomorMatch = token.match(/^N\d+_(.+)$/);
if (nomorMatch) {
  return (NOMOR_SURAT_FIELDS as readonly string[]).includes(nomorMatch[1]);
}
```

Import `NOMOR_SURAT_FIELDS` from constants.

- [ ] **Step 5: Add `countNomorSlots` helper export**

```typescript
export function countNomorSlots(placeholders: DetectedPlaceholder[]): number {
  const slots = new Set<string>();
  for (const p of placeholders) {
    if (p.kategori === 'nomor_surat' && p.slot) {
      slots.add(p.slot);
    }
  }
  return slots.size;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/placeholderDetector.ts
git commit -m "feat: detect N-slot prefix for multi-nomor surat placeholders"
```

---

### Task 3: Update Nomor Surat Generator — Multi-slot Output

**Files:**
- Modify: `src/utils/nomorSuratGenerator.ts`

- [ ] **Step 1: Add `generateMultiNomorParts` function**

```typescript
export function generateMultiNomorParts(
  format: string,
  startCounter: number,
  kodeDesa: string,
  prefix: string = '',
  slotCount: number = 1,
  date: Date = new Date()
): Record<string, NomorSuratParts> {
  const result: Record<string, NomorSuratParts> = {};
  for (let i = 0; i < slotCount; i++) {
    const slot = `N${i + 1}`;
    result[slot] = generateNomorSuratParts(format, startCounter + i, kodeDesa, prefix, date);
  }
  return result;
}
```

Keep existing `generateNomorSuratParts` unchanged for backward compat.

- [ ] **Step 2: Commit**

```bash
git add src/utils/nomorSuratGenerator.ts
git commit -m "feat: add generateMultiNomorParts for multi-slot nomor surat"
```

---

### Task 4: Update Nomor Surat Service — Increment by N

**Files:**
- Modify: `src/services/nomorSuratService.ts`

- [ ] **Step 1: Change `incrementCounter` to accept count parameter**

```typescript
export async function incrementCounter(count: number = 1): Promise<number> {
  const config = await getNomorSuratConfig();
  if (!config) throw new Error('Nomor surat config not found');

  const currentYear = new Date().getFullYear();
  let startCounter: number;

  if (config.tahun !== currentYear) {
    startCounter = 1;
    await execute(
      'UPDATE nomor_surat_config SET counter=$1, tahun=$2, updated_at=$3 WHERE id=$4',
      [startCounter + count, currentYear, new Date().toISOString(), config.id]
    );
  } else {
    startCounter = config.counter;
    await execute(
      'UPDATE nomor_surat_config SET counter=$1, updated_at=$2 WHERE id=$3',
      [startCounter + count, new Date().toISOString(), config.id]
    );
  }

  return startCounter;
}
```

Returns the first counter value. Counter advances by `count`.

- [ ] **Step 2: Commit**

```bash
git add src/services/nomorSuratService.ts
git commit -m "feat: incrementCounter accepts count for multi-nomor"
```

---

### Task 5: Update DB Schema & Types — nomor_urut_akhir

**Files:**
- Modify: `src/services/db.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add migration in db.ts**

After existing pemohon migrations:

```typescript
try { await db.execute(`ALTER TABLE riwayat_surat ADD COLUMN nomor_urut_akhir INTEGER DEFAULT 0`); } catch {}
```

- [ ] **Step 2: Update RiwayatSurat type**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/services/db.ts src/types/index.ts
git commit -m "feat: add nomor_urut_akhir to riwayat_surat schema"
```

---

### Task 6: Update Riwayat Service — Store Multi-Nomor

**Files:**
- Modify: `src/services/riwayatService.ts`

- [ ] **Step 1: Update `saveRiwayat` to accept `nomorUrutAkhir`**

```typescript
export async function saveRiwayat(
  templateId: string,
  templateNama: string,
  nomorSurat: string,
  nomorUrut: number,
  placeholderData: Record<string, string>,
  pemohon?: { nama: string; nik: string; alamat: string },
  nomorUrutAkhir?: number
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO riwayat_surat (id, template_id, template_nama, nomor_surat, nomor_urut, nomor_urut_akhir, pemohon_nama, pemohon_nik, pemohon_alamat, tanggal_generate, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, templateId, templateNama, nomorSurat, nomorUrut, nomorUrutAkhir ?? nomorUrut, pemohon?.nama || '', pemohon?.nik || '', pemohon?.alamat || '', now, now]
  );

  for (const [key, value] of Object.entries(placeholderData)) {
    await execute(
      'INSERT INTO riwayat_surat_data (id, riwayat_id, placeholder_key, placeholder_value) VALUES ($1,$2,$3,$4)',
      [uuid(), id, key, value]
    );
  }

  return id;
}
```

- [ ] **Step 2: Update `recalculateCounter` to use `nomor_urut_akhir`**

```typescript
export async function recalculateCounter(): Promise<void> {
  const currentYear = new Date().getFullYear();
  const rows = await select<{ max_nomor: number | null }>(
    `SELECT MAX(COALESCE(nomor_urut_akhir, nomor_urut)) as max_nomor FROM riwayat_surat
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
git add src/services/riwayatService.ts
git commit -m "feat: riwayat stores nomor_urut_akhir for multi-nomor"
```

---

### Task 7: Update BuatSurat — Generate Multi-Nomor

**Files:**
- Modify: `src/pages/BuatSurat.tsx`

- [ ] **Step 1: Import `generateMultiNomorParts` and `countNomorSlots`**

```typescript
import { generateNomorSuratParts, generateMultiNomorParts } from '@/utils/nomorSuratGenerator'
```

Add `countNomorSlots` import from placeholderDetector (or compute inline).

- [ ] **Step 2: Update `handleGenerate` / `buildDocx` to use multi-nomor**

Replace the single-nomor logic with:

```typescript
// Determine nomor slots
const nomorSlots = [...new Set(placeholders.filter(p => p.kategori === 'nomor_surat' && p.slot).map(p => p.slot!))]
const slotCount = nomorSlots.length || 1

const nomorUrut = await incrementCounter(slotCount)
const suratDate = tanggalOverride || new Date()
const multiParts = generateMultiNomorParts(config.format, nomorUrut, config.kode_desa, selectedTemplate!.prefix_surat || '', slotCount, suratDate)

const finalValues = { ...formValues }
for (const p of placeholders) {
  if (p.kategori === 'nomor_surat') {
    const slot = p.slot || 'N1'
    const parts = multiParts[slot]
    if (parts) {
      if (p.field === 'NOMOR_SURAT' && nomorOverride && slot === 'N1') {
        finalValues[p.token] = nomorOverride
      } else {
        finalValues[p.token] = parts[p.field as keyof typeof parts] || ''
      }
    }
  }
}
```

- [ ] **Step 3: Update `saveRiwayat` call to pass `nomorUrutAkhir`**

```typescript
const nomorUrutAkhir = nomorUrut + slotCount - 1
await saveRiwayat(selectedTemplate!.id, selectedTemplate!.nama, nomorOverride || multiParts['N1'].NOMOR_SURAT, nomorUrut, finalValues, pemohon, nomorUrutAkhir)
```

- [ ] **Step 4: Update `handlePreview` with same multi-nomor logic (without incrementing)**

Use `getCurrentCounter()` as start, generate multi parts for preview display.

- [ ] **Step 5: Update `loadNomorPreview` to show all nomor previews**

```typescript
const loadNomorPreview = async (prefix: string) => {
  try {
    const config = await getNomorSuratConfig()
    if (!config) return
    const counter = await getCurrentCounter()
    const nomorSlots = [...new Set(placeholders.filter(p => p.kategori === 'nomor_surat' && p.slot).map(p => p.slot!))]
    const slotCount = nomorSlots.length || 1
    const multiParts = generateMultiNomorParts(config.format, counter, config.kode_desa, prefix, slotCount)
    const previews = Object.entries(multiParts).map(([slot, parts]) => `${slot}: ${parts.NOMOR_SURAT}`)
    setNomorPreview(previews.join(' • '))
  } catch {}
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/BuatSurat.tsx
git commit -m "feat: BuatSurat generates multi-nomor surat from N-slots"
```

---

### Task 8: Update Placeholder Page — Show Multi-Nomor Section

**Files:**
- Modify: `src/pages/Placeholder.tsx`

- [ ] **Step 1: Add multi-nomor section in the nomor_surat tab**

After existing nomor surat placeholders, add explanation:

```tsx
<div className="mt-4 pt-4 border-t">
  <h4 className="text-xs font-medium mb-2 text-muted-foreground">Multi-Nomor (format: {'{Nn_FIELD}'})</h4>
  <p className="text-xs text-muted-foreground mb-3">
    Untuk template yang butuh lebih dari 1 nomor surat, gunakan prefix N1_, N2_, dst.
    Contoh: {'{N1_NOMOR_SURAT}'}, {'{N2_NOMOR_SURAT}'}, {'{N1_S_NOMOR}'}, {'{N2_S_NOMOR}'}
  </p>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {NOMOR_SURAT_FIELDS.map(f => (
      <PlaceholderCard key={`Nn_${f}`} token={`{Nn_${f}}`} description={f.replace(/_/g, ' ')} onClick={() => handleCardClick(`{Nn_${f}}`)} />
    ))}
  </div>
</div>
```

Import `NOMOR_SURAT_FIELDS` from constants.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Placeholder.tsx
git commit -m "feat: placeholder page shows multi-nomor Nn_FIELD format"
```

---

### Task 9: Update Template Surat Page — Show Nomor Slot Count

**Files:**
- Modify: `src/pages/TemplateSurat.tsx`

- [ ] **Step 1: Import `countNomorSlots` from placeholderDetector**

- [ ] **Step 2: Add badge showing nomor count in template card/list**

In the template display, after existing badges:

```tsx
{(() => {
  const detected: DetectedPlaceholder[] = JSON.parse(t.placeholders || '[]')
  const nomorCount = countNomorSlots(detected)
  return nomorCount > 1 ? <Badge variant="outline">{nomorCount} nomor</Badge> : null
})()}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/TemplateSurat.tsx
git commit -m "feat: template page shows multi-nomor slot count badge"
```

---

### Task 10: Update Riwayat Surat Page — Display Nomor Range

**Files:**
- Modify: `src/pages/RiwayatSurat.tsx`

- [ ] **Step 1: Show nomor range if multi-nomor**

In the nomor_surat table cell:

```tsx
<TableCell>
  {r.nomor_surat}
  {r.nomor_urut_akhir > r.nomor_urut && (
    <span className="text-muted-foreground ml-1">
      (+{r.nomor_urut_akhir - r.nomor_urut})
    </span>
  )}
</TableCell>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/RiwayatSurat.tsx
git commit -m "feat: riwayat shows multi-nomor range indicator"
```

---

### Task 11: Build Verification & Final Commit

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: success, no type errors.

- [ ] **Step 2: Verify backward compatibility**

Templates with unslotted `{NOMOR_SURAT}`, `{S_NOMOR}` etc. should still work — they get auto-assigned slot `N1` by the detector.

- [ ] **Step 3: Final commit if any remaining changes**

```bash
git add -A
git commit -m "feat: multi-nomor surat complete"
git push
```
