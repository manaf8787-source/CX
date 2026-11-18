import { useEffect, useMemo, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Mic, MicOff, Send, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
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
  useEffortSummaries,
  useHomeSummary,
  usePatterns,
  usePersonas,
  usePersons,
  useShopperCases,
  useSignals,
} from '../../services/queries'
import { SheetTitle } from '@/components/ui/sheet'
import { answerQuestion, SUGGESTED_QUERIES, type AssistantAnswer, type AssistantDataset } from './assistantEngine'
import { AssistantResult } from './AssistantResult'
import type { Bi } from '../../types'

interface Message {
  id: number
  from: 'user' | 'assistant'
  text: Bi
  matchedPersonId?: string
  answer?: AssistantAnswer
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
export function AssistantPanel({ onClose, initialQuestion }: { onClose: () => void; initialQuestion?: string }) {
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
  const { data: effortSummaries } = useEffortSummaries()

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
      effortSummaries: effortSummaries ?? [],
      homeSummary,
    }),
    [persons, interactions, signals, patterns, correctiveActions, shopperCases, personas, detractorCallItems, agentDirectory, effortSummaries, homeSummary],
  )
  // Answering before every query has resolved would report zeros as facts.
  const ready = [persons, interactions, signals, patterns, correctiveActions, shopperCases, personas, detractorCallItems, agentDirectory, effortSummaries, homeSummary].every(
    (d) => d !== undefined,
  )

  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: 'assistant', text: { en: 'Ask about a person, or ask a free-text question.', ar: 'اسأل عن شخص، أو اطرح سؤالاً حراً.' } },
  ])
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const replyTimer = useRef<number | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const RecognitionCtor = useMemo(() => getSpeechRecognitionCtor(), [])
  const [voiceQuestion, setVoiceQuestion] = useState<string | null>(null)
  const askedInitial = useRef(false)

  // KB §13: "speak, and the request runs when you stop"; a question typed in
  // the Home or header search runs as soon as the sample data has loaded.
  useEffect(() => {
    if (!ready) return
    if (voiceQuestion) {
      send(voiceQuestion)
      setVoiceQuestion(null)
    } else if (initialQuestion && !askedInitial.current) {
      askedInitial.current = true
      send(initialQuestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, voiceQuestion, initialQuestion])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, thinking])

  useEffect(() => () => window.clearTimeout(replyTimer.current), [])

  useEffect(() => {
    return () => recognitionRef.current?.stop()
  }, [])

  function send(text: string) {
    const value = text.trim()
    if (!value || !ready || thinking) return
    const userMsg: Message = { id: Date.now(), from: 'user', text: { en: value, ar: value } }
    const reply = answerQuestion(value, role.id, dataset)
    const replyMsg: Message = { id: Date.now() + 1, from: 'assistant', text: reply.text, matchedPersonId: reply.matchedPersonId, answer: reply }
    setMessages((list) => [...list, userMsg])
    setDraft('')
    // A short pause with a typing indicator; the answer itself is already computed.
    setThinking(true)
    replyTimer.current = window.setTimeout(() => {
      setMessages((list) => [...list, replyMsg])
      setThinking(false)
    }, 550)
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
      if (transcript) setVoiceQuestion(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {/* Floating drawer header: 60px, the dark assistant mark, title and meta, a 30px light close button. */}
      <header className="flex min-h-[60px] items-center gap-3 ps-5 pe-4">
        <span aria-hidden className="material-dark grid size-[30px] shrink-0 place-items-center rounded-full">
          <Sparkles className="size-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <SheetTitle className="leading-tight">{t('AI assistant', 'المساعد الذكي')}</SheetTitle>
          <span className="truncate text-xs text-muted-foreground">
            {t('Built-in parser (no connection) · sample data, within your role', 'المحلّل المدمج (دون اتصال) · بيانات نموذجية ضمن صلاحيات دورك')}
          </span>
        </div>
        <Button variant="outline" size="icon-sm" onClick={onClose} aria-label={t('Close', 'إغلاق')}>
          <X aria-hidden />
        </Button>
      </header>

      {/* The conversation sits in a well; the two bubbles are the two materials: yours is dark, the assistant's is light. */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label={t('Conversation', 'المحادثة')}
        tabIndex={0}
        className="well mx-2.5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto outline-none"
      >
        {messages.map((msg) => {
          const mine = msg.from === 'user'
          return (
            <m.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex max-w-[88%] flex-col gap-1.5', mine ? 'items-end self-end' : 'items-start self-start')}
            >
              <div
                className={cn(
                  'rounded-[20px] px-4 pt-2.5 pb-3 text-base leading-relaxed whitespace-pre-line',
                  mine ? 'material-dark rounded-ee-[6px]' : 'material-light rounded-es-[6px]',
                )}
              >
                {L(msg.text)}
              </div>
              {msg.answer && (msg.answer.people || msg.answer.plan || msg.answer.brief) && (
                <AssistantResult
                  answer={msg.answer}
                  onOpenPerson={(id) => {
                    navigate(`/customers/${id}`)
                    onClose()
                  }}
                  onDone={(message) => toast.success(message)}
                />
              )}
              {msg.matchedPersonId && (
                <Button
                  size="sm"
                  onClick={() => {
                    navigate(`/customers/${msg.matchedPersonId}`)
                    onClose()
                  }}
                >
                  {t('View their journey', 'عرض رحلة العميل')}
                  <ArrowRight aria-hidden className="rtl:rotate-180" />
                </Button>
              )}
            </m.div>
          )
        })}
        {thinking && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="material-light flex items-center gap-1 self-start rounded-[20px] rounded-es-[6px] px-4 py-3.5"
          >
            <span className="sr-only">{t('The assistant is answering…', 'المساعد يجيب…')}</span>
            {[0, 1, 2].map((i) => (
              <span key={i} aria-hidden className="cx-typing-dot size-1.5 rounded-full bg-muted-foreground" />
            ))}
          </m.div>
        )}
      </div>

      <div className="flex flex-col gap-2 pb-4">
        <div className="flex gap-2 overflow-x-auto px-5 pt-3 pb-1 outline-none" aria-label={t('Suggested questions', 'أسئلة مقترحة')} role="group" tabIndex={0}>
          {SUGGESTED_QUERIES.map((q) => (
            <Button key={q.en} type="button" variant="outline" size="sm" className="shrink-0" disabled={!ready || thinking} onClick={() => send(t(q.en, q.ar))}>
              {t(q.en, q.ar)}
            </Button>
          ))}
        </div>

        <form
          className="flex items-center gap-2 px-5"
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
        >
          {RecognitionCtor && (
            <Button
              type="button"
              variant={listening ? 'default' : 'outline'}
              size="icon-lg"
              title={t('Voice input', 'الإدخال الصوتي')}
              aria-label={listening ? t('Stop voice input', 'إيقاف الإدخال الصوتي') : t('Voice input', 'الإدخال الصوتي')}
              aria-pressed={listening}
              onClick={toggleVoice}
              className={cn('shrink-0', listening && 'animate-pulse motion-reduce:animate-none')}
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
          <Button type="submit" size="icon-lg" className="shrink-0" disabled={!draft.trim() || !ready || thinking} aria-label={t('Send', 'إرسال')}>
            <Send aria-hidden className="rtl:-scale-x-100" />
          </Button>
        </form>
      </div>
    </div>
  )
}
