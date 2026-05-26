import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Send, RefreshCw, StopCircle, FileSearch, ShieldAlert } from 'lucide-react'
import { useAI } from '@/contexts/AIContext'
import { useNavigationContext } from '@/lib/router'
import { MessageBubble } from './MessageBubble'
import { useAIChat } from './useAIChat'
import { TemplateSuggesterPanel } from './TemplateSuggesterPanel'
import { LetterPreviewBridge, useLetterPreviewBridge } from './LetterPreviewBridge'

interface AIDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode: 'chat' | 'template'
}

export function AIDrawer({ open, onOpenChange, defaultMode }: AIDrawerProps) {
  const ai = useAI()
  const { navigate } = useNavigationContext()
  const [mode, setMode] = useState<'chat' | 'template'>(defaultMode)
  const previewBridge = useLetterPreviewBridge()

  useEffect(() => {
    if (open) setMode(defaultMode)
  }, [open, defaultMode])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[480px] flex-col gap-0 border-l border-white/60 bg-white/82 p-0 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/72 sm:max-w-[480px] dark:border-white/10 dark:bg-zinc-950/82 dark:supports-[backdrop-filter]:bg-zinc-950/72"
      >
        <SheetHeader className="border-b border-white/40 px-5 py-4 dark:border-white/10">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AISura AI
          </SheetTitle>
          <SheetDescription>
            {ai.credentials
              ? `Provider aktif. Model: ${ai.credentials.model}${ai.credentials.isDefault ? ' (default)' : ''}.`
              : 'AI belum aktif. Buka Pengaturan > AI untuk mengaktifkan.'}
          </SheetDescription>
        </SheetHeader>

        {!ai.credentials ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-500" />
            <p className="text-sm font-medium">Fitur AI belum aktif</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Aktifkan dulu di Pengaturan, atau pakai default key bawaan AISura.
            </p>
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false)
                navigate('/pengaturan/ai')
              }}
            >
              Buka Pengaturan AI
            </Button>
          </div>
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'chat' | 'template')} className="flex flex-1 min-h-0 flex-col">
            <div className="px-5 pt-3">
              <TabsList className="w-full">
                <TabsTrigger value="chat" className="flex-1">Buat Surat (Chat)</TabsTrigger>
                <TabsTrigger value="template" className="flex-1">Saran Placeholder</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="m-0 flex flex-1 min-h-0 flex-col">
              <ChatPanel previewBridge={previewBridge} />
            </TabsContent>

            <TabsContent value="template" className="m-0 flex flex-1 min-h-0 flex-col">
              <TemplateSuggesterPanel />
            </TabsContent>
          </Tabs>
        )}
        <LetterPreviewBridge bridge={previewBridge} />
      </SheetContent>
    </Sheet>
  )
}

// =================================================================
// Chat panel
// =================================================================

interface ChatPanelProps {
  previewBridge: ReturnType<typeof useLetterPreviewBridge>
}

function ChatPanel({ previewBridge }: ChatPanelProps) {
  const ai = useAI()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const toolContext = useMemo(
    () => ({
      onPreviewLetter: async (input: { templateId: string; templateName: string; values: Record<string, string> }) => {
        await previewBridge.requestPreview(input)
        return 'Preview surat telah dibuka untuk dilihat oleh user.'
      },
    }),
    [previewBridge],
  )

  const chat = useAIChat(ai.credentials, { toolContext })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chat.messages])

  // Auto-resize textarea: grow from min (2 lines) up to max (7 lines), scroll past that.
  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    const styles = window.getComputedStyle(ta)
    const lineHeight = parseFloat(styles.lineHeight) || 20
    const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
    const borderY = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth)
    const minHeight = lineHeight * 2 + paddingY + borderY
    const maxHeight = lineHeight * 7 + paddingY + borderY

    ta.style.height = 'auto'
    const next = Math.min(Math.max(ta.scrollHeight, minHeight), maxHeight)
    ta.style.height = `${next}px`
    ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [input])

  const submit = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    await chat.send(text)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 space-y-3 overflow-y-auto px-5 py-4">
        {chat.messages.length === 0 ? (
          <ChatEmptyState
            onPick={(prompt) => setInput(prompt)}
          />
        ) : (
          chat.messages.map((m, idx) => (
            <MessageBubble
              key={m.uiId}
              message={m}
              isStreaming={chat.busy && idx === chat.messages.length - 1 && m.role === 'assistant'}
            />
          ))
        )}
      </div>

      {chat.error && (
        <div className="mx-5 mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {chat.error}
        </div>
      )}

      <div className="border-t border-white/40 px-5 py-3 dark:border-white/10">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Contoh: Buatkan surat keterangan domisili untuk Pak Sena…"
            rows={2}
            className="resize-none leading-6"
            disabled={chat.busy}
          />
          {chat.busy ? (
            <Button size="icon" variant="outline" onClick={chat.abort} title="Batalkan">
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={submit} disabled={!input.trim()} title="Kirim">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Enter untuk kirim, Shift+Enter untuk baris baru</span>
          {chat.messages.length > 0 && (
            <button onClick={chat.reset} className="inline-flex items-center gap-1 hover:text-foreground">
              <RefreshCw className="h-3 w-3" />
              Mulai ulang
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatEmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const samples = [
    'Buatkan surat keterangan domisili untuk Sena.',
    'Tampilkan template yang ada, saya mau buat surat.',
    'Saya butuh surat keterangan tidak mampu untuk warga.',
  ]
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
        <Sparkles className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium">Mau bikin surat apa hari ini?</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        AI cuma akan menanyakan template + warga. Tanggal surat, nomor surat, dan kepala desa otomatis terisi.
      </p>
      <div className="grid w-full gap-2">
        {samples.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-white/60 bg-white/60 p-3 text-left text-xs hover:border-blue-200 hover:bg-blue-50 dark:border-white/10 dark:bg-zinc-950/40 dark:hover:bg-blue-950/20"
          >
            <FileSearch className="mb-1 h-3.5 w-3.5 text-blue-500" />
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
