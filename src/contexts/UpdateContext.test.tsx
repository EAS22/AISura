import { describe, expect, it } from 'vitest'
import { APP_VERSION } from './UpdateContext'
import pkg from '../../package.json'

describe('UpdateContext version metadata', () => {
  it('uses package version for displayed current version', () => {
    expect(APP_VERSION).toBe(pkg.version)
  })
})
