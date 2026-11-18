import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { useRulesConfig, useUpdateRuleConfig } from '@/services/queries'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/common/LoadingState'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { SettingsSection, SubPageHeader, ViewOnlyNotice } from './SubPageHeader'
import { ESCALATION_PRINCIPLES } from '@/data/v38Reference'
import { MATRIX_COPY } from '@/data/escalationDefaults'
import { RULE_IDS } from '@/utils/ruleValues'
import type { Bi, RuleConfigItem } from '@/types'

/** Modules KB §12: the rules layer is five decisions; every number is a setting. */
const DECISIONS: { n: number; title: Bi; ids: string[]; note?: Bi }[] = [
  { n: 1, title: { en: 'Decision 1 · Signals', ar: 'القرار 1 · الإشارات' }, ids: ['rule_pattern_window', 'rule_pattern_same_issue', 'rule_pattern_same_agent', 'rule_pattern_env_concentration', 'rule_pattern_min_sample', 'rule_legal_once'] },
  { n: 2, title: { en: 'Decision 2 · Mystery shopper', ar: 'القرار 2 · التسوق السري' }, ids: ['rule_shopper_respond', 'rule_shopper_resolve', 'rule_shopper_floor'], note: { en: 'Critical opens a case the same day; medium is a signal; low is an L&D statistic; a visit under the floor is medium.', ar: 'الحرج يفتح حالة في نفس اليوم؛ المتوسط إشارة؛ المنخفض إحصاء للتعلم والتطوير؛ والزيارة تحت الحد متوسطة.' } },
  { n: 3, title: { en: 'Decision 3 · Recovered and worked', ar: 'القرار 3 · التعافي والفعالية' }, ids: ['rule_approval_days', 'rule_verification_days', 'rule_effective_drop', 'rule_effective_hold', 'rule_recovered_days', 'rule_resurvey_min', 'rule_resurvey_max', 'rule_calls_per_hour'], note: { en: 'Interviews are human by default; AI campaigns by the CX team’s choice. Capacity = people × hours × calls per hour × working days.', ar: 'المقابلات بشرية افتراضياً؛ وحملات الذكاء الاصطناعي باختيار فريق تجربة العملاء. السعة = الأشخاص × الساعات × المكالمات في الساعة × أيام العمل.' } },
  { n: 5, title: { en: 'Decision 5 · Feedback coverage', ar: 'القرار 5 · تغطية الملاحظات' }, ids: ['rule_survey_nps_cap', 'rule_survey_csat_cap', 'rule_silence_why', 'rule_public_reply'], note: { en: 'Inside the CSAT/CES window the most important touchpoint is kept: viewing > offer > call. Public channels are never surveyed; each product has its own line; website and app are two named sources.', ar: 'ضمن نافذة CSAT/CES تُحفظ أهم نقطة تواصل: المعاينة > العرض > المكالمة. القنوات العامة لا تُستبين أبداً؛ لكل منتج خطه؛ الموقع والتطبيق مصدران منفصلان.' } },
  {
    n: 6,
    title: { en: 'Added on 18 November · Clocks and calling', ar: 'أُضيف في 18 نوفمبر · المهل والاتصال' },
    ids: [RULE_IDS.workingDays, RULE_IDS.workStart, RULE_IDS.workEnd, RULE_IDS.fixFallbackDays, RULE_IDS.callFrom, RULE_IDS.callTo, RULE_IDS.callTries, RULE_IDS.aiNoAnswers],
    note: {
      en: 'The working week, the working day, a fix’s due date, the calling hours and the call attempts are settings, not constants. A fix is due at the matrix “Resolve (h)” in working hours from approval; the fallback applies when that cell is empty.',
      ar: 'أسبوع العمل ويوم العمل وموعد الحل وساعات الاتصال ومحاولات الاتصال إعدادات لا ثوابت. يُستحق الحل عند «الحل (ساعة)» في المصفوفة بساعات العمل من الاعتماد؛ ويُطبَّق البديل حين تكون تلك الخلية فارغة.',
    },
  },
]

