# Template Reupload Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to replace an existing uploaded DOCX template from the edit modal and download any stored DOCX template from the template list.

**Architecture:** Extend `templateService` with focused update and download helpers while keeping DOCX bytes stored at the existing AppConfig file path. Update `TemplateSuratPage` state to track optional replacement bytes and add action buttons for selecting replacement DOCX and saving/downloading files.

**Tech Stack:** React 19, Tauri dialog/fs plugins, SQLite via existing `templateService`, Vitest.

---

## File Structure

- Modify `src/services/templateService.ts`: extend `updateTemplate` to accept `prefixSurat` and optional replacement DOCX bytes; add `downloadTemplateToPath` helper.
- Create `src/services/templateService.logic.test.ts`: tests pure metadata/update helpers without requiring Tauri runtime.
- Modify `src/pages/TemplateSurat.tsx`: add edit-modal replacement file state, reupload button, download button on template cards, and call updated service API.

### Task 1: Service Logic For Template Updates

**Files:**
- Modify: `src/services/templateService.ts`
- Create: `src/services/templateService.logic.test.ts`

- [ ] **Step 1: Write failing tests for update payload behavior**

Create `src/services/templateService.logic.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildTemplateUpdateSql } from './templateService'

describe('templateService update helpers', () => {
  it('builds metadata-only update without touching placeholders or warga count', () => {
    const result = buildTemplateUpdateSql({
      id: 'tpl-1',
      nama: 'Surat Domisili',
      deskripsi: 'Template domisili',
      prefixSurat: 'SKD',
      updatedAt: '2026-05-25T10:00:00.000Z',
    })

    expect(result.sql).toBe('UPDATE templates SET nama=$1, deskripsi=$2, prefix_surat=$3, updated_at=$4 WHERE id=$5')
    expect(result.params).toEqual(['Surat Domisili', 'Template domisili', 'SKD', '2026-05-25T10:00:00.000Z', 'tpl-1'])
  })

  it('builds DOCX replacement update with refreshed placeholders and warga count', () => {
    const result = buildTemplateUpdateSql({
      id: 'tpl-1',
      nama: 'Surat Usaha',
      deskripsi: 'Template usaha baru',
      prefixSurat: 'SKU',
      updatedAt: '2026-05-25T10:00:00.000Z',
      placeholders: [{ token: 'W1_NAMA', kategori: 'warga', field: 'nama', slot: 'W1' }],
      wargaCount: 1,
    })

    expect(result.sql).toBe('UPDATE templates SET nama=$1, deskripsi=$2, prefix_surat=$3, placeholders=$4, warga_count=$5, updated_at=$6 WHERE id=$7')
    expect(result.params).toEqual([
      'Surat Usaha',
      'Template usaha baru',
      'SKU',
      JSON.stringify([{ token: 'W1_NAMA', kategori: 'warga', field: 'nama', slot: 'W1' }]),
      1,
      '2026-05-25T10:00:00.000Z',
      'tpl-1',
    ])
  })
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npx vitest run src/services/templateService.logic.test.ts
```

Expected: fail because `buildTemplateUpdateSql` is not exported.

- [ ] **Step 3: Implement minimal service logic**

In `src/services/templateService.ts`, add imports/types and replace `updateTemplate`:

```ts
interface TemplateUpdateInput {
  id: string;
  nama: string;
  deskripsi: string;
  prefixSurat: string;
  updatedAt: string;
  placeholders?: ReturnType<typeof detectPlaceholders>;
  wargaCount?: number;
}

export function buildTemplateUpdateSql(input: TemplateUpdateInput): { sql: string; params: unknown[] } {
  if (input.placeholders && typeof input.wargaCount === 'number') {
    return {
      sql: 'UPDATE templates SET nama=$1, deskripsi=$2, prefix_surat=$3, placeholders=$4, warga_count=$5, updated_at=$6 WHERE id=$7',
      params: [input.nama, input.deskripsi, input.prefixSurat, JSON.stringify(input.placeholders), input.wargaCount, input.updatedAt, input.id],
    };
  }

  return {
    sql: 'UPDATE templates SET nama=$1, deskripsi=$2, prefix_surat=$3, updated_at=$4 WHERE id=$5',
    params: [input.nama, input.deskripsi, input.prefixSurat, input.updatedAt, input.id],
  };
}

export async function updateTemplate(
  id: string,
  nama: string,
  deskripsi: string,
  prefixSurat: string,
  fileBytes?: Uint8Array
): Promise<void> {
  const now = new Date().toISOString();
  const template = fileBytes ? await getTemplateById(id) : null;

  if (fileBytes && template) {
    await writeFile(template.file_path, fileBytes, { baseDir: BaseDirectory.AppConfig });
    const placeholders = await detectPlaceholdersFromDocx(fileBytes);
    const wargaCount = countWargaSlots(placeholders);
    const update = buildTemplateUpdateSql({ id, nama, deskripsi, prefixSurat, updatedAt: now, placeholders, wargaCount });
    await execute(update.sql, update.params);
    return;
  }

  const update = buildTemplateUpdateSql({ id, nama, deskripsi, prefixSurat, updatedAt: now });
  await execute(update.sql, update.params);
}

export async function downloadTemplateToPath(filePath: string, destinationPath: string): Promise<void> {
  const bytes = await getTemplateBlob(filePath);
  await writeFile(destinationPath, bytes);
}
```

