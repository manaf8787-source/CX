import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useRole } from '../auth/RoleContext'
import { PageHeader } from '../components/layout/PageHeader'
import { Chip, ProductTag } from '../components/ui/Chip'
import { INCIDENTS } from '../data/incidents'
import { complaintType, LADDER } from '../data/complaintTypes'
import { actorLabel } from '../lib/people'
import { escalationLevel, respondState, resolveState, clockStateLabel, type ClockReading } from '../lib/sla'
import { submitFixBlockers, closeBlockers } from '../lib/incidentWorkflow'
import type { Incident, ProposedAction } from '../types'

type Filter = 'attention' | 'all' | 'breached' | 'waiting' | 'closed'

function clockChip(reading: ClockReading, label: string) {
  const kind = reading.state === 'breached' ? 'crit' : reading.state === 'at_risk' ? 'warn' : reading.state === 'met' ? 'good' : reading.state === 'paused' ? undefined : 'acc'
  return (
    <div className="row" style={{ gap: 6 }}>
      <span className="sm muted" style={{ width: 60 }}>{label}</span>
      <Chip kind={kind}>{clockStateLabel(reading.state).en}</Chip>
      <span className="sm mono muted">{Math.abs(reading.remainingHours).toFixed(1)}h {reading.remainingHours >= 0 ? 'left' : 'over'}</span>
    </div>
  )
}

