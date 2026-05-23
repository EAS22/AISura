import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { changePassword, updateDisplayName } from '../services/authService';

export function Profil() {
  const { displayName, setDisplayName } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(displayName);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveName = async () => {
    try {
      await updateDisplayName(name);
      setDisplayName(name);
      toast('Nama berhasil diubah', 'success');
    } catch {
      toast('Gagal mengubah nama', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) {
      toast('Password minimal 4 karakter', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Password baru tidak cocok', 'error');
      return;
    }
    try {
      const success = await changePassword(oldPassword, newPassword);
      if (success) {
        toast('Password berhasil diubah', 'success');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast('Password lama salah', 'error');
      }
    } catch {
      toast('Gagal mengubah password', 'error');
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Profil</h1>

      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Nama Pengguna</h2>
        <div className="flex gap-2">
          <TextField value={name} onChange={setName} className="flex-1" />
          <Button onPress={handleSaveName} size="sm">Simpan</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Ganti Password</h2>
        <div className="space-y-2">
          <TextField label="Password Lama" type="password" value={oldPassword} onChange={setOldPassword} />
          <TextField label="Password Baru" type="password" value={newPassword} onChange={setNewPassword} />
          <TextField label="Konfirmasi Password Baru" type="password" value={confirmPassword} onChange={setConfirmPassword} />
          <Button onPress={handleChangePassword} size="sm">Ganti Password</Button>
        </div>
      </Card>
    </div>
  );
}
