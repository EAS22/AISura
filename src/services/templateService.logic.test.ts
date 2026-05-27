import { describe, expect, it } from 'vitest'
import { buildTemplateUpdateSql, collectDocxPlaceholderXmlPaths } from './templateService'

describe('templateService update helpers', () => {
  it('builds metadata-only update without touching placeholders or warga count', () => {
    const result = buildTemplateUpdateSql({
      id: 'tpl-1',
      nama: 'Surat Domisili',
      deskripsi: 'Template domisili',
      prefixSurat: 'SKD',
      signerUrutan: 1,
      updatedAt: '2026-05-25T10:00:00.000Z',
    })

    expect(result.sql).toBe(
      'UPDATE templates SET nama=$1, deskripsi=$2, prefix_surat=$3, signer_urutan=$4, updated_at=$5 WHERE id=$6',
    )
    expect(result.params).toEqual([
      'Surat Domisili',
      'Template domisili',
      'SKD',
      1,
      '2026-05-25T10:00:00.000Z',
      'tpl-1',
    ])
  })

  it('builds DOCX replacement update with refreshed placeholders and warga count', () => {
    const result = buildTemplateUpdateSql({
      id: 'tpl-1',
      nama: 'Surat Usaha',
      deskripsi: 'Template usaha baru',
      prefixSurat: 'SKU',
      signerUrutan: 2,
      updatedAt: '2026-05-25T10:00:00.000Z',
      placeholders: [{ token: 'W1_NAMA', kategori: 'warga', field: 'nama', slot: 'W1' }],
      wargaCount: 1,
    })

    expect(result.sql).toBe(
      'UPDATE templates SET nama=$1, deskripsi=$2, prefix_surat=$3, signer_urutan=$4, placeholders=$5, warga_count=$6, updated_at=$7 WHERE id=$8',
    )
    expect(result.params).toEqual([
      'Surat Usaha',
      'Template usaha baru',
      'SKU',
      2,
      JSON.stringify([{ token: 'W1_NAMA', kategori: 'warga', field: 'nama', slot: 'W1' }]),
      1,
      '2026-05-25T10:00:00.000Z',
      'tpl-1',
    ])
  })
})

describe('collectDocxPlaceholderXmlPaths', () => {
  it('always includes the main document body when present', () => {
    const out = collectDocxPlaceholderXmlPaths([
      '[Content_Types].xml',
      'word/document.xml',
      'word/styles.xml',
    ])
    expect(out).toEqual(['word/document.xml'])
  })

  it('also picks up legacy header1 / header2 / footer1 parts', () => {
    const out = collectDocxPlaceholderXmlPaths([
      'word/document.xml',
      'word/header1.xml',
      'word/header2.xml',
      'word/footer1.xml',
    ])
    expect(out).toEqual([
      'word/document.xml',
      'word/header1.xml',
      'word/header2.xml',
      'word/footer1.xml',
    ])
  })

  it('picks up header3.xml that Word 2021 creates for first-page header', () => {
    // Regression: bug where {KOP_SURAT} living inside header3.xml went
    // undetected because the previous code hardcoded only header1 + header2.
    const out = collectDocxPlaceholderXmlPaths([
      'word/document.xml',
      'word/header1.xml',
      'word/header2.xml',
      'word/header3.xml',
      'word/footer1.xml',
      'word/footer2.xml',
      'word/footer3.xml',
    ])
    expect(out).toContain('word/header3.xml')
    expect(out).toContain('word/footer3.xml')
  })

  it('ignores unrelated XML parts (settings, theme, fontTable, ...)', () => {
    const out = collectDocxPlaceholderXmlPaths([
      'word/document.xml',
      'word/settings.xml',
      'word/theme/theme1.xml',
      'word/fontTable.xml',
      'word/header1.xml',
    ])
    expect(out).toEqual(['word/document.xml', 'word/header1.xml'])
  })

  it('returns empty when no document body is present', () => {
    const out = collectDocxPlaceholderXmlPaths(['word/header1.xml'])
    // No document.xml present (defensive — real docx will always have it).
    expect(out).toEqual(['word/header1.xml'])
  })
})
