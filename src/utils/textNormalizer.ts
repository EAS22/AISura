// Generic text sanitizer. Used in 3 places:
// 1. Output of docxCleaner before sending to AI.
// 2. User input in chat textarea (on submit + on paste).
// 3. Display fields in choice cards (alamat, deskripsi, etc.) so weird
//    whitespace from the database doesn't leak into the UI.

const SOFT_HYPHEN = /\u00AD/g
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g
const NBSP = /\u00A0/g
// Lone CR / strange line endings normalize to \n.
const CRLF = /\r\n?/g
// Excessive vertical whitespace.
const TRIPLE_NEWLINE = /\n{3,}/g
// Common smart-quote / dash variants — keep the shape but normalize ASCII so
// AI prompts and chat search still match.
const SMART_QUOTES_DOUBLE = /[\u201C\u201D]/g
const SMART_QUOTES_SINGLE = /[\u2018\u2019]/g
const EM_DASH = /[\u2014]/g // em dash
const EN_DASH = /[\u2013]/g // en dash

/**
 * Default normalization: removes invisible characters, collapses whitespace
 * runs (preserving single newlines and double newlines), trims line edges,
 * normalizes line endings.
 */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return ''
  let s = String(input)
  s = s.replace(SOFT_HYPHEN, '')
  s = s.replace(ZERO_WIDTH, '')
  s = s.replace(NBSP, ' ')
  s = s.replace(CRLF, '\n')
  s = s.replace(SMART_QUOTES_DOUBLE, '"')
  s = s.replace(SMART_QUOTES_SINGLE, "'")
  s = s.replace(EM_DASH, '-')
  s = s.replace(EN_DASH, '-')
  // Normalize tabs and runs of horizontal whitespace per line.
  s = s
    .split('\n')
    .map((line) => line.replace(/\t/g, ' ').replace(/[ \f\v]{2,}/g, ' ').trimEnd())
    .join('\n')
  // Collapse 3+ blank lines down to 2 (allows paragraph breaks).
  s = s.replace(TRIPLE_NEWLINE, '\n\n')
  return s.trim()
}

/**
 * Single-line normalize: like normalizeText but flattens newlines too. Use
 * for things that should never wrap (button labels, tooltips, badges).
 */
export function normalizeOneLine(input: string | null | undefined): string {
  if (!input) return ''
  return normalizeText(input).replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Sanitize a value pasted by the user into a chat textarea. Same as
 * normalizeText but additionally strips control characters and limits to
 * a reasonable length so a runaway paste from a 50-page PDF doesn't blow
 * the chat history.
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const CHAT_INPUT_MAX = 4000

export function sanitizeChatInput(input: string): string {
  if (!input) return ''
  let s = input.replace(CONTROL_CHARS, '')
  s = normalizeText(s)
  if (s.length > CHAT_INPUT_MAX) {
    s = s.slice(0, CHAT_INPUT_MAX)
  }
  return s
}
