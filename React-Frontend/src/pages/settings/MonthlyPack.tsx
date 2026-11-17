import { useState } from 'react'
import { useI18n } from '../../i18n'
import { useNow } from '../../hooks/useNow'
import { useRole } from '../../auth/RoleContext'
import { SampleBanner } from '../../components/common/SampleBanner'
import { Tile } from '../../components/common/Tile'
import { useCorrectiveActions, useSignals } from '../../services/queries'
import { evaluateEffectiveness, EFFECTIVENESS_LABEL } from '../../utils/effectiveness'
import { downloadCsv } from '../../utils/csv'

/** Ported and upgraded from `frontend/src/pages/Report.tsx`
 * (APPLICATION_MODULES.md §C) — "one page for the management meeting,"
 * now reading the live Signals and Corrective-actions registers instead of
 * the old standalone `Incident`/`Effectiveness` arrays (those registers are
 * the v38 replacement, FR-4). The CX manager alone releases it (FR "the CX
 * manager releases this report monthly"). */
export default function MonthlyPack() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const now = useNow()
  const { data: signals } = useSignals()
  const { data: actions } = useCorrectiveActions()
  const [releasedAt, setReleasedAt] = useState<string | null>(null)

  const open = (actions ?? []).filter((a) => a.status !== 'effective' && a.status !== 'failed')
  const late = open.filter((a) => new Date(a.verificationDueAt).getTime() < now && a.status === 'verification')
  const awaitingCheck = (actions ?? []).filter((a) => a.status === 'verification')
  const closedTotal = (actions ?? []).filter((a) => a.status === 'effective' || a.status === 'failed' || a.status === 'partial').length

  const byCategory = new Map<string, number>()
  ;(signals ?? []).forEach((s) => byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + 1))
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)

  const withSeries = (actions ?? []).filter((a) => a.monthlySignalSeries && a.startedMonthIndex !== undefined)

  function exportCsv() {
    downloadCsv('monthly-cx-pack.csv', (actions ?? []).map((a) => ({
      id: a.id, kind: a.kind, status: a.status, owner: a.owner, due_date: a.dueDate, verification_due_at: a.verificationDueAt,
    })))
  }

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted">{t('One page for the management meeting.', 'صفحة واحدة لاجتماع الإدارة.')}</p>
        <div className="row">
          <SampleBanner />
          <button type="button" className="btn sm" onClick={exportCsv}>{t('Download CSV', 'تنزيل CSV')}</button>
          {role.id === 'cxmgr' && (
            <button type="button" className="btn primary sm" onClick={() => setReleasedAt(new Date().toISOString())}>
              {releasedAt ? t('Released', 'تم الإصدار') : t('Release this month’s pack', 'إصدار حزمة هذا الشهر')}
            </button>
          )}
        </div>
      </div>
      {releasedAt && <p className="text-sm muted">{t('Released', 'صدرت في')} {new Date(releasedAt).toLocaleString()}</p>}

      <div className="grid grid-4">
        <Tile label={t('Open actions', 'الإجراءات المفتوحة')} value={open.length} />
        <Tile label={t('Late verification', 'تحقق متأخر')} value={late.length} colorVar={late.length ? '--crit' : undefined} />
        <Tile label={t('Awaiting 60-day check', 'بانتظار تحقق 60 يوماً')} value={awaitingCheck.length} />
        <Tile label={t('Closed total', 'إجمالي المغلقة')} value={closedTotal} />
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Most common signal categories', 'أكثر فئات الإشارات شيوعاً')}</h2></div>
        <div className="col" style={{ gap: 6 }}>
          {topCategories.map(([name, count]) => (
            <div className="row between" key={name}>
              <span className="text-sm">{name.replace(/_/g, ' ')}</span>
              <div className="meter" style={{ flex: 1, margin: '0 10px' }}><i style={{ width: `${(count / Math.max(1, topCategories[0][1])) * 100}%` }} /></div>
              <span className="text-sm mono">{count}</span>
            </div>
          ))}
          {!topCategories.length && <div className="empty-state">{t('No signals yet.', 'لا توجد إشارات بعد.')}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Did past corrective actions work?', 'هل نجحت الإجراءات التصحيحية السابقة؟')}</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('Action', 'الإجراء')}</th><th>{t('Owner', 'المالك')}</th><th className="num">{t('Change', 'التغيّر')}</th><th>{t('Verdict', 'الحكم')}</th></tr></thead>
            <tbody>
              {withSeries.map((a) => {
                const res = evaluateEffectiveness(a.monthlySignalSeries!, a.startedMonthIndex!)
                return (
                  <tr key={a.id}>
                    <td className="text-sm">{L(a.title)}</td>
                    <td className="text-sm muted">{a.owner}</td>
                    <td className="num mono">{Math.round(res.changePct * 100)}%</td>
                    <td><span className={`chip ${res.verdict === 'effective' ? 'good' : res.verdict === 'failed' ? 'crit' : 'warn'}`}>{L(EFFECTIVENESS_LABEL[res.verdict])}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!withSeries.length && <div className="empty-state">{t('No actions past verification yet.', 'لا توجد إجراءات تجاوزت مرحلة التحقق بعد.')}</div>}
        </div>
        <p className="text-sm muted" style={{ marginTop: 8 }}>
          {t('A before/after comparison is a signal, not proof. Real analysis needs two to three months of closed cases.', 'المقارنة بين قبل وبعد مؤشر وليست دليلاً قاطعاً. التحليل الحقيقي يحتاج شهرين إلى ثلاثة من الحالات المغلقة.')}
        </p>
      </div>
    </div>
  )
}
