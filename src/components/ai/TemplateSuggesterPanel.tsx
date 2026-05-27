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

interface Suggestion {
  originalText: string
  suggestedToken: string
  category: 'warga' | 'perangkat_desa' | 'desa' | 'nomor_surat' | 'custom'
  reason: string
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
    // Sanitasi terakhir sebelum kirim — text sudah di-normalize saat extract,
    // tapi kalau user paste manual ke textarea kita sanitize lagi.
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

      const resp = await chatCompletion(ai.credentials, {
        messages: [
          { role: 'system', content: TEMPLATE_SUGGEST_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        jsonObjectMode: true,
        temperature: 0.2,
        max_tokens: 1500,
      })
      const raw = resp.message.content || ''
      const parsed = parseSuggestionJson(raw)
      if (!parsed) {
        console.error('[TemplateSuggester] AI response is not valid JSON', { raw })
        setError('Respons AI bukan JSON yang valid. Coba ulangi atau ganti model.')
        return
      }
      // Filter saran yang token-nya sudah ada di template (kecuali untuk
      // saran koreksi terhadap unknown placeholder).
      const filtered = filterRedundantSuggestions(parsed.suggestions, existingClassification)
      setResult({ suggestions: filtered, notes: parsed.notes })
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
  const parts = [`VALID_TOKENS:\n${JSON.stringify(validTokens)}`]
  if (recognized.length > 0) {
    parts.push(`EXISTING_PLACEHOLDERS_OK (sudah dikenali, JANGAN duplikasi):\n${JSON.stringify(recognized)}`)
  }
  if (unknown.length > 0) {
    parts.push(
      `EXISTING_PLACEHOLDERS_UNKNOWN (format tidak dikenal, sarankan koreksi ke VALID_TOKENS yang sesuai):\n${JSON.stringify(unknown)}`,
    )
  }
  parts.push(`TEMPLATE_TEXT (sudah dibersihkan dari styling, NIK di-mask):\n"""\n${templateText}\n"""`)
  parts.push('Kembalikan JSON sesuai schema. Maksimal 30 saran. Hindari saran yang akan menduplikasi EXISTING_PLACEHOLDERS_OK.')
  return parts.join('\n\n')
}

function filterRedundantSuggestions(
  suggestions: Suggestion[],
  classification: { recognized: string[]; unknown: string[] },
): Suggestion[] {
  const recognizedBase = new Set<string>()
  for (const tok of classification.recognized) {
    // store both with and without modifier suffix for matching
    recognizedBase.add(tok)
    recognizedBase.add(tok.replace(/_(U|L|P)\}$/, '}'))
  }
  return suggestions.filter((s) => {
    const tokBase = s.suggestedToken.replace(/_(U|L|P)\}$/, '}')
    if (recognizedBase.has(s.suggestedToken)) return false
    if (recognizedBase.has(tokBase)) {
      // Allowed only if originalText explicitly references one of the unknown tokens
      // (i.e. AI is mapping a legacy {NAMA_WARGA} → {W1_NAMA}).
      const refersToUnknown = classification.unknown.some((u) => s.originalText.includes(u))
      return refersToUnknown
    }
    return true
  })
}

function parseSuggestionJson(text: string): SuggestionResult | null {
  // Try direct parse
  const tryParse = (s: string): SuggestionResult | null => {
    try {
      const obj = JSON.parse(s) as { suggestions?: unknown; notes?: unknown }
      if (!obj || typeof obj !== 'object') return null
      const arr = Array.isArray(obj.suggestions) ? obj.suggestions : []
      const filtered: Suggestion[] = []
      for (const item of arr) {
        if (!item || typeof item !== 'object') continue
        const it = item as Record<string, unknown>
        const orig = String(it.originalText ?? '').trim()
        const tok = String(it.suggestedToken ?? '').trim()
        const reason = String(it.reason ?? '').trim()
        const cat = String(it.category ?? 'custom').trim()
        if (!orig || !tok) continue
        filtered.push({
          originalText: orig,
          suggestedToken: tok.startsWith('{') ? tok : `{${tok}}`,
          category: (['warga', 'perangkat_desa', 'desa', 'nomor_surat', 'custom'].includes(cat)
            ? (cat as Suggestion['category'])
            : 'custom'),
          reason: reason || '',
        })
      }
      return {
        suggestions: filtered,
        notes: typeof obj.notes === 'string' ? obj.notes : undefined,
      }
    } catch {
      return null
    }
  }

  const direct = tryParse(text)
  if (direct) return direct

  // Try extracting first {...} block
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    return tryParse(match[0])
  }
  return null
}
