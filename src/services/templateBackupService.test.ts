import { describe, expect, it } from 'vitest'
import { planRestoreAction } from './templateBackupService'

describe('templateBackupService.planRestoreAction', () => {
  it('inserts when no template with the same name exists', () => {
    expect(planRestoreAction('SKTM Baru', ['SKD', 'SKU'], 'skip')).toBe('insert')
    expect(planRestoreAction('SKTM Baru', ['SKD', 'SKU'], 'overwrite')).toBe('insert')
  })

  it('skips an existing duplicate when onDuplicate=skip', () => {
    expect(planRestoreAction('SKTM', ['SKTM', 'SKU'], 'skip')).toBe('skip')
  })

  it('overwrites an existing duplicate when onDuplicate=overwrite', () => {
    expect(planRestoreAction('SKTM', ['SKTM', 'SKU'], 'overwrite')).toBe('overwrite')
  })

  it('matches name exactly (case-sensitive) — different casing is not a duplicate', () => {
    // Decision: keep case-sensitive matching so users can intentionally
    // rename their template casing without backup imports collapsing them.
    expect(planRestoreAction('sktm', ['SKTM'], 'skip')).toBe('insert')
    expect(planRestoreAction('SKTM', ['sktm'], 'overwrite')).toBe('insert')
  })

  it('handles empty existing list as no conflicts', () => {
    expect(planRestoreAction('Apa Saja', [], 'skip')).toBe('insert')
    expect(planRestoreAction('Apa Saja', [], 'overwrite')).toBe('insert')
  })
})
