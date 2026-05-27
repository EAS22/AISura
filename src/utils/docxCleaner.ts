// docxCleaner — extract clean, structured text from a DOCX file.
//
// Strategy:
//   1. Open the .docx (zip) and read document.xml + all header/footer XML files.
//   2. Parse each XML with native DOMParser (NOT regex — regex on word XML
//      is not reliable because attributes can wrap, self-closing tags vary,
//      and nested runs can confuse non-greedy capture).
//   3. Walk the DOM iterating <w:p> (paragraphs) and <w:tbl> (tables).
//      - For each paragraph, concatenate <w:t> text nodes in document order.
//        <w:tab/> becomes a tab, <w:br/> becomes a newline.
//      - For each table, extract every <w:tc> as a cell text. Output rows as
//        "Cell1 | Cell2 | Cell3" so downstream AI can see field|value pairs.
//   4. Normalize the resulting text:
//      - Replace soft hyphen, zero-width chars, NBSP, etc.
//      - Collapse runs of whitespace.
//      - Drop near-empty lines and decorative noise (-----, ====).
//      - Cap to a reasonable size for AI context.
//
// Output is a structured object so callers can render it nicely or feed
// only the parts they want.

import JSZip from 'jszip'
import { normalizeText } from './textNormalizer'

export interface CleanDocxRow {
  cells: string[]
}

export interface CleanDocxBlock {
  kind: 'paragraph' | 'table'
  /** Plain-text content of the block. Tables are joined with " | ". */
  text: string
  /** Source file inside the docx zip (so caller can group header/body/footer). */
  source: 'body' | 'header' | 'footer'
  /** For table blocks: structured rows. Empty for paragraphs. */
  rows?: CleanDocxRow[]
}

export interface CleanDocxResult {
  /** Ordered list of all blocks across body + headers + footers. */
  blocks: CleanDocxBlock[]
  /** Single concatenated plain text suitable for pasting/sending to AI. */
  plainText: string
  /** Existing placeholder tokens detected in the source text (with braces). */
  existingPlaceholders: string[]
  /** Any soft warnings encountered during parsing. */
  warnings: string[]
}

const BODY_FILE = 'word/document.xml'
const HEADER_FILE_RE = /^word\/header\d*\.xml$/
const FOOTER_FILE_RE = /^word\/footer\d*\.xml$/

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/**
 * Browser-safe DOM parser wrapper. Throws on parserError elements (which
 * DOMParser produces silently when the input is malformed).
 */
function parseXml(xml: string): Document {
  const parser = new DOMParser()
  // 'application/xml' returns a parserError node on malformed input — surface that.
  const doc = parser.parseFromString(xml, 'application/xml')
  const errEl = doc.getElementsByTagName('parsererror')
  if (errEl.length > 0) {
    const msg = errEl[0].textContent?.trim() || 'XML parser error'
    throw new Error(`Failed to parse XML: ${msg.slice(0, 200)}`)
  }
  return doc
}

/**
 * Iterate child elements with a given local name regardless of namespace prefix.
 * (DOCX always uses the `w:` prefix in practice, but this is safer.)
 */
function getChildrenByLocal(node: Element, localName: string): Element[] {
  const out: Element[] = []
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]
    if (child.nodeType === 1 && (child as Element).localName === localName) {
      out.push(child as Element)
    }
  }
  return out
}

function getAllByLocal(root: Element | Document, localName: string): Element[] {
  // DOM has getElementsByTagNameNS; using namespace-agnostic getElementsByTagName('*') filtered.
  if ('getElementsByTagNameNS' in root) {
    const list = (root as Document).getElementsByTagNameNS(W_NS, localName)
    return Array.from(list)
  }
  const all = (root as Element).getElementsByTagName(localName)
  return Array.from(all)
}

/**
 * Extract textual content from a <w:r> (run). Honors <w:t>, <w:tab/>, <w:br/>.
 * Skips properties like <w:rPr>.
 */
function extractRunText(run: Element): string {
  let buf = ''
  for (let i = 0; i < run.childNodes.length; i++) {
    const child = run.childNodes[i]
    if (child.nodeType !== 1) continue
    const el = child as Element
    switch (el.localName) {
      case 't':
        buf += el.textContent ?? ''
        break
      case 'tab':
        buf += '\t'
        break
      case 'br':
      case 'cr':
        buf += '\n'
        break
      // Other elements (rPr, drawing, instrText, etc.) — ignored.
    }
  }
  return buf
}

/**
 * Walk a <w:p> (paragraph) element, gathering text from all <w:r> runs in
 * document order. Hyperlink children (<w:hyperlink>) and SDT containers wrap
 * further runs which we drill into recursively.
 */
