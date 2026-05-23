import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { SearchField } from '../components/ui/SearchField';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { searchWarga } from '../services/wargaService';
import { getDataDesa } from '../services/desaService';
import { getAllPerangkatDesa } from '../services/perangkatDesaService';
import { getNomorSuratConfig, incrementCounter } from '../services/nomorSuratService';
import { saveRiwayat } from '../services/riwayatService';
import { generateNomorSuratParts } from '../utils/nomorSuratGenerator';
import type { TemplateSurat, DetectedPlaceholder, Warga, DataDesa, PerangkatDesa } from '../types';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

export function BuatSurat() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateSurat[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSurat | null>(null);
  const [placeholders, setPlaceholders] = useState<DetectedPlaceholder[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [nomorOverride, setNomorOverride] = useState('');
  const [step, setStep] = useState<'select' | 'fill' | 'preview'>('select');
  const [loading, setLoading] = useState(true);

  // Context data
  const [dataDesa, setDataDesa] = useState<DataDesa | null>(null);
  const [perangkatDesa, setPerangkatDesa] = useState<PerangkatDesa[]>([]);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const svc = await import('../services/templateService');
      const tmpl = await svc.getAllTemplates();
      setTemplates(tmpl);
      const desa = await getDataDesa();
      setDataDesa(desa);
      const pd = await getAllPerangkatDesa();
      setPerangkatDesa(pd);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (t: TemplateSurat) => {
    setSelectedTemplate(t);
    try {
      const detected: DetectedPlaceholder[] = JSON.parse(t.placeholders);
      setPlaceholders(detected);

      // Pre-fill known values
      const values: Record<string, string> = {};
      for (const p of detected) {
        if (p.kategori === 'desa' && dataDesa) {
          const fieldMap: Record<string, string> = {
            'DESA': dataDesa.desa, 'KECAMATAN': dataDesa.kecamatan,
            'KABUPATEN': dataDesa.kabupaten, 'PROVINSI': dataDesa.provinsi,
            'KODE_POS': dataDesa.kode_pos, 'TELEPON_DESA': dataDesa.telepon,
            'EMAIL_DESA': dataDesa.email, 'ALAMAT_KANTOR_DESA': dataDesa.alamat_kantor,
          };
          values[p.token] = fieldMap[p.field] || '';
        } else if (p.kategori === 'perangkat_desa' && p.slot) {
          const urutanMatch = p.slot.match(/^PD(\d+)$/);
          if (urutanMatch) {
            const pd = perangkatDesa.find(x => x.urutan === parseInt(urutanMatch[1]));
            if (pd) {
              const pdMap: Record<string, string> = {
                'NAMA': pd.nama, 'NIK': pd.nik, 'NIPD': pd.nipd,
                'JABATAN': pd.jabatan, 'ALAMAT': pd.alamat,
                'NAMA_LENGKAP': [pd.gelar_depan, pd.nama, pd.gelar_belakang].filter(Boolean).join(' '),
              };
              values[p.token] = pdMap[p.field] || '';
            }
          }
        } else {
          values[p.token] = '';
        }
      }
      setFormValues(values);
      setStep('fill');
    } catch {
      toast('Gagal membaca placeholder template', 'error');
    }
  };

  const handleGenerate = async () => {
    try {
      // Get nomor surat
      const config = await getNomorSuratConfig();
      if (!config) {
        toast('Konfigurasi nomor surat belum diatur', 'error');
        return;
      }

      const nomorUrut = await incrementCounter();
      const parts = generateNomorSuratParts(config.format, nomorUrut, config.kode_desa);

      // Fill nomor surat placeholders
      const finalValues = { ...formValues };
      for (const p of placeholders) {
        if (p.kategori === 'nomor_surat') {
          if (p.field === 'NOMOR_SURAT' && nomorOverride) {
            finalValues[p.token] = nomorOverride;
          } else {
            const key = p.field as keyof typeof parts;
            finalValues[p.token] = parts[key] || '';
          }
        }
      }

      // Process docx
      const svc = await import('../services/templateService');
      const templateBytes = await svc.getTemplateBlob(selectedTemplate!.file_path);
      const { processDocxTemplate, downloadDocx } = await import('../utils/docxProcessor');
      const result = await processDocxTemplate(templateBytes, finalValues);

      // Download
      const filename = `${selectedTemplate!.nama.replace(/\s+/g, '_')}_${parts.S_NOMOR}_${parts.S_TANGGAL.replace(/\s+/g, '_')}.docx`;
      await downloadDocx(result, filename);

      // Save riwayat
      await saveRiwayat(
        selectedTemplate!.id,
        selectedTemplate!.nama,
        nomorOverride || parts.NOMOR_SURAT,
        nomorUrut,
        finalValues
      );

      toast('Surat berhasil di-generate dan disimpan ke riwayat', 'success');
      setStep('select');
      setSelectedTemplate(null);
      setFormValues({});
      setNomorOverride('');
    } catch (err) {
      toast('Gagal generate surat', 'error');
      console.error(err);
    }
  };

  if (loading) return <p className="text-sm text-[var(--color-text-tertiary)]">Loading...</p>;

  // Step 1: Select template
  if (step === 'select') {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Buat Surat</h1>
        <p className="text-xs text-[var(--color-text-tertiary)]">Pilih template surat yang ingin dibuat</p>

        {templates.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-text-tertiary)] text-center py-4">Belum ada template. Upload template terlebih dahulu.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {templates.map(t => (
              <Card key={t.id} className="cursor-pointer hover:border-[var(--color-accent)] transition-colors">
                <button onClick={() => handleSelectTemplate(t)} className="w-full text-left">
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{t.nama}</h3>
                  {t.deskripsi && <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{t.deskripsi}</p>}
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge variant="accent">{JSON.parse(t.placeholders).length} placeholder</Badge>
                    {t.warga_count > 0 && <Badge variant="success">{t.warga_count} warga</Badge>}
                  </div>
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Step 2: Fill form
  const wargaSlots = [...new Set(placeholders.filter(p => p.kategori === 'warga' && p.slot).map(p => p.slot!))];
  const customPlaceholders = placeholders.filter(p => p.kategori === 'custom');
  const nomorPlaceholders = placeholders.filter(p => p.kategori === 'nomor_surat');

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Buat Surat</h1>
          <p className="text-xs text-[var(--color-text-tertiary)]">Template: {selectedTemplate?.nama}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onPress={() => { setStep('select'); setSelectedTemplate(null); }}>Kembali</Button>
          <Button size="sm" onPress={handleGenerate}>
            <DocumentArrowDownIcon className="w-3.5 h-3.5" /> Generate & Download
          </Button>
        </div>
      </div>

      {/* Warga sections */}
      {wargaSlots.map(slot => (
        <WargaSection
          key={slot}
          slot={slot}
          placeholders={placeholders.filter(p => p.slot === slot)}
          values={formValues}
          onChange={(key, val) => setFormValues({ ...formValues, [key]: val })}
        />
      ))}

      {/* Nomor Surat override */}
      {nomorPlaceholders.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Nomor Surat</h2>
          <TextField
            label="Override Nomor Surat (opsional)"
            value={nomorOverride}
            onChange={setNomorOverride}
            placeholder="Kosongkan untuk auto-generate"
            description="Isi jika ingin menggunakan nomor surat custom"
          />
        </Card>
      )}

      {/* Custom placeholders */}
      {customPlaceholders.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Data Tambahan</h2>
          <div className="space-y-2">
            {customPlaceholders.map(p => (
              <TextField
                key={p.token}
                label={p.field}
                value={formValues[p.token] || ''}
                onChange={v => setFormValues({ ...formValues, [p.token]: v })}
                placeholder={`Isi ${p.field}`}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function WargaSection({ slot, placeholders, values, onChange }: {
  slot: string;
  placeholders: DetectedPlaceholder[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Warga[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = await searchWarga(query);
      setSearchResults(results);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const computeUmur = (tanggalLahir: string): string => {
    const parts = tanggalLahir.split('-');
    if (parts.length !== 3) return '0';
    const [day, month, year] = parts;
    const birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age.toString();
  };

  const handleSelectWarga = (warga: Warga) => {
    const fieldMap: Record<string, string> = {
      'NIK': warga.nik, 'NAMA': warga.nama, 'JENIS_KELAMIN': warga.jenis_kelamin,
      'TEMPAT_LAHIR': warga.tempat_lahir, 'TANGGAL_LAHIR': warga.tanggal_lahir,
      'UMUR': computeUmur(warga.tanggal_lahir), 'AGAMA': warga.agama,
      'STATUS': warga.status, 'HUB_KELUARGA': warga.hub_keluarga,
      'PENDIDIKAN': warga.pendidikan, 'PEKERJAAN': warga.pekerjaan,
      'NAMA_IBU': warga.nama_ibu, 'NAMA_AYAH': warga.nama_ayah,
      'ALAMAT': warga.alamat, 'RT': warga.rt, 'RW': warga.rw,
      'NO_KK': warga.no_kk,
      'ALAMAT_LENGKAP': `${warga.alamat} RT ${warga.rt} RW ${warga.rw}`,
      'TTL': `${warga.tempat_lahir}, ${warga.tanggal_lahir}`,
    };

    for (const p of placeholders) {
      if (fieldMap[p.field]) {
        onChange(p.token, fieldMap[p.field]);
      }
    }
    setShowResults(false);
    setSearchQuery('');
  };

  return (
    <Card>
      <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">{slot}</h2>

      <div className="relative mb-2">
        <SearchField placeholder="Cari warga (nama/NIK)..." value={searchQuery} onChange={handleSearch} />
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
            {searchResults.map(warga => (
              <button key={warga.id} onClick={() => handleSelectWarga(warga)} className="w-full text-left px-2 py-1.5 hover:bg-[var(--color-surface-secondary)] text-xs border-b border-[var(--color-border)] last:border-0">
                <p className="font-medium text-[var(--color-text-primary)]">{warga.nama}</p>
                <p className="text-[var(--color-text-tertiary)]">NIK: {warga.nik} • {warga.alamat} RT {warga.rt} RW {warga.rw} • {computeUmur(warga.tanggal_lahir)} thn</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {placeholders.map(p => (
          <TextField
            key={p.token}
            label={p.field}
            value={values[p.token] || ''}
            onChange={v => onChange(p.token, v)}
            placeholder={p.field}
          />
        ))}
      </div>
    </Card>
  );
}
