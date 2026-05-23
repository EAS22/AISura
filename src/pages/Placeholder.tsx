import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search } from 'lucide-react'
import { DESA_PLACEHOLDERS, NOMOR_SURAT_PLACEHOLDERS, WARGA_FIELDS, PERANGKAT_DESA_FIELDS, PERANGKAT_DESA_ALIASES } from '@/constants/placeholders'

export function PlaceholderPage() {
  const [search, setSearch] = useState('')
  const filter = (token: string, desc: string) => {
    if (!search) return true
    const q = search.toLowerCase()
    return token.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kamus Placeholder</h1>
        <p className="text-sm text-muted-foreground">Daftar semua placeholder yang tersedia untuk template surat</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari placeholder..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      {/* Suffix Rules */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Aturan Suffix Style</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Suffix</TableHead><TableHead>Fungsi</TableHead><TableHead>Contoh</TableHead><TableHead>Hasil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell className="font-mono">(tanpa)</TableCell><TableCell>Apa adanya</TableCell><TableCell className="font-mono">{'{W1_NAMA}'}</TableCell><TableCell>Sena</TableCell></TableRow>
              <TableRow><TableCell className="font-mono">_U</TableCell><TableCell>UPPERCASE</TableCell><TableCell className="font-mono">{'{W1_NAMA_U}'}</TableCell><TableCell>SENA</TableCell></TableRow>
              <TableRow><TableCell className="font-mono">_L</TableCell><TableCell>lowercase</TableCell><TableCell className="font-mono">{'{W1_NAMA_L}'}</TableCell><TableCell>sena</TableCell></TableRow>
              <TableRow><TableCell className="font-mono">_P</TableCell><TableCell>Propercase</TableCell><TableCell className="font-mono">{'{W1_NAMA_P}'}</TableCell><TableCell>Sena</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Tabs defaultValue="warga">
        <TabsList>
          <TabsTrigger value="warga">Warga</TabsTrigger>
          <TabsTrigger value="perangkat">Perangkat Desa</TabsTrigger>
          <TabsTrigger value="desa">Desa</TabsTrigger>
          <TabsTrigger value="nomor">Nomor Surat</TabsTrigger>
        </TabsList>

        <TabsContent value="warga">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Badge>Warga</Badge> Format: {'{Wn_FIELD}'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {WARGA_FIELDS.filter(f => filter(`W1_${f}`, f)).map(f => (
                  <PlaceholderCard key={f} token={`{Wn_${f}}`} description={f.replace(/_/g, ' ')} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perangkat">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Badge variant="outline">Perangkat Desa</Badge> Format: {'{PDn_FIELD}'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {PERANGKAT_DESA_FIELDS.filter(f => filter(`PD1_${f}`, f)).map(f => (
                  <PlaceholderCard key={f} token={`{PDn_${f}}`} description={f.replace(/_/g, ' ')} />
                ))}
              </div>
              <div>
                <h4 className="text-xs font-medium mb-2 text-muted-foreground">Alias (shortcut)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(PERANGKAT_DESA_ALIASES).filter(([k]) => filter(k, k)).map(([alias, target]) => (
                    <PlaceholderCard key={alias} token={`{${alias}}`} description={`→ {${target}}`} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desa">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {DESA_PLACEHOLDERS.filter(p => filter(p.token, p.deskripsi)).map(p => (
                  <PlaceholderCard key={p.token} token={`{${p.token}}`} description={p.deskripsi} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nomor">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {NOMOR_SURAT_PLACEHOLDERS.filter(p => filter(p.token, p.deskripsi)).map(p => (
                  <PlaceholderCard key={p.token} token={`{${p.token}}`} description={p.deskripsi} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PlaceholderCard({ token, description }: { token: string; description: string }) {
  return (
    <div className="rounded-md border p-2.5 space-y-0.5">
      <p className="font-mono text-sm font-medium text-foreground">{token}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
