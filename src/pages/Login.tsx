import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPassword, verifyPassword } from '@/services/authService'

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

  useEffect(() => {
    const customImage = localStorage.getItem('aisura-login-image')
    if (customImage) setLoginImage(customImage)
  }, [])

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

      {/* Left overlay with gradient */}
      <div className="absolute inset-y-0 left-0 w-full sm:w-[420px] bg-gradient-to-r from-background/95 via-background/85 to-transparent" />

      {/* Form content - positioned on left */}
      <div className="relative z-10 flex min-h-svh items-center px-8 sm:px-12 max-w-[400px]">
        <div className="w-full space-y-6">
          {/* Logo */}
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
