import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordInput } from '@/components/password-input'
import { ThemeSwitch } from '@/components/theme-switch'
import { createPassword, verifyPassword } from '@/services/authService'
import { getStoredLoginImage } from '@/services/loginImageService'
import { APP_VERSION } from '@/contexts/UpdateContext'
import { cn } from '@/lib/utils'
import { ShieldCheck, Sparkles } from 'lucide-react'
import type { DataDesa } from '@/types'

interface LoginProps {
  isSetup: boolean
  onSuccess: () => void
}

export function Login({ isSetup, onSuccess }: LoginProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginImage, setLoginImage] = useState(getStoredLoginImage())
  const [dataDesa, setDataDesa] = useState<Partial<DataDesa> | null>(null)

  useEffect(() => {
    setLoginImage(getStoredLoginImage())
    loadDesaData()
  }, [])

  const loadDesaData = async () => {
    try {
      const { getDataDesa } = await import('@/services/desaService')
      const desa = await getDataDesa()
      if (desa && desa.desa) setDataDesa(desa)
    } catch { /* ignore */ }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSetup) {
        if (password.length < 4) { setError('Password minimal 4 karakter'); setLoading(false); return }
        if (password !== confirmPassword) { setError('Password tidak cocok'); setLoading(false); return }
        await createPassword(password, displayName.trim() || undefined)
        onSuccess()
      } else {
        const valid = await verifyPassword(password)
        if (valid) onSuccess()
        else setError('Password salah')
      }
    } catch { setError('Terjadi kesalahan') } finally { setLoading(false) }
  }

  const desaSubtitle = [
    dataDesa?.kecamatan && `Kec. ${dataDesa.kecamatan}`,
    dataDesa?.kabupaten && `Kab. ${dataDesa.kabupaten}`,
  ].filter(Boolean).join(' • ')

  return (
    <div className="relative grid min-h-svh w-full lg:grid-cols-[70fr_30fr]">
      {/* Theme switch - top right corner across entire screen */}
      <div className="absolute right-4 top-4 z-30">
        <ThemeSwitch />
      </div>

      {/* === Brand panel (kiri) === */}
      <div className="relative hidden overflow-hidden bg-slate-100 lg:block dark:bg-slate-950">
        <img
          src={loginImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        {/* Adaptive overlay: white tint in light mode, black tint in dark mode */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/60 to-white/85 dark:from-blue-950/60 dark:via-slate-950/70 dark:to-slate-950/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.18),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.25),_transparent_55%)]" />

        {/* Top-left: brand */}
        <div className="absolute left-8 top-8 flex items-center gap-2 text-slate-900 dark:text-white">
          <span className="text-3xl font-bold leading-none" style={{ fontFamily: "'Unica One', cursive" }}>
            <span className="text-blue-600 dark:text-blue-400">AI</span>
            <span>Sura</span>
          </span>
          <span className="rounded-full border border-slate-900/15 bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider backdrop-blur dark:border-white/20 dark:bg-white/10">
            v{APP_VERSION}
          </span>
        </div>

        {/* Bottom-left: tagline + desa identity card */}
        <div className="absolute inset-x-8 bottom-10 space-y-6 text-slate-900 dark:text-white">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/15 bg-slate-900/5 px-3 py-1 text-xs font-medium backdrop-blur dark:border-white/20 dark:bg-white/10">
              <Sparkles className="h-3.5 w-3.5" />
              Aplikasi Surat Otomatis Desa
            </p>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Operasional surat<br />desa lebih rapi.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-slate-700 dark:text-white/75">
              Kelola template DOCX, data warga, nomor surat otomatis,
              dan riwayat administrasi dalam satu workspace desktop.
            </p>
          </div>

          {dataDesa?.desa && (
            <div className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/70 p-3 pr-5 backdrop-blur-md dark:border-white/15 dark:bg-white/10">
              {dataDesa.logo_desa ? (
                <img src={dataDesa.logo_desa} alt="Logo Desa" className="h-12 w-12 shrink-0 object-contain" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 dark:bg-blue-500/20">
                  <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">Pemerintah Desa {dataDesa.desa}</p>
                {desaSubtitle && (
                  <p className="text-xs text-slate-700/80 dark:text-white/65">{desaSubtitle}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === Form panel (kanan) === */}
      <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-6 py-12 lg:px-10">
        {/* Background texture: subtle dot grid + soft radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.45) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(37,99,235,0.10),_transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_0%,_rgba(37,99,235,0.18),_transparent_60%)]"
        />
        {/* Top + bottom fade so dots don't crowd edges */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"
        />

        {/* Mobile only: small brand on top */}
        <div className="absolute left-6 top-6 z-10 lg:hidden">
          <span className="text-2xl font-bold leading-none" style={{ fontFamily: "'Unica One', cursive" }}>
            <span className="text-blue-600">AI</span>
            <span className="text-foreground">Sura</span>
          </span>
        </div>

        <div className="relative z-10 w-full max-w-sm space-y-6">
          {/* Heading */}
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">
              {isSetup ? 'Buat Password' : 'Selamat Datang'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSetup
                ? 'Atur password untuk mengamankan aplikasi sebelum mulai.'
                : 'Masukkan password untuk masuk.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSetup && (
              <div className="space-y-2">
                <Label htmlFor="display-name">Nama Pengguna <span className="text-muted-foreground">(opsional)</span></Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Admin Desa"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isSetup ? 'Minimal 4 karakter' : 'Masukkan password'}
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                autoFocus
              />
            </div>

            {isSetup && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Konfirmasi Password</Label>
                <PasswordInput
                  id="confirm"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                />
              </div>
            )}

            {!isSetup && (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(Boolean(v))}
                  />
                  Ingat saya
                </label>
                <span className="text-xs text-muted-foreground">Single password</span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className={cn('w-full rounded-xl bg-blue-600 hover:bg-blue-700', loading && 'opacity-90')}
              disabled={loading}
            >
              {loading ? 'Memproses...' : isSetup ? 'Buat Password' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer copyright - bottom right corner */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} EAS Creative Studio
      </div>
    </div>
  )
}
