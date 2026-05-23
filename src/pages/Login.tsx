import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPassword, verifyPassword } from '@/services/authService'
import type { DataDesa } from '@/types'

interface LoginProps {
  isSetup: boolean
  onSuccess: () => void
}

export function Login({ isSetup, onSuccess }: LoginProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginImage, setLoginImage] = useState('/images/login-illustration.png')
  const [dataDesa, setDataDesa] = useState<Partial<DataDesa> | null>(null)

  useEffect(() => {
    const customImage = localStorage.getItem('aisura-login-image')
    if (customImage) setLoginImage(customImage)
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
        await createPassword(password)
        onSuccess()
      } else {
        const valid = await verifyPassword(password)
        if (valid) onSuccess()
        else setError('Password salah')
      }
    } catch { setError('Terjadi kesalahan') } finally { setLoading(false) }
  }

  return (
    <div className="relative min-h-svh w-full overflow-hidden">
      {/* Fullscreen background image */}
      <img
        src={loginImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Right overlay gradient: 90% → 80% → 0%, width 45% */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-[45%] bg-gradient-to-l from-background/90 via-background/80 to-transparent" />

      {/* Form content - positioned on right, shifted closer to right edge */}
      <div className="relative z-10 flex min-h-svh items-center justify-end">
        <div className="w-full sm:w-[35%] px-8 sm:pl-8 sm:pr-0 space-y-6 flex flex-col items-center">

          {/* Desa identity (shown only if data exists) */}
          {dataDesa && (
            <div className="flex flex-col items-center gap-2 text-center">
              {dataDesa.logo_desa && (
                <img src={dataDesa.logo_desa} alt="Logo Desa" className="h-[52px] w-[52px] object-contain" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">Pemerintah Desa {dataDesa.desa}</p>
                <p className="text-xs text-muted-foreground">
                  {[dataDesa.kecamatan && `Kec. ${dataDesa.kecamatan}`, dataDesa.kabupaten && `Kab. ${dataDesa.kabupaten}`].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Logo App */}
          <div className="text-center">
            <span className="text-4xl font-bold" style={{ fontFamily: "'Unica One', cursive" }}>
              <span className="text-blue-600">AI</span>
              <span className="text-black dark:text-white">Sura</span>
            </span>
            <p className="text-sm text-muted-foreground mt-1">Aplikasi Surat Otomatis Desa</p>
          </div>

          {/* Heading */}
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-semibold">{isSetup ? 'Buat Password' : 'Selamat Datang'}</h2>
            <p className="text-sm text-muted-foreground">
              {isSetup ? 'Buat password untuk mengamankan aplikasi' : 'Masukkan password untuk melanjutkan'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-xs">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="bg-background/80 backdrop-blur-sm text-center pr-20"
                />
                <Label htmlFor="password" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {isSetup ? 'Password' : 'Password'}
                </Label>
              </div>
            </div>
            {isSetup && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    className="bg-background/80 backdrop-blur-sm text-center pr-24"
                  />
                  <Label htmlFor="confirm" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    Konfirmasi
                  </Label>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : isSetup ? 'Buat Password' : 'Masuk'}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground text-center">
            EAS Creative Studio • v1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
