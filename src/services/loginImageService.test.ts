import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_LOGIN_IMAGE, getStoredLoginImage, resetStoredLoginImage } from './loginImageService'

describe('loginImageService', () => {
  it('returns default image when no custom image is stored', () => {
    const storage = { getItem: vi.fn(() => null) }

    expect(getStoredLoginImage(storage as unknown as Storage)).toBe(DEFAULT_LOGIN_IMAGE)
  })

  it('removes custom image and returns default image on reset', () => {
    const storage = { removeItem: vi.fn() }

    expect(resetStoredLoginImage(storage as unknown as Storage)).toBe(DEFAULT_LOGIN_IMAGE)
    expect(storage.removeItem).toHaveBeenCalledWith('aisura-login-image')
  })
})
