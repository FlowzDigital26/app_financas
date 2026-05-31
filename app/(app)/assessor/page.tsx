'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, Send, Loader2, User, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: `Olá! Sou o **Assessor Flowz**, seu assistente financeiro pessoal.

Tenho acesso às suas transações dos últimos 3 meses e posso ajudar você a:

- **Analisar seus gastos** por categoria e período
- **Identificar padrões** e oportunidades de economia
- **Comparar** receitas e despesas
- **Sugerir** estratégias para atingir suas metas

O que gostaria de saber sobre suas finanças hoje?`,
}

function renderMarkdown(content: string) {
  const lines = content.split('\n')

  return lines.map((line, i) => {
    const bold = (text: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*)/)
      return parts.map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : <span key={j}>{part}</span>
      )
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-accent shrink-0 mt-0.5 text-xs">●</span>
          <span>{bold(line.slice(2))}</span>
        </div>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-1" />
    return <p key={i}>{bold(line)}</p>
  })
}

export default function AssessorPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px'
  }, [])

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    setLoading(true)

    try {
      const res = await fetch('/api/assessor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(err.error ?? 'Erro ao contatar o assessor')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Sem stream de resposta')

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.'
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `Desculpe, não consegui processar sua mensagem. **Erro:** ${message}` },
      ])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleReset() {
    setMessages([WELCOME_MESSAGE])
    setInput('')
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-[calc(100svh-11rem)] min-h-[480px]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border shrink-0">
        <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-accent" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-display font-semibold leading-tight">Assessor Flowz</h1>
          <p className="text-xs text-muted-foreground">Assistente financeiro com IA · Últimos 3 meses</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Reiniciar conversa"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg, i) => {
          const isStreaming = loading && i === messages.length - 1 && msg.role === 'assistant' && msg.content === ''
          return (
            <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                msg.role === 'assistant' ? 'bg-accent/15' : 'bg-primary'
              )}>
                {msg.role === 'assistant'
                  ? <Bot className="w-4 h-4 text-accent" />
                  : <User className="w-4 h-4 text-primary-foreground" />
                }
              </div>

              <div className={cn(
                'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1',
                msg.role === 'assistant'
                  ? 'bg-card border border-border rounded-tl-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-sm'
              )}>
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : msg.role === 'assistant' ? (
                  renderMarkdown(msg.content)
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-border shrink-0">
        <form onSubmit={sendMessage} className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); resizeTextarea() }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre seus gastos, categorias, dicas de economia..."
            rows={1}
            disabled={loading}
            className={cn(
              'flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'placeholder:text-muted-foreground min-h-[48px] overflow-y-auto',
              'disabled:opacity-50'
            )}
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading}
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
