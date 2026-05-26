import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User, Wrench, ChevronDown, ChevronRight, FileText, IdCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIChatMessage } from '@/services/ai'
import type { UIMessage } from './useAIChat'

interface Props {
  message: UIMessage
  isStreaming?: boolean
  /** When true, this assistant message follows a tool that returned choices.
   *  Used to auto-collapse redundant markdown list re-printing. */
  hasChoicesAbove?: boolean
}

export function MessageBubble({ message, isStreaming, hasChoicesAbove }: Props) {
  const [toolOpen, setToolOpen] = useState(false)
  const [listExpanded, setListExpanded] = useState(false)

  if (message.role === 'system') return null

  if (message.role === 'tool') {
    return (
      <div className="flex items-start gap-2 px-1 text-[11px] text-muted-foreground">
        <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
        <button
          type="button"
          onClick={() => setToolOpen((v) => !v)}
          className="text-left hover:text-foreground"
        >
          <span className="font-data-number">{message.name || 'tool'}</span>
          <span className="ml-1">{toolOpen ? <ChevronDown className="inline h-3 w-3" /> : <ChevronRight className="inline h-3 w-3" />}</span>
          {toolOpen && (
            <pre className="mt-1 max-h-48 overflow-auto rounded-md border bg-muted/30 p-2 text-[10px] leading-snug whitespace-pre-wrap font-data-number">
              {message.content}
            </pre>
          )}
        </button>
      </div>
    )
  }

  const isUser = message.role === 'user'
  const text = message.content || (isStreaming ? '' : '')

  // User-side: render compact "picked" pill instead of plain text when relevant
  if (isUser && message.pickedFrom) {
    const Icon = message.pickedFrom.kind === 'pick_template' ? FileText : IdCard
    return (
      <div className="flex w-full justify-end">
        <div className="flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-blue-200/40 dark:shadow-none">
          <Icon className="h-3.5 w-3.5" />
          <span className="max-w-[260px] truncate">{text}</span>
        </div>
        <div className="ml-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <User className="h-4 w-4" />
        </div>
      </div>
    )
  }

  // Detect redundant list (>=2 numbered/bulleted lines) when choices already shown above
  const collapsedList = useMemo(() => {
    if (isUser) return null
    if (!hasChoicesAbove) return null
    if (!text) return null
    const lines = text.split('\n')
    const listLines = lines.filter((l) => /^\s*(?:\d+\.|[-*])\s+/.test(l))
    if (listLines.length < 2) return null
    // Strip the list block, leaving only intro/outro prose.
    const nonList = lines.filter((l) => !/^\s*(?:\d+\.|[-*])\s+/.test(l)).join('\n').trim()
    return { listLines, nonList, fullText: text }
  }, [text, hasChoicesAbove, isUser])

  return (
    <div className={cn('flex w-full gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'bg-blue-600 text-white'
            : 'border border-white/60 bg-white/75 text-foreground backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/65',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{text}</p>
        ) : text ? (
          collapsedList ? (
            <div className="space-y-1">
              {collapsedList.nonList && (
                <div className={cn('prose prose-sm max-w-none dark:prose-invert', '[&_p]:my-1')}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{collapsedList.nonList}</ReactMarkdown>
                </div>
              )}
              <button
                type="button"
                onClick={() => setListExpanded((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {listExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {listExpanded ? 'Sembunyikan daftar tekstual' : 'Lihat daftar tekstual'}
              </button>
              {listExpanded && (
                <div className={cn('prose prose-sm max-w-none border-l-2 border-blue-200/70 pl-2 dark:prose-invert dark:border-blue-900/40', '[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1')}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{collapsedList.listLines.join('\n')}</ReactMarkdown>
                </div>
              )}
            </div>
          ) : (
            <div className={cn('prose prose-sm max-w-none dark:prose-invert', '[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1')}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          )
        ) : (
          <span className="inline-flex gap-0.5">
            <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]"></span>
            <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]"></span>
            <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]"></span>
          </span>
        )}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.tool_calls.map((tc) => (
              <div key={tc.id} className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
                <Wrench className="h-3 w-3 text-blue-500" />
                <span className="font-data-number">{tc.function.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

// Re-export AIChatMessage for callers that want the underlying type
export type { AIChatMessage }
