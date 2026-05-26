import { describe, expect, it } from 'vitest'
import { buildTemplateUpdateSql } from './templateService'

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
