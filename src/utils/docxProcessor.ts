import { TemplateHandler, type TemplateData } from 'easy-template-x';

/**
 * Convert base64 data URL to binary data for easy-template-x image plugin.
 * Width is set to full A4 content width (approx 595 points for borderless, 451 for standard margins).
 * Height is auto-calculated to maintain aspect ratio based on a default ratio.
 */
function base64ToImageData(dataUrl: string): { source: ArrayBuffer; format: string; width: number; height: number } | null {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;

  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|bmp|webp);base64,(.+)$/);
  if (!match) return null;

  let mimeType = `image/${match[1]}`;
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (mimeType === 'image/webp') mimeType = 'image/png';

  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Try to get image dimensions from PNG header
  let width = 595; // A4 full width in points (no margin)
  let height = 100;

  if (mimeType === 'image/png' && bytes.length > 24) {
    // PNG: width at offset 16 (4 bytes big-endian), height at offset 20
    const imgWidth = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const imgHeight = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    if (imgWidth > 0 && imgHeight > 0) {
      // Scale to fit page width (595 points), maintain aspect ratio
      height = Math.round((595 / imgWidth) * imgHeight);
      width = 595;
    }
  } else if (mimeType === 'image/jpeg' && bytes.length > 4) {
    // JPEG: scan for SOF0 marker (0xFF 0xC0) to get dimensions
    for (let i = 0; i < bytes.length - 9; i++) {
      if (bytes[i] === 0xFF && (bytes[i + 1] === 0xC0 || bytes[i + 1] === 0xC2)) {
        const imgHeight = (bytes[i + 5] << 8) | bytes[i + 6];
        const imgWidth = (bytes[i + 7] << 8) | bytes[i + 8];
        if (imgWidth > 0 && imgHeight > 0) {
          height = Math.round((595 / imgWidth) * imgHeight);
          width = 595;
        }
        break;
      }
    }
  }

  return {
    source: bytes.buffer as ArrayBuffer,
    format: mimeType,
    width,
    height,
  };
}

export async function processDocxTemplate(
  templateBytes: Uint8Array,
  data: Record<string, string>
): Promise<ArrayBuffer> {
  const templateData: TemplateData = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if value is a base64 image (for KOP_SURAT, etc.)
    if (value && value.startsWith('data:image/')) {
      const imgData = base64ToImageData(value);
      if (imgData) {
        templateData[key] = {
          _type: 'image',
          source: imgData.source,
          format: imgData.format,
          width: imgData.width,
          height: imgData.height,
        };
        continue;
      }
    }
    templateData[key] = value;
  }

  const handler = new TemplateHandler();
  const blob = new Blob([templateBytes as unknown as BlobPart]);
  const doc = await handler.process(blob, templateData);
  return await doc.arrayBuffer();
}

export async function downloadDocx(buffer: ArrayBuffer, filename: string): Promise<void> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    });
    if (!filePath) return;
    await writeFile(filePath, new Uint8Array(buffer));
  } else {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
