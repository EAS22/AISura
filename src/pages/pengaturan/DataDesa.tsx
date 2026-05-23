import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { getDataDesa, saveDataDesa } from '../../services/desaService';
import { getAllPerangkatDesa, savePerangkatDesa, deletePerangkatDesa } from '../../services/perangkatDesaService';
import { searchWarga } from '../../services/wargaService';
import { SearchField } from '../../components/ui/SearchField';
import type { DataDesa, PerangkatDesa, Warga } from '../../types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const DEFAULT_JABATAN = [
  'Kepala Desa', 'Sekretaris Desa', 'Kaur TU & Umum', 'Kaur Keuangan',
  'Kaur Perencanaan', 'Kasi Pemerintahan', 'Kasi Kesejahteraan', 'Kasi Pelayanan',
];

export function DataDesaPage() {
  const { toast } = useToast();
  const [desa, setDesa] = useState<Partial<DataDesa>>({});
  const [perangkat, setPerangkat] = useState<Partial<PerangkatDesa>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const desaData = await getDataDesa();
      if (desaData) setDesa(desaData);
      const pdData = await getAllPerangkatDesa();
      if (pdData.length > 0) {
        setPerangkat(pdData);
      } else {
        setPerangkat(DEFAULT_JABATAN.map((jab, i) => ({ urutan: i + 1, jabatan: jab, nama: '', gelar_depan: '', gelar_belakang: '', nik: '', nipd: '', alamat: '', warga_id: null })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDesa = async () => {
    try {
      await saveDataDesa(desa as Omit<DataDesa, 'id' | 'created_at' | 'updated_at'>);
      toast('Data desa berhasil disimpan', 'success');
    } catch (err) {
      toast('Gagal menyimpan data desa', 'error');
      console.error(err);
    }
  };

  const handleSavePerangkat = async () => {
    try {
      for (const pd of perangkat) {
        if (pd.nama || pd.nik) {
          await savePerangkatDesa(pd as Omit<PerangkatDesa, 'id' | 'created_at' | 'updated_at'>);
        }
      }
      toast('Perangkat desa berhasil disimpan', 'success');
    } catch (err) {
      toast('Gagal menyimpan perangkat desa', 'error');
      console.error(err);
    }
  };

  const handleAddPerangkat = () => {
    const nextUrutan = perangkat.length + 1;
    setPerangkat([...perangkat, { urutan: nextUrutan, jabatan: `Kadus ${nextUrutan - 8}`, nama: '', gelar_depan: '', gelar_belakang: '', nik: '', nipd: '', alamat: '', warga_id: null }]);
  };

  const handleRemovePerangkat = async (index: number) => {
    const pd = perangkat[index];
    if (pd.id) await deletePerangkatDesa(pd.id);
    setPerangkat(perangkat.filter((_, i) => i !== index));
  };

  const updatePerangkat = (index: number, data: Partial<PerangkatDesa>) => {
    const updated = [...perangkat];
    updated[index] = { ...updated[index], ...data };
    setPerangkat(updated);
  };

  if (loading) return <p className="text-sm text-[var(--color-text-tertiary)]">Loading...</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Data Desa</h1>

      {/* Identitas Desa */}
      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Identitas Desa</h2>
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Nama Desa" value={desa.desa || ''} onChange={v => setDesa({ ...desa, desa: v })} />
          <TextField label="Kecamatan" value={desa.kecamatan || ''} onChange={v => setDesa({ ...desa, kecamatan: v })} />
          <TextField label="Kabupaten" value={desa.kabupaten || ''} onChange={v => setDesa({ ...desa, kabupaten: v })} />
          <TextField label="Provinsi" value={desa.provinsi || ''} onChange={v => setDesa({ ...desa, provinsi: v })} />
          <TextField label="Kode Pos" value={desa.kode_pos || ''} onChange={v => setDesa({ ...desa, kode_pos: v })} />
          <TextField label="Telepon" value={desa.telepon || ''} onChange={v => setDesa({ ...desa, telepon: v })} />
          <TextField label="Email" value={desa.email || ''} onChange={v => setDesa({ ...desa, email: v })} />
          <TextField label="Alamat Kantor" value={desa.alamat_kantor || ''} onChange={v => setDesa({ ...desa, alamat_kantor: v })} />
        </div>
        <div className="mt-3">
          <Button onPress={handleSaveDesa} size="sm">Simpan Data Desa</Button>
        </div>
      </Card>

      {/* Perangkat Desa */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">Perangkat Desa</h2>
          <Button variant="secondary" size="sm" onPress={handleAddPerangkat}>
            <PlusIcon className="w-3.5 h-3.5" /> Tambah
          </Button>
        </div>

        <div className="space-y-3">
          {perangkat.map((pd, index) => (
            <PerangkatDesaItem
              key={index}
              data={pd}
              index={index}
              onChange={(data) => updatePerangkat(index, data)}
              onRemove={index >= 8 ? () => handleRemovePerangkat(index) : undefined}
            />
          ))}
        </div>

        <div className="mt-3">
          <Button onPress={handleSavePerangkat} size="sm">Simpan Perangkat Desa</Button>
        </div>
      </Card>
    </div>
  );
}

function PerangkatDesaItem({ data, index, onChange, onRemove }: {
  data: Partial<PerangkatDesa>;
  index: number;
  onChange: (data: Partial<PerangkatDesa>) => void;
  onRemove?: () => void;
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

  const handleSelectWarga = (warga: Warga) => {
    onChange({
      warga_id: warga.id,
      nama: warga.nama,
      nik: warga.nik,
      alamat: `${warga.alamat} RT ${warga.rt} RW ${warga.rw}`,
    });
    setShowResults(false);
    setSearchQuery('');
  };

  return (
    <div className="border border-[var(--color-border)] rounded-md p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          PD{index + 1} — {data.jabatan || ''}
        </span>
        {onRemove && (
          <button onClick={onRemove} className="p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="relative">
        <SearchField placeholder="Cari warga (nama/NIK)..." value={searchQuery} onChange={handleSearch} />
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg z-10 max-h-32 overflow-y-auto">
            {searchResults.map(warga => (
              <button key={warga.id} onClick={() => handleSelectWarga(warga)} className="w-full text-left px-2 py-1.5 hover:bg-[var(--color-surface-secondary)] text-xs border-b border-[var(--color-border)] last:border-0">
                <p className="font-medium text-[var(--color-text-primary)]">{warga.nama}</p>
                <p className="text-[var(--color-text-tertiary)]">NIK: {warga.nik} • {warga.alamat} RT {warga.rt} RW {warga.rw}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <TextField label="Gelar Depan" value={data.gelar_depan || ''} onChange={v => onChange({ gelar_depan: v })} placeholder="H." />
        <TextField label="Nama" value={data.nama || ''} onChange={v => onChange({ nama: v })} className="col-span-2" />
        <TextField label="Gelar Belakang" value={data.gelar_belakang || ''} onChange={v => onChange({ gelar_belakang: v })} placeholder="S.Pd." />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <TextField label="NIK" value={data.nik || ''} onChange={v => onChange({ nik: v })} />
        <TextField label="NIPD" value={data.nipd || ''} onChange={v => onChange({ nipd: v })} />
        <TextField label="Jabatan" value={data.jabatan || ''} onChange={v => onChange({ jabatan: v })} />
      </div>
      <TextField label="Alamat" value={data.alamat || ''} onChange={v => onChange({ alamat: v })} />
    </div>
  );
}
