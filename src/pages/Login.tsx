import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    // Check if custom login image exists in localStorage
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
    <div className="flex min-h-svh">
      {/* Left column - Illustration */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-muted/30 p-8">
        <img
          src={loginImage}
          alt="Ilustrasi"
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
      </div>

      {/* Right column - Form */}
      <div className="flex flex-1 lg:max-w-md items-center justify-center p-6">
        <Card className="w-full max-w-sm border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="text-center">
            <div className="mb-2">
              <span className="text-3xl font-bold" style={{ fontFamily: "'Unica One', cursive" }}>
                <span className="text-primary">AI</span>
                <span className="text-foreground">Sura</span>
              </span>
            </div>
            <CardTitle>{isSetup ? 'Buat Password' : 'Login'}</CardTitle>
            <CardDescription>
              {isSetup ? 'Buat password untuk mengamankan aplikasi' : 'Masukkan password untuk melanjutkan'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{isSetup ? 'Password Baru' : 'Password'}</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" />
              </div>
              {isSetup && (
                <div className="space-y-2">
                  <Label htmlFor="confirm">Konfirmasi Password</Label>
                  <Input id="confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password" />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : isSetup ? 'Buat Password' : 'Masuk'}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground text-center mt-6">
              Aplikasi Surat Otomatis Desa<br />EAS Creative Studio • v1.0.0
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
