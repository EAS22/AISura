import { TemplateHandler, type TemplateData } from 'easy-template-x';

/**
 * Convert base64 data URL to binary data for easy-template-x image plugin
 */
function base64ToImageData(dataUrl: string): { source: ArrayBuffer; format: string; width: number; height: number } | null {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;

  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|bmp|webp);base64,(.+)$/);
  if (!match) return null;

  // easy-template-x requires full mime type: "image/png", "image/jpeg", etc.
  let mimeType = `image/${match[1]}`;
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (mimeType === 'image/webp') mimeType = 'image/png'; // fallback unsupported

  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return {
    source: bytes.buffer as ArrayBuffer,
    format: mimeType,
    width: 600,
    height: 100,
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
