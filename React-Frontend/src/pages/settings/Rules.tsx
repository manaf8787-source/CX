import { Fragment, useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useRulesConfig, useUpdateRuleConfig } from '@/services/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionCard } from '@/components/common/SectionCard'
import { LoadingState } from '@/components/common/LoadingState'
import { SubPageHeader, ViewOnlyNotice } from './SubPageHeader'
import { ESCALATION_COLUMNS, ESCALATION_PRINCIPLES, ESCALATION_ROWS } from '@/data/v38Reference'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { Bi } from '@/types'

/** Modules KB §12: the rules layer is five decisions; every number is a setting. */
const DECISIONS: { n: number; title: Bi; ids: string[]; note?: Bi }[] = [
  { n: 1, title: { en: 'Decision 1 · Signals', ar: 'القرار 1 · الإشارات' }, ids: ['rule_pattern_window', 'rule_pattern_same_issue', 'rule_pattern_same_agent', 'rule_pattern_env_concentration', 'rule_pattern_min_sample', 'rule_legal_once'] },
  { n: 2, title: { en: 'Decision 2 · Mystery shopper', ar: 'القرار 2 · التسوق السري' }, ids: ['rule_shopper_respond', 'rule_shopper_resolve', 'rule_shopper_floor'], note: { en: 'Critical opens a case the same day; medium is a signal; low is an L&D statistic; a visit under the floor is medium.', ar: 'الحرج يفتح حالة في نفس اليوم؛ المتوسط إشارة؛ المنخفض إحصاء للتعلم والتطوير؛ والزيارة تحت الحد متوسطة.' } },
  { n: 3, title: { en: 'Decision 3 · Recovered and worked', ar: 'القرار 3 · التعافي والفعالية' }, ids: ['rule_approval_days', 'rule_verification_days', 'rule_effective_drop', 'rule_effective_hold', 'rule_recovered_days', 'rule_resurvey_min', 'rule_resurvey_max', 'rule_calls_per_hour'], note: { en: 'Interviews are human by default; AI campaigns by the CX team’s choice. Capacity = people × hours × calls per hour × working days.', ar: 'المقابلات بشرية افتراضياً؛ وحملات الذكاء الاصطناعي باختيار فريق تجربة العملاء. السعة = الأشخاص × الساعات × المكالمات في الساعة × أيام العمل.' } },
  { n: 5, title: { en: 'Decision 5 · Feedback coverage', ar: 'القرار 5 · تغطية الملاحظات' }, ids: ['rule_survey_nps_cap', 'rule_survey_csat_cap', 'rule_silence_why', 'rule_public_reply'], note: { en: 'Inside the CSAT/CES window the most important touchpoint is kept: viewing > offer > call. Public channels are never surveyed; each product has its own line; website and app are two named sources.', ar: 'ضمن نافذة CSAT/CES تُحفظ أهم نقطة تواصل: المعاينة > العرض > المكالمة. القنوات العامة لا تُستبين أبداً؛ لكل منتج خطه؛ الموقع والتطبيق مصدران منفصلان.' } },
]

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

  const groups = useMemo(() => {
    const placed = new Set(DECISIONS.flatMap((d) => d.ids))
    const decided = DECISIONS.map((d) => ({ key: `d${d.n}`, title: d.title, note: d.note, rows: d.ids.map((id) => (rules ?? []).find((r) => r.id === id)).filter((r) => !!r) }))
    const other = (rules ?? []).filter((r) => !placed.has(r.id))
    return [
      ...decided,
      ...(other.length ? [{ key: 'other', title: { en: 'Other thresholds (runaway types)', ar: 'حدود أخرى (أنواع الهروب)' }, note: undefined, rows: other }] : []),
    ]
  }, [rules])

  function valueFor(id: string, current: number) {
    return draft[id] ?? current
  }

  const escalation = (
        <SectionCard
          title={t('Decision 4 · The escalation matrix: template and principles', 'القرار 4 · مصفوفة التصعيد: القالب والمبادئ')}
          description={t(
            'One table per product. The product owners fill the cells with the Internal Audit and Marketing Lead by 28 November; the matrix decides who, by title, receives each kind of action.',
            'جدول لكل منتج. يملأ مالكو المنتجات الخلايا مع مسؤول التدقيق الداخلي والتسويق بحلول 28 نوفمبر؛ وتحدد المصفوفة من يستلم كل نوع من الإجراءات حسب المسمى.',
          )}
          actions={<StatusBadge tone="warning">{t('Cells pending', 'الخلايا معلّقة')}</StatusBadge>}
          contentClassName="flex flex-col gap-4"
        >
          <ul className="grid grid-cols-1 gap-1.5 text-sm md:grid-cols-2">
            {ESCALATION_PRINCIPLES.map((p) => (
              <li key={p.en} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {L(p)}
              </li>
            ))}
          </ul>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start text-xs font-semibold text-muted-foreground">{t('Kind of action or case', 'نوع الإجراء أو الحالة')}</th>
                  {ESCALATION_COLUMNS.map((c) => (
                    <th key={c.en} scope="col" className="px-3 py-2 text-start text-xs font-semibold text-muted-foreground">
                      {L(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ESCALATION_ROWS.map((r) => (
                  <tr key={r.key} className="border-t">
                    <th scope="row" className="px-3 py-2 text-start font-medium">
                      {L(r.label)}
                    </th>
                    {ESCALATION_COLUMNS.map((c) => (
                      <td key={c.en} className="px-3 py-2 text-xs text-muted-foreground italic">
                        {t('Pending', 'معلّق')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
  )

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Rules as configuration', 'القواعد كإعدادات')}
        description={t(
          'The five decisions of the rules layer. Every number the agents apply lives here and is changed by the CX manager without a developer; the full text is "CX Portal: Rules and Definitions".',
          'القرارات الخمسة لطبقة القواعد. كل رقم تطبقه الوكلاء موجود هنا ويغيّره مدير تجربة العملاء دون مطوّر؛ والنص الكامل في "بوابة تجربة العملاء: القواعد والتعريفات".',
        )}
      />
      {!canEdit && <ViewOnlyNotice>{t('View only — the CX manager edits these.', 'للعرض فقط — يعدّل هذه القيم مدير تجربة العملاء.')}</ViewOnlyNotice>}

      {isLoading && <LoadingState rows={6} />}
      {groups.map((group) => {
        const rows = group.rows
        if (!rows.length) return null
        return (
          <Fragment key={group.key}>
          <SectionCard title={L(group.title)} description={group.note ? L(group.note) : undefined}>
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
                          <span className="w-24 text-sm text-muted-foreground">{L(r.unit)}</span>
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
          {group.key === 'd3' && escalation}
          </Fragment>
        )
      })}

    </section>
  )
}
