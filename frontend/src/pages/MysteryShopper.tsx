import { useState } from 'react'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { Chip, ProductTag } from '../components/ui/Chip'
import { CHECKLISTS, SCENARIOS, checklist } from '../data/checklists'
import { SHOPPERS, ASSIGNMENTS as SEED_ASSIGNMENTS, shopper } from '../data/shoppers'
import { channel as findChannel } from '../data/channels'
import type { Assignment, AssignmentStatus } from '../types'

const STATUS_KIND: Record<AssignmentStatus, 'good' | 'warn' | 'crit' | 'acc' | undefined> = {
  sent: undefined, opened: 'acc', progress: 'acc', submitted: 'warn', review: 'warn', approved: 'good', returned: 'crit', overdue: 'crit',
}

export default function MysteryShopper() {
  const { L, t } = useI18n()
  const [tab, setTab] = useState('results')
  const [assignments, setAssignments] = useState<Assignment[]>(() => SEED_ASSIGNMENTS.map((a) => ({ ...a })))
  const [dist, setDist] = useState({ checklistId: CHECKLISTS[0].id, scenarioId: SCENARIOS[0].id, shopperIds: [] as string[], via: 'email' as Assignment['via'] })

  const scored = assignments.filter((a) => a.score != null)
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length) : null
  const toReview = assignments.filter((a) => a.status === 'submitted' || a.status === 'review')

  function send() {
    if (!dist.shopperIds.length) return
    const now = new Date().toISOString()
    const due = new Date(Date.now() + 3 * 24 * 3_600_000).toISOString()
    setAssignments((list) => [
      ...dist.shopperIds.map((sid, i) => ({ id: `asg-new-${Date.now()}-${i}`, checklistId: dist.checklistId, scenarioId: dist.scenarioId, shopperId: sid, via: dist.via, sentAt: now, dueAt: due, status: 'sent' as AssignmentStatus })),
      ...list,
    ])
    setDist((d) => ({ ...d, shopperIds: [] }))
  }

  function decide(id: string, approve: boolean) {
    setAssignments((list) => list.map((a) => (a.id === id ? { ...a, status: approve ? 'approved' : 'returned' } : a)))
  }

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Mystery Shopper', 'التسوق السري')} lede={t('Plans, distributes, collects and reviews mystery shopping visits and calls.', 'تخطيط وتوزيع وجمع ومراجعة زيارات ومكالمات التسوق السري.')} />
      <Tabs tabs={[
        { id: 'results', label: t('Results', 'النتائج') },
        { id: 'checklists', label: t('Checklists', 'القوائم') },
        { id: 'shoppers', label: t('Shoppers', 'المتسوقون') },
        { id: 'distribution', label: t('Distribution', 'التوزيع') },
        { id: 'review', label: `${t('Review', 'المراجعة')} (${toReview.length})` },
      ]} active={tab} onChange={setTab} />

      {tab === 'results' && (
        <div className="main" style={{ gap: 12 }}>
          <div className="grid g3">
            <div className="tile"><div className="l">{t('Average score', 'متوسط النتيجة')}</div><div className="v">{avgScore ?? '–'}%</div></div>
            <div className="tile"><div className="l">{t('Critical fails', 'الإخفاقات الحرجة')}</div><div className="v">{assignments.reduce((s, a) => s + (a.criticalFails ?? 0), 0)}</div></div>
            <div className="tile"><div className="l">{t('Completed', 'مكتملة')}</div><div className="v">{assignments.filter((a) => a.status === 'approved').length}</div></div>
          </div>
          <div className="card tw">
            <table>
              <thead><tr><th>{t('Shopper', 'المتسوق')}</th><th>{t('Checklist', 'القائمة')}</th><th>{t('Status', 'الحالة')}</th><th className="n">{t('Score', 'النتيجة')}</th></tr></thead>
              <tbody>
                {assignments.map((a) => {
                  const cl = checklist(a.checklistId)!
                  return (
                    <tr key={a.id}>
                      <td>{shopper(a.shopperId)?.name}</td>
                      <td className="sm">{L(cl.name)}</td>
                      <td><Chip kind={STATUS_KIND[a.status]}>{a.status}</Chip></td>
                      <td className="n">{a.score != null ? `${a.score}%${a.criticalFails ? ' ⚠' : ''}` : '–'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'checklists' && (
        <div className="grid g2">
          {CHECKLISTS.map((cl) => (
            <div className="card" key={cl.id}>
              <div className="card-h">
                <h2>{L(cl.name)}</h2>
                <Chip kind={cl.status === 'published' ? 'good' : 'warn'}>{cl.status}</Chip>
              </div>
              <p className="sm muted">{t('Version', 'الإصدار')} {cl.version} · {cl.items.length} {t('items', 'عناصر')}</p>
              <div className="list" style={{ marginTop: 8 }}>
                {cl.items.map((it) => (
                  <div className={`item ${it.critical ? 'crit' : ''}`} key={it.id}>
                    <div className="row between">
                      <span className="sm">{L(it.text)}</span>
                      <span className="sm muted">{it.weight}%</span>
                    </div>
                    <div className="row" style={{ marginTop: 3 }}>
                      <span className="ent">{it.type}</span>
                      {it.critical && <Chip kind="crit">{t('critical', 'حرج')}</Chip>}
                      {it.evidence !== 'none' && <Chip>{t('evidence', 'دليل')}: {it.evidence}</Chip>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'shoppers' && (
        <div className="card tw">
          <table>
            <thead><tr><th>{t('Name', 'الاسم')}</th><th>{t('Type', 'النوع')}</th><th>{t('Contact', 'التواصل')}</th><th className="n">{t('Shops', 'الزيارات')}</th><th className="n">{t('Reliability', 'الموثوقية')}</th><th>{t('Active', 'نشط')}</th></tr></thead>
            <tbody>
              {SHOPPERS.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}{s.agency && <div className="sm muted">{s.agency}</div>}</td>
                  <td className="sm">{s.type}</td>
                  <td className="sm mono">{s.email}</td>
                  <td className="n">{s.shopsCompleted}</td>
                  <td className="n">{s.reliability}%</td>
                  <td><Chip kind={s.active ? 'good' : undefined}>{s.active ? t('yes', 'نعم') : t('no', 'لا')}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'distribution' && (
        <div className="card">
          <div className="form">
            <label className="f">{t('Checklist', 'القائمة')}
              <select value={dist.checklistId} onChange={(e) => setDist((d) => ({ ...d, checklistId: e.target.value }))}>
                {CHECKLISTS.filter((c) => c.status === 'published').map((c) => <option key={c.id} value={c.id}>{L(c.name)}</option>)}
              </select>
            </label>
            <label className="f">{t('Scenario', 'السيناريو')}
              <select value={dist.scenarioId} onChange={(e) => setDist((d) => ({ ...d, scenarioId: e.target.value }))}>
                {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{L(s.title)}</option>)}
              </select>
            </label>
            <label className="f">{t('Channel', 'القناة')}
              <select value={dist.via} onChange={(e) => setDist((d) => ({ ...d, via: e.target.value as Assignment['via'] }))}>
                <option value="email">{t('Email', 'بريد إلكتروني')}</option>
                <option value="wa">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </label>
          </div>
          <div className="card-h" style={{ marginTop: 10 }}><h3>{t('Shoppers', 'المتسوقون')}</h3></div>
          <div className="pills">
            {SHOPPERS.filter((s) => s.active).map((s) => (
              <button key={s.id} className="pill-b" aria-pressed={dist.shopperIds.includes(s.id)} onClick={() => setDist((d) => ({ ...d, shopperIds: d.shopperIds.includes(s.id) ? d.shopperIds.filter((x) => x !== s.id) : [...d.shopperIds, s.id] }))}>{s.name}</button>
            ))}
          </div>
          <button className="btn primary" style={{ marginTop: 10 }} disabled={!dist.shopperIds.length} onClick={send}>{t('Send (simulated — nothing is really sent)', 'إرسال (محاكاة — لا يُرسل شيء فعلياً)')}</button>
        </div>
      )}

      {tab === 'review' && (
        <div className="list">
          {toReview.map((a) => {
            const cl = checklist(a.checklistId)!
            const sc = SCENARIOS.find((s) => s.id === a.scenarioId)
            return (
              <div className="card" key={a.id}>
                <div className="card-h">
                  <div>
                    <h2>{shopper(a.shopperId)?.name}</h2>
                    <p className="sm muted">{L(cl.name)} · {sc && L(sc.title)} · {findChannel(cl.channel) && L(findChannel(cl.channel)!.name)}</p>
                  </div>
                  <ProductTag productId={cl.product} />
                </div>
                <div className="row">
                  <button className="btn s primary" onClick={() => decide(a.id, true)}>{t('Approve', 'اعتماد')}</button>
                  <button className="btn s danger" onClick={() => decide(a.id, false)}>{t('Return to shopper', 'إعادة للمتسوق')}</button>
                </div>
              </div>
            )
          })}
          {toReview.length === 0 && <div className="empty">{t('Nothing waiting for review.', 'لا يوجد شيء بانتظار المراجعة.')}</div>}
        </div>
      )}
    </div>
  )
}
