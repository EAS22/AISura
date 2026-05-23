import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchField } from '../components/ui/SearchField';
import { useToast } from '../components/ui/Toast';
import { getAllWarga, importWargaBatch, deleteAllWarga, getWargaCount } from '../services/wargaService';
import { parseExcelOrCsv } from '../utils/excelImporter';
import { generateTemplateWargaExcel } from '../utils/excelExporter';
import type { Warga } from '../types';
import { ArrowUpTrayIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

export function DataWarga() {
  const { toast } = useToast();
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [filtered, setFiltered] = useState<Warga[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const perPage = 50;

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      setFiltered(wargaList.filter(w =>
        w.nama.toLowerCase().includes(q) || w.nik.includes(q) || w.alamat.toLowerCase().includes(q)
      ));
    } else {
      setFiltered(wargaList);
    }
    setPage(0);
  }, [searchQuery, wargaList]);

  const loadData = async () => {
    try {
      const data = await getAllWarga();
      setWargaList(data);
      setFiltered(data);
      const c = await getWargaCount();
      setCount(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await open({ filters: [{ name: 'Excel/CSV', extensions: ['xlsx', 'xls', 'csv'] }], multiple: false });
      if (!filePath) return;

      const bytes = await readFile(filePath as string);
      const result = parseExcelOrCsv(bytes.buffer as ArrayBuffer);

      if (!result.success) {
        toast(`Import gagal: ${result.errors.join(', ')}`, 'error');
        return;
      }

      const imported = await importWargaBatch(result.data);
      toast(`${imported} data warga berhasil diimport`, 'success');
      await loadData();
    } catch (err) {
      toast('Gagal import data', 'error');
      console.error(err);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const buffer = generateTemplateWargaExcel();
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({ defaultPath: 'template-import-warga.xlsx', filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
      if (!filePath) return;
      await writeFile(filePath, new Uint8Array(buffer));
      toast('Template berhasil diunduh', 'success');
    } catch (err) {
      toast('Gagal download template', 'error');
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Hapus semua data warga? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      await deleteAllWarga();
      toast('Semua data warga berhasil dihapus', 'success');
      await loadData();
    } catch (err) {
      toast('Gagal menghapus data', 'error');
      console.error(err);
    }
  };

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  if (loading) return <p className="text-sm text-[var(--color-text-tertiary)]">Loading...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Data Warga</h1>
          <p className="text-xs text-[var(--color-text-tertiary)]">{count} data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onPress={handleDownloadTemplate}>
            <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Template
          </Button>
          <Button size="sm" onPress={handleImport}>
            <ArrowUpTrayIcon className="w-3.5 h-3.5" /> Import
          </Button>
          {count > 0 && (
            <Button variant="danger" size="sm" onPress={handleDeleteAll}>
              <TrashIcon className="w-3.5 h-3.5" /> Hapus Semua
            </Button>
          )}
        </div>
      </div>

      <SearchField placeholder="Cari nama, NIK, atau alamat..." value={searchQuery} onChange={setSearchQuery} className="max-w-sm" />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">No</th>
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">NIK</th>
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">Nama</th>
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">JK</th>
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">Alamat</th>
                <th className="px-2 py-1.5 text-left font-medium text-[var(--color-text-secondary)]">RT/RW</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((w, i) => (
                <tr key={w.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]">
                  <td className="px-2 py-1.5 text-[var(--color-text-tertiary)]">{page * perPage + i + 1}</td>
                  <td className="px-2 py-1.5 font-mono text-[var(--color-text-primary)]">{w.nik}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text-primary)]">{w.nama}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text-secondary)]">{w.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text-secondary)]">{w.alamat}</td>
                  <td className="px-2 py-1.5 text-[var(--color-text-secondary)]">{w.rt}/{w.rw}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-4 text-center text-[var(--color-text-tertiary)]">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" isDisabled={page === 0} onPress={() => setPage(page - 1)}>Prev</Button>
          <span className="text-xs text-[var(--color-text-secondary)]">{page + 1} / {totalPages}</span>
          <Button variant="ghost" size="sm" isDisabled={page >= totalPages - 1} onPress={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
