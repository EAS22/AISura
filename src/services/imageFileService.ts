const IMAGE_MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
}

export const SUPPORTED_IMAGE_EXTENSIONS = Object.keys(IMAGE_MIME_TYPES)

export function getImageMimeType(filePath: string) {
  const extension = filePath.split('.').pop()?.toLowerCase() || 'png'
  return IMAGE_MIME_TYPES[extension] || 'image/png'
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export function createImageDataUrl(filePath: string, bytes: Uint8Array) {
  return `data:${getImageMimeType(filePath)};base64,${bytesToBase64(bytes)}`
}
