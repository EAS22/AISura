import { describe, expect, it } from 'vitest'
import { getCrmStatTone, getCompletionPercent } from './aisura-crm-ui'

describe('AISura CRM UI helpers', () => {
  it('uses AISura blue as primary stat tone', () => {
    expect(getCrmStatTone(0).accent).toBe('blue')
    expect(getCrmStatTone(0).card).toContain('border-blue-200')
  })

  it('cycles supporting stat tones', () => {
    expect(getCrmStatTone(1).accent).toBe('emerald')
    expect(getCrmStatTone(4).accent).toBe('blue')
  })

  it('calculates bounded completion percentages', () => {
    expect(getCompletionPercent(5, 10)).toBe(50)
    expect(getCompletionPercent(0, 0)).toBe(0)
    expect(getCompletionPercent(20, 10)).toBe(100)
  })
})
