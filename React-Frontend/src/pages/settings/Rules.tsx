import { useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useRulesConfig, useUpdateRuleConfig } from '@/services/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/components/common/SectionCard'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

/** Net-new (NFR-4): "every numeric threshold named anywhere in the
 * requirements must be editable under Settings by the CX manager, without a
 * code deploy." This is the single page every other page's threshold
 * ultimately traces back to — each row cites the FR it backs so a change
 * here is auditable against the source requirement, not a bare number. */
export default function Rules() {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canEdit = role.id === 'cxmgr'
  const { data: rules, isLoading } = useRulesConfig()
  const update = useUpdateRuleConfig()
  const [draft, setDraft] = useState<Record<string, number>>({})

  const areas = useMemo(() => [...new Set((rules ?? []).map((r) => r.area.en))], [rules])

  function valueFor(id: string, current: number) {
    return draft[id] ?? current
  }

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Rules as configuration', 'القواعد كإعدادات')}
        description={t(
          'Every threshold named in the functional requirements, editable here — not a magic number buried in a component.',
          'كل حد مذكور في المتطلبات الوظيفية، قابل للتعديل هنا — وليس رقماً ثابتاً مدفوناً داخل الواجهة.',
        )}
      />
      {!canEdit && <ViewOnlyNotice>{t('View only — the CX manager edits these.', 'للعرض فقط — يعدّل هذه القيم مدير تجربة العملاء.')}</ViewOnlyNotice>}

      {isLoading && <LoadingState rows={6} />}
      {areas.map((area) => {
        const rows = (rules ?? []).filter((r) => r.area.en === area)
        return (
          <SectionCard key={area} title={L(rows[0].area)}>
            <ul className="flex flex-col divide-y">
              {rows.map((r) => {
                const dirty = draft[r.id] !== undefined && draft[r.id] !== r.value
                const inputId = `rule-${r.id}`
                return (
                  <li key={r.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col">
                      <label htmlFor={canEdit ? inputId : undefined} className="text-sm font-medium">
                        {L(r.label)}
                      </label>
                      <span className="font-mono text-xs text-muted-foreground">{r.source}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {canEdit ? (
                        <>
                          <Input
                            id={inputId}
                            type="number"
                            inputMode="numeric"
                            value={valueFor(r.id, r.value)}
                            onChange={(e) => setDraft((d) => ({ ...d, [r.id]: Number(e.target.value) }))}
                            className="h-9 w-24 text-end tabular-nums"
                          />
                          <span className="min-w-12 text-sm text-muted-foreground">{L(r.unit)}</span>
                          <Button
                            size="sm"
                            className={dirty ? '' : 'invisible'}
                            aria-hidden={!dirty}
                            tabIndex={dirty ? 0 : -1}
                            onClick={() => update.mutate({ id: r.id, value: draft[r.id] })}
                          >
                            {t('Save', 'حفظ')}
                          </Button>
                        </>
                      ) : (
                        <span className="text-base font-semibold tabular-nums">
                          {r.value} <span className="text-sm font-normal text-muted-foreground">{L(r.unit)}</span>
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </SectionCard>
        )
      })}
    </section>
  )
}
