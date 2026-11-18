import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CalendarX, Hourglass, MessageSquareWarning, MoonStar, PhoneMissed, Shuffle } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAllInteractions, usePersons } from '@/services/queries'
import { useEnvScope } from '@/services/queriesV40'
import { JOURNEY_RULES } from '@/utils/journeyRules'
import { buildFaultSummary, RUNAWAY_LEARNING_ORDER, RUNAWAY_TYPE_DEFINITION, RUNAWAY_TYPE_LABEL } from '@/utils/runaway'
import { personLabel } from '@/utils/peopleExport'
import { CUSTOMERS_LIST_COPY } from '@/data/customersList'
import { envName } from '@/data/environments'
import type { RunawayType } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionCard } from '@/components/common/SectionCard'
import { KpiTile } from '@/components/common/KpiTile'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { CustomersTabs } from '@/components/customers/CustomersTabs'
import { usePeopleFacts } from '@/components/customers/usePeopleFacts'

/** One neutral icon per type so the six read apart at a glance. The name carries the meaning; colour is not used (the skill keeps hues for status). */
const TYPE_ICON: Record<RunawayType, LucideIcon> = {
  silent_lead: PhoneMissed,
  did_not_renew: CalendarX,
  dormant_owner: MoonStar,
  went_to_competitor: Shuffle,
  frozen_deal: Hourglass,
  complained_then_left: MessageSquareWarning,
}

/** FR-3.1–3.5 — six types as live counters (classified from real sample
 * data, not static placeholders), a cross-type "what we keep doing wrong"
 * list clickable into Actions, per-person detail linking to the full
 * Customers journey, environment scoping, and the agreed learning order.
 * v40 (F17): the "Who is leaving" tab of Customers (the URL `/runaway` still works), and a
 * person shows by name only to a role that may see customer names (the Internal Audit and
 * Marketing Lead sees the reference, for example P-005). */
export default function Runaway() {
  const { t, L } = useI18n()
  const navigate = useNavigate()
  const { role } = useRole()
  const { fixed } = useEnvScope()
  // The environment switch (and an environment manager's own environment) already narrows the people register.
  const { data: scopedPersons = [], isLoading: personsLoading } = usePersons()
  const { facts, isLoading: factsLoading } = usePeopleFacts(scopedPersons)
  const { data: interactions, isLoading: interactionsLoading } = useAllInteractions()
  const loading = personsLoading || factsLoading || interactionsLoading
  const classifications = facts.drifting

  const byType = useMemo(() => {
    const groups = new Map<RunawayType, { id: string; label: string }[]>()
    for (const [personId, c] of classifications) {
      const person = scopedPersons.find((p) => p.id === personId)
      if (!person) continue
      const list = groups.get(c.type) ?? []
      list.push({ id: person.id, label: personLabel(person, role.id) })
      groups.set(c.type, list)
    }
    return groups
  }, [classifications, scopedPersons, role.id])

  const faults = useMemo(() => buildFaultSummary(scopedPersons, classifications, interactions ?? []), [scopedPersons, classifications, interactions])
  const maxFault = Math.max(1, ...faults.map((f) => f.count))
  const anyClassified = [...byType.values()].some((l) => l.length)

  return (
    <div data-density="dense" className="flex flex-col gap-6">
      <PageHeader
        term="Runaway customer" title={L(CUSTOMERS_LIST_COPY.tabs.leaving)}
        description={t(
          'Six types as counters, plus a cross-type "what we keep doing wrong" list. The point is to learn and fix the cause, not to chase each one.',
          'ستة أنواع كعدادات، مع قائمة الأخطاء المتكررة عبر الأنواع. الهدف التعلّم وإصلاح السبب، لا ملاحقة كل حالة.',
        )}
      />

      <CustomersTabs />

      {fixed && (
        <StatusBadge tone="info" className="self-start">
          {t('Scoped to your environment:', 'محصور ببيئتك:')} {L(envName(fixed))}
        </StatusBadge>
      )}

      <section aria-label={t('Runaway types', 'أنواع العملاء الهاربين')} className="grid grid-cols-2 gap-(--grid-gap) xl:grid-cols-3">
        {RUNAWAY_LEARNING_ORDER.map((type, idx) => {
          const Icon = TYPE_ICON[type]
          return (
            <KpiTile
              key={type}
              label={L(RUNAWAY_TYPE_LABEL[type])}
              value={(byType.get(type) ?? []).length}
              sub={idx < 3 ? t(`Learn first · #${idx + 1}`, `للتعلّم أولاً · ${idx + 1}`) : undefined}
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
          <div className="well">
            <ul className="flex flex-col gap-1">
              {faults.map((f, i) => {
                const rule = JOURNEY_RULES.find((r) => r.id === f.flag)
                const hero = i === 0
                return (
                  <li key={f.flag}>
                    <button
                      type="button"
                      onClick={() => navigate('/actions/corrective')}
                      className="group grid min-h-11 w-full cursor-pointer grid-cols-[minmax(5rem,12rem)_minmax(0,1fr)_2rem_1rem] items-center gap-3.5 rounded-xl px-3 py-2 text-start outline-none transition-colors duration-200 hover:bg-card sm:grid-cols-[minmax(8rem,16rem)_minmax(0,1fr)_2rem_1rem]"
                    >
                      <span className={cn('truncate first-letter:uppercase', hero ? 't-small-strong' : 't-body-s')}>{rule ? L(rule.label) : f.flag.replace(/_/g, ' ')}</span>
                      <span aria-hidden className="h-3 overflow-hidden rounded-full bg-line shadow-inset-track">
                        <span
                          className={cn('block h-full rounded-full', hero ? 'material-dark' : 'bg-grad-muted-fill opacity-[0.62]')}
                          style={{ width: `${(f.count / maxFault) * 100}%` }}
                        />
                      </span>
                      <span className={cn('tabular text-end', hero ? 't-small-strong' : 't-body-s')}>{f.count}</span>
                      <ArrowRight
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground transition-transform duration-400 ease-spring group-hover:translate-x-0.5 motion-reduce:transform-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </SectionCard>

      {!loading && !anyClassified && <EmptyState title={t('No runaway customers classified in this scope yet.', 'لا يوجد عملاء هاربون مصنَّفون ضمن هذا النطاق بعد.')} />}

      <div className="grid grid-cols-1 gap-(--grid-gap) lg:grid-cols-2">
        {RUNAWAY_LEARNING_ORDER.map((type) => {
          const list = byType.get(type) ?? []
          if (!list.length) return null
          const Icon = TYPE_ICON[type]
          return (
            <section key={type} id={`ra-${type}`} className="scroll-mt-20">
              <SectionCard
                className="h-full"
                title={
                  <span className="inline-flex items-center gap-2.5">
                    <span aria-hidden className="material-light inline-grid size-[30px] shrink-0 place-items-center rounded-full [&_svg]:size-4">
                      <Icon />
                    </span>
                    {L(RUNAWAY_TYPE_LABEL[type])}
                    <span className="pill pill-light tabular">{list.length}</span>
                  </span>
                }
                description={L(RUNAWAY_TYPE_DEFINITION[type])}
              >
                <ul className="flex flex-col">
                  {list.map((p) => {
                    const reason = classifications.get(p.id)?.reason
                    return (
                      <li key={p.id} className="row-divider flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">{p.label}</span>
                          {reason && <span className="text-xs text-muted-foreground">{L(reason)}</span>}
                        </div>
                        <Button variant="ghost" size="sm" asChild className="shrink-0">
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
