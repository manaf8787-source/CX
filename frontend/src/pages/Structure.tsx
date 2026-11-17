import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { ACCESS_LABEL, ACCESS_SYMBOL, AUTHORITY_MATRIX, ROLE_DEFS } from '../data/roles'
import { Tabs } from '../components/ui/Tabs'
import { Fragment, useState } from 'react'

export default function Structure() {
  const { L, t } = useI18n()
  const [tab, setTab] = useState('matrix')
  const groups = [...new Set(AUTHORITY_MATRIX.map((r) => L(r.group)))]

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Build specification', 'مواصفات البناء')} lede={t('The master reference for roles and permissions in the live system.', 'المرجع الأساسي للأدوار والصلاحيات في النظام الفعلي.')} />
      <Tabs tabs={[{ id: 'matrix', label: t('Authority matrix', 'مصفوفة الصلاحيات') }, { id: 'roles', label: t('Roles', 'الأدوار') }]} active={tab} onChange={setTab} />

      {tab === 'roles' && (
        <div className="grid g3">
          {ROLE_DEFS.map((r) => (
            <div className="item" key={r.id}>
              <b>{L(r.name)}</b>
              <p className="sm muted" style={{ marginTop: 4 }}>{L(r.description)}</p>
              <p className="sm mono muted" style={{ marginTop: 4 }}>{t('Lands on', 'الوجهة الافتراضية')}: {r.home}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'matrix' && (
        <div className="card">
          <p className="sm muted" style={{ marginBottom: 8 }}>
            ● {L(ACCESS_LABEL.full)} · ◐ {L(ACCESS_LABEL.own)} · ○ {L(ACCESS_LABEL.view)} · ✉ {L(ACCESS_LABEL.informed)} · ✔ {L(ACCESS_LABEL.approve)} · – {L(ACCESS_LABEL.none)}
          </p>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>{t('Capability', 'الصلاحية')}</th>
                  {ROLE_DEFS.map((r) => <th key={r.id} className="n" title={L(r.name)}>{L(r.name).split(' ')[0]}</th>)}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g}>
                    <tr><td colSpan={ROLE_DEFS.length + 1} style={{ background: 'var(--surface2)', fontWeight: 700, fontSize: 11 }}>{g}</td></tr>
                    {AUTHORITY_MATRIX.filter((row) => L(row.group) === g).map((row) => (
                      <tr key={L(row.label)}>
                        <td className="sm">{L(row.label)}</td>
                        {ROLE_DEFS.map((r) => (
                          <td key={r.id} className="n" title={L(ACCESS_LABEL[row.values[r.id]])}>{ACCESS_SYMBOL[row.values[r.id]]}</td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
