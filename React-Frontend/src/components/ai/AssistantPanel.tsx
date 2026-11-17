import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Mic, MicOff, Send, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import {
  useAgentDirectory,
  useAllInteractions,
  useCorrectiveActions,
  useDetractorCallItems,
  useHomeSummary,
  usePatterns,
  usePersonas,
  usePersons,
  useShopperCases,
  useSignals,
} from '../../services/queries'
import { SheetTitle } from '@/components/ui/sheet'
import { answerQuestion, SUGGESTED_QUERIES, type AssistantDataset } from './assistantEngine'
import type { Bi } from '../../types'

interface Message {
  id: number
  from: 'user' | 'assistant'
  text: Bi
  matchedPersonId?: string
}

/** Minimal surface of the Web Speech API this component uses — not in
 * standard TS lib.dom typings, so declared locally rather than widened
 * with `any` (UI_UX_SPECIFICATION.md §4: "a real feature-detection
 * requirement, not graceful-degradation boilerplate"). */
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Fully mocked UI — no real API call, no key management (the user's
 * explicit Phase 2 decision). Reachable from every page via `Shell`'s
 * header button. Answers are computed live against the same mock
 * repository every other page reads (`assistantEngine.ts`), standing in for
 * the "built-in bilingual keyword parser" the AI Agents Specification
 * describes as the fallback/acceptance-test engine — real Claude wiring is
 * an explicit later decision, not assumed here (APPLICATION_MODULES.md §B).
 */
export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const { lang, t, L } = useI18n()
  const { role } = useRole()
  const navigate = useNavigate()

  const { data: persons } = usePersons()
  const { data: interactions } = useAllInteractions()
  const { data: signals } = useSignals()
  const { data: patterns } = usePatterns()
  const { data: correctiveActions } = useCorrectiveActions()
  const { data: shopperCases } = useShopperCases()
  const { data: personas } = usePersonas()
  const { data: detractorCallItems } = useDetractorCallItems()
  const { data: agentDirectory } = useAgentDirectory()
  const { data: homeSummary } = useHomeSummary()

  const dataset: AssistantDataset = useMemo(
    () => ({
      persons: persons ?? [],
      interactions: interactions ?? [],
      signals: signals ?? [],
      patterns: patterns ?? [],
      correctiveActions: correctiveActions ?? [],
      shopperCases: shopperCases ?? [],
      personas: personas ?? [],
      detractorCallItems: detractorCallItems ?? [],
      agentDirectory: agentDirectory ?? [],
      homeSummary,
    }),
    [persons, interactions, signals, patterns, correctiveActions, shopperCases, personas, detractorCallItems, agentDirectory, homeSummary],
  )
  // Answering before every query has resolved would report zeros as facts.
  const ready = [persons, interactions, signals, patterns, correctiveActions, shopperCases, personas, detractorCallItems, agentDirectory, homeSummary].every(
    (d) => d !== undefined,
  )

  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: 'assistant', text: { en: 'Ask about a person, or ask a free-text question.', ar: 'اسأل عن شخص، أو اطرح سؤالاً حراً.' } },
  ])
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const RecognitionCtor = useMemo(() => getSpeechRecognitionCtor(), [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    return () => recognitionRef.current?.stop()
  }, [])

  function send(text: string) {
    const value = text.trim()
    if (!value || !ready) return
    const userMsg: Message = { id: Date.now(), from: 'user', text: { en: value, ar: value } }
    const reply = answerQuestion(value, role.id, dataset)
    const replyMsg: Message = { id: Date.now() + 1, from: 'assistant', text: reply.text, matchedPersonId: reply.matchedPersonId }
    setMessages((m) => [...m, userMsg, replyMsg])
    setDraft('')
  }

  function toggleVoice() {
    if (!RecognitionCtor) return
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const recognition = new RecognitionCtor()
    recognition.lang = lang === 'ar' ? 'ar-AE' : 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) setDraft(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold text-gold-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <SheetTitle className="text-lg leading-tight font-semibold">{t('AI assistant', 'المساعد الذكي')}</SheetTitle>
          <span className="truncate text-xs text-muted-foreground">
            {t('Answers from the sample data, within your role', 'إجابات من البيانات النموذجية، ضمن صلاحيات دورك')}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('Close', 'إغلاق')}>
          <X aria-hidden />
        </Button>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label={t('Conversation', 'المحادثة')}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((m) => {
          const mine = m.from === 'user'
          return (
            <div key={m.id} className={cn('flex max-w-[88%] flex-col gap-1.5', mine ? 'items-end self-end' : 'items-start self-start')}>
              <div
                className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-base leading-relaxed whitespace-pre-line shadow-xs',
                  mine ? 'rounded-ee-sm bg-primary text-primary-foreground' : 'rounded-es-sm border bg-card text-card-foreground',
                )}
              >
                {L(m.text)}
              </div>
              {m.matchedPersonId && (
                <Button
                  size="sm"
                  onClick={() => {
                    navigate(`/customers/${m.matchedPersonId}`)
                    onClose()
                  }}
                >
                  {t('View their journey', 'عرض رحلة العميل')}
                  <ArrowRight aria-hidden className="rtl:rotate-180" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t bg-card">
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1" aria-label={t('Suggested questions', 'أسئلة مقترحة')} role="group">
          {SUGGESTED_QUERIES.map((q) => (
            <Button
              key={q.en}
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full font-normal"
              disabled={!ready}
              onClick={() => send(t(q.en, q.ar))}
            >
              {t(q.en, q.ar)}
            </Button>
          ))}
        </div>

        <form
          className="flex items-center gap-2 px-4 pt-2 pb-4"
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
        >
          {RecognitionCtor && (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              title={t('Voice input', 'الإدخال الصوتي')}
              aria-label={listening ? t('Stop voice input', 'إيقاف الإدخال الصوتي') : t('Voice input', 'الإدخال الصوتي')}
              aria-pressed={listening}
              onClick={toggleVoice}
              className={cn('shrink-0', listening && 'border-destructive bg-destructive/10 text-danger-text animate-pulse motion-reduce:animate-none')}
            >
              {listening ? <MicOff aria-hidden /> : <Mic aria-hidden />}
            </Button>
          )}
          <Input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={t('Ask the assistant', 'اسأل المساعد')}
            placeholder={
              !ready
                ? t('Loading the sample data…', 'جارٍ تحميل البيانات النموذجية…')
                : listening
                  ? t('Listening…', 'جارٍ الاستماع…')
                  : t('Name, mobile, or a question…', 'اسم، رقم جوال، أو سؤال…')
            }
            className="h-10 min-w-0 flex-1"
          />
          <Button type="submit" size="icon-lg" className="shrink-0" disabled={!draft.trim() || !ready} aria-label={t('Send', 'إرسال')}>
            <Send aria-hidden className="rtl:-scale-x-100" />
          </Button>
        </form>
      </div>
    </div>
  )
}
