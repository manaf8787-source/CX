import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Activity, Layers, Megaphone, Plus, Settings2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useRole } from '@/auth/RoleContext'
import { canActOnCorrectiveAction } from '@/auth/permissions'
import { useCreateActionFromPattern, useHandoffs, usePatterns, useSignals } from '@/services/queries'
import type { CorrectiveActionKind, HandoffItem, Pattern } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KpiTile } from '@/components/common/KpiTile'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { PatternThresholdMeter } from './components/PatternThresholdMeter'
import { ScoresVsSignalsNotice } from './components/ScoresVsSignalsNotice'
import { signalCategoryLabel } from './components/labels'
import { useChartMotion } from '@/hooks/useChartMotion'

const CORRECTIVE_KINDS: CorrectiveActionKind[] = ['employee', 'service_behaviour', 'training_gap', 'product_app', 'process', 'environment', 'legal_privacy', 'marketing']

const KIND_LABEL: Record<CorrectiveActionKind, { en: string; ar: string }> = {
  employee: { en: 'Employee (management note)', ar: 'موظف (ملاحظة إدارية)' },
  service_behaviour: { en: 'Service & behaviour', ar: 'الخدمة والسلوك' },
  training_gap: { en: 'Training gap', ar: 'فجوة تدريبية' },
  product_app: { en: 'Product & app', ar: 'المنتج والتطبيق' },
  process: { en: 'Process', ar: 'العملية' },
  environment: { en: 'Environment', ar: 'البيئة' },
  legal_privacy: { en: 'Legal & privacy', ar: 'قانوني وخصوصية' },
  marketing: { en: 'Marketing', ar: 'تسويق' },
}