function extractParagraphText(p: Element): string {
  let buf = ''
  const visit = (el: Element) => {
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i]
      if (child.nodeType !== 1) continue
      const ce = child as Element
      const local = ce.localName
      if (local === 'r') {
        buf += extractRunText(ce)
      } else if (local === 'hyperlink' || local === 'sdt' || local === 'sdtContent' || local === 'smartTag' || local === 'fldSimple') {
        visit(ce)
      } else if (local === 'tab') {
        buf += '\t'
      } else if (local === 'br' || local === 'cr') {
        buf += '\n'
      }
      // Skip pPr, sectPr, etc.
    }
  }
  visit(p)
  return buf
}

/**
 * Extract structured rows from a <w:tbl>. Each row → array of cell strings.
 */
function extractTable(tbl: Element): CleanDocxRow[] {
  const rows: CleanDocxRow[] = []
  const trs = getChildrenByLocal(tbl, 'tr')
  for (const tr of trs) {
    const cells: string[] = []
    const tcs = getChildrenByLocal(tr, 'tc')
    for (const tc of tcs) {
      // Each cell may contain multiple paragraphs; join with " ".
      const ps = getChildrenByLocal(tc, 'p')
      const cellText = ps.map(extractParagraphText).join(' ')
      cells.push(cleanLine(cellText))
    }
    if (cells.some((c) => c.length > 0)) rows.push({ cells })
  }
  return rows
}

/**
 * Walk the body element (<w:body>) and emit blocks in document order.
 */
function walkBlocks(body: Element, source: CleanDocxBlock['source']): CleanDocxBlock[] {
  const out: CleanDocxBlock[] = []
  for (let i = 0; i < body.childNodes.length; i++) {
    const child = body.childNodes[i]
    if (child.nodeType !== 1) continue
    const el = child as Element
    if (el.localName === 'p') {
      const text = cleanLine(extractParagraphText(el))
      if (text.length === 0) continue
      out.push({ kind: 'paragraph', text, source })
    } else if (el.localName === 'tbl') {
      const rows = extractTable(el)
      if (rows.length === 0) continue
      const text = rows.map((r) => r.cells.join(' | ')).join('\n')
      out.push({ kind: 'table', text, source, rows })
    }
    // Other elements: sectPr, etc. — ignored.
  }
  return out
}

/**
 * Get the root element to walk for a given source XML — usually <w:body>
 * inside <w:document>, or the header/footer root itself for header/footer files.
 */
function getRootForWalk(doc: Document, isBody: boolean): Element | null {
  if (isBody) {
    const docRoot = doc.documentElement
    const bodies = getChildrenByLocal(docRoot, 'body')
    return bodies[0] ?? null
  }
  return doc.documentElement
}

const SOFT_HYPHEN = '\u00AD'
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g
const NBSP = '\u00A0'

/**
 * Single-line normalizer applied per paragraph / cell. Removes invisible
 * characters, collapses whitespace, but preserves intentional line breaks
 * (caller must split first if needed).
 */
function cleanLine(input: string): string {
  if (!input) return ''
  // Split on hard breaks → cleanLine each → rejoin with \n
  const parts = input.split(/\r?\n/)
  const cleaned = parts.map((part) => {
    let s = part
    s = s.replace(new RegExp(SOFT_HYPHEN, 'g'), '')
    s = s.replace(ZERO_WIDTH_RE, '')
    s = s.replace(new RegExp(NBSP, 'g'), ' ')
    s = s.replace(/\t+/g, ' ')
    s = s.replace(/[ \f\v]{2,}/g, ' ')
    return s.trim()
  })
  return cleaned.filter((p, idx) => p.length > 0 || idx < cleaned.length - 1).join('\n').trim()
}

/**
 * Detect existing placeholder tokens in the source XML text. Captures every
 * `{TOKEN}` that looks like a structured placeholder. Useful so the AI can
 * skip suggestions for ones already in the template.
 */
function detectExistingPlaceholders(rawXmlText: string): string[] {
  const found = new Set<string>()
  const re = /\{([A-Z][A-Z0-9_]{1,40})\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(rawXmlText)) !== null) {
    found.add(`{${m[1]}}`)
  }
  return Array.from(found).sort()
}

/**
 * Drop decorative-only lines (mis. ---- or ====) and lines too short to be
 * meaningful (single character bullets etc.).
 */
function isNoiseLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 2) return true
  // Lines made entirely of repeating punctuation/symbols.
  if (/^[\s\-_=*~.•·]+$/.test(trimmed)) return true
  return false
}

const MAX_PLAINTEXT_CHARS = 8000

