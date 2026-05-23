import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { DialogTrigger } from 'react-aria-components';

export function AplikasiPage() {
  const { toast } = useToast();
  const [showResetModal, setShowResetModal] = useState(false);

  const handleBackup = async () => {
    try {
      const { exportBackup } = await import('../../services/backupService');
      const success = await exportBackup();
      if (success) toast('Backup berhasil disimpan', 'success');
    } catch (err) {
      toast('Gagal membuat backup', 'error');
      console.error(err);
    }
  };

  const handleRestore = async () => {
    try {
      const { importBackup } = await import('../../services/backupService');
      const success = await importBackup();
      if (success) {
        toast('Data berhasil di-restore. Restart aplikasi.', 'success');
      }
    } catch (err) {
      toast('Gagal restore data', 'error');
      console.error(err);
    }
  };

  const handleReset = async () => {
    try {
      const { resetAllData } = await import('../../services/backupService');
      await resetAllData();
      setShowResetModal(false);
      toast('Semua data berhasil direset', 'success');
    } catch (err) {
      toast('Gagal reset data', 'error');
      console.error(err);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Aplikasi</h1>

      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Backup & Restore</h2>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
          Export semua data ke file JSON atau restore dari backup sebelumnya.
        </p>
        <div className="flex gap-2">
          <Button onPress={handleBackup} size="sm">Export Backup</Button>
          <Button variant="secondary" onPress={handleRestore} size="sm">Import Backup</Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Reset Data</h2>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
          Hapus semua data (kecuali password). Tindakan ini tidak bisa dibatalkan.
        </p>
        <Button variant="danger" size="sm" onPress={() => setShowResetModal(true)}>
          Reset Semua Data
        </Button>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Informasi</h2>
        <div className="space-y-1 text-xs text-[var(--color-text-secondary)]">
          <p>Versi: <span className="font-medium text-[var(--color-text-primary)]">v1.0.0</span></p>
          <p>Developer: EAS Creative Studio</p>
          <p>Email: dev@eas.biz.id</p>
        </div>
      </Card>

      {showResetModal && (
        <DialogTrigger isOpen={showResetModal} onOpenChange={setShowResetModal}>
          <Modal title="Reset Semua Data?">
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Semua data (warga, template, riwayat, pengaturan) akan dihapus permanen. Password tetap tersimpan.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onPress={() => setShowResetModal(false)}>Batal</Button>
              <Button variant="danger" size="sm" onPress={handleReset}>Ya, Reset</Button>
            </div>
          </Modal>
        </DialogTrigger>
      )}
    </div>
  );
}
