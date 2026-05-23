import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { getNomorSuratConfig, saveNomorSuratConfig } from '../../services/nomorSuratService';
import { generateNomorSuratParts } from '../../utils/nomorSuratGenerator';

export function NomorSuratPage() {
  const { toast } = useToast();
  const [format, setFormat] = useState('{S_NOMOR}/{S_KODE_DESA}/{S_BULAN_ROM}/{S_TAHUN}');
  const [kodeDesa, setKodeDesa] = useState('');
  const [counter, setCounter] = useState(1);
  const [nomorAwal, setNomorAwal] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getNomorSuratConfig();
      if (config) {
        setFormat(config.format);
        setKodeDesa(config.kode_desa);
        setCounter(config.counter);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const newCounter = nomorAwal ? parseInt(nomorAwal) : undefined;
      await saveNomorSuratConfig({ format, kode_desa: kodeDesa, counter: newCounter });
      if (newCounter) setCounter(newCounter);
      setNomorAwal('');
      toast('Konfigurasi nomor surat berhasil disimpan', 'success');
    } catch (err) {
      toast('Gagal menyimpan konfigurasi', 'error');
      console.error(err);
    }
  };

  const preview = generateNomorSuratParts(format, counter, kodeDesa);

  if (loading) return <p className="text-sm text-[var(--color-text-tertiary)]">Loading...</p>;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Nomor Surat</h1>

      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Konfigurasi Format</h2>
        <div className="space-y-2">
          <TextField
            label="Format Nomor Surat"
            value={format}
            onChange={setFormat}
            description="Gunakan: {S_NOMOR}, {S_KODE_DESA}, {S_BULAN}, {S_BULAN_ROM}, {S_TAHUN}"
          />
          <TextField
            label="Kode Desa"
            value={kodeDesa}
            onChange={setKodeDesa}
            placeholder="DS-GRM"
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Counter</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-secondary)]">Counter saat ini:</span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{counter}</span>
          </div>
          <TextField
            label="Set Nomor Awal (opsional)"
            value={nomorAwal}
            onChange={setNomorAwal}
            placeholder="Kosongkan jika tidak ingin mengubah"
            description="Override counter ke nomor tertentu"
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Preview</h2>
        <div className="bg-[var(--color-surface-secondary)] rounded-md p-2">
          <p className="text-sm font-mono text-[var(--color-text-primary)]">{preview.NOMOR_SURAT}</p>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-[var(--color-text-tertiary)]">
            <span>S_NOMOR: {preview.S_NOMOR}</span>
            <span>S_BULAN: {preview.S_BULAN}</span>
            <span>S_BULAN_ROM: {preview.S_BULAN_ROM}</span>
            <span>S_TAHUN: {preview.S_TAHUN}</span>
            <span>S_KODE_DESA: {preview.S_KODE_DESA}</span>
            <span>S_TANGGAL: {preview.S_TANGGAL}</span>
          </div>
        </div>
      </Card>

      <Button onPress={handleSave}>Simpan Konfigurasi</Button>
    </div>
  );
}
