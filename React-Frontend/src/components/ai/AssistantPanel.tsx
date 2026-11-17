import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff, Send, X } from 'lucide-react'
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
    if (!value) return
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
    <>
      <div className="slideover-backdrop" onClick={onClose} />
      <div className="slideover" role="dialog" aria-label={t('AI assistant', 'المساعد الذكي')}>
        <div className="row between" style={{ padding: 16, borderBlockEnd: '1px solid var(--line)' }}>
          <h2>{t('AI assistant', 'المساعد الذكي')}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Close', 'إغلاق')}>
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="col" style={{ flex: 1, overflowY: 'auto', padding: 16, gap: 10 }}>
          {messages.map((m) => (
            <div key={m.id} className="col" style={{ alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 6 }}>
              <div
                className="card"
                style={{ background: m.from === 'user' ? 'var(--brand-tint)' : 'var(--surface-2)', margin: 0 }}
              >
                {L(m.text)}
              </div>
              {m.matchedPersonId && (
                <button
                  type="button"
                  className="btn sm primary"
                  style={{ alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start' }}
                  onClick={() => {
                    navigate(`/customers/${m.matchedPersonId}`)
                    onClose()
                  }}
                >
                  {t('View their journey', 'عرض رحلة العميل')}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="row" style={{ padding: '0 16px', gap: 6 }}>
          {SUGGESTED_QUERIES.map((q) => (
            <button key={q.en} type="button" className="chip" style={{ cursor: 'pointer' }} onClick={() => send(t(q.en, q.ar))}>
              {t(q.en, q.ar)}
            </button>
          ))}
        </div>

        <div className="row" style={{ padding: 16, borderBlockStart: '1px solid var(--line)' }}>
          {RecognitionCtor && (
            <button
              type="button"
              className="icon-btn"
              title={t('Voice input', 'الإدخال الصوتي')}
              aria-label={t('Voice input', 'الإدخال الصوتي')}
              aria-pressed={listening}
              onClick={toggleVoice}
              style={listening ? { color: 'var(--crit)', borderColor: 'var(--crit)' } : undefined}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(draft)}
            placeholder={t('Name, mobile, or a question…', 'اسم، رقم جوال، أو سؤال…')}
          />
          <button type="button" className="btn primary" onClick={() => send(draft)} aria-label={t('Send', 'إرسال')}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </>
  )
}
