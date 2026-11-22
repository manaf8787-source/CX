import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Search } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useCorrectiveActions, useHrPool, useLdRequests, useShopperCases, useStandards } from '@/services/queries'
import { DEPT_LABEL, pendingItems, timingOf, type Dept, type PendingItem, type PendingSource } from '@/data/pendingWork'
import { ACTION_KIND } from '@/lib/actionKinds'
import { CORRECTIVE_STATUS_LABEL, CORRECTIVE_STATUS_TONE, LD_REQUEST_STATUS_LABEL, SEVERITY_TONE, STANDARD_STATUS_LABEL } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { ProductTag } from '@/components/common/Chip'
import type { ProductId } from '@/types'

/**
 * "With other teams" (owner's request, 22 Nov): everything the CX side is waiting on from another department, in one list. Fixes their
 * owners still have to decide or carry out, conduct cases with HR, training requests with L&D, the standards documents another team still has to write. Pick a department, open any line to read
 * it. Replaces looking in the HR pool, the L&D page and the fixes list one by one. CX manager and CX team only.
 */
const SOURCE_LABEL: Record<PendingSource, { en: string; ar: string }> = {
  fix: { en: 'Fix', ar: 'إصلاح' },
  conduct: { en: 'Conduct case', ar: 'حالة سلوك' },
  training: { en: 'Training request', ar: 'طلب تدريب' },
  document: { en: 'Document to write', ar: 'مستند للكتابة' },
}

const CASE_STATUS: Record<string, { en: string; ar: string }> = {
  open: { en: 'Open', ar: 'مفتوحة' },
  triaged: { en: 'Triaged', ar: 'مصنّفة' },
  owner_decision: { en: 'Waiting for the owner', ar: 'بانتظار المالك' },
  hr_review: { en: 'With HR', ar: 'لدى الموارد البشرية' },
  closed: { en: 'Closed', ar: 'مغلقة' },
}

type When = 'all' | 'late' | 'soon'

