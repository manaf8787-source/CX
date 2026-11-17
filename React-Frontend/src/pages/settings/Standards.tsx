import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import { SampleBanner } from '../../components/common/SampleBanner'
import { Chip } from '../../components/common/Chip'
import { useStandards, useUpdateStandardStatus } from '../../services/queries'
import type { StandardStatus } from '../../types'

const STATUS_TONE: Record<StandardStatus, 'crit' | 'warn' | 'accent' | 'good'> = {
  not_started: 'crit', legal_review: 'warn', drafted: 'accent', approved_scored: 'good',
}
const STATUS_LABEL: Record<StandardStatus, { en: string; ar: string }> = {
  not_started: { en: 'Not started', ar: 'لم يبدأ' },
  legal_review: { en: 'Confirm with Legal', ar: 'تأكيد مع القانونية' },
  drafted: { en: 'Drafted', ar: 'مسودة' },
  approved_scored: { en: 'Approved and scored', ar: 'معتمد ومُقيَّم' },
}
const STATUS_ORDER: StandardStatus[] = ['not_started', 'legal_review', 'drafted', 'approved_scored']

/** Ported and grown from `frontend/src/pages/Standards.tsx`'s flat 13-item
 * list (APPLICATION_MODULES.md §C: "needs to grow to a numbered register").
 * The `ld_document` rows are transcribed from `Standards-Documentation-
 * List-for-LD.docx` §1–6. [Proposed]: that document states "twenty-eight
 * documents in six groups" (§7), but transcribing its six group tables
 * yielded 33 distinct titles — flagged here rather than silently dropped to
 * force the stated count; L&D should reconcile the two when the document is
 * finalised. */
export default function Standards() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canEdit = role.id === 'cxmgr'
  const { data: standards } = useStandards()
  const update = useUpdateStandardStatus()
  const [groupFilter, setGroupFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StandardStatus | 'all'>('all')

  const groups = useMemo(() => [...new Set((standards ?? []).map((s) => s.group.en))], [standards])
  const visible = (standards ?? []).filter((s) => (groupFilter === 'all' || s.group.en === groupFilter) && (statusFilter === 'all' || s.status === statusFilter))

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted" style={{ maxWidth: '68ch' }}>
          {t('Every checklist item and signal rule points to a numbered standard, so there is one source of truth (NFR-4). M-14 onward are L&D’s documentation list; M-01–M-13 are platform rules CX already wrote.', 'يشير كل عنصر في القوائم وكل قاعدة إشارة إلى معيار مرقّم. M-14 فصاعداً من قائمة وثائق التعلم والتطوير؛ M-01 إلى M-13 قواعد المنصة.')}
        </p>
        <SampleBanner />
      </div>

      <div className="row">
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
          <option value="all">{t('All groups', 'كل المجموعات')}</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">{t('All statuses', 'كل الحالات')}</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{L(STATUS_LABEL[s])}</option>)}
        </select>
        <span className="text-sm muted">{visible.length} / {standards?.length ?? 0}</span>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('Code', 'الرمز')}</th>
              <th>{t('Standard', 'المعيار')}</th>
              <th>{t('Writer', 'الكاتب')}</th>
              <th>{t('Environment variant', 'اختلاف البيئة')}</th>
              <th className="num">{t('Priority', 'الأولوية')}</th>
              <th>{t('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id}>
                <td className="mono text-sm muted">{s.code}</td>
                <td>
                  {L(s.title)}
                  {s.linkedItems > 0 && <span className="text-sm muted"> · {s.linkedItems} {t('linked items', 'عنصراً مرتبطاً')}</span>}
                </td>
                <td className="text-sm muted">{L(s.writer)}</td>
                <td className="text-sm muted">{s.environmentVariant ? L(s.environmentVariant) : '–'}</td>
                <td className="num">{s.priorityTier ?? '–'}</td>
                <td>
                  {canEdit ? (
                    <select value={s.status} onChange={(e) => update.mutate({ id: s.id, status: e.target.value as StandardStatus })}>
                      {STATUS_ORDER.map((st) => <option key={st} value={st}>{L(STATUS_LABEL[st])}</option>)}
                    </select>
                  ) : (
                    <Chip tone={STATUS_TONE[s.status]}>{L(STATUS_LABEL[s.status])}</Chip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <div className="empty-state">{t('No standards match this filter.', 'لا توجد معايير مطابقة لهذا الفلتر.')}</div>}
      </div>
    </div>
  )
}
