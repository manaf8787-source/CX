import { useMemo, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CalendarX, Hourglass, MessageSquareWarning, MoonStar, PhoneMissed, Shuffle } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAllInteractions, useEffortSummaries, usePersons } from '@/services/queries'
import { JOURNEY_RULES } from '@/utils/journeyRules'
import {
  buildFaultSummary,
  classifyRunaway,
  RUNAWAY_LEARNING_ORDER,
  RUNAWAY_TYPE_DEFINITION,
  RUNAWAY_TYPE_LABEL,
  type RunawayClassification,
} from '@/utils/runaway'
import type { RunawayType } from '@/types'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'

/** One icon and one hue per type so the six read apart at a glance (icon carries meaning, colour only reinforces it). */
const TYPE_STYLE: Record<RunawayType, { icon: LucideIcon; accent: string }> = {
  silent_lead: { icon: PhoneMissed, accent: 'var(--chart-4)' },
  did_not_renew: { icon: CalendarX, accent: 'var(--warning)' },
  dormant_owner: { icon: MoonStar, accent: 'var(--chart-1)' },
  went_to_competitor: { icon: Shuffle, accent: 'var(--destructive)' },
  frozen_deal: { icon: Hourglass, accent: 'var(--chart-3)' },
  complained_then_left: { icon: MessageSquareWarning, accent: 'var(--chart-5)' },
}

/** FR-3.1–3.5 — six types as live counters (classified from real sample
 * data, not static placeholders), a cross-type "what we keep doing wrong"
 * list clickable into Actions, per-person detail linking to the full
 * Customers journey, environment scoping, and the agreed learning order. */
export default function Runaway() {
  const { t, L } = useI18n()
  const navigate = useNavigate()
  const { role } = useRole()
  const { data: persons, isLoading: personsLoading } = usePersons()
  const { data: effortSummaries, isLoading: effortLoading } = useEffortSummaries()
  const { data: interactions, isLoading: interactionsLoading } = useAllInteractions()
  const loading = personsLoading || effortLoading || interactionsLoading

  const scopedPersons = useMemo(() => {
    let list = persons ?? []
    if (role.id === 'envmgmt' && role.environment) list = list.filter((p) => p.environment === role.environment)
    return list
  }, [persons, role])

  const classifications = useMemo(() => {
    const map = new Map<string, RunawayClassification>()
    for (const p of scopedPersons) {
      const effort = effortSummaries?.find((e) => e.personId === p.id)
      const mine = (interactions ?? []).filter((i) => i.personKey === p.id)
      const result = classifyRunaway(p, effort, mine)
      if (result) map.set(p.id, result)
    }
    return map
  }, [scopedPersons, effortSummaries, interactions])

  const byType = useMemo(() => {
    const groups = new Map<RunawayType, { id: string; name: string }[]>()
    for (const [personId, c] of classifications) {
      const person = scopedPersons.find((p) => p.id === personId)
      if (!person) continue
      const list = groups.get(c.type) ?? []
      list.push({ id: person.id, name: person.name })
      groups.set(c.type, list)
    }
    return groups
  }, [classifications, scopedPersons])

  const faults = useMemo(() => buildFaultSummary(scopedPersons, classifications, interactions ?? []), [scopedPersons, classifications, interactions])
  const maxFault = Math.max(1, ...faults.map((f) => f.count))
  const anyClassified = [...byType.values()].some((l) => l.length)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        term="Runaway customer" title={t('Runaway customers', 'العملاء الهاربون')}
        description={t(
          'Six types as counters, plus a cross-type "what we keep doing wrong" list. The point is to learn and fix the cause, not to chase each one.',
          'ستة أنواع كعدادات، مع قائمة الأخطاء المتكررة عبر الأنواع. الهدف التعلّم وإصلاح السبب، لا ملاحقة كل حالة.',
        )}
      />

      {role.id === 'envmgmt' && role.environment && (
        <StatusBadge tone="info" className="self-start">
          {t('Scoped to your environment:', 'محصور ببيئتك:')} {role.environment}
        </StatusBadge>
      )}

      <section aria-label={t('Runaway types', 'أنواع العملاء الهاربين')} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {RUNAWAY_LEARNING_ORDER.map((type, idx) => {
          const { icon: Icon, accent } = TYPE_STYLE[type]
          return (
            <KpiTile
              key={type}
              label={L(RUNAWAY_TYPE_LABEL[type])}
              value={(byType.get(type) ?? []).length}
              sub={idx < 3 ? t(`Learn first · #${idx + 1}`, `للتعلّم أولاً · ${idx + 1}`) : undefined}
              accent={accent}
              icon={<Icon />}
              loading={loading}
              onClick={() => document.getElementById(`ra-${type}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
          )
        })}
      </section>

      <SectionCard
        term="Runaway customer" title={t('What we keep doing wrong', 'ما زلنا نكرر هذه الأخطاء')}
        description={t('Faults found across every runaway record. Open one to work on it as a corrective action.', 'أخطاء ظهرت عبر كل السجلات الهاربة. افتح أحدها للعمل عليه كإجراء تصحيحي.')}
      >
        {loading ? (
          <LoadingState rows={4} />
        ) : !faults.length ? (
          <EmptyState title={t('No faults found across runaway records yet.', 'لا توجد أخطاء مسجّلة عبر السجلات الهاربة بعد.')} />
        ) : (
          <ul className="flex flex-col gap-1">
            {faults.map((f) => {
              const rule = JOURNEY_RULES.find((r) => r.id === f.flag)
              return (
                <li key={f.flag}>
                  <button
                    type="button"
                    onClick={() => navigate('/actions/corrective')}
                    className="group flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-start outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="w-28 shrink-0 truncate text-sm font-medium first-letter:uppercase sm:w-56">{rule ? L(rule.label) : f.flag.replace(/_/g, ' ')}</span>
                    <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-destructive/70" style={{ width: `${(f.count / maxFault) * 100}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-end text-sm font-semibold tabular-nums">{f.count}</span>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 motion-reduce:transition-none" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {!loading && !anyClassified && <EmptyState title={t('No runaway customers classified in this scope yet.', 'لا يوجد عملاء هاربون مصنَّفون ضمن هذا النطاق بعد.')} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {RUNAWAY_LEARNING_ORDER.map((type) => {
          const list = byType.get(type) ?? []
          if (!list.length) return null
          const { icon: Icon, accent } = TYPE_STYLE[type]
          return (
            <section key={type} id={`ra-${type}`} className="scroll-mt-20" style={{ '--c': accent } as CSSProperties}>
              <SectionCard
                className="h-full border-t-2 border-t-(--c)"
                title={
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden className="flex size-7 items-center justify-center rounded-md bg-(--c)/12 text-(--c)">
                      <Icon className="size-4" />
                    </span>
                    {L(RUNAWAY_TYPE_LABEL[type])}
                    <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground tabular-nums">{list.length}</span>
                  </span>
                }
                description={L(RUNAWAY_TYPE_DEFINITION[type])}
              >
                <ul className="flex flex-col divide-y">
                  {list.map((p) => {
                    const reason = classifications.get(p.id)?.reason
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-medium">{p.name}</span>
                          {reason && <span className="text-xs text-muted-foreground">{L(reason)}</span>}
                        </div>
                        <Button variant="outline" size="sm" asChild className="h-9 shrink-0">
                          <Link to={`/customers/${p.id}`}>
                            {t('Full journey', 'الرحلة الكاملة')}
                            <ArrowRight aria-hidden className="rtl:rotate-180" />
                          </Link>
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </SectionCard>
            </section>
          )
        })}
      </div>
    </div>
  )
}
