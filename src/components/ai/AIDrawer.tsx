import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Send, RefreshCw, StopCircle, FileSearch, ShieldAlert } from 'lucide-react'
import { useAI } from '@/contexts/AIContext'
import { useNavigationContext } from '@/lib/router'
import { MessageBubble } from './MessageBubble'
import { ChoiceCardList } from './ChoiceCard'
import { StatusPanel } from './StatusPanel'
import { useAIChat, type UIMessage } from './useAIChat'
import { TemplateSuggesterPanel } from './TemplateSuggesterPanel'
import type { LetterPreviewBridgeApi } from './LetterPreviewBridge'
import { sanitizeChatInput } from '@/utils/textNormalizer'

interface AIDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode: 'chat' | 'template'
}

export function AIDrawer({ open, onOpenChange, defaultMode }: AIDrawerProps) {
  const ai = useAI()
  const { navigate } = useNavigationContext()
  const [mode, setMode] = useState<'chat' | 'template'>(defaultMode)

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
            AISura Assistant
          </SheetTitle>
          <SheetDescription>
            {ai.credentials
              ? `Provider aktif. Model: ${ai.credentials.model}.`
              : 'AI belum aktif. Buka Pengaturan > AI untuk mengaktifkan.'}
          </SheetDescription>
        </SheetHeader>

        {!ai.credentials ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-500" />
            <p className="text-sm font-medium">Fitur AI belum aktif</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Aktifkan dulu di Pengaturan, lalu isi kredensial provider AI Anda.
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
                <TabsTrigger value="chat" className="flex-1">Buat Surat</TabsTrigger>
                <TabsTrigger value="template" className="flex-1">Template</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="m-0 flex flex-1 min-h-0 flex-col">
              <ChatPanel previewBridge={ai.previewBridge} />
            </TabsContent>

            <TabsContent value="template" className="m-0 flex flex-1 min-h-0 flex-col">
              <TemplateSuggesterPanel />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
}

// =================================================================
// Chat panel
// =================================================================

interface ChatPanelProps {
  previewBridge: LetterPreviewBridgeApi
}

function ChatPanel({ previewBridge }: ChatPanelProps) {
  const ai = useAI()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const toolContext = useMemo(() => ({}), [])
  const chat = useAIChat(ai.credentials, { toolContext })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chat.messages, chat.status])

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
    const cleaned = sanitizeChatInput(input).trim()
    if (!cleaned) return
    setInput('')
    await chat.send(cleaned)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Sanitize pasted text — strip control chars, soft hyphens, smart quotes, etc.
    const pasted = e.clipboardData.getData('text/plain')
    if (!pasted) return
    const cleaned = sanitizeChatInput(pasted)
    if (cleaned !== pasted) {
      e.preventDefault()
      const target = e.currentTarget
      const start = target.selectionStart ?? input.length
      const end = target.selectionEnd ?? input.length
      const next = input.slice(0, start) + cleaned + input.slice(end)
      setInput(next)
      // Restore cursor position after insertion (in next tick).
      requestAnimationFrame(() => {
        try {
          target.selectionStart = target.selectionEnd = start + cleaned.length
        } catch { /* ignore */ }
      })
    }
  }

  // Refocus textarea ketika reply AI selesai (chat.busy false→true→false transition).
  // Tanpa ini, focus hilang saat textarea di-disable selama AI memproses.
  const wasBusyRef = useRef(false)
  useEffect(() => {
    if (wasBusyRef.current && !chat.busy) {
      // AI baru saja selesai. Refocus textarea kalau drawer masih ke-render.
      // Pakai setTimeout supaya state disabled dilepas dulu di DOM.
      const t = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      wasBusyRef.current = chat.busy
      return () => clearTimeout(t)
    }
    wasBusyRef.current = chat.busy
  }, [chat.busy])

  const handlePreview = async () => {
    if (!chat.status || !chat.status.values) return
    const session = chat.getSessionSnapshot()
    if (!session.templateId) return

    // Pemohon name from W1 slot (when present) — used for filename hint
    // before commit; the committed final value will be authoritative on save.
    const w1 = chat.status.slots.find((s) => s.slot === 1)
    const pemohonName = w1?.nama ?? ''

    await previewBridge.requestPreview({
      templateId: chat.status.templateId,
      templateName: chat.status.templateName,
      values: chat.status.values,
      pemohonName,
      commit: async () => {
        // 1. Consume counter + build authoritative values map.
        const { finalizeLetter } = await import('@/services/ai/letterAutoResolver')
        const finalized = await finalizeLetter({
          templateId: session.templateId!,
          wargaSlots: session.wargaSlots,
          customValues: session.customValues,
        })

        // 2. Save riwayat so the surat shows up in Riwayat Surat.
        const { saveRiwayat } = await import('@/services/riwayatService')
        await saveRiwayat(
          session.templateId!,
          chat.status!.templateName,
          finalized.nomorSurat,
          finalized.nomorUrut,
          finalized.values,
          finalized.pemohon,
          finalized.nomorUrutAkhir,
        )

        return {
          values: finalized.values,
          pemohonName: finalized.pemohon.nama,
          nomorSurat: finalized.nomorSurat,
        }
      },
    })
  }

  // Determine which tool message holds the latest pending choices, so only that
  // ChoiceCardList renders interactive (older ones disabled).
  const latestPendingChoiceMsgId = useMemo(() => {
    if (!chat.pendingChoices) return null
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      const m = chat.messages[i]
      if (m.role === 'tool' && m.quickReplies && m.quickReplies.choices.length > 0) {
        return m.uiId
      }
    }
    return null
  }, [chat.messages, chat.pendingChoices])

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 space-y-3 overflow-y-auto px-5 py-4">
        {chat.messages.length === 0 ? (
          <ChatEmptyState onPick={(prompt) => setInput(prompt)} />
        ) : (
          <ChatHistory
            messages={chat.messages}
            busy={chat.busy}
            latestPendingChoiceMsgId={latestPendingChoiceMsgId}
            onPickChoice={chat.pickChoice}
          />
        )}

        {/* Sticky-ish status panel rendered after chat history when active */}
        {chat.status && (
          <StatusPanel
            status={chat.status}
            onPreview={handlePreview}
            busy={previewBridge.loading}
          />
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
            onPaste={onPaste}
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

interface ChatHistoryProps {
  messages: UIMessage[]
  busy: boolean
  latestPendingChoiceMsgId: string | null
  onPickChoice: ReturnType<typeof useAIChat>['pickChoice']
}

function ChatHistory({ messages, busy, latestPendingChoiceMsgId, onPickChoice }: ChatHistoryProps) {
  // For each assistant message, determine whether it follows a tool message
  // that produced choices — used to auto-collapse redundant lists.
  return (
    <>
      {messages.map((m, idx) => {
        const isLastAssistantStreaming =
          busy && idx === messages.length - 1 && m.role === 'assistant'

        // Did the previous tool message yield choices?
        const hasChoicesAbove = (() => {
          if (m.role !== 'assistant') return false
          for (let i = idx - 1; i >= 0; i--) {
            const prev = messages[i]
            if (prev.role === 'tool') {
              return !!(prev.quickReplies && prev.quickReplies.choices.length > 0)
            }
            if (prev.role === 'user') return false
          }
          return false
        })()

        if (m.role === 'tool' && m.quickReplies && m.quickReplies.choices.length > 0) {
          const isActive = m.uiId === latestPendingChoiceMsgId && !busy
          return (
            <div key={m.uiId} className="space-y-2">
              <MessageBubble message={m} />
              <ChoiceCardList
                quickReplies={m.quickReplies}
                active={isActive}
                onPick={(c) => onPickChoice(c, m.quickReplies!.kind, m.quickReplies!.slot)}
              />
            </div>
          )
        }

        return (
          <MessageBubble
            key={m.uiId}
            message={m}
            isStreaming={isLastAssistantStreaming}
            hasChoicesAbove={hasChoicesAbove}
          />
        )
      })}
    </>
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
