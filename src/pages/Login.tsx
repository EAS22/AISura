import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { createPassword, verifyPassword } from '../services/authService';

interface LoginProps {
  isSetup: boolean;
  onSuccess: () => void;
}

export function Login({ isSetup, onSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSetup) {
        if (password.length < 4) {
          setError('Password minimal 4 karakter');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Password tidak cocok');
          setLoading(false);
          return;
        }
        await createPassword(password);
        onSuccess();
      } else {
        const valid = await verifyPassword(password);
        if (valid) {
          onSuccess();
        } else {
          setError('Password salah');
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-secondary)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 shadow-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-center mb-6"
          >
            <h1 className="text-3xl" style={{ fontFamily: "'Unica One', cursive" }}>
              <span className="text-[var(--color-accent)]">AI</span>
              <span className="text-[var(--color-text-primary)]">Sura</span>
            </h1>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Aplikasi Surat Otomatis Desa</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <TextField
              label={isSetup ? 'Buat Password' : 'Password'}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Masukkan password"
            />

            {isSetup && (
              <TextField
                label="Konfirmasi Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Ulangi password"
              />
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <Button type="submit" className="w-full" isDisabled={loading}>
              {loading ? 'Loading...' : isSetup ? 'Buat Password' : 'Masuk'}
            </Button>
          </form>

          <p className="text-[10px] text-[var(--color-text-tertiary)] text-center mt-4">
            EAS Creative Studio • v1.0.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