/** The working week picker lists Monday first (JS weekday 1) to Sunday (0). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** The working week (decided 18 Nov: Monday to Friday, still a setting): a checkbox per weekday, Monday first; saved with one button.
 * Each day is a quiet pill holding a native checkbox (`accent-primary`, so a ticked box is ink); the name of a ticked day turns ink. */
function WeekPicker({
  rule,
  selected,
  canEdit,
  dayName,
  onChange,
  onSave,
}: {
  rule: RuleConfigItem
  selected: number[]
  canEdit: boolean
  dayName: (jsDay: number) => string
  onChange: (days: number[]) => void
  onSave: () => void
}) {
  const { t } = useI18n()
  const current = [...(rule.days ?? [])].sort((a, b) => a - b).join()
  const dirty = [...selected].sort((a, b) => a - b).join() !== current
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-labelledby={`rule-${rule.id}-label`} className="flex flex-wrap gap-1.5">
        {WEEK_ORDER.map((d) => {
          const on = selected.includes(d)
          return (
            <label
              key={d}
              className={cn('inline-flex h-9 items-center gap-2 rounded-full bg-well ps-3 pe-3.5 pt-px text-sm transition-colors duration-200', canEdit && 'cursor-pointer hover:bg-well-hover', on ? 'font-medium text-foreground' : 'text-muted-foreground')}
            >
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-primary"
                checked={on}
                disabled={!canEdit}
                onChange={(e) => onChange([...new Set(e.target.checked ? [...selected, d] : selected.filter((x) => x !== d))].sort((a, b) => a - b))}
              />
              {dayName(d)}
            </label>
          )
        })}
      </div>
      {canEdit && (
        <Button size="sm" className={dirty ? '' : 'invisible'} aria-hidden={!dirty} tabIndex={dirty ? 0 : -1} disabled={selected.length === 0} onClick={onSave}>
          {t('Save', 'حفظ')}
        </Button>
      )}
    </div>
  )
}

/** Net-new (NFR-4): "every numeric threshold named anywhere in the
 * requirements must be editable under Settings by the CX manager, without a
 * code deploy." This is the single page every other page's threshold
 * ultimately traces back to — each row cites the FR it backs so a change
 * here is auditable against the source requirement, not a bare number.
 *
 * v40: Decision 4 (the escalation matrix) is no longer an empty template here: it points to the matrix page, where each cell is
 * edited (the per-complaint-category template is superseded, decided 18 Nov). The working week is a weekday picker; an item may
 * carry a small note ("Legal to confirm the hours") and, when it is still a proposal, the [Proposed] badge.
 *
 * Composition (the skill's settings layout, comfortable): each decision is a section, the heading and its note above one card (stacked,
 * not split: the Settings menu already takes a third of the width) whose rows are divided by the one line (label, FR source and note on the left, the field, its unit and Save on
 * the right). 48px between the decisions. A read-only role sees the value as ink text and the view-only note. */
