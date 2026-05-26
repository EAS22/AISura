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
  type AIResolvedCredentials,
  type SessionState,
  type ToolContext,
} from '@/services/ai'

interface UIMessage extends AIChatMessage {
  uiId: string
}

interface UseAIChatOptions {
  toolContext: ToolContext
}

interface UseAIChatResult {
  messages: UIMessage[]
  busy: boolean
  error: string | null
  send: (text: string) => Promise<void>
  reset: () => void
  abort: () => void
}

const MAX_TOOL_ROUNDS = 8

export function useAIChat(creds: AIResolvedCredentials | null, options: UseAIChatOptions): UseAIChatResult {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionRef = useRef<SessionState>(createSessionState())

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    sessionRef.current = createSessionState()
    setMessages([])
    setBusy(false)
    setError(null)
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
  }, [])

  const send = useCallback(
    async (text: string) => {
      const userText = text.trim()
      if (!userText) return
      if (!creds) {
        setError('AI belum dikonfigurasi. Buka Pengaturan > AI dulu.')
        return
      }
      if (busy) return

      setError(null)

      // Off-topic guard — short-circuit without hitting AI.
      if (isLikelyOffTopic(userText)) {
        setMessages((prev) => [
          ...prev,
          { uiId: uuid(), role: 'user', content: userText },
          { uiId: uuid(), role: 'assistant', content: OFF_TOPIC_REPLY },
        ])
        return
      }

      const userMsg: UIMessage = { uiId: uuid(), role: 'user', content: userText }
      const placeholderMsg: UIMessage = { uiId: uuid(), role: 'assistant', content: '' }

      setMessages((prev) => [...prev, userMsg, placeholderMsg])
      setBusy(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const baseHistory: AIChatMessage[] = [
          { role: 'system', content: CHAT_LETTER_SYSTEM_PROMPT },
          ...messages
            .filter((m) => m.role !== 'system')
            .map(({ uiId: _id, ...rest }) => rest as AIChatMessage),
          { role: 'user', content: userText },
        ]

        let working: AIChatMessage[] = baseHistory
        let assistantUiId = placeholderMsg.uiId

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
            setMessages((prev) => [...prev, { ...toolMsg, uiId: uuid() }])
          }

          const nextId = uuid()
          assistantUiId = nextId
          setMessages((prev) => [...prev, { uiId: nextId, role: 'assistant', content: '' }])
        }
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

  return { messages, busy, error, send, reset, abort }
}
