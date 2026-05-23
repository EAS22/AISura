import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  variant?: 'default' | 'destructive'
}

export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', description: '' })
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const handleConfirm = () => {
    setOpen(false)
    resolver?.(true)
  }

  const handleCancel = () => {
    setOpen(false)
    resolver?.(false)
  }

  const ConfirmDialog = () => (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{options.description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Batal</Button>
          <Button variant={options.variant || 'destructive'} onClick={handleConfirm}>
            {options.confirmLabel || 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { confirm, ConfirmDialog }
}
