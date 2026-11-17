import { useState } from 'react'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Chip, ProductTag } from '../components/ui/Chip'
import { ASSIGNMENTS as SEED, shopper } from '../data/shoppers'
import { checklist, SCENARIOS } from '../data/checklists'
import { scoreChecklist } from '../lib/metrics'
import type { Assignment } from '../types'

// The demo sign-in: email/mobile + a one-time code (any code in the demo).
const SIGNED_IN_SHOPPER_ID = 'sh1'

export default function ShopperTasks() {
  const { L, t } = useI18n()
  const [assignments, setAssignments] = useState<Assignment[]>(() => SEED.filter((a) => a.shopperId === SIGNED_IN_SHOPPER_ID).map((a) => ({ ...a })))
  const [openId, setOpenId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, number | 'na'>>({})
  const [question, setQuestion] = useState('')

  const me = shopper(SIGNED_IN_SHOPPER_ID)
  const open = assignments.find((a) => a.id === openId)
  const cl = open ? checklist(open.checklistId) : undefined
  const sc = open ? SCENARIOS.find((s) => s.id === open.scenarioId) : undefined

  function startTask(a: Assignment) { setOpenId(a.id); setAnswers({}) }

  function submit() {
    if (!open || !cl) return
    const result = scoreChecklist(cl, answers)
    setAssignments((list) => list.map((a) => (a.id === open.id ? { ...a, status: 'submitted', score: result.score ?? undefined, criticalFails: result.criticalFails } : a)))
    setOpenId(null)
  }

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('My tasks', 'مهامي')} lede={t(`Signed in as ${me?.name ?? ''}. You see only your own tasks.`, `تم الدخول باسم ${me?.name ?? ''}. تظهر لك مهامك الخاصة فقط.`)} />

      {!open && (
        <div className="list">
          {assignments.map((a) => {
            const c = checklist(a.checklistId)!
            const scenario = SCENARIOS.find((s) => s.id === a.scenarioId)
            const daysLeft = Math.ceil((new Date(a.dueAt).getTime() - Date.now()) / 86_400_000)
            return (
              <div className="card" key={a.id}>
                <div className="card-h">
                  <div>
                    <h2 style={{ fontSize: 14 }}>{L(c.name)}</h2>
                    <p className="sm muted">{scenario && L(scenario.title)}</p>
                  </div>
                  <ProductTag productId={c.product} />
                </div>
                <div className="row between">
                  <Chip kind={a.status === 'approved' ? 'good' : a.status === 'overdue' ? 'crit' : undefined}>{a.status}</Chip>
                  <span className="sm muted">{daysLeft >= 0 ? t(`${daysLeft} day(s) left`, `متبقي ${daysLeft} يوم`) : t('overdue', 'متأخر')}</span>
                  {(a.status === 'sent' || a.status === 'opened' || a.status === 'progress') && <button className="btn s primary" onClick={() => startTask(a)}>{t('Open task', 'فتح المهمة')}</button>}
                </div>
              </div>
            )
          })}
          {assignments.length === 0 && <div className="empty">{t('No tasks right now.', 'لا توجد مهام حالياً.')}</div>}
        </div>
      )}

      {open && cl && (
        <div className="grid g-12">
          <div className="card">
            <div className="card-h"><h2>{t('Brief', 'الموجز')}</h2></div>
            <div className="list sm">
              <div><b>{t('Scenario', 'السيناريو')}:</b> {sc && L(sc.title)}</div>
              <div><b>{t('What is checked', 'ما الذي يُفحص')}:</b> {sc && L(sc.tests)}</div>
              <div className="hint">{t('Consent and privacy: do not record anyone without disclosure where required by local rules.', 'الموافقة والخصوصية: لا تسجّل أي شخص دون الإفصاح عند الحاجة وفق القواعد المحلية.')}</div>
            </div>
            <div className="card-h" style={{ marginTop: 10 }}><h3>{t('Questions to CX', 'أسئلة لفريق تجربة العملاء')}</h3></div>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t('Ask something before you start…', 'اسأل شيئاً قبل البدء…')} />
          </div>
          <div className="card">
            <div className="card-h"><h2>{L(cl.name)}</h2></div>
            <div className="list">
              {cl.items.map((it) => (
                <div className={`item ${it.critical ? 'crit' : ''}`} key={it.id}>
                  <div className="row between">
                    <span className="sm">{L(it.text)}</span>
                    {it.evidence !== 'none' && <Chip kind={it.evidence === 'required' ? 'warn' : undefined}>{it.evidence} {it.evidenceKinds.join('/')}</Chip>}
                  </div>
                  <div className="pills" style={{ marginTop: 6 }}>
                    {it.type === 'passfail' && (
                      <>
                        <button className="btn s" aria-pressed={answers[it.id] === 1} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 1 }))}>{t('Pass', 'ناجح')}</button>
                        <button className="btn s" aria-pressed={answers[it.id] === 0} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 0 }))}>{t('Fail', 'راسب')}</button>
                      </>
                    )}
                    {it.type === 'scale' && [1, 2, 3, 4, 5].map((v) => (
                      <button key={v} className="btn s" aria-pressed={answers[it.id] === v} onClick={() => setAnswers((a) => ({ ...a, [it.id]: v }))}>{v}</button>
                    ))}
                    {it.type === 'text' && <textarea onChange={() => setAnswers((a) => ({ ...a, [it.id]: 1 }))} />}
                    <button className="btn s" aria-pressed={answers[it.id] === 'na'} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 'na' }))}>N/A</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="row between" style={{ marginTop: 10 }}>
              <button className="btn s" onClick={() => setOpenId(null)}>{t('Cancel', 'إلغاء')}</button>
              <button className="btn primary" onClick={submit}>{t('Submit', 'إرسال')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
