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

    // Load desa data for login display
    loadDesaData()
  }, [])

  const loadDesaData = async () => {
    try {
      const { getDataDesa } = await import('@/services/desaService')
      const desa = await getDataDesa()
      if (desa && desa.desa) setDataDesa(desa)
    } catch { /* ignore - desa data not available yet */ }
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

      {/* Right overlay with gradient */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-[450px] bg-gradient-to-l from-background/95 via-background/90 to-transparent" />

      {/* Form content - positioned on right */}
      <div className="relative z-10 flex min-h-svh items-center justify-end">
        <div className="w-full sm:w-[400px] px-8 sm:px-12 space-y-6">

          {/* Desa identity (shown only if data exists) */}
          {dataDesa && (
            <div className="flex items-center gap-3">
              {dataDesa.logo_desa && (
                <img src={dataDesa.logo_desa} alt="Logo Desa" className="h-12 w-12 object-contain rounded" />
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
          <div>
            <span className="text-4xl font-bold" style={{ fontFamily: "'Unica One', cursive" }}>
              <span className="text-primary">AI</span>
              <span className="text-foreground">Sura</span>
            </span>
            <p className="text-sm text-muted-foreground mt-1">Aplikasi Surat Otomatis Desa</p>
          </div>

          {/* Form */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{isSetup ? 'Buat Password' : 'Selamat Datang'}</h2>
            <p className="text-sm text-muted-foreground">
              {isSetup ? 'Buat password untuk mengamankan aplikasi' : 'Masukkan password untuk melanjutkan'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{isSetup ? 'Password Baru' : 'Password'}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="bg-background/80 backdrop-blur-sm"
              />
            </div>
            {isSetup && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Konfirmasi Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="bg-background/80 backdrop-blur-sm"
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : isSetup ? 'Buat Password' : 'Masuk'}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground">
            EAS Creative Studio • v1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
