import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchField } from '../components/ui/SearchField';
import { useToast } from '../components/ui/Toast';
import { getAllRiwayat, deleteRiwayat, deleteAllRiwayat } from '../services/riwayatService';
import { exportRiwayatToExcel } from '../utils/excelExporter';
import type { RiwayatSurat } from '../types';
import { ArrowDownTrayIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export function RiwayatSuratPage() {
  const { toast } = useToast();
  const [riwayat, setRiwayat] = useState<RiwayatSurat[]>([]);
  const [filtered, setFiltered] = useState<RiwayatSurat[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (search.length >= 2) {
      const q = search.toLowerCase();
      setFiltered(riwayat.filter(r =>
        r.nomor_surat.toLowerCase().includes(q) || r.template_nama.toLowerCase().includes(q)
      ));
    } else {
      setFiltered(riwayat);
    }
  }, [search, riwayat]);

  const loadData = async () => {
    try {
      const data = await getAllRiwayat();
      setRiwayat(data);
      setFiltered(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const buffer = exportRiwayatToExcel(riwayat);
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({
        defaultPath: `laporan-surat-${new Date().toISOString().split('T')[0]}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      if (!filePath) return;
      await writeFile(filePath, new Uint8Array(buffer));
      toast('Laporan berhasil diunduh', 'success');
    } catch (err) {
      toast('Gagal export laporan', 'error');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus riwayat surat ini?')) return;
    try {
      await deleteRiwayat(id);
      toast('Riwayat berhasil dihapus', 'success');
      await loadData();
    } catch (err) {
      toast('Gagal menghapus riwayat', 'error');
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Hapus semua riwayat surat? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      await deleteAllRiwayat();
      toast('Semua riwayat berhasil dihapus', 'success');
      await loadData();
    } catch (err) {
      toast('Gagal menghapus riwayat', 'error');
      console.error(err);
    }
  };

  if (loading) return <p className="text-sm text-[var(--color-text-tertiary)]">Loading...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Riwayat Surat</h1>
        <div className="flex gap-2">
          {riwayat.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onPress={handleExport}>
                <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Laporan
              </Button>
              <Button variant="danger" size="sm" onPress={handleDeleteAll}>
                <TrashIcon className="w-3.5 h-3.5" /> Hapus Semua
              </Button>
            </>
          )}
        </div>
      </div>

      <SearchField placeholder="Cari nomor surat atau template..." value={search} onChange={setSearch} className="max-w-sm" />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">No</th>
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">Tanggal</th>
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">Nomor Surat</th>
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">Template</th>
                <th className="px-2 py-1.5 text-right font-medium text-[var(--color-text-secondary)]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]">
                  <td className="px-2 py-1.5 text-[var(--color-text-tertiary)]">{i + 1}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text-secondary)]">
                    {new Date(r.tanggal_generate).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[var(--color-text-primary)]">{r.nomor_surat}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text-secondary)]">{r.template_nama}</td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="p-1 text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] rounded" title="Generate Ulang">
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Hapus">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-4 text-center text-[var(--color-text-tertiary)]">Belum ada riwayat surat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
