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