/**
 * Build a plain-text rendering of all blocks in a way that's easy for an AI
 * to scan. Sections are tagged so the model can tell paragraphs from tables.
 */
function buildPlainText(blocks: CleanDocxBlock[]): string {
  const lines: string[] = []
  let lastSource: CleanDocxBlock['source'] | null = null

  for (const block of blocks) {
    if (lastSource !== block.source) {
      lines.push('')
      lines.push(`### ${block.source.toUpperCase()} ###`)
      lastSource = block.source
    }
    if (block.kind === 'paragraph') {
      // Split on hard breaks again; keep each non-noise line.
      const inner = block.text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !isNoiseLine(l))
      if (inner.length === 0) continue
      lines.push(...inner)
      lines.push('')
    } else {
      // Table block — emit an explicit marker so the AI knows it's tabular.
      lines.push('[TABEL]')
      for (const row of block.rows ?? []) {
        const cells = row.cells.map((c) => c.replace(/\s+/g, ' ').trim()).filter((c) => c.length > 0)
        if (cells.length > 0) lines.push(cells.join(' | '))
      }
      lines.push('[/TABEL]')
      lines.push('')
    }
  }

  // Collapse consecutive blank lines.
  const collapsed: string[] = []
  for (const line of lines) {
    if (line === '' && collapsed[collapsed.length - 1] === '') continue
    collapsed.push(line)
  }
  let result = collapsed.join('\n').trim()
  if (result.length > MAX_PLAINTEXT_CHARS) {
    result = result.slice(0, MAX_PLAINTEXT_CHARS) + '\n\n[... TEKS DIPOTONG SAMPAI 8000 KARAKTER ...]'
  }
  return result
}

/**
 * Public API: parse a docx Uint8Array → clean structured output for AI.
 */
export async function extractCleanText(fileBytes: Uint8Array | ArrayBuffer): Promise<CleanDocxResult> {
  const warnings: string[] = []
  const blocks: CleanDocxBlock[] = []
  const seenPlaceholderText: string[] = []

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(fileBytes)
  } catch (err) {
    throw new Error(`Tidak bisa membaca file docx: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Process body first, then headers (sorted), then footers (sorted), so the
  // visual reading order is preserved.
  const fileNames = Object.keys(zip.files)
  const bodyFiles = fileNames.filter((n) => n === BODY_FILE)
  const headerFiles = fileNames.filter((n) => HEADER_FILE_RE.test(n)).sort()
  const footerFiles = fileNames.filter((n) => FOOTER_FILE_RE.test(n)).sort()

  const queue: { name: string; source: CleanDocxBlock['source'] }[] = [
    ...bodyFiles.map((n) => ({ name: n, source: 'body' as const })),
    ...headerFiles.map((n) => ({ name: n, source: 'header' as const })),
    ...footerFiles.map((n) => ({ name: n, source: 'footer' as const })),
  ]

  for (const { name, source } of queue) {
    const file = zip.file(name)
    if (!file) continue
    let xml: string
    try {
      xml = await file.async('text')
    } catch (err) {
      warnings.push(`Gagal membaca ${name}`)
      continue
    }
    seenPlaceholderText.push(xml)
    let doc: Document
    try {
      doc = parseXml(xml)
    } catch (err) {
      warnings.push(
        `Gagal parse ${name}: ${err instanceof Error ? err.message : 'unknown'}. Akan di-skip.`,
      )
      continue
    }
    const root = getRootForWalk(doc, source === 'body')
    if (!root) {
      warnings.push(`Tidak ditemukan body root di ${name}`)
      continue
    }
    blocks.push(...walkBlocks(root, source))
  }

  if (blocks.length === 0) {
    // Fallback: extract <w:t> textContent across the whole zip
    // (last-resort, low-quality, but better than nothing).
    let fallback = ''
    for (const { name } of queue) {
      const file = zip.file(name)
      if (!file) continue
      const xml = await file.async('text').catch(() => '')
      try {
        const doc = parseXml(xml)
        const tNodes = getAllByLocal(doc, 't')
        for (const node of tNodes) {
          fallback += (node.textContent ?? '') + ' '
        }
      } catch { /* ignore */ }
    }
    if (fallback.trim()) {
      blocks.push({ kind: 'paragraph', text: cleanLine(fallback), source: 'body' })
      warnings.push('Struktur dokumen tidak terdeteksi; pakai fallback ekstraksi mentah.')
    }
  }

  const plainText = normalizeText(buildPlainText(blocks))
  const existingPlaceholders = detectExistingPlaceholders(seenPlaceholderText.join('\n'))

  return { blocks, plainText, existingPlaceholders, warnings }
}
