import { describe, expect, it } from 'vitest'
import { getTemplateAccent, getFieldStateClass } from './BuatSurat'

describe('BuatSurat UI helpers', () => {
  it('cycles template accents by index', () => {
    expect(getTemplateAccent(0).accent).toBe('blue')
    expect(getTemplateAccent(1).accent).toBe('emerald')
    expect(getTemplateAccent(6).accent).toBe('blue')
  })

  it('marks filled form fields with stronger surface', () => {
    expect(getFieldStateClass('Siti')).toContain('border-blue-200')
    expect(getFieldStateClass('')).toContain('border-dashed')
  })
})
