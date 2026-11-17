import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useRole } from '../auth/RoleContext'
import { PageHeader } from '../components/layout/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { Chip } from '../components/ui/Chip'
import { AFTER_SALES_QUEUE } from '../data/afterSales'
import { survey } from '../data/surveys'
import type { AfterSalesQueueItem, CallOutcome } from '../types'

const STATUS_KIND: Record<AfterSalesQueueItem['status'], 'good' | 'warn' | 'crit' | 'acc' | undefined> = {
  queued: undefined, in_progress: 'acc', done: 'good', exhausted: 'crit',
}

const OUTCOMES: { id: CallOutcome; en: string; ar: string }[] = [
  { id: 'reached', en: 'Reached', ar: 'تم الوصول' },
  { id: 'no_answer', en: 'No answer', ar: 'لا يوجد رد' },
  { id: 'busy', en: 'Busy', ar: 'مشغول' },
  { id: 'callback', en: 'Call back later', ar: 'إعادة الاتصال لاحقاً' },
  { id: 'wrong_number', en: 'Wrong number', ar: 'رقم خاطئ' },
  { id: 'declined', en: 'Declined', ar: 'رفض' },
]

export default function AfterSalesDesk() {
  const { L, t, lang } = useI18n()
  const { role } = useRole()
  const [tab, setTab] = useState('queue')
  const [queue, setQueue] = useState<AfterSalesQueueItem[]>(() => AFTER_SALES_QUEUE.map((q) => ({ ...q })))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const isAgent = role?.id === 'asagent'
  const myName = 'Yousef A.' // the signed-in agent in this demo sign-in
  const visibleQueue = isAgent ? queue.filter((q) => q.assignedAgent === myName) : queue
  const active = queue.find((q) => q.id === activeId) ?? null
  const activeSurvey = active ? survey(active.surveyId) : undefined

  const tabs = useMemo(() => {
    const base = [{ id: 'queue', label: t(isAgent ? 'My queue' : 'Team queue', isAgent ? 'طابوري' : 'طابور الفريق') }]
    if (active) base.push({ id: 'screen', label: t('Call screen', 'شاشة الاتصال') })
    base.push({ id: 'results', label: t('Results', 'النتائج') })
    return base
  }, [active, isAgent, t])

  function openCall(item: AfterSalesQueueItem) {
    setActiveId(item.id)
    setAnswers({})
    setNotes('')
    setTab('screen')
  }

  function recordOutcome(outcome: CallOutcome) {
    if (!active) return
    setQueue((qs) => qs.map((q) => {
      if (q.id !== active.id) return q
      if (outcome === 'reached') {
        return { ...q, status: 'done', lastOutcome: outcome, tries: q.tries + 1 }
      }
      const tries = q.tries + 1
      const exhausted = tries >= q.maxTries
      return { ...q, tries, lastOutcome: outcome, status: exhausted ? 'exhausted' : 'in_progress', nextTryAt: exhausted ? undefined : new Date(Date.now() + 24 * 3_600_000).toISOString() }
    }))
    setTab('queue')
    setActiveId(null)
  }

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('After-Sales Desk', 'مكتب ما بعد البيع')} lede={t('Daily call list, retries and the call screen with the right survey version.', 'قائمة الاتصال اليومية، إعادة المحاولة، وشاشة الاتصال بالنسخة الصحيحة من الاستبيان.')} />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'queue' && (
        <div className="card">
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>{t('Customer', 'العميل')}</th><th>{t('Unit status', 'حالة الوحدة')}</th><th>{t('Agent', 'الموظف')}</th>
                  <th className="n">{t('Tries', 'المحاولات')}</th><th>{t('Status', 'الحالة')}</th><th>{t('Last outcome', 'آخر نتيجة')}</th><th></th>
                </tr>
              </thead>
              <tbody>
                {visibleQueue.map((q) => (
                  <tr key={q.id}>
                    <td>{q.customerName}<div className="sm muted mono">{q.mobileMasked}</div></td>
                    <td className="sm">{q.unitStatus}</td>
                    <td className="sm">{q.assignedAgent}</td>
                    <td className="n">{q.tries}/{q.maxTries}</td>
                    <td><Chip kind={STATUS_KIND[q.status]}>{q.status.replace('_', ' ')}</Chip></td>
                    <td className="sm">{q.lastOutcome ?? '–'}</td>
                    <td>{(q.status === 'queued' || q.status === 'in_progress') && <button className="btn s primary" onClick={() => openCall(q)}>{t('Call', 'اتصال')}</button>}</td>
                  </tr>
                ))}
                {visibleQueue.length === 0 && <tr><td colSpan={7}><div className="empty">{t('Nothing in the queue.', 'لا يوجد شيء في الطابور.')}</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'screen' && active && activeSurvey && (
        <div className="grid g-12">
          <div className="card">
            <div className="card-h"><h2>{active.customerName}</h2></div>
            <div className="list sm">
              <div className="row between"><span className="muted">{t('Mobile', 'الجوال')}</span><span className="mono">{active.mobileMasked}</span></div>
              <div className="row between"><span className="muted">{t('Unit status', 'حالة الوحدة')}</span><span>{active.unitStatus}</span></div>
              <div className="row between"><span className="muted">{t('Survey', 'الاستبيان')}</span><span>{L(activeSurvey.name)}</span></div>
              <div className="row between"><span className="muted">{t('Try', 'المحاولة')}</span><span>{active.tries + 1} / {active.maxTries}</span></div>
            </div>
            <div className="card-h" style={{ marginTop: 10 }}><h3>{t('Call outcome', 'نتيجة الاتصال')}</h3></div>
            <div className="pills">
              {OUTCOMES.map((o) => (
                <button key={o.id} className="btn s" onClick={() => recordOutcome(o.id)}>{lang === 'en' ? o.en : o.ar}</button>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>{t('Survey', 'الاستبيان')}</h2></div>
            <div className="list">
              {activeSurvey.questions.map((q) => (
                <label className="f" key={q.id}>
                  {L(q.text)}
                  {q.type === 'open' ? (
                    <textarea value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
                  ) : q.type === 'nps' ? (
                    <div className="pills">{Array.from({ length: 11 }, (_, i) => i).map((v) => (
                      <button key={v} className="btn s" aria-pressed={answers[q.id] === String(v)} onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(v) }))}>{v}</button>
                    ))}</div>
                  ) : q.type === 'rating' ? (
                    <div className="pills">{[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} className="btn s" aria-pressed={answers[q.id] === String(v)} onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(v) }))}>{v}</button>
                    ))}</div>
                  ) : q.type === 'yesno' ? (
                    <div className="pills">
                      <button className="btn s" aria-pressed={answers[q.id] === 'yes'} onClick={() => setAnswers((a) => ({ ...a, [q.id]: 'yes' }))}>{t('Yes', 'نعم')}</button>
                      <button className="btn s" aria-pressed={answers[q.id] === 'no'} onClick={() => setAnswers((a) => ({ ...a, [q.id]: 'no' }))}>{t('No', 'لا')}</button>
                    </div>
                  ) : (
                    <div className="pills">{q.options?.map((opt) => (
                      <button key={L(opt)} className="btn s" aria-pressed={answers[q.id] === L(opt)} onClick={() => setAnswers((a) => ({ ...a, [q.id]: L(opt) }))}>{L(opt)}</button>
                    ))}</div>
                  )}
                </label>
              ))}
              <label className="f">{t('Agent notes', 'ملاحظات الموظف')}<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
              <div className="row between">
                <span className="hint">{t('Saving creates a complaint case automatically if any incident rule matches.', 'سيؤدي الحفظ إلى إنشاء حالة شكوى تلقائياً إذا تطابقت إحدى القواعد.')}</span>
                <button className="btn primary" onClick={() => recordOutcome('reached')}>{t('Save and finish', 'حفظ وإنهاء')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'results' && (
        <div className="card">
          <div className="card-h"><h2>{t('Today', "اليوم")}</h2></div>
          <div className="grid g4">
            <div className="item"><div className="muted sm">{t('Done', 'تم')}</div><b className="score-big">{queue.filter((q) => q.status === 'done').length}</b></div>
            <div className="item"><div className="muted sm">{t('In progress', 'قيد التنفيذ')}</div><b className="score-big">{queue.filter((q) => q.status === 'in_progress').length}</b></div>
            <div className="item"><div className="muted sm">{t('Queued', 'بالانتظار')}</div><b className="score-big">{queue.filter((q) => q.status === 'queued').length}</b></div>
            <div className="item"><div className="muted sm">{t('Exhausted (3 tries)', 'استُنفدت (3 محاولات)')}</div><b className="score-big">{queue.filter((q) => q.status === 'exhausted').length}</b></div>
          </div>
        </div>
      )}
    </div>
  )
}
