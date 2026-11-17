import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { useRole } from '../auth/RoleContext'
import {
  useAiCampaigns,
  useCreateAiCampaign,
  useDetractorCallItems,
  usePersons,
  useRecordInterview,
  useRecordResurvey,
} from '../services/queries'
import { SampleBanner } from '../components/common/SampleBanner'
import { InterviewDialog } from '../components/closeTheLoop/InterviewDialog'
import { CampaignDialog } from '../components/closeTheLoop/CampaignDialog'
import {
  CLOSE_LOOP_DEFAULTS,
  INTERVIEW_OUTCOME_LABEL,
  SEVERITY_ORDER,
  computeMonthlyCapacity,
  isRecovered,
  sampleToCapacity,
} from '../utils/closeTheLoop'
import type { DetractorCallItem } from '../types'

/** FR-5.1–5.6 — the monthly detractor call list with real capacity math,
 * the four-question interview, re-survey/recovery delta, and AI interview
 * campaigns with the critical-exclusion hard rule. */
export default function CloseTheLoop() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: items } = useDetractorCallItems()
  const { data: persons } = usePersons()
  const { data: campaigns } = useAiCampaigns()
  const recordInterview = useRecordInterview()
  const recordResurvey = useRecordResurvey()
  const createCampaign = useCreateAiCampaign()

  const [people, setPeople] = useState(CLOSE_LOOP_DEFAULTS.people)
  const [hoursPerDay, setHoursPerDay] = useState(CLOSE_LOOP_DEFAULTS.hoursPerDay)
  const [workingDays, setWorkingDays] = useState(CLOSE_LOOP_DEFAULTS.workingDaysPerMonth)
  const [interviewing, setInterviewing] = useState<DetractorCallItem | null>(null)
  const [resurveyDraft, setResurveyDraft] = useState<Record<string, string>>({})
  const [creatingCampaign, setCreatingCampaign] = useState(false)

  const capacity = computeMonthlyCapacity(people, hoursPerDay, workingDays)
  const sorted = useMemo(() => [...(items ?? [])].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]), [items])
  const { selected, excluded } = useMemo(() => sampleToCapacity(sorted, capacity), [sorted, capacity])
  const usedPct = sorted.length ? Math.min(100, Math.round((selected.length / sorted.length) * 100)) : 0
  const canCreateCampaign = role.id === 'cxmgr' || role.id === 'cxteam'

  function personName(id: string) {
    return persons?.find((p) => p.id === id)?.name ?? id
  }

  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{t('Close the loop', 'إغلاق الحلقة')}</h1>
          <p className="page-lede">{t('Every detractor gets a human call, a reason code and a re-survey. Critical cases first.', 'كل منتقد يحصل على مكالمة بشرية ورمز سبب وإعادة استبيان. الحالات الحرجة أولاً.')}</p>
        </div>
        <SampleBanner />
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Monthly capacity', 'السعة الشهرية')}</h2></div>
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <label className="col text-sm">{t('CX people', 'عدد موظفي تجربة العملاء')}
            <input type="number" min={1} value={people} onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))} style={{ width: 80 }} />
          </label>
          <label className="col text-sm">{t('Hours/day', 'ساعات/يوم')}
            <input type="number" min={1} max={12} value={hoursPerDay} onChange={(e) => setHoursPerDay(Math.max(1, Number(e.target.value) || 1))} style={{ width: 80 }} />
          </label>
          <label className="col text-sm">{t('Working days', 'أيام العمل')}
            <input type="number" min={1} max={31} value={workingDays} onChange={(e) => setWorkingDays(Math.max(1, Number(e.target.value) || 1))} style={{ width: 80 }} />
          </label>
          <div className="col text-sm">
            <span className="muted">{t('= capacity (4 calls/hour)', '= السعة (4 مكالمات/ساعة)')}</span>
            <b className="mono" style={{ fontSize: 18 }}>{capacity}</b>
          </div>
        </div>
        <div className="meter" style={{ marginTop: 10 }}><i style={{ width: `${usedPct}%` }} /></div>
        <p className="text-sm muted" style={{ marginTop: 6 }}>
          {selected.length} / {sorted.length} {t('detractors called this month', 'منتقد سيُتصل بهم هذا الشهر')}
          {excluded.length > 0 && (
            <> — {excluded.length} {t('sampled out (critical always called at 100%, the rest spread across products/environments)', 'مستبعدون من العينة (الحرج دائماً 100%، والباقي موزَّع على المنتجات والبيئات)')}</>
          )}
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t("This month's call list", 'قائمة الاتصال لهذا الشهر')}</h2>
          <span className="text-sm muted">{selected.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Severity', 'الخطورة')}</th>
                <th>{t('Person', 'الشخص')}</th>
                <th>{t('Environment', 'البيئة')}</th>
                <th>{t('Channel', 'القناة')}</th>
                <th className="num">{t('First score', 'النتيجة الأولى')}</th>
                <th>{t('Outcome', 'النتيجة')}</th>
                <th>{t('Re-survey / recovery', 'إعادة الاستبيان / التعافي')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {selected.map((i) => (
                <tr key={i.id}>
                  <td><span className={`chip ${i.severity === 'critical' ? 'crit' : i.severity === 'medium' ? 'warn' : ''}`}>{i.severity}</span></td>
                  <td>{personName(i.personId)}</td>
                  <td>{i.environment}</td>
                  <td>{i.channel === 'ai_campaign' ? t('AI campaign', 'حملة ذكاء اصطناعي') : t('Human', 'بشري')}</td>
                  <td className="num">{i.firstScore}</td>
                  <td>
                    {i.outcome ? L(INTERVIEW_OUTCOME_LABEL[i.outcome]) : <span className="muted">{t('Not called yet', 'لم يُتصل به بعد')}</span>}
                  </td>
                  <td>
                    {i.secondScore !== undefined ? (
                      <span className={`chip ${isRecovered(i) ? 'good' : ''}`}>
                        {i.firstScore} → {i.secondScore}{isRecovered(i) ? ` · ${t('Recovered', 'تعافى')}` : ''}
                      </span>
                    ) : i.outcome && i.outcome !== 'declined' ? (
                      <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        <input
                          type="number" min={0} max={10} placeholder="0-10" style={{ width: 60 }}
                          value={resurveyDraft[i.id] ?? ''}
                          onChange={(e) => setResurveyDraft((d) => ({ ...d, [i.id]: e.target.value }))}
                        />
                        <button
                          type="button" className="btn sm"
                          onClick={() => {
                            const v = Number(resurveyDraft[i.id])
                            if (Number.isFinite(v)) recordResurvey.mutate({ id: i.id, secondScore: v })
                          }}
                        >
                          {t('Save', 'حفظ')}
                        </button>
                      </span>
                    ) : i.outcome === 'declined' ? (
                      <span className="text-sm muted">{t('Declined — no retry', 'رفض — دون إعادة محاولة')}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {!i.outcome && <button type="button" className="btn sm primary" onClick={() => setInterviewing(i)}>{t('Call', 'اتصال')}</button>}
                  </td>
                </tr>
              ))}
              {!selected.length && (
                <tr><td colSpan={8} className="muted">{t("Nobody on this month's list.", 'لا أحد في قائمة هذا الشهر.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t('AI interview campaigns', 'حملات المقابلات بالذكاء الاصطناعي')}</h2>
          {canCreateCampaign && (
            <button type="button" className="btn sm" onClick={() => setCreatingCampaign(true)}>{t('Create campaign', 'إنشاء حملة')}</button>
          )}
        </div>
        <p className="text-sm muted" style={{ marginBottom: 10 }}>
          {t(
            'Humans call by default. Hand-off rules: 2x no-answer/hang-up → human; asks for a person or says anything critical → human the same day; declines → no retry. Critical detractors are never in a campaign.',
            'الاتصال بشري افتراضياً. قواعد التسليم: عدم الرد مرتين → بشري؛ طلب شخص أو قول أمر حرج → بشري بنفس اليوم؛ الرفض → دون إعادة محاولة. المنتقدون الحرجون لا يُدرجون في أي حملة أبداً.',
          )}
        </p>
        <div className="col">
          {campaigns?.map((c) => (
            <div className="card tint" key={c.id}>
              <div className="row between">
                <b>{L(c.name)}</b>
                <span className={`chip ${c.status === 'running' ? 'good' : c.status === 'closed' ? '' : 'warn'}`}>{c.status}</span>
              </div>
              <span className="text-sm muted">{L(c.segmentDescription)} · {c.memberIds.length} {t('members', 'عضو')}</span>
            </div>
          ))}
          {!campaigns?.length && <div className="empty-state">{t('No campaigns yet.', 'لا توجد حملات بعد.')}</div>}
        </div>
      </div>

      {interviewing && (
        <InterviewDialog
          item={interviewing}
          onCancel={() => setInterviewing(null)}
          onSubmit={(v) => {
            recordInterview.mutate({ id: interviewing.id, ...v })
            setInterviewing(null)
          }}
        />
      )}

      {creatingCampaign && (
        <CampaignDialog
          eligibleItems={(items ?? []).filter((i) => i.severity !== 'critical' && !i.outcome)}
          onCancel={() => setCreatingCampaign(false)}
          onCreate={(v) => {
            createCampaign.mutate({
              name: { en: v.name, ar: v.name },
              segmentDescription: { en: v.segmentDescription, ar: v.segmentDescription },
              script: { en: v.scriptEn, ar: v.scriptAr },
              memberIds: v.memberIds,
            })
            setCreatingCampaign(false)
          }}
        />
      )}
    </div>
  )
}
