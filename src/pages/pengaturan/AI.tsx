import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PasswordInput } from '@/components/password-input'
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Plug,
  KeyRound,
  Globe2,
  Cpu,
  ListRestart,
  Search,
  BookmarkPlus,
  Bookmark,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { crmShell } from '@/lib/aisura-crm-ui'
import {
  AI_PROVIDER_PRESETS,
  getProviderPreset,
  listModels,
  listAIProviderProfiles,
  saveAIProviderProfile,
  deleteAIProviderProfile,
  saveAIConfig,
  testAIConnection,
} from '@/services/ai'
import { useAI } from '@/contexts/AIContext'
import type { AIProviderId, AIProviderProfile } from '@/services/ai'

export function AIPage() {
  const ai = useAI()
  const config = ai.config

  const [enabled, setEnabled] = useState(false)
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

  // Saved provider profiles
  const [profiles, setProfiles] = useState<AIProviderProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [profileLabelInput, setProfileLabelInput] = useState('')
  const [profileDirty, setProfileDirty] = useState<'create' | 'overwrite' | null>(null)

  const reloadProfiles = async () => {
    setProfilesLoading(true)
    try {
      const list = await listAIProviderProfiles()
      setProfiles(list)
    } catch (err) {
      console.error('[AI Settings] failed to load profiles', err)
    } finally {
      setProfilesLoading(false)
    }
  }

  useEffect(() => {
    reloadProfiles()
  }, [])

  useEffect(() => {
    if (!config) return
    setEnabled(config.enabled)
    setProvider(config.provider)
    setBaseUrl(config.base_url)
    setApiKey(config.api_key)
    setModel(config.model)
    setTemperature(config.temperature)
    setAcknowledged(config.privacy_acknowledged)
  }, [config])

  const preset = useMemo(() => getProviderPreset(provider), [provider])

  // Find an exact match between current credentials and a saved profile so
  // we can highlight it without forcing the user to "select" first.
  const matchedProfile = useMemo<AIProviderProfile | null>(() => {
    return (
      profiles.find(
        (p) =>
          p.provider === provider &&
          p.base_url.trim() === baseUrl.trim() &&
          p.api_key.trim() === apiKey.trim() &&
          p.model.trim() === model.trim(),
      ) ?? null
    )
  }, [profiles, provider, baseUrl, apiKey, model])

  // Track if the active profile is "dirty" (current form drifted from saved).
  useEffect(() => {
    if (!activeProfileId) {
      setProfileDirty(null)
      return
    }
    const active = profiles.find((p) => p.id === activeProfileId)
    if (!active) return
    const drifted =
      active.provider !== provider ||
      active.base_url.trim() !== baseUrl.trim() ||
      active.api_key.trim() !== apiKey.trim() ||
      active.model.trim() !== model.trim() ||
      active.temperature !== temperature
    setProfileDirty(drifted ? 'overwrite' : null)
  }, [activeProfileId, profiles, provider, baseUrl, apiKey, model, temperature])

  const handleSelectProvider = (id: string) => {
    const next = id as AIProviderId
    setProvider(next)
    const p = getProviderPreset(next)
    if (!baseUrl || baseUrl !== p.baseUrl) setBaseUrl(p.baseUrl)
    if (!model) setModel(p.defaultModel)
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
      const trimmedBase = (baseUrl || preset.baseUrl).trim()
      const trimmedModel = (model || preset.defaultModel).trim()
      const trimmedKey = apiKey.trim()
      if (!trimmedBase || !trimmedModel) {
        setTestResult({ ok: false, msg: 'Base URL dan model wajib diisi.' })
        return
      }
      if (preset.needsKey && !trimmedKey) {
        setTestResult({ ok: false, msg: `API key wajib untuk provider ${preset.label}.` })
        return
      }
      const result = await testAIConnection({
        baseUrl: trimmedBase,
        apiKey: trimmedKey,
        model: trimmedModel,
        temperature,
      })
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

  // ----- Provider profiles handlers -----

  const handleApplyProfile = (p: AIProviderProfile) => {
    setProvider(p.provider)
    setBaseUrl(p.base_url)
    setApiKey(p.api_key)
    setModel(p.model)
    setTemperature(p.temperature)
    setActiveProfileId(p.id)
    setProfileLabelInput(p.label)
    setProfileDirty(null)
    setTestResult({ ok: true, msg: `Profil "${p.label}" dimuat. Klik "Simpan pengaturan" untuk mengaktifkan.` })
  }

  const handleSaveAsNewProfile = async () => {
    const label = profileLabelInput.trim()
    if (!label) {
      setTestResult({ ok: false, msg: 'Beri label dulu untuk profil yang akan disimpan.' })
      return
    }
    try {
      const saved = await saveAIProviderProfile({
        label,
        provider,
        base_url: baseUrl.trim(),
        api_key: apiKey.trim(),
        model: model.trim(),
        temperature,
      })
      await reloadProfiles()
      setActiveProfileId(saved.id)
      setProfileDirty(null)
      setTestResult({ ok: true, msg: `Profil "${label}" disimpan.` })
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Gagal menyimpan profil' })
    }
  }

  const handleOverwriteProfile = async () => {
    if (!activeProfileId) return
    const label = profileLabelInput.trim() || profiles.find((p) => p.id === activeProfileId)?.label || 'Profil'
    try {
      await saveAIProviderProfile({
        id: activeProfileId,
        label,
        provider,
        base_url: baseUrl.trim(),
        api_key: apiKey.trim(),
        model: model.trim(),
        temperature,
      })
      await reloadProfiles()
      setProfileDirty(null)
      setTestResult({ ok: true, msg: `Profil "${label}" diperbarui.` })
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Gagal memperbarui profil' })
    }
  }

  const handleDeleteProfile = async (p: AIProviderProfile) => {
    if (!confirm(`Hapus profil "${p.label}"? Data kredensial akan hilang dari aplikasi.`)) return
    try {
      await deleteAIProviderProfile(p.id)
      if (activeProfileId === p.id) setActiveProfileId(null)
      await reloadProfiles()
      setTestResult({ ok: true, msg: `Profil "${p.label}" dihapus.` })
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Gagal menghapus profil' })
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
            <p className="text-xs leading-5 text-muted-foreground">
              Untuk memakai fitur ini, isi kredensial provider AI Anda sendiri (mis. Groq, OpenAI, OpenRouter, Ollama lokal,
              dll). AISura tidak menyediakan API key bawaan.
            </p>
            <div className="flex flex-wrap items-center gap-2">
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

      {/* Saved provider profiles */}
      <Card className={crmShell.card}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <Bookmark className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm">Provider Tersimpan</CardTitle>
              <CardDescription>
                Simpan kombinasi provider + API key + model sebagai profil agar bisa berpindah cepat
                tanpa input ulang.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
              {profilesLoading ? 'Memuat profil…' : 'Belum ada profil tersimpan. Isi kredensial di bawah, beri label, lalu klik “Simpan sebagai profil baru”.'}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {profiles.map((p) => {
                const isMatched = matchedProfile?.id === p.id
                const isActive = activeProfileId === p.id
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border p-3 text-xs transition-colors',
                      isMatched
                        ? 'border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30'
                        : 'border-slate-200/80 bg-background dark:border-slate-800',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {p.label}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {getProviderPreset(p.provider).label}
                          {p.model ? ` · ${p.model}` : ''}
                        </p>
                      </div>
                      {isMatched && (
                        <Badge className="rounded-full bg-blue-600/10 text-blue-700 hover:bg-blue-600/10 dark:text-blue-300">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Aktif
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {p.base_url || '(default base URL)'} · key {p.api_key ? `••••${p.api_key.slice(-4)}` : '(kosong)'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant={isActive ? 'secondary' : 'outline'}
                        className="h-7 px-2 text-[11px]"
                        onClick={() => handleApplyProfile(p)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        {isActive ? 'Muat ulang' : 'Pakai'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => {
                          handleApplyProfile(p)
                          setProfileLabelInput(p.label)
                        }}
                        title="Edit label / kredensial"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                        onClick={() => handleDeleteProfile(p)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Save form */}
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Label profil</Label>
                <Input
                  value={profileLabelInput}
                  onChange={(e) => setProfileLabelInput(e.target.value)}
                  placeholder="mis. Groq Pribadi, OpenRouter Kantor"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {activeProfileId && profileDirty === 'overwrite' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOverwriteProfile}
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Update profil aktif
                  </Button>
                )}
                <Button size="sm" onClick={handleSaveAsNewProfile}>
                  <BookmarkPlus className="mr-1 h-3.5 w-3.5" />
                  Simpan sebagai profil baru
                </Button>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Catatan: API key tersimpan di database lokal aplikasi (SQLite) bersama profil.
              Pilih nama label tanpa mengandung kata sandi.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card className={crmShell.card}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm">Kredensial Provider</CardTitle>
              <CardDescription>Pilih provider, isi base URL, model, dan API key Anda.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Label className="text-xs flex items-center gap-1">
                <KeyRound className="h-3 w-3" />API Key {!preset.needsKey && '(opsional)'}
              </Label>
              <PasswordInput
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={preset.needsKey ? 'sk-...' : 'kosongkan kalau tidak butuh'}
              />
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