export default function Incidents() {
  const { L, t } = useI18n()
  const { role } = useRole()
  const now = Date.now()

  const [incidents, setIncidents] = useState<Incident[]>(() => INCIDENTS.map((i) => ({ ...i, proposedActions: i.proposedActions.map((a) => ({ ...a })), timeline: [...i.timeline] })))
  const [filter, setFilter] = useState<Filter>('attention')
  const [selectedId, setSelectedId] = useState<string | null>(incidents[0]?.id ?? null)
  const [verify, setVerify] = useState({ rootCauseClear: false, actionDone: false, customerSatisfied: false })
  const [rcDraft, setRcDraft] = useState<{ category: string; explanation: string; corrective: string; preventive: string; pOwner: string; pDue: string }>({ category: '', explanation: '', corrective: '', preventive: '', pOwner: '', pDue: '' })
  const [actionDrafts, setActionDrafts] = useState<Record<number, { decision: ProposedAction['decision']; note: string }>>({})

  const canWork = role && ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'hrspec'].includes(role.id)
  const canVerifyClose = role && ['cxmgr', 'cxteam'].includes(role.id)
  const canApprove = role?.id === 'cxmgr'

  const scoped = role?.product ? incidents.filter((i) => i.product === role.product) : incidents

  const filtered = useMemo(() => {
    let list = scoped
    if (filter === 'attention') list = list.filter((i) => i.status === 'open' || i.status === 'progress' || i.status === 'waiting')
    if (filter === 'breached') list = list.filter((i) => resolveState(i, now).state === 'breached')
    if (filter === 'waiting') list = list.filter((i) => i.status === 'waiting')
    if (filter === 'closed') list = list.filter((i) => i.status === 'closed')
    return [...list].sort((a, b) => resolveState(a, now).remainingHours - resolveState(b, now).remainingHours)
  }, [scoped, filter, now])

  const selected = incidents.find((i) => i.id === selectedId) ?? null
  const type = selected ? complaintType(selected.typeId) : undefined

  function update(id: string, fn: (i: Incident) => Incident) {
    setIncidents((list) => list.map((i) => (i.id === id ? fn(i) : i)))
  }

  function recordFirstResponse(i: Incident) {
    update(i.id, (inc) => ({ ...inc, firstResponseAt: new Date().toISOString(), status: 'progress', timeline: [...inc.timeline, { at: new Date().toISOString(), role: role!.id, text: { en: 'First response recorded', ar: 'تم تسجيل الرد الأول' } }] }))
  }

  function togglePause(i: Incident) {
    if (i.status === 'waiting') {
      const pausedMs = i.pauseStartedAt ? Date.now() - new Date(i.pauseStartedAt).getTime() : 0
      update(i.id, (inc) => ({ ...inc, status: 'progress', pausedMinutes: inc.pausedMinutes + pausedMs / 60000, pauseStartedAt: undefined, timeline: [...inc.timeline, { at: new Date().toISOString(), role: role!.id, text: { en: 'Resumed — customer replied', ar: 'استؤنفت — رد العميل' } }] }))
    } else {
      update(i.id, (inc) => ({ ...inc, status: 'waiting', pauseStartedAt: new Date().toISOString(), timeline: [...inc.timeline, { at: new Date().toISOString(), role: role!.id, text: { en: 'Paused — waiting on the customer', ar: 'متوقف — بانتظار العميل' } }] }))
    }
  }

  function escalateNow(i: Incident) {
    update(i.id, (inc) => ({ ...inc, manualEscalationLevel: Math.min(LADDER.length - 1, inc.manualEscalationLevel + 1), timeline: [...inc.timeline, { at: new Date().toISOString(), role: role!.id, text: { en: 'Manually escalated', ar: 'تم التصعيد يدوياً' } }] }))
  }

  function decideAction(i: Incident, n: number) {
    const draft = actionDrafts[n]
    if (!draft) return
    update(i.id, (inc) => ({ ...inc, proposedActions: inc.proposedActions.map((a) => (a.n === n ? { ...a, decision: draft.decision, note: draft.note || undefined } : a)), managerReviewState: inc.proposedActions.some((a) => a.n !== n && (a.decision === 'modified' || a.decision === 'rejected')) || draft.decision === 'modified' || draft.decision === 'rejected' ? 'pending' : inc.managerReviewState }))
  }

  function submitFix(i: Incident) {
    const blockers = submitFixBlockers({ ...i, rootCauseCategory: (rcDraft.category || i.rootCauseCategory) as Incident['rootCauseCategory'], rootCauseExplanation: rcDraft.explanation || i.rootCauseExplanation, correctiveAction: rcDraft.corrective || i.correctiveAction, preventiveAction: rcDraft.preventive || i.preventiveAction }, type?.priority === 'high')
    if (blockers.length) { alert(blockers.map((b) => L(b)).join('\n')); return }
    update(i.id, (inc) => ({
      ...inc,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      rootCauseCategory: (rcDraft.category || inc.rootCauseCategory) as Incident['rootCauseCategory'],
      rootCauseExplanation: rcDraft.explanation || inc.rootCauseExplanation,
      correctiveAction: rcDraft.corrective || inc.correctiveAction,
      preventiveAction: rcDraft.preventive || inc.preventiveAction,
      preventiveActionOwner: rcDraft.pOwner || inc.preventiveActionOwner,
      preventiveActionDue: rcDraft.pDue || inc.preventiveActionDue,
      timeline: [...inc.timeline, { at: new Date().toISOString(), role: role!.id, text: { en: 'Fix submitted — resolve clock stopped', ar: 'تم تقديم الإصلاح — توقفت ساعة الحل' } }],
    }))
  }

  function approveActions(i: Incident) {
    update(i.id, (inc) => ({ ...inc, managerReviewState: 'approved', timeline: [...inc.timeline, { at: new Date().toISOString(), role: 'cxmgr', text: { en: 'CX manager approved the modified/rejected actions', ar: 'اعتمد مدير تجربة العملاء الإجراءات المعدّلة أو المرفوضة' } }] }))
  }

  function verifyAndClose(i: Incident) {
    const blockers = closeBlockers(i, verify)
    if (blockers.length) { alert(blockers.map((b) => L(b)).join('\n')); return }
    update(i.id, (inc) => ({ ...inc, status: 'closed', timeline: [...inc.timeline, { at: new Date().toISOString(), role: role!.id, text: { en: 'Verified and closed', ar: 'تم التحقق والإغلاق' } }] }))
    setVerify({ rootCauseClear: false, actionDone: false, customerSatisfied: false })
  }

  function reopen(i: Incident) {
    update(i.id, (inc) => ({ ...inc, status: 'progress', resolvedAt: undefined, timeline: [...inc.timeline, { at: new Date().toISOString(), role: role!.id, text: { en: 'Reopened — customer not satisfied', ar: 'أُعيد الفتح — العميل غير راضٍ' } }] }))
  }

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Incidents and SLAs', 'الحوادث واتفاقيات مستوى الخدمة')} lede={t('Everything that hurts the customer experience, with an owner, a clock and a recorded fix.', 'كل ما يؤثر سلباً على تجربة العميل، مع مالك وساعة وإصلاح موثّق.')} />

      <div className="seg" role="tablist">
        {(['attention', 'all', 'breached', 'waiting', 'closed'] as Filter[]).map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(f, f)}</button>
        ))}
      </div>

      <div className="grid g-case">
        <div className="card" style={{ padding: 0 }}>
          <div className="list" style={{ padding: 8 }}>
            {filtered.map((i) => {
              const resolve = resolveState(i, now)
              const t2 = complaintType(i.typeId)
              return (
                <button key={i.id} className={`item ${i.id === selectedId ? 'sel' : ''} ${t2?.priority === 'high' ? 'crit' : ''}`} style={{ textAlign: 'start', cursor: 'pointer', width: '100%' }} onClick={() => setSelectedId(i.id)}>
                  <div className="row between">
                    <span className="mono sm muted">{i.id}</span>
                    <Chip kind={resolve.state === 'breached' ? 'crit' : resolve.state === 'at_risk' ? 'warn' : resolve.state === 'met' ? 'good' : undefined}>{clockStateLabel(resolve.state).en}</Chip>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 12.5, margin: '3px 0' }}>{L(i.title)}</div>
                  <div className="row" style={{ gap: 6 }}>
                    <ProductTag productId={i.product} />
                    <span className="sm muted">{t2 && L(t2.name)}</span>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && <div className="empty">{t('Nothing here.', 'لا يوجد شيء هنا.')}</div>}
          </div>
        </div>

        {selected && type ? (
          <div className="card list">
            <div className="row between">
              <div>
                <div className="mono sm muted">{selected.id}</div>
                <h2>{L(selected.title)}</h2>
              </div>
              <div className="row">
                <ProductTag productId={selected.product} />
                <Chip kind={type.priority === 'high' ? 'crit' : type.priority === 'medium' ? 'warn' : undefined}>{type.priority}</Chip>
                <Chip>{selected.status}</Chip>
              </div>
            </div>
            <div className="sm muted">{L(type.name)} · {selected.environment ?? t('all environments', 'كل البيئات')} · {t('source', 'المصدر')}: {selected.source}</div>

            <div className="grid g2">
              {clockChip(respondState(selected, now), t('Respond', 'الرد'))}
              {clockChip(resolveState(selected, now), t('Resolve', 'الحل'))}
            </div>

            <div className="row">
              <span className="sm muted">{t('Escalation', 'التصعيد')}:</span>
              {LADDER.map((step, idx) => (
                <Chip key={idx} kind={idx <= escalationLevel(selected, now) ? 'warn' : undefined}>{L(step.label)}</Chip>
              ))}
            </div>

            {canWork && selected.status !== 'closed' && (
              <div className="row">
                {!selected.firstResponseAt && <button className="btn s" onClick={() => recordFirstResponse(selected)}>{t('Record first response', 'تسجيل الرد الأول')}</button>}
                <button className="btn s" onClick={() => togglePause(selected)}>{selected.status === 'waiting' ? t('Resume', 'استئناف') : t('Pause — waiting on customer', 'إيقاف — بانتظار العميل')}</button>
                <button className="btn s danger" onClick={() => escalateNow(selected)}>{t('Escalate now', 'تصعيد الآن')}</button>
              </div>
            )}

            <div className="card tint">
              <h3>{t('Owner fixes and records', 'إصلاح المالك وتوثيقه')}</h3>
              {selected.status === 'open' || selected.status === 'progress' || selected.status === 'waiting' ? (
                canWork ? (
                  <div className="form" style={{ marginTop: 8 }}>
                    <label className="f">{t('Root cause category', 'فئة السبب الجذري')}
                      <select value={rcDraft.category} onChange={(e) => setRcDraft((d) => ({ ...d, category: e.target.value }))}>
                        <option value="">—</option>
                        {['people', 'process', 'system', 'information', 'third_party', 'expectation'].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="f">{t('Explanation', 'الشرح')}<textarea value={rcDraft.explanation} onChange={(e) => setRcDraft((d) => ({ ...d, explanation: e.target.value }))} /></label>
                    <label className="f">{t('Corrective action', 'الإجراء التصحيحي')}<textarea value={rcDraft.corrective} onChange={(e) => setRcDraft((d) => ({ ...d, corrective: e.target.value }))} /></label>
                    <label className="f">{t('Preventive action', 'الإجراء الوقائي')}<textarea value={rcDraft.preventive} onChange={(e) => setRcDraft((d) => ({ ...d, preventive: e.target.value }))} /></label>
                    <label className="f">{t('Preventive owner', 'مالك الإجراء الوقائي')}<input type="text" value={rcDraft.pOwner} onChange={(e) => setRcDraft((d) => ({ ...d, pOwner: e.target.value }))} /></label>
                    <label className="f">{t('Due date', 'تاريخ الاستحقاق')}<input type="date" value={rcDraft.pDue} onChange={(e) => setRcDraft((d) => ({ ...d, pDue: e.target.value }))} /></label>
                  </div>
                ) : <p className="sm muted">{t('Only the case owner can record the fix.', 'فقط مالك الحالة يمكنه تسجيل الإصلاح.')}</p>
              ) : (
                <div className="list sm">
                  <div><b>{t('Root cause', 'السبب الجذري')}:</b> {selected.rootCauseCategory} — {selected.rootCauseExplanation}</div>
                  <div><b>{t('Corrective action', 'الإجراء التصحيحي')}:</b> {selected.correctiveAction}</div>
                  {selected.preventiveAction && <div><b>{t('Preventive action', 'الإجراء الوقائي')}:</b> {selected.preventiveAction} ({selected.preventiveActionOwner}, {t('due', 'الاستحقاق')} {selected.preventiveActionDue})</div>}
                </div>
              )}

              <h3 style={{ marginTop: 10 }}>{t('Proposed corrective actions', 'الإجراءات التصحيحية المقترحة')}</h3>
              <div className="list">
                {selected.proposedActions.map((a) => (
                  <div className="item" key={a.n}>
                    <div className="row between">
                      <span className="sm">#{a.n} {a.text}</span>
                      <Chip kind={a.decision === 'confirmed' ? 'good' : a.decision === 'rejected' ? 'crit' : a.decision === 'modified' ? 'warn' : undefined}>{a.decision}</Chip>
                    </div>
                    {a.note && <p className="sm muted">{a.note}</p>}
                    {canWork && a.decision === 'pending' && selected.status !== 'closed' && (
                      <div className="row" style={{ marginTop: 4 }}>
                        <select onChange={(e) => setActionDrafts((d) => ({ ...d, [a.n]: { decision: e.target.value as ProposedAction['decision'], note: d[a.n]?.note ?? '' } }))} defaultValue="">
                          <option value="" disabled>{t('Decide…', 'اتخذ قراراً…')}</option>
                          <option value="confirmed">{t('Confirm', 'تأكيد')}</option>
                          <option value="modified">{t('Modify', 'تعديل')}</option>
                          <option value="rejected">{t('Reject', 'رفض')}</option>
                        </select>
                        <input type="text" placeholder={t('Note (for modify/reject)', 'ملاحظة (للتعديل أو الرفض)')} onChange={(e) => setActionDrafts((d) => ({ ...d, [a.n]: { decision: d[a.n]?.decision ?? 'confirmed', note: e.target.value } }))} />
                        <button className="btn s" onClick={() => decideAction(selected, a.n)}>{t('Save', 'حفظ')}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selected.managerReviewState === 'pending' && (
                <div className="row between" style={{ marginTop: 8 }}>
                  <Chip kind="warn">{t('Needs CX manager approval (modified/rejected action)', 'يحتاج اعتماد مدير تجربة العملاء (إجراء معدّل/مرفوض)')}</Chip>
                  {canApprove && <button className="btn s primary" onClick={() => approveActions(selected)}>{t('Approve', 'اعتماد')}</button>}
                </div>
              )}

              {canWork && (selected.status === 'open' || selected.status === 'progress' || selected.status === 'waiting') && (
                <button className="btn primary" style={{ marginTop: 10 }} onClick={() => submitFix(selected)}>{t('Submit fix — stop resolve clock', 'تقديم الإصلاح — إيقاف ساعة الحل')}</button>
              )}
            </div>

            {(selected.status === 'resolved' || selected.status === 'closed') && (
              <div className="card tint">
                <h3>{t('Verify and close', 'التحقق والإغلاق')}</h3>
                {selected.status === 'resolved' && canVerifyClose && (
                  <>
                    <div className="list">
                      <label className="row"><input type="checkbox" checked={verify.rootCauseClear} onChange={(e) => setVerify((v) => ({ ...v, rootCauseClear: e.target.checked }))} />{t('Root cause is clear', 'السبب الجذري واضح')}</label>
                      <label className="row"><input type="checkbox" checked={verify.actionDone} onChange={(e) => setVerify((v) => ({ ...v, actionDone: e.target.checked }))} />{t('The action was really done', 'تم تنفيذ الإجراء فعلاً')}</label>
                      <label className="row"><input type="checkbox" checked={verify.customerSatisfied} onChange={(e) => setVerify((v) => ({ ...v, customerSatisfied: e.target.checked }))} />{t('The customer was told and is satisfied', 'تم إبلاغ العميل وهو راضٍ')}</label>
                    </div>
                    <button className="btn primary" style={{ marginTop: 8 }} onClick={() => verifyAndClose(selected)}>{t('Close case', 'إغلاق الحالة')}</button>
                  </>
                )}
                {selected.status === 'closed' && canVerifyClose && (
                  <button className="btn s" onClick={() => reopen(selected)}>{t('Reopen', 'إعادة فتح')}</button>
                )}
              </div>
            )}

            <div>
              <h3>{t('Timeline', 'المخطط الزمني')}</h3>
              <div className="list sm">
                {selected.timeline.map((e, idx) => (
                  <div className="row between" key={idx}>
                    <span>{L(e.text)}</span>
                    <span className="muted">{L(actorLabel(e.role))} · {new Date(e.at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card empty">{t('Select a case from the list.', 'اختر حالة من القائمة.')}</div>
        )}
      </div>
    </div>
  )
}
