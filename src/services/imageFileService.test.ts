import { describe, expect, it } from 'vitest'
import { bytesToBase64, createImageDataUrl, getImageMimeType } from './imageFileService'

describe('imageFileService', () => {
  it('normalizes jpg and jpeg files to image/jpeg data urls', () => {
    expect(getImageMimeType('C:/foto/logo.JPG')).toBe('image/jpeg')
    expect(createImageDataUrl('logo.jpeg', new Uint8Array([255, 216]))).toBe('data:image/jpeg;base64,/9g=')
  })

  it('supports png and gif image data urls', () => {
    expect(createImageDataUrl('/tmp/kop.png', new Uint8Array([137, 80, 78, 71]))).toBe('data:image/png;base64,iVBORw==')
    expect(createImageDataUrl('/tmp/animasi.gif', new Uint8Array([71, 73, 70]))).toBe('data:image/gif;base64,R0lG')
  })

  it('converts large byte arrays without spreading into function arguments', () => {
    const bytes = new Uint8Array(200_000)
    bytes.fill(65)

    expect(() => bytesToBase64(bytes)).not.toThrow()
    expect(bytesToBase64(bytes)).toMatch(/^QUFB/)
  })
})
