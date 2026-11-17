import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAiAccessMatrix, useUpdateAiAccessCell } from '@/services/queries'
import { ROLE_DEFS } from '@/data/roles'
import type { Access } from '@/types'
import { SectionCard } from '@/components/common/SectionCard'
import { LoadingState } from '@/components/common/LoadingState'
import { AccessLegend, AccessMatrix, type MatrixRow } from './AccessMatrix'
import { SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

const CYCLE: Access[] = ['none', 'view', 'own', 'full', 'informed', 'approve']

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
  const { data: matrix, isLoading } = useAiAccessMatrix()
  const update = useUpdateAiAccessCell()

  const rows: MatrixRow[] = (matrix ?? []).map((r) => ({
    key: `${r.group.en}|${r.label.en}`,
    group: L(r.group),
    label: L(r.label),
    values: r.values,
  }))
  const byKey = new Map((matrix ?? []).map((r) => [`${r.group.en}|${r.label.en}`, r]))

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('AI Insights access matrix', 'مصفوفة صلاحيات رؤى الذكاء الاصطناعي')}
        description={t(
          'Which role sees which categories, environments and names, and what it can act on — changes apply at once.',
          'أي دور يرى أي فئات وبيئات وأسماء، وما يمكنه التصرف به — تُطبَّق التغييرات فوراً.',
        )}
      />
      {!canEdit && <ViewOnlyNotice>{t('View only — the CX manager edits this matrix.', 'للعرض فقط — يعدّل هذه المصفوفة مدير تجربة العملاء.')}</ViewOnlyNotice>}

      <SectionCard contentClassName="flex flex-col gap-3">
        <AccessLegend hint={canEdit ? t('Select a cell to change it.', 'اختر خلية لتغييرها.') : undefined} />
        {isLoading ? (
          <LoadingState rows={6} />
        ) : (
          <AccessMatrix
            caption={t('AI Insights access by role', 'صلاحيات رؤى الذكاء الاصطناعي حسب الدور')}
            roles={ROLE_DEFS}
            rows={rows}
            onCycle={
              canEdit
                ? (row, roleId, current) => {
                    const source = byKey.get(row.key)
                    if (!source) return
                    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]
                    update.mutate({ group: source.group.en, label: source.label.en, roleId: roleId as (typeof ROLE_DEFS)[number]['id'], value: next })
                  }
                : undefined
            }
          />
        )}
      </SectionCard>
    </section>
  )
}