- [ ] **Step 4: Run service tests and verify GREEN**

Run:

```bash
npx vitest run src/services/templateService.logic.test.ts
```

Expected: 2 tests pass.

### Task 2: Edit Modal Reupload UI

**Files:**
- Modify: `src/pages/TemplateSurat.tsx`

- [ ] **Step 1: Add edit replacement state**

Add state near edit modal state:

```ts
const [editFileBytes, setEditFileBytes] = useState<Uint8Array | null>(null)
const [editFileName, setEditFileName] = useState('')
```

- [ ] **Step 2: Reset replacement state when opening edit modal**

In `openEditModal`, add:

```ts
setEditFileBytes(null)
setEditFileName('')
```

- [ ] **Step 3: Add replacement file picker handler**

Add in `TemplateSuratPage` before `handleSaveEdit`:

```ts
const handlePickReplacementDocx = async () => {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const filePath = await open({ filters: [{ name: 'Word', extensions: ['docx'] }], multiple: false })
    if (!filePath) return
    const bytes = await readFile(filePath as string)
    setEditFileBytes(bytes)
    setEditFileName((filePath as string).split(/[\\/]/).pop() || 'template.docx')
  } catch (err) {
    alert('Gagal memilih file DOCX')
    console.error(err)
  }
}
```

- [ ] **Step 4: Update save handler to send prefix and optional bytes**

Replace current `handleSaveEdit` service call:

```ts
await svc.updateTemplate(editId, editNama, editDeskripsi, editPrefix, editFileBytes || undefined)
```

After successful save, reset replacement state:

```ts
setEditFileBytes(null)
setEditFileName('')
```

- [ ] **Step 5: Add file section to edit modal**

Below Prefix Surat input in edit modal, add:

```tsx
<div className="space-y-2 rounded-xl border bg-muted/20 p-3">
  <div className="flex items-center justify-between gap-3">
    <div>
      <Label>File DOCX</Label>
      <p className="text-[10px] text-muted-foreground">Ganti file template tanpa membuat template baru.</p>
    </div>
    <Button size="sm" variant="outline" onClick={handlePickReplacementDocx}>Ganti File</Button>
  </div>
  {editFileName && (
    <p className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
      File baru: <span className="font-medium text-foreground">{editFileName}</span>. Placeholder akan diperbarui saat disimpan.
    </p>
  )}
</div>
```

- [ ] **Step 6: Run TypeScript build check**

Run:

```bash
npm run build
```

Expected: build passes.

### Task 3: Template Download Button

**Files:**
- Modify: `src/pages/TemplateSurat.tsx`

- [ ] **Step 1: Update icons import**

Change lucide import:

```ts
import { FilePlus, Trash2, Pencil, Download } from 'lucide-react'
```

- [ ] **Step 2: Add safe filename helper**

Add inside `TemplateSuratPage` before `handleUpload`:

```ts
const getTemplateDownloadName = (template: TemplateSurat) => {
  const safeName = template.nama.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ') || 'template-surat'
  return `${safeName}.docx`
}
```

- [ ] **Step 3: Add download handler**

Add before `handleDelete`:

```ts
const handleDownloadTemplate = async (template: TemplateSurat) => {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const svc = await import('@/services/templateService')
    const destinationPath = await save({
      defaultPath: getTemplateDownloadName(template),
      filters: [{ name: 'Word', extensions: ['docx'] }],
    })
    if (!destinationPath) return
    await svc.downloadTemplateToPath(template.file_path, destinationPath)
  } catch (err) {
    alert('Gagal download template')
    console.error(err)
  }
}
```

- [ ] **Step 4: Add download button to card actions**

In card action div before edit button, add:

```tsx
<Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadTemplate(t)} title="Download template DOCX">
  <Download className="h-3.5 w-3.5" />
</Button>
```

- [ ] **Step 5: Run build check**

Run:

```bash
npm run build
```

Expected: build passes.

### Task 4: Full Verification And Commit

**Files:**
- Verify all touched files.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Inspect git diff**

Run:

```bash
git diff -- src/services/templateService.ts src/services/templateService.logic.test.ts src/pages/TemplateSurat.tsx
```

Expected: diff only includes template reupload/download changes.

- [ ] **Step 4: Commit changes**

Run:

```bash
git add src/services/templateService.ts src/services/templateService.logic.test.ts src/pages/TemplateSurat.tsx docs/superpowers/plans/2026-05-25-template-reupload-download.md
git commit -m "feat: allow template reupload and download"
```

Expected: commit created.

## Self Review

- Spec coverage: reupload in edit modal covered by Task 2; download button covered by Task 3; service behavior covered by Task 1.
- Placeholder scan: no TBD/TODO placeholders; code snippets define exact imports, state, handlers, and SQL.
- Type consistency: `updateTemplate(id, nama, deskripsi, prefixSurat, fileBytes?)` used consistently in service and page.
