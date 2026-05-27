import { describe, expect, it } from 'vitest'
import { buildLetterFilename } from './letterFilename'

describe('buildLetterFilename', () => {
  it('matches the documented example shape', () => {
    const out = buildLetterFilename({
      templateName: 'SKTM',
      pemohonName: 'UJANG',
      generatedAt: new Date(2026, 4, 27, 14, 0),
    })
    expect(out).toBe('SKTM UJANG 27-05-2026 14.00.docx')
  })

  it('zero-pads single-digit dates and times', () => {
    const out = buildLetterFilename({
      templateName: 'SKD',
      pemohonName: 'BUDI',
      generatedAt: new Date(2026, 0, 5, 9, 7),
    })
    expect(out).toBe('SKD BUDI 05-01-2026 09.07.docx')
  })

  it('strips path-unsafe characters from template/name parts', () => {
    const out = buildLetterFilename({
      templateName: 'SK/Domisili',
      pemohonName: 'Pak <Sena>',
      generatedAt: new Date(2026, 4, 27, 14, 0),
    })
    expect(out).toBe('SKDomisili Pak Sena 27-05-2026 14.00.docx')
  })

  it('falls back to "Tanpa Pemohon" when pemohon is blank', () => {
    const out = buildLetterFilename({
      templateName: 'SKD',
      pemohonName: '',
      generatedAt: new Date(2026, 4, 27, 14, 0),
    })
    expect(out).toBe('SKD Tanpa Pemohon 27-05-2026 14.00.docx')
  })

  it('falls back to "Surat" when template name is blank', () => {
    const out = buildLetterFilename({
      templateName: '   ',
      pemohonName: 'UJANG',
      generatedAt: new Date(2026, 4, 27, 14, 0),
    })
    expect(out).toBe('Surat UJANG 27-05-2026 14.00.docx')
  })
})
