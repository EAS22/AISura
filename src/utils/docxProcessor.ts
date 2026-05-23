import { TemplateHandler, type TemplateData } from 'easy-template-x';

const KOP_TARGET_WIDTH = 812;

/**
 * Load image dimensions using browser Image API
 */
function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Convert base64 data URL to easy-template-x image data.
 * Uses Image API to detect real dimensions and scales to full document width.
 */
async function base64ToImageData(dataUrl: string): Promise<{ _type: 'image'; source: Blob; format: string; width: number; height: number } | null> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;

  const match = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!match) return null;

  const mimeSubtype = match[1].toLowerCase();
  const base64Data = match[2];

  let format: string;
  switch (mimeSubtype) {
    case 'png': format = 'image/png'; break;
    case 'jpeg': case 'jpg': format = 'image/jpeg'; break;
    case 'gif': format = 'image/gif'; break;
    case 'bmp': format = 'image/bmp'; break;
    default: return null;
  }

  // Convert base64 to Blob
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const source = new Blob([bytes], { type: format });

  // Detect real dimensions and scale to target width
  let width = KOP_TARGET_WIDTH;
  let height = Math.round(KOP_TARGET_WIDTH / 4);
  try {
    const natural = await loadImageDimensions(dataUrl);
    if (natural.width > 0 && natural.height > 0) {
      const ratio = natural.height / natural.width;
      height = Math.round(KOP_TARGET_WIDTH * ratio);
    }
  } catch {
    // fallback to default ratio
  }

  return { _type: 'image', source, format, width, height };
}

export async function processDocxTemplate(
  templateBytes: Uint8Array,
  data: Record<string, string>
): Promise<ArrayBuffer> {
  const templateData: TemplateData = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if value is a base64 image (for KOP_SURAT, etc.)
    if (value && value.startsWith('data:image/')) {
      const imgData = await base64ToImageData(value);
      if (imgData) {
        templateData[key] = imgData;
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