export default function Signals() {
  const chartMotion = useChartMotion()
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const now = useNow()
  const { data: signals, isLoading: signalsLoading } = useSignals()
  const { data: patterns, isLoading: patternsLoading } = usePatterns()
  const { data: handoffs, isLoading: handoffsLoading } = useHandoffs()
  const createAction = useCreateActionFromPattern()
  const [creatingFor, setCreatingFor] = useState<Pattern | null>(null)

  const volumeSeries = useMemo(() => {
    if (!signals) return []
    const byDay = new Map<string, number>()
    for (const s of signals) {
      const day = s.occurredAt.slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + 1)
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day: day.slice(5), count }))
  }, [signals])

  const publicMentions = signals?.filter((s) => s.isPublic) ?? []
  const canCreate = canActOnCorrectiveAction(role.id, 'process')

  const handoffColumns: ColumnDef<HandoffItem>[] = [
    { id: 'owner', header: t('Owner system', 'النظام المالك'), accessorFn: (h) => L(h.ownerSystem) },
    {
      id: 'status',
      header: t('Status', 'الحالة'),
      accessorKey: 'status',
      cell: ({ row }) => (
        <StatusBadge tone={row.original.status === 'done' ? 'success' : 'neutral'} dot>
          {row.original.status === 'done' ? t('Done', 'منجز') : t('Open', 'مفتوح')}
        </StatusBadge>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <ScoresVsSignalsNotice register="signals" />

      <section aria-label={t('Signal totals', 'إجماليات الإشارات')} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile
          label={t('Signals (counted, not worked)', 'الإشارات (تُحصى ولا تُعالج فردياً)')}
          value={signals?.length}
          accent="var(--chart-1)"
          icon={<Activity />}
          loading={signalsLoading}
        />
        <KpiTile
          label={t('Patterns past threshold', 'أنماط تجاوزت الحد')}
          value={patterns?.length}
          accent="var(--warning)"
          icon={<Layers />}
          loading={patternsLoading}
        />
        <KpiTile
          label={t('Public mentions', 'الإشارات العامة')}
          value={signals ? publicMentions.length : undefined}
          sub={t('48-hour reply clock', 'ساعة رد 48 ساعة')}
          accent="var(--chart-4)"
          icon={<Megaphone />}
          loading={signalsLoading}
        />
      </section>

      <SectionCard
        title={t('Signal volume', 'حجم الإشارات')}
        description={t('Signals per day across live products.', 'الإشارات يومياً عبر المنتجات الفعالة.')}
        actions={
          <Button variant="ghost" size="sm" asChild className="text-primary">
            <Link to="/settings/rules">
              <Settings2 aria-hidden />
              {t('Edit thresholds', 'تعديل الحدود')}
            </Link>
          </Button>
        }
      >
        {signalsLoading ? (
          <LoadingState rows={2} />
        ) : (
          <div className="h-44" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={lang === 'ar' ? [...volumeSeries].reverse() : volumeSeries}
                margin={lang === 'ar' ? { top: 4, right: -20, bottom: 0, left: 4 } : { top: 4, right: 4, bottom: 0, left: -20 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <YAxis
                  allowDecimals={false}
                  orientation={lang === 'ar' ? 'right' : 'left'}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--border)' }}
                  formatter={(v) => [v, t('Signals', 'الإشارات')]}
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="count" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.12} strokeWidth={2} {...chartMotion} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={t('Patterns', 'الأنماط')}
        description={t('Each pattern shows how far its signals are toward the rule that makes it actionable.', 'يُظهر كل نمط مدى اقتراب إشاراته من القاعدة التي تجعله قابلاً للإجراء.')}
      >
        {patternsLoading ? (
          <LoadingState rows={4} />
        ) : !patterns?.length ? (
          <EmptyState title={t('No patterns past threshold yet.', 'لا توجد أنماط تجاوزت الحد بعد.')} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {patterns.map((p) => (
              <li key={p.id} className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {L(signalCategoryLabel(p.category))} <span className="font-normal text-muted-foreground">· {p.team}</span>
                  </h3>
                </div>
                <PatternThresholdMeter pattern={p} />
                <p className="text-sm">{L(p.aiSuggestion)}</p>
                <p className="text-xs text-muted-foreground">{L(p.recoveryFigure)}</p>
                {canCreate && p.hasMinimumSample && (
                  <Button size="sm" className="h-9 self-start" onClick={() => setCreatingFor(p)}>
                    <Plus aria-hidden />
                    {t('Create action', 'إنشاء إجراء')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={t('Public mentions', 'الإشارات العامة')}
          description={t('Never tied to a person unless self-identified.', 'لا تُربط بشخص إلا إذا عرّف نفسه.')}
        >
          {signalsLoading ? (
            <LoadingState rows={3} />
          ) : publicMentions.length === 0 ? (
            <EmptyState title={t('No public mentions yet.', 'لا توجد إشارات عامة بعد.')} />
          ) : (
            <ul className="flex flex-col divide-y">
              {publicMentions.map((s) => {
                const dueMs = s.publicReplyDueAt ? new Date(s.publicReplyDueAt).getTime() - now : null
                const breached = dueMs !== null && dueMs <= 0
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Megaphone aria-hidden className="size-4 text-muted-foreground" />
                      <span>{L(signalCategoryLabel(s.category))}</span>
                      <span className="text-muted-foreground">· {s.environment}</span>
                    </span>
                    {s.publicReplyDueAt ? (
                      <StatusBadge tone={breached ? 'danger' : 'warning'} dot>
                        {breached ? t('48h reply breached', 'تجاوز ساعة الرد 48') : t('48h reply clock running', 'ساعة الرد 48 جارية')}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">{t('No reply clock', 'لا ساعة رد')}</StatusBadge>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={t('Hand-offs', 'التسليمات')}
          description={t('One-customer fixes owned by another system — status tracked, no SLA clock runs here.', 'إصلاحات فردية تملكها أنظمة أخرى — تُتابع حالتها دون ساعة التزام.')}
        >
          <DataTable columns={handoffColumns} data={handoffs} isLoading={handoffsLoading} pageSize={6} emptyTitle={t('No hand-offs', 'لا تسليمات')} />
        </SectionCard>
      </div>

      {creatingFor && (
        <CreateActionDialog
          pattern={creatingFor}
          onCancel={() => setCreatingFor(null)}
          onCreate={(values) => {
            createAction.mutate({ pattern: creatingFor, ...values })
            setCreatingFor(null)
            toast.success(t('Corrective action proposed', 'تم اقتراح إجراء تصحيحي'))
          }}
        />
      )}
    </div>
  )
}

const createSchema = z.object({
  kind: z.enum(['employee', 'service_behaviour', 'training_gap', 'product_app', 'process', 'environment', 'legal_privacy', 'marketing']),
  owner: z.string().trim().min(2, 'owner'),
  dueDate: z.string().min(1, 'due'),
})
type CreateValues = z.infer<typeof createSchema>

function CreateActionDialog({ pattern, onCancel, onCreate }: { pattern: Pattern; onCancel: () => void; onCreate: (v: CreateValues) => void }) {
  const { t, L } = useI18n()
  const now = useNow()
  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { kind: 'process', owner: `${pattern.team.replace(' team', '')} environment manager`, dueDate: new Date(now + 5 * 86_400_000).toISOString().slice(0, 10) },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t('Create a corrective action', 'إنشاء إجراء تصحيحي')}</DialogTitle>
            <DialogDescription>
              {L(signalCategoryLabel(pattern.category))} — {pattern.team}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="ca-kind">{t('Kind', 'النوع')}</FieldLabel>
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ca-kind" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CORRECTIVE_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {L(KIND_LABEL[k])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field data-invalid={!!errors.owner}>
              <FieldLabel htmlFor="ca-owner">{t('Owner (title)', 'المالك (المسمى الوظيفي)')}</FieldLabel>
              <Input id="ca-owner" className="h-9" aria-invalid={!!errors.owner} {...register('owner')} />
              {errors.owner && <FieldError>{t('Owner title is required.', 'المسمى الوظيفي للمالك مطلوب.')}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.dueDate}>
              <FieldLabel htmlFor="ca-due">{t('Due date', 'تاريخ الاستحقاق')}</FieldLabel>
              <Input id="ca-due" type="date" className="h-9" aria-invalid={!!errors.dueDate} {...register('dueDate')} />
              {errors.dueDate && <FieldError>{t('Due date is required.', 'تاريخ الاستحقاق مطلوب.')}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">{t('Propose action', 'اقتراح إجراء')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
