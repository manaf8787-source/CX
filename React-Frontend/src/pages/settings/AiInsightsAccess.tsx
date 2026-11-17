import { Fragment } from 'react'
import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import { SampleBanner } from '../../components/common/SampleBanner'
import { useAiAccessMatrix, useUpdateAiAccessCell } from '../../services/queries'
import { ROLE_DEFS } from '../../data/roles'
import type { Access } from '../../types'

const CYCLE: Access[] = ['none', 'view', 'own', 'full', 'informed', 'approve']
const SYMBOL: Record<Access, string> = { full: '●', own: '◐', view: '○', informed: '✉', approve: '✔', none: '–' }
const LABEL: Record<Access, { en: string; ar: string }> = {
  full: { en: 'Full', ar: 'كامل' }, own: { en: 'Own scope', ar: 'ضمن نطاقه' }, view: { en: 'View only', ar: 'للعرض فقط' },
  informed: { en: 'Informed only', ar: 'للعلم فقط' }, approve: { en: 'Approves', ar: 'يعتمد' }, none: { en: 'No access', ar: 'لا صلاحية' },
}

/** The live, CX-manager-editable role×capability grid (USER_ROLES_AND_
 * PERMISSIONS.md: "which role sees which categories... changes apply at
 * once"). Rebuilt for the 12 v38 roles — ported pattern, not ported data,
 * from `frontend/src/data/roles.ts`'s `AUTHORITY_MATRIX` (kept, for the
 * old role set, at Teams and structure). A cell cycles through the access
 * vocabulary on click; only the CX manager can change it. */
export default function AiInsightsAccess() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canEdit = role.id === 'cxmgr'
  const { data: matrix } = useAiAccessMatrix()
  const update = useUpdateAiAccessCell()
  const groups = [...new Set((matrix ?? []).map((r) => r.group.en))]

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted" style={{ maxWidth: '64ch' }}>
          {t('Which role sees which categories, environments and names, and what it can act on — changes apply at once.', 'أي دور يرى أي فئات وبيئات وأسماء، وما يمكنه التصرف به — تُطبَّق التغييرات فوراً.')}
        </p>
        <SampleBanner />
      </div>
      {!canEdit && <p className="text-sm" style={{ color: 'var(--warn)' }}>{t('View only — the CX manager edits this matrix.', 'للعرض فقط — يعدّل هذه المصفوفة مدير تجربة العملاء.')}</p>}

      <div className="card table-wrap">
        <p className="text-sm muted" style={{ marginBottom: 8 }}>
          ● {L(LABEL.full)} · ◐ {L(LABEL.own)} · ○ {L(LABEL.view)} · ✉ {L(LABEL.informed)} · ✔ {L(LABEL.approve)} · – {L(LABEL.none)}
          {canEdit && <> — {t('click a cell to change it', 'انقر على خلية لتغييرها')}</>}
        </p>
        <table>
          <thead>
            <tr>
              <th>{t('Capability', 'الصلاحية')}</th>
              {ROLE_DEFS.map((r) => <th key={r.id} className="num" title={L(r.name)}>{L(r.name).split(' ')[0]}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g}>
                <tr><td colSpan={ROLE_DEFS.length + 1} style={{ background: 'var(--surface-2)', fontWeight: 700, fontSize: 11 }}>{g}</td></tr>
                {(matrix ?? []).filter((row) => row.group.en === g).map((row) => (
                  <tr key={row.label.en}>
                    <td className="text-sm">{L(row.label)}</td>
                    {ROLE_DEFS.map((r) => {
                      const value = row.values[r.id]
                      return (
                        <td
                          key={r.id}
                          className="num"
                          title={L(LABEL[value])}
                          style={canEdit ? { cursor: 'pointer' } : undefined}
                          onClick={() => {
                            if (!canEdit) return
                            const next = CYCLE[(CYCLE.indexOf(value) + 1) % CYCLE.length]
                            update.mutate({ group: row.group.en, label: row.label.en, roleId: r.id, value: next })
                          }}
                        >
                          {SYMBOL[value]}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
