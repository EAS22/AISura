import { useMemo, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Wand2,
  FileText,
  Copy,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  StopCircle,
  ClipboardCopy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAI } from '@/contexts/AIContext'
import { TEMPLATE_SUGGEST_SYSTEM_PROMPT, sanitizeText, streamChatCompletion } from '@/services/ai'
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
}

interface Suggestion extends RawSuggestion {
  category: 'warga' | 'perangkat_desa' | 'desa' | 'nomor_surat' | 'custom'
}

interface SuggestionResult {
  suggestions: Suggestion[]
}

const MAX_SUGGESTIONS = 8

export function TemplateSuggesterPanel() {
  const ai = useAI()
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [result, setResult] = useState<SuggestionResult | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [existingPlaceholders, setExistingPlaceholders] = useState<string[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  // Streaming progress (chars received) + elapsed seconds.
  const [progressBytes, setProgressBytes] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

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

  const handleAbort = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
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
    setProgressBytes(0)
    setElapsedSec(0)

    const controller = new AbortController()
    abortRef.current = controller
    const startedAt = Date.now()
    const elapsedTimer = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000))
    }, 250)

    try {
      const userPrompt = buildUserPrompt(
        validTokens,
        sanitized,
        existingClassification.recognized,
        existingClassification.unknown,
      )

      // Line-based output is much shorter than JSON: ~30 char × 8 saran ≈ 240
      // chars ≈ 80 tokens. Start with a tight budget; escalate only if empty.
      const baseRequest = {
        messages: [
          { role: 'system' as const, content: TEMPLATE_SUGGEST_SYSTEM_PROMPT },
          { role: 'user' as const, content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }

      const onDelta = (chunk: string) => {
        setProgressBytes((prev) => prev + chunk.length)
      }

      let resp = await streamChatCompletion(
        ai.credentials,
        { ...baseRequest, tools: undefined },
        onDelta,
        controller.signal,
      )
      let raw = resp.message.content || ''

      // If empty, retry once with bigger budget (some models occasionally
      // emit empty content even though they had room).
      if (!raw.trim()) {
        console.warn('[TemplateSuggester] empty stream output, retrying with bigger budget')
        setProgressBytes(0)
        resp = await streamChatCompletion(
          ai.credentials,
          { ...baseRequest, max_tokens: 2500 },
          onDelta,
          controller.signal,
        )
        raw = resp.message.content || ''
      }

      if (!raw.trim()) {
        console.error('[TemplateSuggester] AI returned empty content', {
          finishReason: resp.finishReason,
          usage: resp.usage,
        })
        setError(
          `AI tidak menghasilkan output. Finish reason: ${resp.finishReason}. ` +
            'Coba ganti model di Pengaturan AI atau pakai template yang lebih pendek.',
        )
        return
      }

      const parsed = parseLineBasedSuggestions(raw, validTokens)
      if (parsed.length === 0) {
        console.error('[TemplateSuggester] no valid line-based suggestions parsed', {
          rawSample: raw.slice(0, 500),
          rawLength: raw.length,
          finishReason: resp.finishReason,
        })
        setError(
          'AI tidak mengembalikan saran dengan format yang dikenali. Coba ulangi atau ganti model.',
        )
        return
      }

      const filtered = filterRedundantSuggestions(parsed, existingClassification).slice(
        0,
        MAX_SUGGESTIONS,
      )
      const withCategory = filtered.map(annotateCategory)
      setResult({ suggestions: withCategory })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.info('[TemplateSuggester] aborted by user')
        setError('Dibatalkan oleh user.')
        return
      }
      console.error('[TemplateSuggester] handleSuggest error', err)
      const message = err instanceof Error ? err.message : String(err)
      setError(message || 'Gagal memanggil AI')
    } finally {
      clearInterval(elapsedTimer)
      abortRef.current = null
      setBusy(false)
    }
  }

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 1500)
    } catch {
      /* ignore */
    }
  }

  const handleCopyAll = async () => {
    if (!result) return
    const blob = result.suggestions
      .map((s) => `${s.originalText} => ${s.suggestedToken}`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(blob)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 1800)
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

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSuggest} disabled={busy || !text.trim()} className="flex-1">
            <Wand2 className={cn('mr-1 h-3.5 w-3.5', busy && 'animate-pulse')} />
            {busy
              ? `Menganalisa… ${progressBytes > 0 ? `${progressBytes} char · ` : ''}${elapsedSec}s`
              : 'Sarankan Placeholder'}
          </Button>
          {busy && (
            <Button size="sm" variant="outline" onClick={handleAbort} title="Batalkan">
              <StopCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.suggestions.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                AI tidak menemukan kandidat placeholder yang perlu ditambahkan.
              </div>
            ) : (
              <>
                {/* Code block + Copy semua */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {result.suggestions.length} saran (klik "Copy semua" untuk paste ke template):
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyAll}
                      className="h-7 px-2 text-xs"
                    >
                      {copiedAll ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
                          Copy semua
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 font-data-number text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                    {result.suggestions
                      .map((s) => `${s.originalText} => ${s.suggestedToken}`)
                      .join('\n')}
                  </pre>
                </div>

                {/* Structured list with category badges, supports per-token copy */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Detail per saran:</p>
                  {result.suggestions.map((s, i) => (
                    <SuggestionRow
                      key={`${s.suggestedToken}-${i}`}
                      suggestion={s}
                      onCopy={handleCopyToken}
                      isCopied={copiedToken === s.suggestedToken}
                    />
                  ))}
                </div>
              </>
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
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => onCopy(suggestion.suggestedToken)}
          title="Salin token"
        >
          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <p className="mt-2 text-foreground/90">
        Ganti: <span className="font-medium">"{suggestion.originalText}"</span>
      </p>
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
    'Analisa template berikut dan kembalikan saran placeholder dalam format <text> => {TOKEN}, satu saran per baris, maksimal 8 baris.',
    `VALID_TOKENS: ${validTokens.join(', ')}`,
  ]
  if (recognized.length > 0) {
    parts.push(`SUDAH_ADA (skip): ${recognized.join(', ')}`)
  }
  if (unknown.length > 0) {
    parts.push(`KOREKSI (format lama, sarankan ke VALID_TOKENS yang setara): ${unknown.join(', ')}`)
  }
  parts.push(`TEMPLATE:\n"""\n${templateText}\n"""`)
  parts.push('Output: hanya baris-baris <text> => {TOKEN}. JANGAN tulis JSON, markdown, atau penjelasan.')
  return parts.join('\n\n')
}

/**
 * Parse line-based AI output. Each valid line follows:
 *   <original text> => {TOKEN}
 *
 * Tolerant of:
 *   - leading list bullets (-, *, 1., 1))
 *   - leading "•"
 *   - markdown wrappers (```...``` fence) — strip and process inside
 *   - extra commentary lines (skipped silently)
 *   - quoted original text ("AAD HENRAYANA" => {W1_NAMA})
 *   - tokens without curly braces (W1_NAMA → wrapped to {W1_NAMA})
 */
function parseLineBasedSuggestions(raw: string, validTokens: string[]): RawSuggestion[] {
  // Strip code fences if any.
  const stripped = raw.replace(/```(?:[a-zA-Z]+)?\s*/g, '').replace(/```/g, '')

  const validSet = new Set(validTokens)
  // Match "<text> => {TOKEN}" with optional braces and modifier suffix.
  // Also accept "→" or "->" as separators (some models prefer those).
  const lineRe = /^(.+?)\s*(?:=>|->|→)\s*\{?([A-Z][A-Z0-9_]*)\}?\s*$/

  const out: RawSuggestion[] = []
  const seen = new Set<string>()

  for (const rawLine of stripped.split(/\r?\n/)) {
    // Strip leading bullets/numbering and surrounding quotes.
    const line = rawLine
      .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')
      .trim()
    if (!line) continue

    const m = line.match(lineRe)
    if (!m) continue

    let originalText = m[1].trim()
    // Strip surrounding quotes if any.
    originalText = originalText.replace(/^["'`]+|["'`]+$/g, '').trim()
    if (!originalText) continue
    // Cap originalText length (defensive — models sometimes emit long stuff).
    if (originalText.length > 120) originalText = originalText.slice(0, 120)

    const inner = m[2].trim()
    const candidate = `{${inner}}`
    // Validate: must match a known VALID_TOKEN, optionally with _U/_L/_P suffix.
    const baseCandidate = candidate.replace(/_(U|L|P)\}$/, '}')
    if (!validSet.has(candidate) && !validSet.has(baseCandidate)) continue

    const dedupeKey = `${originalText.toLowerCase()}::${candidate}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    out.push({ originalText, suggestedToken: candidate })
  }
  return out
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
