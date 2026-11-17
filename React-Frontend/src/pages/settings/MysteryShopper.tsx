import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useNow } from '../../hooks/useNow'
import { useRole } from '../../auth/RoleContext'
import { SampleBanner } from '../../components/common/SampleBanner'
import { Tile } from '../../components/common/Tile'
import { Chip } from '../../components/common/Chip'
import {
  useDecideMsAssignment,
  useMsChecklists,
  useMsScenarios,
  useMsShoppers,
  useMsAssignments,
  useSendMsAssignments,
  useSubmitMsAssignment,
} from '../../services/queries'
import { msSeverityFor } from '../../utils/mysteryShopper'
import type { Bi, MsAssignment, MsAssignmentStatus } from '../../types'

const TABS = ['results', 'checklists', 'shoppers', 'distribution', 'review'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, Bi> = {
  results: { en: 'Results', ar: 'النتائج' },
  checklists: { en: 'Checklists', ar: 'القوائم' },
  shoppers: { en: 'Shoppers', ar: 'المتسوقون' },
  distribution: { en: 'Distribution', ar: 'التوزيع' },
  review: { en: 'Review', ar: 'المراجعة' },
}

const STATUS_TONE: Partial<Record<MsAssignmentStatus, 'good' | 'warn' | 'crit' | 'accent'>> = {
  submitted: 'warn', review: 'warn', approved: 'good', returned: 'crit', overdue: 'crit',
}

// The demo sign-in for the separate shopper landing page (FR: "email/mobile
// + one-time code sign-in") — same convention `ShopperTasks.tsx` used.
const SIGNED_IN_SHOPPER_ID = 'sh1'

/** Ported from `frontend/src/pages/MysteryShopper.tsx` + `ShopperTasks.tsx`
 * (APPLICATION_MODULES.md §C), with `lib/metrics.ts`'s `scoreChecklist()`
 * reused via `utils/mysteryShopper.ts`. FR-4.14's severity floor is read
 * off the same score here and in Review — a critical outcome is never a
 * second case model, it links to the existing Actions → Shopper cases
 * register rather than duplicating it. The `shopper` role lands here too
 * (`data/roles.ts`'s `home: '/settings/mystery-shopper'`) and sees only its
 * own tasks, per NFR-2 — a different view entirely, not a hidden tab. */
export default function MysteryShopper() {
  const { role } = useRole()
  if (role.id === 'shopper') return <ShopperMyTasks />
  return <MysteryShopperConsole />
}

function MysteryShopperConsole() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canManage = role.id === 'cxmgr' || role.id === 'cxteam'
  const [tab, setTab] = useState<Tab>('results')
  const { data: checklists } = useMsChecklists()
  const { data: scenarios } = useMsScenarios()
  const { data: shoppers } = useMsShoppers()
  const { data: assignments } = useMsAssignments()
  const send = useSendMsAssignments()
  const decide = useDecideMsAssignment()

  const [dist, setDist] = useState({ checklistId: '', scenarioId: '', via: 'email' as 'email' | 'wa' | 'sms', shopperIds: [] as string[] })

  const list = assignments ?? []
  const scored = list.filter((a) => a.score != null)
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length) : null
  const toReview = list.filter((a) => a.status === 'submitted' || a.status === 'review')

  function checklistOf(id: string) {
    return checklists?.find((c) => c.id === id)
  }
  function shopperOf(id: string) {
    return shoppers?.find((s) => s.id === id)
  }

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted">{t('Plans, distributes, collects and reviews mystery shopping visits and calls.', 'تخطيط وتوزيع وجمع ومراجعة زيارات ومكالمات التسوق السري.')}</p>
        <SampleBanner />
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {L(TAB_LABEL[id])}{id === 'review' && toReview.length > 0 ? ` (${toReview.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'results' && (
        <div className="col">
          <div className="grid grid-3">
            <Tile label={t('Average score', 'متوسط النتيجة')} value={avgScore != null ? `${avgScore}%` : '–'} />
            <Tile label={t('Critical fails', 'الإخفاقات الحرجة')} value={list.reduce((s, a) => s + (a.criticalFails ?? 0), 0)} colorVar="--crit" />
            <Tile label={t('Completed', 'مكتملة')} value={list.filter((a) => a.status === 'approved').length} />
          </div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t('Shopper', 'المتسوق')}</th><th>{t('Checklist', 'القائمة')}</th><th>{t('Status', 'الحالة')}</th><th className="num">{t('Score', 'النتيجة')}</th></tr></thead>
                <tbody>
                  {list.map((a) => {
                    const cl = checklistOf(a.checklistId)
                    const severity = msSeverityFor(a.score ?? null, a.criticalFails ?? 0)
                    return (
                      <tr key={a.id}>
                        <td>{shopperOf(a.shopperId)?.name}</td>
                        <td className="text-sm">{cl ? L(cl.name) : a.checklistId}</td>
                        <td><Chip tone={STATUS_TONE[a.status]}>{a.status}</Chip></td>
                        <td className="num">
                          {a.score != null ? `${a.score}%` : '–'}
                          {severity === 'critical' && <Link to="/actions/shopper-cases" className="text-sm" style={{ marginInlineStart: 6, color: 'var(--crit)' }}>⚠ {t('case opened', 'تم فتح حالة')}</Link>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'checklists' && (
        <div className="grid grid-2">
          {(checklists ?? []).map((cl) => (
            <div className="card" key={cl.id}>
              <div className="card-head">
                <h2>{L(cl.name)}</h2>
                <Chip tone={cl.status === 'published' ? 'good' : 'warn'}>{cl.status}</Chip>
              </div>
              <p className="text-sm muted">{t('Version', 'الإصدار')} {cl.version} · {cl.items.length} {t('items', 'عناصر')}</p>
              <div className="col" style={{ marginTop: 8, gap: 6 }}>
                {cl.items.map((it) => (
                  <div key={it.id} className="row between">
                    <span className="text-sm">{L(it.text)}</span>
                    <span className="row" style={{ gap: 4 }}>
                      {it.critical && <Chip tone="crit">{t('critical', 'حرج')}</Chip>}
                      <span className="text-sm muted">{it.weight}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'shoppers' && (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>{t('Name', 'الاسم')}</th><th>{t('Type', 'النوع')}</th><th className="num">{t('Shops', 'الزيارات')}</th><th className="num">{t('Reliability', 'الموثوقية')}</th><th>{t('Active', 'نشط')}</th></tr></thead>
            <tbody>
              {(shoppers ?? []).map((s) => (
                <tr key={s.id}>
                  <td>{s.name}{s.agency && <div className="text-sm muted">{s.agency}</div>}</td>
                  <td className="text-sm">{s.type}</td>
                  <td className="num">{s.shopsCompleted}</td>
                  <td className="num">{s.reliability}%</td>
                  <td><Chip tone={s.active ? 'good' : undefined}>{s.active ? t('yes', 'نعم') : t('no', 'لا')}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'distribution' && canManage && (
        <div className="card col">
          <div className="grid grid-3">
            <label className="col"><span className="text-sm muted">{t('Checklist', 'القائمة')}</span>
              <select value={dist.checklistId} onChange={(e) => setDist((d) => ({ ...d, checklistId: e.target.value }))}>
                <option value="">{t('Select…', 'اختر…')}</option>
                {(checklists ?? []).filter((c) => c.status === 'published').map((c) => <option key={c.id} value={c.id}>{L(c.name)}</option>)}
              </select>
            </label>
            <label className="col"><span className="text-sm muted">{t('Scenario', 'السيناريو')}</span>
              <select value={dist.scenarioId} onChange={(e) => setDist((d) => ({ ...d, scenarioId: e.target.value }))}>
                <option value="">{t('Select…', 'اختر…')}</option>
                {(scenarios ?? []).map((s) => <option key={s.id} value={s.id}>{L(s.title)}</option>)}
              </select>
            </label>
            <label className="col"><span className="text-sm muted">{t('Channel', 'القناة')}</span>
              <select value={dist.via} onChange={(e) => setDist((d) => ({ ...d, via: e.target.value as typeof dist.via }))}>
                <option value="email">{t('Email', 'بريد إلكتروني')}</option>
                <option value="wa">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </label>
          </div>
          <h3>{t('Shoppers', 'المتسوقون')}</h3>
          <div className="row">
            {(shoppers ?? []).filter((s) => s.active).map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip ${dist.shopperIds.includes(s.id) ? 'accent' : ''}`}
                onClick={() => setDist((d) => ({ ...d, shopperIds: d.shopperIds.includes(s.id) ? d.shopperIds.filter((x) => x !== s.id) : [...d.shopperIds, s.id] }))}
              >
                {s.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn primary"
            disabled={!dist.checklistId || !dist.scenarioId || !dist.shopperIds.length}
            onClick={() => { send.mutate(dist); setDist((d) => ({ ...d, shopperIds: [] })) }}
          >
            {t('Send (simulated — nothing is really sent)', 'إرسال (محاكاة — لا يُرسل شيء فعلياً)')}
          </button>
        </div>
      )}
      {tab === 'distribution' && !canManage && <div className="empty-state">{t('CX only.', 'فريق تجربة العملاء فقط.')}</div>}

      {tab === 'review' && (
        <div className="col">
          {toReview.map((a) => {
            const cl = checklistOf(a.checklistId)
            return (
              <div className="card" key={a.id}>
                <div className="row between">
                  <div className="col" style={{ gap: 2 }}>
                    <b>{shopperOf(a.shopperId)?.name}</b>
                    <span className="text-sm muted">{cl && L(cl.name)}</span>
                  </div>
                  {canManage && (
                    <div className="row">
                      <button type="button" className="btn sm primary" onClick={() => decide.mutate({ id: a.id, approve: true })}>{t('Approve', 'اعتماد')}</button>
                      <button type="button" className="btn sm danger" onClick={() => decide.mutate({ id: a.id, approve: false })}>{t('Return to shopper', 'إعادة للمتسوق')}</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {!toReview.length && <div className="empty-state">{t('Nothing waiting for review.', 'لا يوجد شيء بانتظار المراجعة.')}</div>}
        </div>
      )}
    </div>
  )
}

/** The shopper's own view — "sees only their own tasks" (USER_ROLES_AND_
 * PERMISSIONS.md). No access to anyone else's results, review queue or the
 * distribution form above. */
function ShopperMyTasks() {
  const { t, L } = useI18n()
  const now = useNow()
  const { data: checklists } = useMsChecklists()
  const { data: scenarios } = useMsScenarios()
  const { data: assignments } = useMsAssignments()
  const submit = useSubmitMsAssignment()
  const [openId, setOpenId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, number | 'na' | null>>({})

  const mine = (assignments ?? []).filter((a) => a.shopperId === SIGNED_IN_SHOPPER_ID)
  const open = mine.find((a: MsAssignment) => a.id === openId)
  const cl = open ? checklists?.find((c) => c.id === open.checklistId) : undefined
  const sc = open ? scenarios?.find((s) => s.id === open.scenarioId) : undefined

  function submitOpen() {
    if (!open) return
    submit.mutate({ id: open.id, checklistId: open.checklistId, answers })
    setOpenId(null)
    setAnswers({})
  }

  return (
    <div className="col">
      <p className="text-sm muted">{t('Signed in as a mystery shopper. You see only your own tasks.', 'تم الدخول كمتسوق سري. تظهر لك مهامك الخاصة فقط.')}</p>

      {!open && (
        <div className="col">
          {mine.map((a) => {
            const c = checklists?.find((x) => x.id === a.checklistId)
            const daysLeft = Math.ceil((new Date(a.dueAt).getTime() - now) / 86_400_000)
            return (
              <div className="card" key={a.id}>
                <div className="row between">
                  <div className="col" style={{ gap: 2 }}>
                    <b>{c && L(c.name)}</b>
                    <span className="text-sm muted">{scenarios?.find((s) => s.id === a.scenarioId) && L(scenarios.find((s) => s.id === a.scenarioId)!.title)}</span>
                  </div>
                  <Chip tone={a.status === 'approved' ? 'good' : a.status === 'overdue' ? 'crit' : undefined}>{a.status}</Chip>
                </div>
                <div className="row between" style={{ marginTop: 8 }}>
                  <span className="text-sm muted">{daysLeft >= 0 ? t(`${daysLeft} day(s) left`, `متبقي ${daysLeft} يوم`) : t('overdue', 'متأخر')}</span>
                  {(a.status === 'sent' || a.status === 'opened' || a.status === 'progress') && (
                    <button type="button" className="btn sm primary" onClick={() => setOpenId(a.id)}>{t('Open task', 'فتح المهمة')}</button>
                  )}
                </div>
              </div>
            )
          })}
          {!mine.length && <div className="empty-state">{t('No tasks right now.', 'لا توجد مهام حالياً.')}</div>}
        </div>
      )}

      {open && cl && (
        <div className="grid grid-2">
          <div className="card col">
            <h2>{t('Brief', 'الموجز')}</h2>
            <p className="text-sm"><b>{t('Scenario', 'السيناريو')}:</b> {sc && L(sc.title)}</p>
            <p className="text-sm"><b>{t('What is checked', 'ما الذي يُفحص')}:</b> {sc && L(sc.tests)}</p>
            <p className="text-sm muted">{t('Consent and privacy: do not record anyone without disclosure where required by local rules.', 'الموافقة والخصوصية: لا تسجّل أي شخص دون الإفصاح عند الحاجة وفق القواعد المحلية.')}</p>
          </div>
          <div className="card col">
            <h2>{L(cl.name)}</h2>
            {cl.items.map((it) => (
              <div key={it.id} className="col" style={{ gap: 4 }}>
                <div className="row between">
                  <span className="text-sm">{L(it.text)}</span>
                  {it.critical && <Chip tone="crit">{t('critical', 'حرج')}</Chip>}
                </div>
                <div className="row">
                  {it.type === 'passfail' && (
                    <>
                      <button type="button" className={`btn sm ${answers[it.id] === 1 ? 'primary' : ''}`} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 1 }))}>{t('Pass', 'ناجح')}</button>
                      <button type="button" className={`btn sm ${answers[it.id] === 0 ? 'danger' : ''}`} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 0 }))}>{t('Fail', 'راسب')}</button>
                    </>
                  )}
                  {it.type === 'scale' && [1, 2, 3, 4, 5].map((v) => (
                    <button key={v} type="button" className={`btn sm ${answers[it.id] === v ? 'primary' : ''}`} onClick={() => setAnswers((a) => ({ ...a, [it.id]: v }))}>{v}</button>
                  ))}
                  {it.type === 'text' && <textarea onChange={() => setAnswers((a) => ({ ...a, [it.id]: 1 }))} />}
                  <button type="button" className={`btn sm ${answers[it.id] === 'na' ? 'primary' : ''}`} onClick={() => setAnswers((a) => ({ ...a, [it.id]: 'na' }))}>N/A</button>
                </div>
              </div>
            ))}
            <div className="row between">
              <button type="button" className="btn" onClick={() => setOpenId(null)}>{t('Cancel', 'إلغاء')}</button>
              <button type="button" className="btn primary" onClick={submitOpen}>{t('Submit', 'إرسال')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
