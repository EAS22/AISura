// Helper: build the consistent letter filename across manual + AI flows.
// Format: "<NamaTemplate> <NamaPemohon> <DD-MM-YYYY> <HH.MM>.docx"
// Example: "SKTM UJANG 27-05-2026 14.00.docx"

const FILENAME_INVALID_RE = /[<>:"/\\|?*\u0000-\u001f]/g

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function sanitizeFilenamePart(value: string, fallback: string): string {
  const cleaned = (value || '')
    .replace(FILENAME_INVALID_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || fallback
}

export interface BuildLetterFilenameInput {
  /** Nama template surat (e.g. "SKTM"). */
  templateName: string
  /** Nama pemohon (W1 NAMA). Optional — falls back to "Tanpa Pemohon" if blank. */
  pemohonName?: string
  /** Tanggal surat. Defaults to now. */
  generatedAt?: Date
}

/**
 * Build the canonical letter filename. Always returns a `.docx` filename
 * with safe characters only.
 */
export function buildLetterFilename(input: BuildLetterFilenameInput): string {
  const date = input.generatedAt ?? new Date()
  const datePart = `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`
  const timePart = `${pad2(date.getHours())}.${pad2(date.getMinutes())}`
  const templatePart = sanitizeFilenamePart(input.templateName, 'Surat')
  const pemohonPart = sanitizeFilenamePart(input.pemohonName || '', 'Tanpa Pemohon')
  return `${templatePart} ${pemohonPart} ${datePart} ${timePart}.docx`
}
