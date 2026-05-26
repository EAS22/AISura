import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PasswordInput } from '@/components/password-input'
import { Sparkles, ShieldCheck, ShieldAlert, RefreshCw, Plug, KeyRound, Globe2, Cpu, ListRestart, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { crmShell } from '@/lib/aisura-crm-ui'
import {
  AI_PROVIDER_PRESETS,
  getProviderPreset,
  hasDefaultKey,
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  listModels,
  resolveCredentials,
  saveAIConfig,
  testAIConnection,
} from '@/services/ai'
import { useAI } from '@/contexts/AIContext'
import type { AIProviderId } from '@/services/ai'

export function AIPage() {
  const ai = useAI()
  const config = ai.config

  const [enabled, setEnabled] = useState(false)
  const [useDefault, setUseDefault] = useState(true)
  const [provider, setProvider] = useState<AIProviderId>('groq')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [temperature, setTemperature] = useState(0.3)
  const [acknowledged, setAcknowledged] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null)
  const [modelSearch, setModelSearch] = useState('')
  const [modelPickerOpen, setModelPickerOpen] = useState(false)

  useEffect(() => {
    if (!config) return
    setEnabled(config.enabled)
    setUseDefault(config.use_default)
    setProvider(config.provider)
    setBaseUrl(config.base_url)
    setApiKey(config.api_key)
    setModel(config.model)
    setTemperature(config.temperature)
    setAcknowledged(config.privacy_acknowledged)
  }, [config])

  const preset = useMemo(() => getProviderPreset(provider), [provider])
  const defaultAvailable = hasDefaultKey()

  const handleSelectProvider = (id: string) => {
    const next = id as AIProviderId
    setProvider(next)
    const p = getProviderPreset(next)
    if (!baseUrl || baseUrl !== p.baseUrl) setBaseUrl(p.baseUrl)
    if (!model) setModel(p.defaultModel)
    // Reset fetched model list since provider berubah
    setFetchedModels([])
    setFetchModelsError(null)
  }

  const handleFetchModels = async () => {
    setFetchingModels(true)
    setFetchModelsError(null)
    setFetchedModels([])
    try {
      const url = (baseUrl || preset.baseUrl).trim()
      if (!url) {
        setFetchModelsError('Base URL kosong')
        return
      }
      const models = await listModels(url, apiKey)
      if (models.length === 0) {
        setFetchModelsError('Provider tidak mengembalikan daftar model.')
        return
      }
      setFetchedModels(models)
      setModelPickerOpen(true)
    } catch (err) {
      setFetchModelsError(err instanceof Error ? err.message : 'Gagal fetch model')
    } finally {
      setFetchingModels(false)
    }
  }

  const filteredFetchedModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase()
    if (!q) return fetchedModels
    return fetchedModels.filter((m) => m.toLowerCase().includes(q))
  }, [fetchedModels, modelSearch])

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const probe = useDefault
        ? defaultAvailable
          ? {
              baseUrl: DEFAULT_AI_BASE_URL,
              model: DEFAULT_AI_MODEL,
              apiKey: '__use_default__', // placeholder; actual key resolved internally below
              temperature,
              isDefault: true as const,
            }
          : null
        : {
            baseUrl: (baseUrl || preset.baseUrl).trim(),
            model: (model || preset.defaultModel).trim(),
            apiKey: apiKey.trim(),
            temperature,
            isDefault: false as const,
          }
      if (!probe) {
        setTestResult({ ok: false, msg: 'Default key tidak tersedia di build ini.' })
        return
      }
      // For default mode we resolve via the existing config so the real default key is used.
      const creds = useDefault
        ? resolveCredentials({
            ...(config ?? {
              id: '',
              enabled: true,
              use_default: true,
              provider: 'groq',
              base_url: '',
              api_key: '',
              model: '',
              temperature,
              privacy_acknowledged: true,
              created_at: '',
              updated_at: '',
            }),
            enabled: true,
            use_default: true,
            temperature,
          })
        : probe
      if (!creds) {
        setTestResult({ ok: false, msg: 'Konfigurasi belum lengkap untuk testing.' })
        return
      }
      const result = await testAIConnection(creds)
      if (result.ok) setTestResult({ ok: true, msg: `Tersambung. Sample: "${result.sample}"` })
      else setTestResult({ ok: false, msg: result.error })
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Gagal mengetes' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAIConfig({
        enabled,
        use_default: useDefault,
        provider,
        base_url: baseUrl,
        api_key: apiKey,
        model,
        temperature,
        privacy_acknowledged: acknowledged,
      })
      await ai.reload()
      setTestResult({ ok: true, msg: 'Pengaturan AI tersimpan.' })
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Gagal menyimpan' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={crmShell.page}>
      <div>
        <p className={crmShell.eyebrow}>AI assistant</p>
        <h1 className={crmShell.title}>Pengaturan AI</h1>
        <p className={crmShell.subtitle}>
          Aktifkan asisten AI untuk membantu rekomendasi placeholder template dan pembuatan surat via chat.
        </p>
      </div>

      {/* Hero panel */}
      <Card className={cn(crmShell.panel, 'overflow-hidden')}>
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">AISura AI</p>
                <h2 className="text-lg font-semibold">Asisten administrasi desa</h2>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              AI bantu kerja di dua hal: <span className="font-medium text-foreground">menyarankan placeholder</span> saat upload
              template, dan <span className="font-medium text-foreground">membuat surat via chat</span> dengan panduan
              langkah-demi-langkah. AI tidak bisa mengubah data warga atau template, hanya membaca lewat tool yang sudah dibatasi.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full">{defaultAvailable ? 'Default key aktif' : 'Default key tidak ter-embed'}</Badge>
              <Badge variant="outline" className="rounded-full">{enabled ? 'Aktif' : 'Nonaktif'}</Badge>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-200/70 bg-white/75 p-4 dark:border-blue-900/50 dark:bg-zinc-950/55">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="ai-enabled" className="text-sm font-semibold">Aktifkan fitur AI</Label>
                <p className="text-xs text-muted-foreground">
                  {acknowledged
                    ? 'Drawer AI akan muncul di header.'
                    : 'Centang persetujuan privasi di bawah dulu.'}
                </p>
              </div>
              <Switch
                id="ai-enabled"
                checked={enabled}
                onCheckedChange={(v) => {
                  if (v && !acknowledged) {
                    setTestResult({ ok: false, msg: 'Centang dulu persetujuan privasi data warga.' })
                    return
                  }
                  setEnabled(v)
                }}
                disabled={!acknowledged}
              />
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Privasi data warga (wajib)</p>
                <p className="text-[11px] leading-snug text-amber-700/90 dark:text-amber-200/80">
                  Data dasar warga (nama dimask, NIK dipotong, alamat dipersingkat) dikirim ke provider AI hanya saat
                  user memilih warga. NIK lengkap baru dikirim setelah Anda menekan konfirmasi pilihan.
                </p>
                <label className="mt-1 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-200">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-amber-400"
                    checked={acknowledged}
                    onChange={(e) => {
                      const v = e.target.checked
                      setAcknowledged(v)
                      // Saat user uncheck persetujuan, paksa nonaktifkan toggle juga
                      if (!v && enabled) setEnabled(false)
                    }}
                  />
                  Saya paham dan setuju.
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source toggle */}
      <Card className={crmShell.card}>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm">Sumber kredensial</CardTitle>
                <CardDescription>Pilih default bawaan AISura atau API key Anda sendiri.</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="ai-default" className="text-xs text-muted-foreground">Pakai default</Label>
              <Switch id="ai-default" checked={useDefault} onCheckedChange={setUseDefault} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {useDefault ? (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <p className="font-medium">Provider: Groq (free tier)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Model <span className="font-data-number">{DEFAULT_AI_MODEL}</span>. Endpoint{' '}
                <span className="font-data-number">{DEFAULT_AI_BASE_URL}</span>.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Jika rate limit, matikan toggle ini lalu pakai API key sendiri (gratis tier juga tersedia di banyak provider).
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Provider</Label>
                <Select value={provider} onValueChange={handleSelectProvider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDER_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-medium">{p.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs flex items-center gap-1"><Globe2 className="h-3 w-3" />Base URL</Label>
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={preset.baseUrl} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Model</Label>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={fetchingModels || !baseUrl.trim()}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:underline disabled:opacity-50"
                  >
                    <ListRestart className={cn('h-3 w-3', fetchingModels && 'animate-spin')} />
                    {fetchingModels ? 'Fetching…' : 'Fetch dari provider'}
                  </button>
                </div>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={preset.defaultModel}
                  list={preset.suggestedModels.length > 0 ? 'ai-suggested-models' : undefined}
                />
                {preset.suggestedModels.length > 0 && fetchedModels.length === 0 && (
                  <datalist id="ai-suggested-models">
                    {preset.suggestedModels.map((m) => <option key={m} value={m} />)}
                  </datalist>
                )}
                {fetchModelsError && (
                  <p className="text-[10px] text-destructive">{fetchModelsError}</p>
                )}
                {fetchedModels.length > 0 && (
                  <div className="rounded-md border bg-background">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted/30"
                      onClick={() => setModelPickerOpen((v) => !v)}
                    >
                      <span>{fetchedModels.length} model tersedia dari provider</span>
                      <span>{modelPickerOpen ? '▲' : '▼'}</span>
                    </button>
                    {modelPickerOpen && (
                      <div className="border-t">
                        <div className="relative px-2 py-1.5">
                          <Search className="absolute left-3.5 top-3 h-3 w-3 text-muted-foreground" />
                          <Input
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            placeholder="Cari model..."
                            className="h-7 pl-6 text-[11px]"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto border-t">
                          {filteredFetchedModels.length === 0 ? (
                            <p className="px-2 py-2 text-[10px] text-muted-foreground">Tidak ada model cocok.</p>
                          ) : (
                            filteredFetchedModels.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setModel(m)
                                  setModelPickerOpen(false)
                                  setModelSearch('')
                                }}
                                className={cn(
                                  'block w-full truncate px-2 py-1.5 text-left text-[11px] hover:bg-blue-50 dark:hover:bg-blue-950/30',
                                  m === model && 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
                                )}
                              >
                                {m}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><KeyRound className="h-3 w-3" />API Key {!preset.needsKey && '(opsional)'}</Label>
                <PasswordInput value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={preset.needsKey ? 'sk-...' : 'kosongkan kalau tidak butuh'} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Temperature ({temperature.toFixed(2)})</Label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <p className="text-[10px] text-muted-foreground">
                  Nilai rendah = jawaban lebih konsisten dan teliti. Default 0.3.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleTest} disabled={testing}>
              <Plug className="mr-1 h-3.5 w-3.5" />
              {testing ? 'Mengetes...' : 'Test koneksi'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <RefreshCw className={cn('mr-1 h-3.5 w-3.5', saving && 'animate-spin')} />
              {saving ? 'Menyimpan...' : 'Simpan pengaturan'}
            </Button>
            {testResult && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs',
                  testResult.ok
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-destructive/10 text-destructive',
                )}
              >
                {testResult.ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                {testResult.msg}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
