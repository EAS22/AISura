import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SearchField } from '../components/ui/SearchField';
import { DESA_PLACEHOLDERS, NOMOR_SURAT_PLACEHOLDERS, WARGA_FIELDS, PERANGKAT_DESA_FIELDS, PERANGKAT_DESA_ALIASES } from '../constants/placeholders';

export function PlaceholderPage() {
  const [search, setSearch] = useState('');

  const filterBySearch = (token: string, deskripsi: string) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return token.toLowerCase().includes(q) || deskripsi.toLowerCase().includes(q);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Kamus Placeholder</h1>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Daftar semua placeholder yang tersedia untuk template surat</p>
      </div>

      <SearchField placeholder="Cari placeholder..." value={search} onChange={setSearch} className="max-w-sm" />

      {/* Suffix Rules */}
      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Aturan Suffix Style</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">Tambahkan suffix di akhir placeholder untuk mengubah format teks:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Suffix</th>
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Fungsi</th>
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Contoh</th>
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Hasil</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--color-border)]">
                <td className="px-2 py-1 font-mono">(tanpa)</td><td className="px-2 py-1">Apa adanya</td>
                <td className="px-2 py-1 font-mono">{'{W1_NAMA}'}</td><td className="px-2 py-1">Sena</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="px-2 py-1 font-mono">_U</td><td className="px-2 py-1">UPPERCASE</td>
                <td className="px-2 py-1 font-mono">{'{W1_NAMA_U}'}</td><td className="px-2 py-1">SENA</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="px-2 py-1 font-mono">_L</td><td className="px-2 py-1">lowercase</td>
                <td className="px-2 py-1 font-mono">{'{W1_NAMA_L}'}</td><td className="px-2 py-1">sena</td>
              </tr>
              <tr>
                <td className="px-2 py-1 font-mono">_P</td><td className="px-2 py-1">Propercase</td>
                <td className="px-2 py-1 font-mono">{'{W1_NAMA_P}'}</td><td className="px-2 py-1">Sena</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Warga */}
      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
          <Badge variant="accent">Warga</Badge> Placeholder Data Warga
        </h2>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Format: {'{Wn_FIELD}'} — n = nomor urut warga (1, 2, 3, ...)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Placeholder</th>
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {WARGA_FIELDS.filter(f => filterBySearch(`W1_${f}`, f)).map(field => (
                <tr key={field} className="border-b border-[var(--color-border)]">
                  <td className="px-2 py-1 font-mono text-[var(--color-text-primary)]">{`{Wn_${field}}`}</td>
                  <td className="px-2 py-1 text-[var(--color-text-secondary)]">{field.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Perangkat Desa */}
      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
          <Badge variant="success">Perangkat Desa</Badge> Placeholder Perangkat Desa
        </h2>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Format: {'{PDn_FIELD}'} — n = nomor urut perangkat (1=Kades, 2=Sekdes, ...)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Placeholder</th>
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {PERANGKAT_DESA_FIELDS.filter(f => filterBySearch(`PD1_${f}`, f)).map(field => (
                <tr key={field} className="border-b border-[var(--color-border)]">
                  <td className="px-2 py-1 font-mono text-[var(--color-text-primary)]">{`{PDn_${field}}`}</td>
                  <td className="px-2 py-1 text-[var(--color-text-secondary)]">{field.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="text-xs font-medium text-[var(--color-text-secondary)] mt-3 mb-1">Alias (shortcut)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              {Object.entries(PERANGKAT_DESA_ALIASES).filter(([k]) => filterBySearch(k, k)).map(([alias, target]) => (
                <tr key={alias} className="border-b border-[var(--color-border)]">
                  <td className="px-2 py-1 font-mono text-[var(--color-text-primary)]">{`{${alias}}`}</td>
                  <td className="px-2 py-1 text-[var(--color-text-tertiary)]">→ {`{${target}}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Desa */}
      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
          <Badge variant="warning">Desa</Badge> Placeholder Identitas Desa
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Placeholder</th>
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Deskripsi</th>
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Contoh</th>
              </tr>
            </thead>
            <tbody>
              {DESA_PLACEHOLDERS.filter(p => filterBySearch(p.token, p.deskripsi)).map(p => (
                <tr key={p.token} className="border-b border-[var(--color-border)]">
                  <td className="px-2 py-1 font-mono text-[var(--color-text-primary)]">{`{${p.token}}`}</td>
                  <td className="px-2 py-1 text-[var(--color-text-secondary)]">{p.deskripsi}</td>
                  <td className="px-2 py-1 text-[var(--color-text-tertiary)]">{p.contoh}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Nomor Surat */}
      <Card>
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
          <Badge variant="danger">Nomor Surat</Badge> Placeholder Nomor Surat
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Placeholder</th>
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Deskripsi</th>
                <th className="px-2 py-1 text-left text-[var(--color-text-secondary)]">Contoh</th>
              </tr>
            </thead>
            <tbody>
              {NOMOR_SURAT_PLACEHOLDERS.filter(p => filterBySearch(p.token, p.deskripsi)).map(p => (
                <tr key={p.token} className="border-b border-[var(--color-border)]">
                  <td className="px-2 py-1 font-mono text-[var(--color-text-primary)]">{`{${p.token}}`}</td>
                  <td className="px-2 py-1 text-[var(--color-text-secondary)]">{p.deskripsi}</td>
                  <td className="px-2 py-1 text-[var(--color-text-tertiary)]">{p.contoh}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
