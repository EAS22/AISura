import { useCallback, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import {
  CHAT_LETTER_SYSTEM_PROMPT,
  TOOL_DEFINITIONS,
  createSessionState,
  executeTool,
  isLikelyOffTopic,
  OFF_TOPIC_REPLY,
  streamChatCompletion,
  type AIChatMessage,
  type AIChoice,
  type AILetterStatus,
  type AIQuickReplies,
  type AIResolvedCredentials,
  type SessionState,
  type ToolContext,
} from '@/services/ai'

export interface UIMessage extends AIChatMessage {
  uiId: string
  /** Set on tool-role messages: structured payload for choice cards / status. */
  quickReplies?: AIQuickReplies
  status?: AILetterStatus
  /** Set when user clicks a choice card — used to render compact pill in chat history. */
  pickedFrom?: { kind: 'pick_template' | 'pick_warga'; choiceId: string }
}

interface UseAIChatOptions {
  toolContext: ToolContext
}

interface UseAIChatResult {
  messages: UIMessage[]
  busy: boolean
  error: string | null
  send: (text: string) => Promise<void>
  pickChoice: (choice: AIChoice, kind: AIQuickReplies['kind'], slot?: number) => Promise<void>
  reset: () => void
  abort: () => void
  /** Latest letter status snapshot (mirrors session.lastStatus). */
  status: AILetterStatus | null
  /** Latest unanswered quick replies (cleared once user picks or sends another message). */
  pendingChoices: AIQuickReplies | null
  /**
   * Snapshot of the internal session for use by callers that need to
   * commit the letter (mainly the download flow which has to consume
   * the nomor surat counter and save riwayat).
   */
  getSessionSnapshot: () => {
    templateId?: string
    wargaSlots: Record<string, string>
    customValues: Record<string, string>
  }
}

const MAX_TOOL_ROUNDS = 8

export function useAIChat(creds: AIResolvedCredentials | null, options: UseAIChatOptions): UseAIChatResult {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<AILetterStatus | null>(null)
  const [pendingChoices, setPendingChoices] = useState<AIQuickReplies | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionRef = useRef<SessionState>(createSessionState())

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    sessionRef.current = createSessionState()
    setMessages([])
    setBusy(false)
    setError(null)
    setStatus(null)
    setPendingChoices(null)
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
  }, [])

  /**
   * If the user types a bare digit while a quick-reply set is pending,
   * translate to a structured choice message before sending.
   */
  const interceptNumericReply = useCallback(
    (text: string): { kind: 'literal' | 'choice'; payload: string; choice?: AIChoice; meta?: { kind: 'pick_template' | 'pick_warga'; slot?: number } } => {
      const digit = text.trim().match(/^([1-9]\d?)$/)
      if (!digit || !pendingChoices) return { kind: 'literal', payload: text }
      const idx = parseInt(digit[1], 10) - 1
      const choice = pendingChoices.choices[idx]
      if (!choice) return { kind: 'literal', payload: text }
      return {
        kind: 'choice',
        payload: structuredChoiceMessage(choice, pendingChoices.kind, pendingChoices.slot),
        choice,
        meta: { kind: pendingChoices.kind === 'generic' ? 'pick_template' : pendingChoices.kind, slot: pendingChoices.slot },
      }
    },
    [pendingChoices],
  )

  const sendInternal = useCallback(
    async (
      text: string,
      opts?: {
        displayText?: string
        pickedFrom?: { kind: 'pick_template' | 'pick_warga'; choiceId: string }
      },
    ) => {
      const userText = text.trim()
      if (!userText) return
      if (!creds) {
        setError('AI belum dikonfigurasi. Buka Pengaturan > AI dulu.')
        return
      }
      if (busy) return

      setError(null)

      // Off-topic guard
      if (isLikelyOffTopic(userText)) {
        setMessages((prev) => [
          ...prev,
          { uiId: uuid(), role: 'user', content: opts?.displayText || userText },
          { uiId: uuid(), role: 'assistant', content: OFF_TOPIC_REPLY },
        ])
        return
      }

      const userMsg: UIMessage = {
        uiId: uuid(),
        role: 'user',
        content: opts?.displayText || userText,
        pickedFrom: opts?.pickedFrom,
      }
      const placeholderMsg: UIMessage = { uiId: uuid(), role: 'assistant', content: '' }

      setMessages((prev) => [...prev, userMsg, placeholderMsg])
      // Once user sends another message, prior pending choices are no longer the latest.
      setPendingChoices(null)
      setBusy(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const baseHistory: AIChatMessage[] = [
          { role: 'system', content: CHAT_LETTER_SYSTEM_PROMPT },
          ...messages
            .filter((m) => m.role !== 'system')
            .map(({ uiId: _id, quickReplies: _qr, status: _st, pickedFrom: _pf, ...rest }) => rest as AIChatMessage),
          { role: 'user', content: userText },
        ]

        let working: AIChatMessage[] = baseHistory
        let assistantUiId = placeholderMsg.uiId
        let latestQuickReplies: AIQuickReplies | null = null

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let streamingText = ''
          const resp = await streamChatCompletion(
            creds,
            { messages: working, tools: TOOL_DEFINITIONS, tool_choice: 'auto' },
            (chunk) => {
              streamingText += chunk
              setMessages((prev) =>
                prev.map((m) => (m.uiId === assistantUiId ? { ...m, content: streamingText } : m)),
              )
            },
            controller.signal,
          )

          const assistantMsg: AIChatMessage = {
            role: 'assistant',
            content: resp.message.content || '',
            tool_calls: resp.message.tool_calls,
          }
          working = [...working, assistantMsg]
          setMessages((prev) =>
            prev.map((m) =>
              m.uiId === assistantUiId
                ? { ...m, content: assistantMsg.content || '', tool_calls: assistantMsg.tool_calls }
                : m,
            ),
          )

          if (!resp.message.tool_calls || resp.message.tool_calls.length === 0) {
            break
          }

          for (const tc of resp.message.tool_calls) {
            const result = await executeTool(
              tc.function.name,
              tc.function.arguments,
              options.toolContext,
              sessionRef.current,
            )
            const toolMsg: AIChatMessage = {
              role: 'tool',
              content: result.content,
              tool_call_id: tc.id,
              name: tc.function.name,
            }
            working = [...working, toolMsg]
            const uiToolMsg: UIMessage = {
              ...toolMsg,
              uiId: uuid(),
              quickReplies: result.raw?.quickReplies,
              status: result.raw?.status,
            }
            setMessages((prev) => [...prev, uiToolMsg])
            if (result.raw?.quickReplies && result.raw.quickReplies.choices.length > 0) {
              // Override (not append): hanya choice set TERAKHIR yang aktif.
              latestQuickReplies = result.raw.quickReplies
            }
            if (result.raw?.status) {
              setStatus(result.raw.status)
            }
          }

          const nextId = uuid()
          assistantUiId = nextId
          setMessages((prev) => [...prev, { uiId: nextId, role: 'assistant', content: '' }])
        }

        // Set pendingChoices to the most recent batch from the entire round
        setPendingChoices(latestQuickReplies)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal menghubungi AI'
        setError(msg)
        setMessages((prev) => {
          const next = [...prev]
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === 'assistant' && !next[i].content) {
              next[i] = { ...next[i], content: `⚠️ ${msg}` }
              break
            }
          }
          return next
        })
      } finally {
        abortRef.current = null
        setBusy(false)
      }
    },
    [creds, busy, messages, options.toolContext],
  )

  const send = useCallback(
    async (text: string) => {
      // Numeric fallback: if user types "1" / "2" while choices pending, translate
      const intercepted = interceptNumericReply(text)
      if (intercepted.kind === 'choice' && intercepted.choice && intercepted.meta) {
        await sendInternal(intercepted.payload, {
          displayText: `Saya pilih: ${intercepted.choice.primary}`,
          pickedFrom: { kind: intercepted.meta.kind, choiceId: intercepted.choice.id },
        })
        return
      }
      await sendInternal(text)
    },
    [interceptNumericReply, sendInternal],
  )

  const pickChoice = useCallback(
    async (choice: AIChoice, kind: AIQuickReplies['kind'], slot?: number) => {
      const payload = structuredChoiceMessage(choice, kind, slot)
      await sendInternal(payload, {
        displayText: `Saya pilih: ${choice.primary}`,
        pickedFrom: kind === 'generic' ? undefined : { kind, choiceId: choice.id },
      })
    },
    [sendInternal],
  )

  const getSessionSnapshot = useCallback(() => {
    const s = sessionRef.current
    return {
      templateId: s.templateId,
      wargaSlots: { ...s.wargaSlots },
      customValues: { ...s.customValues },
    }
  }, [])

  return { messages, busy, error, send, pickChoice, reset, abort, status, pendingChoices, getSessionSnapshot }
}

function structuredChoiceMessage(choice: AIChoice, kind: AIQuickReplies['kind'], slot?: number): string {
  if (kind === 'pick_template') {
    return `Saya pilih template: ${choice.primary} (id: ${choice.id})`
  }
  if (kind === 'pick_warga') {
    const slotPart = slot ? ` untuk slot W${slot}` : ''
    return `Saya pilih warga${slotPart}: ${choice.primary} (id: ${choice.id})`
  }
  return `Saya pilih: ${choice.primary}`
}
