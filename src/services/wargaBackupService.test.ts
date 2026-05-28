import { describe, expect, it } from 'vitest'
import { planRestoreAction } from './wargaBackupService'

describe('wargaBackupService.planRestoreAction', () => {
  it('inserts when NIK does not exist locally', () => {
    expect(planRestoreAction('3214567890123456', ['1111111111111111'], 'skip')).toBe('insert')
    expect(planRestoreAction('3214567890123456', ['1111111111111111'], 'overwrite')).toBe('insert')
  })

  it('skips conflict by default (skip mode)', () => {
    expect(planRestoreAction('3214567890123456', ['3214567890123456'], 'skip')).toBe('skip')
  })

  it('overwrites conflict in overwrite mode', () => {
    expect(planRestoreAction('3214567890123456', ['3214567890123456'], 'overwrite')).toBe('overwrite')
  })

  it('always treats blank NIK as insert (no reliable key to match by)', () => {
    expect(planRestoreAction('', ['3214567890123456'], 'skip')).toBe('insert')
    expect(planRestoreAction('   ', ['3214567890123456'], 'overwrite')).toBe('insert')
  })

  it('trims whitespace before comparing', () => {
    expect(planRestoreAction(' 3214567890123456 ', ['3214567890123456'], 'overwrite')).toBe('overwrite')
  })

  it('handles empty existing index', () => {
    expect(planRestoreAction('3214567890123456', [], 'skip')).toBe('insert')
    expect(planRestoreAction('', [], 'overwrite')).toBe('insert')
  })
})
