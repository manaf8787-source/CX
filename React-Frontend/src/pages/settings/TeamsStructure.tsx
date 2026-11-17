import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { Chip } from '../../components/common/Chip'
import { LEGACY_ACCESS_LABEL, LEGACY_ACCESS_SYMBOL, LEGACY_AUTHORITY_MATRIX, LEGACY_ROLE_DEFS } from '../../data/legacyReference'

/** "Teams and structure" — kept as a Knowledge Base document, explicitly
 * removed from the live v38 portal menu (Programme KB §26). This page is
 * historical reference only: the pre-omnichannel `frontend/src/data/
 * roles.ts` role set and authority matrix, not the live one. The live,
 * CX-manager-editable grid is AI Insights access matrix. */
export default function TeamsStructure() {
  const { t, L } = useI18n()
  const [tab, setTab] = useState<'matrix' | 'roles'>('matrix')
  const groups = [...new Set(LEGACY_AUTHORITY_MATRIX.map((r) => L(r.group)))]

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted" style={{ maxWidth: '64ch' }}>
          {t('Kept for historical reference — removed from the real portal menu. This is the pre-omnichannel role set, not the live v38 one.', 'محفوظة للرجوع التاريخي — أُزيلت من قائمة البوابة الفعلية. هذه مجموعة الأدوار قبل إعادة البناء الشاملة، وليست مجموعة v38 الحيّة.')}
        </p>
        <Link to="/settings/ai-insights-access" className="btn sm">{t('Open the live access matrix', 'فتح مصفوفة الصلاحيات الحيّة')}</Link>
      </div>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'matrix'} onClick={() => setTab('matrix')}>{t('Authority matrix (legacy)', 'مصفوفة الصلاحيات (قديمة)')}</button>
        <button type="button" role="tab" aria-selected={tab === 'roles'} onClick={() => setTab('roles')}>{t('Roles (legacy)', 'الأدوار (قديمة)')}</button>
      </div>

      {tab === 'roles' && (
        <div className="grid grid-3">
          {LEGACY_ROLE_DEFS.map((r) => (
            <div className="card" key={r.id}>
              <b>{L(r.name)}</b>
              <p className="text-sm muted" style={{ marginTop: 4 }}>{L(r.description)}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'matrix' && (
        <div className="card table-wrap">
          <p className="text-sm muted" style={{ marginBottom: 8 }}>
            ● {L(LEGACY_ACCESS_LABEL.full)} · ◐ {L(LEGACY_ACCESS_LABEL.own)} · ○ {L(LEGACY_ACCESS_LABEL.view)} · ✉ {L(LEGACY_ACCESS_LABEL.informed)} · ✔ {L(LEGACY_ACCESS_LABEL.approve)} · – {L(LEGACY_ACCESS_LABEL.none)}
          </p>
          <table>
            <thead>
              <tr>
                <th>{t('Capability', 'الصلاحية')}</th>
                {LEGACY_ROLE_DEFS.map((r) => <th key={r.id} className="num" title={L(r.name)}>{L(r.name).split(' ')[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g}>
                  <tr><td colSpan={LEGACY_ROLE_DEFS.length + 1} style={{ background: 'var(--surface-2)', fontWeight: 700, fontSize: 11 }}>{g}</td></tr>
                  {LEGACY_AUTHORITY_MATRIX.filter((row) => L(row.group) === g).map((row) => (
                    <tr key={L(row.label)}>
                      <td className="text-sm">{L(row.label)}</td>
                      {LEGACY_ROLE_DEFS.map((r) => (
                        <td key={r.id} className="num" title={L(LEGACY_ACCESS_LABEL[row.values[r.id]])}>{LEGACY_ACCESS_SYMBOL[row.values[r.id]]}</td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Chip tone="warn">{t('Reference only — not live navigation', 'مرجع فقط — ليست ضمن التنقل الفعلي')}</Chip>
    </div>
  )
}