export default function WithOtherTeams() {
  const { t, L, lang } = useI18n()
  const { data: fixes, isLoading: l1 } = useCorrectiveActions()
  const { data: cases, isLoading: l2 } = useShopperCases()
  const { data: requests, isLoading: l3 } = useLdRequests()
  const { data: pool, isLoading: l4 } = useHrPool()
  const { data: standards } = useStandards()
  const [dept, setDept] = useState<Dept | 'all'>('all')
  const [when, setWhen] = useState<When>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const all = useMemo(() => pendingItems(fixes ?? [], cases ?? [], requests ?? [], pool ?? [], standards ?? []), [fixes, cases, requests, pool, standards])
  const depts = useMemo(() => {
    const m = new Map<Dept, { total: number; late: number }>()
    for (const i of all) {
      const d = m.get(i.dept) ?? { total: 0, late: 0 }
      d.total++
      if (timingOf(i).timing === 'late') d.late++
      m.set(i.dept, d)
    }
    return [...m.entries()].sort((a, b) => b[1].late - a[1].late || b[1].total - a[1].total)
  }, [all])
  const shown = all
    .filter((i) => dept === 'all' || i.dept === dept)
    .filter((i) => when === 'all' || timingOf(i).timing === when)
    .filter((i) => !query.trim() || `${i.title.en} ${i.title.ar} ${i.owner}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (a.dueAt ? timingOf(a).days : Infinity) - (b.dueAt ? timingOf(b).days : Infinity))
  const late = all.filter((i) => timingOf(i).timing === 'late').length

  if (l1 || l2 || l3 || l4) return <LoadingState rows={5} />

  return (
    <div className="flex flex-col gap-4" data-testid="with-other-teams">
      <SectionCard
        title={t('Waiting on other teams', 'بانتظار الأقسام الأخرى')}
        description={t(
          `${all.length} things are with another department, ${late} of them past their date. Pick a department to see only its list.`,
          `${all.length} بنداً لدى أقسام أخرى، منها ${late} تجاوزت موعدها. اختر قسماً لترى قائمته فقط.`,
        )}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <DeptTile active={dept === 'all'} onClick={() => setDept('all')} label={t('All departments', 'كل الأقسام')} total={all.length} late={late} />
          {depts.map(([d, n]) => (
            <DeptTile key={d} active={dept === d} onClick={() => setDept(d)} label={L(DEPT_LABEL[d])} total={n.total} late={n.late} />
          ))}
        </div>
      </SectionCard>

      <SectionCard contentClassName="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="relative flex min-w-56 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            {t('Find', 'ابحث')}
            <Search aria-hidden className="pointer-events-none absolute start-3 top-[29px] size-3.5" />
            <Input
              className="h-9 ps-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Part of the title or the owner', 'جزء من العنوان أو المالك')}
            />
          </label>
          <Segmented<When>
            label={t('Show', 'اعرض')}
            variant="pressed"
            value={when}
            onValueChange={setWhen}
            options={[
              { value: 'all', label: t('Everything', 'الكل') },
              { value: 'late', label: t('Past the date', 'متأخرة') },
              { value: 'soon', label: t('Due this week', 'مستحقة هذا الأسبوع') },
            ]}
          />
        </div>
        {shown.length === 0 ? (
          <EmptyState title={t('Nothing waiting here.', 'لا شيء بالانتظار هنا.')} />
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((i) => (
              <Row key={`${i.source}-${i.id}`} item={i} open={openId === i.id} onToggle={() => setOpenId(openId === i.id ? null : i.id)} lang={lang} />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

function DeptTile({ active, onClick, label, total, late }: { active: boolean; onClick: () => void; label: string; total: number; late: number }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col gap-1 rounded-xl border p-3 text-start outline-hidden transition-colors focus-visible:ring-2',
        active ? 'border-foreground bg-well' : 'border-line hover:bg-(--hover-tint)',
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-medium tabular text-foreground">{total}</span>
      <span className={cn('text-xs', late ? 'text-(--status-error-text)' : 'text-muted-foreground')}>
        {late ? t(`${late} late`, `${late} متأخرة`) : t('none late', 'لا متأخرات')}
      </span>
    </button>
  )
}

function Row({ item, open, onToggle, lang }: { item: PendingItem; open: boolean; onToggle: () => void; lang: 'en' | 'ar' }) {
  const { t, L } = useI18n()
  const { timing, days } = timingOf(item)
  const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short' }) : '—')
  return (
    <li className="well flex flex-col gap-3 p-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-start outline-hidden focus-visible:ring-2"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-medium text-foreground">{L(item.title)}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge>{L(SOURCE_LABEL[item.source])}</StatusBadge>
            {L(DEPT_LABEL[item.dept])} · {item.owner}
            {item.product && <ProductTag productId={item.product as ProductId} lang={lang} />}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {timing === 'late' && <StatusBadge tone="danger">{t(`${-days} days late`, `متأخرة ${-days} يوماً`)}</StatusBadge>}
          {timing === 'soon' && <StatusBadge tone="warning">{t(`due in ${days} days`, `مستحقة خلال ${days} أيام`)}</StatusBadge>}
          {timing === 'ok' && <StatusBadge tone="success">{t(`due ${day(item.dueAt)}`, `مستحقة ${day(item.dueAt)}`)}</StatusBadge>}
          <ChevronDown aria-hidden className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-line pt-3 text-sm">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <Fact label={t('Waiting for', 'بانتظار')} value={L(item.waitingFor)} />
            <Fact label={t('With', 'لدى')} value={`${item.owner} (${L(DEPT_LABEL[item.dept])})`} />
            {item.openedAt && <Fact label={t('Since', 'منذ')} value={day(item.openedAt)} />}
            {item.dueAt && <Fact label={t('Due', 'الموعد')} value={day(item.dueAt)} />}
            {item.fix && (
              <>
                <Fact label={t('Kind of problem', 'نوع المشكلة')} value={L(ACTION_KIND[item.fix.kind].label)} />
                <Fact
                  label={t('Status', 'الحالة')}
                  value={<StatusBadge tone={CORRECTIVE_STATUS_TONE[item.fix.status]}>{L(CORRECTIVE_STATUS_LABEL[item.fix.status])}</StatusBadge>}
                />
                <Fact label={t('What comes back to us', 'ما يعود إلينا')} value={L(ACTION_KIND[item.fix.kind].comesBack)} wide />
              </>
            )}
            {item.shopperCase && (
              <>
                <Fact
                  label={t('Severity', 'الخطورة')}
                  value={<StatusBadge tone={SEVERITY_TONE[item.shopperCase.severity]}>{item.shopperCase.severity}</StatusBadge>}
                />
                <Fact label={t('Status', 'الحالة')} value={L(CASE_STATUS[item.shopperCase.status])} />
                <Fact label={t('Where', 'المكان')} value={item.shopperCase.environment} />
                <Fact label={t('Visit score', 'نتيجة الزيارة')} value={`${item.shopperCase.visitScorePct}%`} />
              </>
            )}
            {item.standard && (
              <>
                <Fact label={t('Code', 'الرمز')} value={item.standard.code} />
                <Fact label={t('Status', 'الحالة')} value={L(STANDARD_STATUS_LABEL[item.standard.status])} />
                <Fact label={t('Who uses it', 'من يستخدمه')} value={L(item.standard.readBy)} />
                <Fact label={t('Waiting items tied to it', 'بنود مرتبطة به')} value={String(item.standard.linkedItems)} />
              </>
            )}
            {item.request && (
              <>
                <Fact label={t('Asked by', 'طلبه')} value={item.request.requestedBy} />
                <Fact label={t('Status', 'الحالة')} value={L(LD_REQUEST_STATUS_LABEL[item.request.status])} />
                {item.request.environment && <Fact label={t('Where', 'المكان')} value={item.request.environment} />}
              </>
            )}
          </dl>

          {item.fix && item.fix.auditLog.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t('Latest steps', 'آخر الخطوات')}</span>
              <ol className="flex flex-col gap-1">
                {[...item.fix.auditLog]
                  .reverse()
                  .slice(0, 3)
                  .map((a, k) => (
                    <li key={k} className="text-xs text-foreground">
                      <span className="text-muted-foreground">{day(a.at)} · </span>
                      {L(a.what)}
                    </li>
                  ))}
              </ol>
            </div>
          )}
          {item.shopperCase && item.shopperCase.proposedActions.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t('Actions proposed to HR', 'الإجراءات المقترحة على الموارد البشرية')}</span>
              <ol className="flex flex-col gap-1">
                {item.shopperCase.proposedActions.map((a) => (
                  <li key={a.n} className="flex flex-wrap items-center gap-2 text-xs text-foreground">
                    <span>
                      {a.n}. {L(a.text)}
                    </span>
                    <StatusBadge tone={a.decision === 'pending' ? 'warning' : a.decision === 'rejected' ? 'danger' : 'success'}>{a.decision}</StatusBadge>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!item.request && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link
                  to={
                    item.fix
                      ? `/actions/corrective?fix=${item.fix.id}`
                      : item.shopperCase
                        ? '/actions/shopper-cases'
                        : item.standard
                          ? '/settings/standards'
                          : '/settings/ld'
                  }
                >
                  {item.fix
                    ? t('Open the fix', 'افتح الإصلاح')
                    : item.shopperCase
                      ? t('Open shopper cases', 'افتح حالات التسوق')
                      : item.standard
                        ? t('Open the standards register', 'افتح سجل المعايير')
                        : t('Open L&D', 'افتح التعلم والتطوير')}
                  <ArrowRight aria-hidden className="rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function Fact({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-0.5', wide && 'sm:col-span-2')}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}

