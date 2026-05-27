import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Upload, Wand2, FileText, Copy, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAI } from '@/contexts/AIContext'
import { TEMPLATE_SUGGEST_SYSTEM_PROMPT, chatCompletion, sanitizeText } from '@/services/ai'
import {
  WARGA_FIELDS,
  PERANGKAT_DESA_FIELDS,
  NOMOR_SURAT_FIELDS,
  DESA_TOKENS,
  PERANGKAT_DESA_ALIASES,
} from '@/constants/placeholders'
import { extractCleanText } from '@/utils/docxCleaner'
import { normalizeText } from '@/utils/textNormalizer'

interface RawSuggestion {
  originalText: string
  suggestedToken: string
  reason: string
}

interface Suggestion extends RawSuggestion {
  category: 'warga' | 'perangkat_desa' | 'desa' | 'nomor_surat' | 'custom'
}

interface SuggestionResult {
  suggestions: Suggestion[]
  notes?: string
}

export function TemplateSuggesterPanel() {
  const ai = useAI()
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [result, setResult] = useState<SuggestionResult | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [existingPlaceholders, setExistingPlaceholders] = useState<string[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)

  const validTokens = useMemo(() => buildValidTokenList(), [])

  /**
   * Existing placeholders split into 'recognized' (already match a VALID_TOKENS
   * entry, hence safe to skip) vs 'unknown' (legacy/typo placeholders that
   * should still be suggested for replacement).
   */
  const existingClassification = useMemo(() => {
    const valid = new Set(validTokens)
    const recognized: string[] = []
    const unknown: string[] = []
    for (const tok of existingPlaceholders) {
      // strip optional _U/_L/_P modifier when checking validity
      const baseToken = tok.replace(/_(U|L|P)\}$/, '}')
      if (valid.has(tok) || valid.has(baseToken)) {
        recognized.push(tok)
      } else {
        unknown.push(tok)
      }
    }
    return { recognized, unknown }
  }, [existingPlaceholders, validTokens])

  const handlePickDocx = async () => {
    setError(null)
    setWarnings([])
    setExistingPlaceholders([])
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await open({
        filters: [{ name: 'Word', extensions: ['docx'] }],
        multiple: false,
      })
      if (!filePath) return
      const bytes = await readFile(filePath as string)
      const fname = (filePath as string).split(/[\\/]/).pop() || 'template.docx'
      setFilename(fname)
      const cleaned = await extractCleanText(bytes)
      setText(cleaned.plainText)
      setExistingPlaceholders(cleaned.existingPlaceholders)
      setWarnings(cleaned.warnings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca file')
    }
  }

  const handleSuggest = async () => {
    if (!ai.credentials) {
      setError('AI belum dikonfigurasi. Aktifkan AI di Pengaturan dulu.')
      return
    }
    const cleaned = normalizeText(text.trim())
    const sanitized = sanitizeText(cleaned)
    if (sanitized.length < 30) {
      setError('Teks template terlalu pendek. Upload docx atau paste teks ≥30 karakter.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const userPrompt = buildUserPrompt(validTokens, sanitized, existingClassification.recognized, existingClassification.unknown)

      // Try with json_object response_format first.
      const baseRequest = {
        messages: [
          { role: 'system' as const, content: TEMPLATE_SUGGEST_SYSTEM_PROMPT },
          { role: 'user' as const, content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 6000,
      }

      let resp = await chatCompletion(ai.credentials, {
        ...baseRequest,
        jsonObjectMode: true,
      })
      let raw = resp.message.content || ''

      if (!raw.trim()) {
        console.warn('[TemplateSuggester] empty response with json_object mode, retrying without it')
        resp = await chatCompletion(ai.credentials, baseRequest)
        raw = resp.message.content || ''
      }

      if (!raw.trim()) {
        console.error('[TemplateSuggester] AI returned empty content twice', {
          finishReason: resp.finishReason,
          usage: resp.usage,
        })
        setError(
          `AI tidak menghasilkan output. Finish reason: ${resp.finishReason}. ` +
          'Coba ganti model di Pengaturan AI atau pakai template yang lebih pendek.',
        )
        return
      }

      const parsed = parseSuggestionJson(raw)
      if (!parsed) {
        console.error('[TemplateSuggester] AI response is not valid JSON', {
          rawSample: raw.slice(0, 500),
          rawLength: raw.length,
          finishReason: resp.finishReason,
        })
        setError(
          resp.finishReason === 'length'
            ? 'Output AI terpotong (max_tokens habis). Coba template yang lebih pendek atau model dengan output token lebih besar.'
            : 'Respons AI bukan JSON yang valid. Coba ulangi atau ganti model.',
        )
        return
      }
      const filtered = filterRedundantSuggestions(parsed.suggestions, existingClassification)
      // Annotate kategori di client (derived dari token, bukan dari AI output)
      // sehingga AI tidak perlu emit field kategori → token output lebih sedikit.
      const withCategory = filtered.map(annotateCategory)
      setResult({ suggestions: withCategory, notes: parsed.notes })
    } catch (err) {
      console.error('[TemplateSuggester] handleSuggest error', err)
      const message = err instanceof Error ? err.message : String(err)
      setError(message || 'Gagal memanggil AI')
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-5 py-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Sumber template</p>
          <p className="text-xs text-muted-foreground">
            Upload file <span className="font-medium">.docx</span> atau paste teks template surat. Aplikasi otomatis
            membersihkan teks dari styling/whitespace asing sebelum dikirim ke AI.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePickDocx}>
              <Upload className="mr-1 h-3.5 w-3.5" />
              Pilih file DOCX
            </Button>
            {filename && (
              <Badge variant="outline" className="rounded-full">
                <FileText className="mr-1 h-3 w-3" />
                {filename}
              </Badge>
            )}
            {filename && text && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setPreviewOpen((v) => !v)}
              >
                {previewOpen ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                {previewOpen ? 'Sembunyikan teks bersih' : 'Lihat teks bersih'}
              </Button>
            )}
          </div>

          {/* Existing placeholders summary */}
          {existingPlaceholders.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-2.5 text-[11px]">
              <p className="font-medium text-foreground">{existingPlaceholders.length} placeholder sudah ada di template ini.</p>
              {existingClassification.recognized.length > 0 && (
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">{existingClassification.recognized.length} dikenali AISura</span> — tidak akan diduplikasi.
                </p>
              )}
              {existingClassification.unknown.length > 0 && (
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-amber-700 dark:text-amber-300">{existingClassification.unknown.length} format lama</span> — AI akan menyarankan koreksi: {existingClassification.unknown.slice(0, 5).join(', ')}{existingClassification.unknown.length > 5 ? `, +${existingClassification.unknown.length - 5} lainnya` : ''}
                </p>
              )}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-200/70 bg-amber-50/60 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <p className="font-medium">Catatan parsing:</p>
              <ul className="mt-1 list-inside list-disc">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Atau paste teks template surat di sini…"
            className={cn(
              'min-h-32 font-data-number text-xs',
              !previewOpen && filename && 'sr-only',
            )}
          />
          {!previewOpen && filename && (
            <p className="text-[10px] text-muted-foreground">
              Teks dari file <span className="font-medium text-foreground">{filename}</span> sudah di-load (klik "Lihat teks bersih" untuk preview).
            </p>
          )}
        </div>

        <Button size="sm" onClick={handleSuggest} disabled={busy || !text.trim()} className="w-full">
          <Wand2 className={cn('mr-1 h-3.5 w-3.5', busy && 'animate-pulse')} />
          {busy ? 'Menganalisa…' : 'Sarankan Placeholder'}
        </Button>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.notes && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">{result.notes}</div>
            )}
            {result.suggestions.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                AI tidak menemukan kandidat placeholder yang perlu ditambahkan.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{result.suggestions.length} saran:</p>
                {result.suggestions.map((s, i) => (
                  <SuggestionRow
                    key={`${s.suggestedToken}-${i}`}
                    suggestion={s}
                    onCopy={handleCopy}
                    isCopied={copiedToken === s.suggestedToken}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SuggestionRow({
  suggestion,
  onCopy,
  isCopied,
}: {
  suggestion: Suggestion
  onCopy: (token: string) => void
  isCopied: boolean
}) {
  const tone = categoryTone(suggestion.category)
  return (
    <div className={cn('rounded-xl border p-3 text-xs', tone.frame)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn('rounded-full font-data-number', tone.badge)}>{suggestion.suggestedToken}</Badge>
          <Badge variant="outline" className="rounded-full">{suggestion.category}</Badge>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onCopy(suggestion.suggestedToken)} title="Salin">
          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <p className="mt-2 text-foreground/90">
        Ganti: <span className="font-medium">"{suggestion.originalText}"</span>
      </p>
      <p className="mt-1 text-muted-foreground">{suggestion.reason}</p>
    </div>
  )
}

function categoryTone(c: Suggestion['category']) {
  switch (c) {
    case 'warga':
      return { frame: 'border-blue-200/70 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20', badge: 'bg-blue-600/10 text-blue-700 dark:text-blue-300' }
    case 'perangkat_desa':
      return { frame: 'border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20', badge: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300' }
    case 'desa':
      return { frame: 'border-amber-200/70 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20', badge: 'bg-amber-600/10 text-amber-700 dark:text-amber-300' }
    case 'nomor_surat':
      return { frame: 'border-violet-200/70 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/20', badge: 'bg-violet-600/10 text-violet-700 dark:text-violet-300' }
    default:
      return { frame: 'border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40', badge: 'bg-slate-600/10 text-slate-700 dark:text-slate-300' }
  }
}

function buildValidTokenList(): string[] {
  const tokens = new Set<string>()
  for (const f of WARGA_FIELDS) {
    tokens.add(`{W1_${f}}`)
    tokens.add(`{W2_${f}}`)
  }
  for (const f of PERANGKAT_DESA_FIELDS) {
    tokens.add(`{PD1_${f}}`)
    tokens.add(`{PD2_${f}}`)
  }
  for (const t of Object.keys(PERANGKAT_DESA_ALIASES)) tokens.add(`{${t}}`)
  for (const t of DESA_TOKENS) tokens.add(`{${t}}`)
  for (const f of NOMOR_SURAT_FIELDS) tokens.add(`{${f}}`)
  tokens.add('{NOMOR_SURAT}')
  return Array.from(tokens).sort()
}

function buildUserPrompt(
  validTokens: string[],
  templateText: string,
  recognized: string[],
  unknown: string[],
): string {
  const parts = [
    'Analisa template berikut dan kembalikan JSON saran placeholder.',
    `VALID_TOKENS: ${validTokens.join(', ')}`,
  ]
  if (recognized.length > 0) {
    parts.push(`SUDAH ADA (skip): ${recognized.join(', ')}`)
  }
  if (unknown.length > 0) {
    parts.push(`KOREKSI (format lama, sarankan ke VALID_TOKENS yang setara): ${unknown.join(', ')}`)
  }
  parts.push(`TEMPLATE:\n"""\n${templateText}\n"""`)
  parts.push('Output: hanya JSON object {"suggestions":[...],"notes":"..."}.')
  return parts.join('\n\n')
}

/**
 * Derive kategori dari token (bukan dari AI output) sehingga AI tidak perlu
 * emit field kategori → menghemat output tokens.
 */
function annotateCategory(s: RawSuggestion): Suggestion {
  const inner = s.suggestedToken.replace(/^\{|\}$/g, '').replace(/_(U|L|P)$/, '')
  let category: Suggestion['category'] = 'custom'
  if (/^W\d+_/.test(inner)) category = 'warga'
  else if (/^PD\d+_/.test(inner) || inner in PERANGKAT_DESA_ALIASES) category = 'perangkat_desa'
  else if (DESA_TOKENS.includes(inner)) category = 'desa'
  else if (/^N\d+_/.test(inner) || inner === 'NOMOR_SURAT' || NOMOR_SURAT_FIELDS.includes(inner as never)) category = 'nomor_surat'
  return { ...s, category }
}

function filterRedundantSuggestions(
  suggestions: RawSuggestion[],
  classification: { recognized: string[]; unknown: string[] },
): RawSuggestion[] {
  const recognizedBase = new Set<string>()
  for (const tok of classification.recognized) {
    recognizedBase.add(tok)
    recognizedBase.add(tok.replace(/_(U|L|P)\}$/, '}'))
  }
  return suggestions.filter((s) => {
    const tokBase = s.suggestedToken.replace(/_(U|L|P)\}$/, '}')
    if (recognizedBase.has(s.suggestedToken)) return false
    if (recognizedBase.has(tokBase)) {
      const refersToUnknown = classification.unknown.some((u) => s.originalText.includes(u))
      return refersToUnknown
    }
    return true
  })
}

interface RawSuggestionResult {
  suggestions: RawSuggestion[]
  notes?: string
}

/**
 * Parse JSON from AI output. Tolerant of:
 *   - Pure JSON
 *   - JSON wrapped in markdown ```json ... ``` fence
 *   - JSON preceded/followed by free-form text
 *   - Partial JSON (truncated by max_tokens) — recover the complete
 *     `suggestions` array entries that were finished before the cut.
 */
function parseSuggestionJson(text: string): RawSuggestionResult | null {
  const cleaned = text.trim()
  if (!cleaned) return null

  // Strip markdown code fence kalau ada.
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenceMatch ? fenceMatch[1].trim() : cleaned

  // Direct parse first.
  const direct = tryParse(candidate)
  if (direct) return direct

  // Find first {...} block (greedy from first {) and try parse.
  const firstBrace = candidate.indexOf('{')
  if (firstBrace === -1) return null
  const candidateFromBrace = candidate.slice(firstBrace)

  const fromBrace = tryParse(candidateFromBrace)
  if (fromBrace) return fromBrace

  // Last resort: partial recovery. Output mungkin terpotong di tengah
  // suggestions array karena max_tokens. Cari array suggestions yang complete.
  return recoverPartialJson(candidateFromBrace)
}

function tryParse(s: string): RawSuggestionResult | null {
  try {
    const obj = JSON.parse(s) as { suggestions?: unknown; notes?: unknown }
    if (!obj || typeof obj !== 'object') return null
    const arr = Array.isArray(obj.suggestions) ? obj.suggestions : []
    const filtered: RawSuggestion[] = []
    for (const item of arr) {
      const sug = coerceSuggestion(item)
      if (sug) filtered.push(sug)
    }
    return {
      suggestions: filtered,
      notes: typeof obj.notes === 'string' ? obj.notes : undefined,
    }
  } catch {
    return null
  }
}

function coerceSuggestion(item: unknown): RawSuggestion | null {
  if (!item || typeof item !== 'object') return null
  const it = item as Record<string, unknown>
  const orig = String(it.originalText ?? '').trim()
  const tok = String(it.suggestedToken ?? '').trim()
  const reason = String(it.reason ?? '').trim()
  if (!orig || !tok) return null
  return {
    originalText: orig,
    suggestedToken: tok.startsWith('{') ? tok : `{${tok}}`,
    reason: reason || '',
  }
}

/**
 * Recover suggestion items from a JSON string that was cut off by
 * max_tokens. Strategy: scan for "suggestions": [ then read complete
 * objects {...} one-by-one, stopping at the first incomplete one.
 */
function recoverPartialJson(text: string): RawSuggestionResult | null {
  const arrayStart = text.indexOf('"suggestions"')
  if (arrayStart === -1) return null
  const bracketStart = text.indexOf('[', arrayStart)
  if (bracketStart === -1) return null

  const items: RawSuggestion[] = []
  let i = bracketStart + 1
  while (i < text.length) {
    // Skip whitespace and commas.
    while (i < text.length && /[\s,]/.test(text[i])) i++
    if (i >= text.length) break
    if (text[i] === ']') break
    if (text[i] !== '{') break
    // Walk forward tracking brace depth + string state to find a balanced {...}.
    const objStart = i
    let depth = 0
    let inString = false
    let escape = false
    let objEnd = -1
    for (let j = i; j < text.length; j++) {
      const ch = text[j]
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) { objEnd = j; break }
      }
    }
    if (objEnd === -1) break // truncated mid-object
    const objStr = text.slice(objStart, objEnd + 1)
    try {
      const item = JSON.parse(objStr)
      const coerced = coerceSuggestion(item)
      if (coerced) items.push(coerced)
    } catch {
      // skip malformed item
    }
    i = objEnd + 1
  }

  if (items.length === 0) return null
  return { suggestions: items, notes: '(Output AI terpotong, hanya saran lengkap yang ditampilkan.)' }
}
