import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import type { TemplateSurat, DetectedPlaceholder } from '../types';
import { DocumentPlusIcon, TrashIcon, PencilIcon, TagIcon } from '@heroicons/react/24/outline';

// Lazy import templateService (uses Tauri FS)
async function getTemplateService() {
  return await import('../services/templateService');
}

export function TemplateSuratPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateSurat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadNama, setUploadNama] = useState('');
  const [uploadDeskripsi, setUploadDeskripsi] = useState('');

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const svc = await getTemplateService();
      const data = await svc.getAllTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await open({ filters: [{ name: 'Word Document', extensions: ['docx'] }], multiple: false });
      if (!filePath) return;

      const bytes = await readFile(filePath as string);
      const svc = await getTemplateService();
      await svc.uploadTemplate(bytes, uploadNama || 'Template Baru', uploadDeskripsi);
      toast('Template berhasil diupload', 'success');
      setShowUpload(false);
      setUploadNama('');
      setUploadDeskripsi('');
      await loadTemplates();
    } catch (err) {
      toast('Gagal upload template', 'error');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus template ini?')) return;
    try {
      const svc = await getTemplateService();
      await svc.deleteTemplate(id);
      toast('Template berhasil dihapus', 'success');
      await loadTemplates();
    } catch (err) {
      toast('Gagal menghapus template', 'error');
      console.error(err);
    }
  };

  const getPlaceholders = (t: TemplateSurat): DetectedPlaceholder[] => {
    try { return JSON.parse(t.placeholders); } catch { return []; }
  };

  if (loading) return <p className="text-sm text-[var(--color-text-tertiary)]">Loading...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Template Surat</h1>
        <Button size="sm" onPress={() => setShowUpload(!showUpload)}>
          <DocumentPlusIcon className="w-3.5 h-3.5" /> Upload Template
        </Button>
      </div>

      {showUpload && (
        <Card>
          <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Upload Template Baru</h2>
          <div className="space-y-2">
            <TextField label="Nama Template" value={uploadNama} onChange={setUploadNama} placeholder="Surat Keterangan Domisili" />
            <TextField label="Deskripsi (opsional)" value={uploadDeskripsi} onChange={setUploadDeskripsi} placeholder="Deskripsi singkat" />
            <div className="flex gap-2">
              <Button size="sm" onPress={handleUpload}>Pilih File & Upload</Button>
              <Button variant="ghost" size="sm" onPress={() => setShowUpload(false)}>Batal</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="text-xs text-[var(--color-text-tertiary)]">
        <a href="#" onClick={(e) => { e.preventDefault(); /* navigate to placeholder page */ }} className="text-[var(--color-accent)] hover:underline">
          <TagIcon className="w-3 h-3 inline" /> Lihat daftar placeholder
        </a>
      </div>

      {templates.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-text-tertiary)] text-center py-4">Belum ada template. Upload template pertama.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map(t => {
            const placeholders = getPlaceholders(t);
            return (
              <Card key={t.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate">{t.nama}</h3>
                    {t.deskripsi && <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{t.deskripsi}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="accent">{placeholders.length} placeholder</Badge>
                      {t.warga_count > 0 && <Badge variant="success">{t.warga_count} warga</Badge>}
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">
                        {new Date(t.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] rounded">
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1 text-[var(--color-text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
