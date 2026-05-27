import { describe, expect, it } from 'vitest'
import { normalizeText, normalizeOneLine, sanitizeChatInput } from './textNormalizer'

describe('textNormalizer', () => {
  it('strips zero-width and soft hyphens', () => {
    const input = 'Hello\u200B\u00ADWorld'
    expect(normalizeText(input)).toBe('HelloWorld')
  })

  it('replaces NBSP with regular space', () => {
    expect(normalizeText('Foo\u00A0Bar')).toBe('Foo Bar')
  })

  it('collapses excessive whitespace per line but preserves paragraph break', () => {
    const input = 'Hello   World\n\n\n\nFoo  Bar'
    expect(normalizeText(input)).toBe('Hello World\n\nFoo Bar')
  })

  it('normalizes smart quotes and dashes for AI-friendly text', () => {
    expect(normalizeText('“halo” — ‘test’')).toBe('"halo" - \'test\'')
  })

  it('one-line variant flattens newlines into single spaces', () => {
    expect(normalizeOneLine('Foo\n\nBar\n  Baz')).toBe('Foo Bar Baz')
  })

  it('sanitize chat input strips control chars and caps length', () => {
    const dirty = 'A\u0000B\u0007C\u001FD'
    expect(sanitizeChatInput(dirty)).toBe('ABCD')
    const long = 'x'.repeat(10000)
    expect(sanitizeChatInput(long).length).toBe(4000)
  })
})
