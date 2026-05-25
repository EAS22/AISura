import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, Copy, Check } from 'lucide-react'
import { DESA_PLACEHOLDERS, NOMOR_SURAT_PLACEHOLDERS, NOMOR_SURAT_FIELDS, WARGA_FIELDS, PERANGKAT_DESA_FIELDS, PERANGKAT_DESA_ALIASES } from '@/constants/placeholders'
import { crmShell } from '@/lib/aisura-crm-ui'

export function PlaceholderPage() {
  const [search, setSearch] = useState('')
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [copied, setCopied] = useState('')
  const [wargaNumber, setWargaNumber] = useState('1')
  const [modalStep, setModalStep] = useState<'number' | 'suffix'>('suffix')

  const filter = (token: string, desc: string) => {
    if (!search) return true
    const q = search.toLowerCase()
    return token.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
  }

  const handleCardClick = (token: string) => {
    setSelectedToken(token)
    setCopied('')
    // Check if token has "Wn" or "PDn" prefix — need number input first
    const inner = token.replace(/^\{|\}$/g, '')
    if (/^Wn_/.test(inner) || /^PDn_/.test(inner)) {
      setWargaNumber('1')
      setModalStep('number')
    } else {
      setModalStep('suffix')
    }
    setModalOpen(true)
  }

  const handleNumberConfirm = () => {
    setModalStep('suffix')
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(''), 2000)
  }

  // Resolve token with number substitution
  const resolveToken = (token: string): string => {
    const inner = token.replace(/^\{|\}$/g, '')
    if (/^Wn_/.test(inner)) return inner.replace('Wn_', `W${wargaNumber}_`)
    if (/^PDn_/.test(inner)) return inner.replace('PDn_', `PD${wargaNumber}_`)
    return inner
  }

  const baseToken = selectedToken ? resolveToken(selectedToken) : ''

  const suffixOptions = [
    { label: 'Tanpa suffix (apa adanya)', suffix: '', result: `{${baseToken}}` },
    { label: 'UPPERCASE', suffix: '_U', result: `{${baseToken}_U}` },
    { label: 'lowercase', suffix: '_L', result: `{${baseToken}_L}` },
    { label: 'Propercase (Title Case)', suffix: '_P', result: `{${baseToken}_P}` },
  ]

  // Determine label for number input
  const numberLabel = selectedToken?.includes('Wn_') ? 'Nomor Warga' : 'Nomor Perangkat Desa'

  return (
    <div className={crmShell.page}>
      <div>
        <p className={crmShell.eyebrow}>Placeholder library</p>
        <h1 className={crmShell.title}>Kamus Placeholder</h1>
        <p className={crmShell.subtitle}>Klik placeholder untuk menyalin dengan pilihan style.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari placeholder..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      {/* Suffix Rules */}
      <Card className={crmShell.card}>
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
                  <PlaceholderCard key={f} token={`{Wn_${f}}`} description={f.replace(/_/g, ' ')} onClick={() => handleCardClick(`{Wn_${f}}`)} />
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
                  <PlaceholderCard key={f} token={`{PDn_${f}}`} description={f.replace(/_/g, ' ')} onClick={() => handleCardClick(`{PDn_${f}}`)} />
                ))}
              </div>
              <div>
                <h4 className="text-xs font-medium mb-2 text-muted-foreground">Alias (shortcut)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(PERANGKAT_DESA_ALIASES).filter(([k]) => filter(k, k)).map(([alias, target]) => (
                    <PlaceholderCard key={alias} token={`{${alias}}`} description={`→ {${target}}`} onClick={() => handleCardClick(`{${alias}}`)} />
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
                  <PlaceholderCard key={p.token} token={`{${p.token}}`} description={p.deskripsi} onClick={() => handleCardClick(`{${p.token}}`)} />
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
                  <PlaceholderCard key={p.token} token={`{${p.token}}`} description={p.deskripsi} onClick={() => handleCardClick(`{${p.token}}`)} />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-xs font-medium mb-2 text-muted-foreground">Multi-Nomor (format: {'{Nn_FIELD}'})</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Untuk template yang butuh lebih dari 1 nomor surat, gunakan prefix N1_, N2_, dst.
                  Contoh: {'{N1_NOMOR_SURAT}'}, {'{N2_NOMOR_SURAT}'}, {'{N1_S_NOMOR}'}, {'{N2_S_NOMOR}'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {NOMOR_SURAT_FIELDS.map(f => (
                    <PlaceholderCard key={`Nn_${f}`} token={`{Nn_${f}}`} description={f.replace(/_/g, ' ')} onClick={() => handleCardClick(`{Nn_${f}}`)} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suffix Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setModalStep('suffix') }}>
        <DialogContent className="max-w-sm">
          {modalStep === 'number' ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{numberLabel}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Masukkan nomor urut {selectedToken?.includes('Wn_') ? 'warga (W1, W2, W3, ...)' : 'perangkat desa (PD1, PD2, ...)'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selectedToken?.includes('Wn_') ? 'W' : 'PD'}</span>
                <Input
                  type="number"
                  min="1"
                  value={wargaNumber}
                  onChange={e => setWargaNumber(e.target.value)}
                  className="w-20"
                  placeholder="1"
                />
              </div>
              <Button onClick={handleNumberConfirm} className="w-full">Lanjut Pilih Style</Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">{`{${baseToken}}`}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Pilih style lalu klik untuk menyalin:</p>
              <div className="space-y-2">
                {suffixOptions.map(opt => (
                  <button
                    key={opt.suffix}
                    onClick={() => handleCopy(opt.result)}
                    className="w-full flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors text-left"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">{opt.result}</p>
                      <p className="text-xs text-muted-foreground">{opt.label}</p>
                    </div>
                    {copied === opt.result ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlaceholderCard({ token, description, onClick }: { token: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border p-2.5 space-y-0.5 text-left hover:bg-accent hover:border-primary/30 transition-colors cursor-pointer"
    >
      <p className="font-mono text-sm font-medium text-foreground">{token}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  )
}