export default function Rules() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const canEdit = role.id === 'cxmgr'
  const { data: rules, isLoading } = useRulesConfig()
  const update = useUpdateRuleConfig()
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [draftDays, setDraftDays] = useState<Record<string, number[]>>({})

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

  /** "Mon" / "الإثنين": a weekday name in the active language (16 Nov 2026 is a Monday). */
  const dayName = (jsDay: number) => new Date(2026, 10, 15 + jsDay).toLocaleDateString(lang, { weekday: 'long' })

  const canOpenMatrix = canAccessPath(role.id, '/settings/escalation-matrix')
  const escalation = (
    <SettingsSection
      key="escalation"
      layout="stacked"
      title={t('Decision 4 · The escalation matrix', 'القرار 4 · مصفوفة التصعيد')}
      description={t(
        'One table per product, a row per kind of fix or case. The product owners fill the cells with the Internal Audit and Marketing Lead by 28 November; the matrix decides who, by title, receives each kind of action, and a fix’s due date comes from its “Resolve (h)”. It is edited on its own page.',
        'جدول لكل منتج، وصف لكل نوع من الحلول أو الحالات. يملأ مالكو المنتجات الخلايا مع مسؤول التدقيق الداخلي والتسويق بحلول 28 نوفمبر؛ وتحدد المصفوفة من يستلم كل نوع من الإجراءات حسب المسمى، ويأتي موعد الحل من «الحل (ساعة)». تُعدَّل في صفحتها.',
      )}
    >
      <ul className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm md:grid-cols-2">
        {ESCALATION_PRINCIPLES.map((p) => (
          <li key={p.en} className="flex gap-2.5">
            <span aria-hidden className="dot mt-[7px]" />
            {L(p)}
          </li>
        ))}
      </ul>
      <p className="t-body-s">{L(MATRIX_COPY.defaultCellsNote)}</p>
      {canOpenMatrix && (
        <Button variant="outline" size="sm" asChild className="self-start">
          <Link to="/settings/escalation-matrix">{t('Open the escalation matrix', 'افتح مصفوفة التصعيد')}</Link>
        </Button>
      )}
    </SettingsSection>
  )

  return (
    <section data-density="comfortable" className="@container flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <SubPageHeader
          title={t('Rules as configuration', 'القواعد كإعدادات')}
          description={t(
            'The five decisions of the rules layer. Every number the agents apply lives here and is changed by the CX manager without a developer; the full text is "CX Portal: Rules and Definitions".',
            'القرارات الخمسة لطبقة القواعد. كل رقم تطبقه الوكلاء موجود هنا ويغيّره مدير تجربة العملاء دون مطوّر؛ والنص الكامل في "بوابة تجربة العملاء: القواعد والتعريفات".',
          )}
        />
        {!canEdit && <ViewOnlyNotice>{t('View only — the CX manager edits these.', 'للعرض فقط — يعدّل هذه القيم مدير تجربة العملاء.')}</ViewOnlyNotice>}
      </div>

      {isLoading && <LoadingState rows={6} />}
      {groups.map((group) => {
        const rows = group.rows
        if (!rows.length) return null
        return (
          <Fragment key={group.key}>
            <SettingsSection layout="stacked" title={L(group.title)} description={group.note ? L(group.note) : undefined}>
              <ul className="flex flex-col">
                {rows.map((r) => {
                  const dirty = draft[r.id] !== undefined && draft[r.id] !== r.value
                  const inputId = `rule-${r.id}`
                  return (
                    <li key={r.id} className={cn('row-divider flex min-h-(--row-h) flex-col gap-2 py-3.5 first:pt-0 last:pb-0', !r.days && 'sm:flex-row sm:items-center sm:justify-between sm:gap-6')}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {r.days ? (
                            <span id={`${inputId}-label`} className="t-ui-strong">
                              {L(r.label)}
                            </span>
                          ) : (
                            <label htmlFor={canEdit ? inputId : undefined} className="t-ui-strong">
                              {L(r.label)}
                            </label>
                          )}
                          {r.proposed && <ProposedBadge />}
                        </div>
                        <span className="t-caption tabular">{r.source}</span>
                        {r.note && <span className="t-caption">{L(r.note)}</span>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {r.days ? (
                          <WeekPicker
                            rule={r}
                            selected={draftDays[r.id] ?? r.days}
                            canEdit={canEdit}
                            dayName={dayName}
                            onChange={(days) => setDraftDays((m) => ({ ...m, [r.id]: days }))}
                            onSave={() => update.mutate({ id: r.id, days: draftDays[r.id] })}
                          />
                        ) : canEdit ? (
                          <>
                            <Input
                              id={inputId}
                              type="number"
                              inputMode="numeric"
                              value={valueFor(r.id, r.value)}
                              onChange={(e) => setDraft((d) => ({ ...d, [r.id]: Number(e.target.value) }))}
                              className="h-9 w-24 text-end tabular"
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
                          <span className="t-ui-strong tabular">
                            {r.value} <span className="font-normal text-muted-foreground">{L(r.unit)}</span>
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </SettingsSection>
            {group.key === 'd3' && escalation}
          </Fragment>
        )
      })}
    </section>
  )
}
