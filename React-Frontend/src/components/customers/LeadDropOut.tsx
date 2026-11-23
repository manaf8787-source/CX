import { Fragment, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { useEnvScope } from '@/services/envScope'
import { envName } from '@/data/environments'
import {
  EXIT_LABEL,
  OPP_STAGES,
  OWNER_LABEL,
  SOURCE_LABEL,
  STAGE_LABEL,
  agentName,
  exitOf,
  leadSample,
  type ExitReason,
  type LeadRec,
  type LeadSource,
  type Owner,
} from '@/data/leadFunnel'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard } from '@/components/common/SectionCard'

/**
 * Who is leaving, the CRM view (owner, 23 Nov, from PSI Marketing's CRM logic guide): every enquiry of the last 90 days, how far it got
 * (AI → qualified → agent → viewing → offer → booking → won), where it dropped out, why (the guide's reasons: unreachable, nurture,
 * junk, non-buyer, returned by the agent, closed lost with its reason, stuck), and who had the person last (the AI, Customer Support,
 * Agent QA, Return QA, or the agent by name). Filter by campaign and source, so Marketing and the auditor see where a campaign loses
 * its people.
 */
const CODES = ['MKT-2026-031', 'MKT-2026-034', 'MKT-2026-037', 'MKT-2026-040', 'MKT-2026-043']

export function LeadDropOut() {
  const { t, L, lang } = useI18n()
  const now = useNow()
  const { env } = useEnvScope()
  const [campaign, setCampaign] = useState('all')
  const [source, setSource] = useState<'all' | LeadSource>('all')
  const [open, setOpen] = useState<ExitReason | null>(null)
  const list = useMemo(
    () =>
      leadSample(now).filter(
        (l) =>
          (env === 'all' || l.envId === env) &&
          (campaign === 'all' || (campaign === 'none' ? !l.campaignCode : l.campaignCode === campaign)) &&
          (source === 'all' || l.source === source),
      ),
    [now, env, campaign, source],
  )

  // how far each enquiry got
  const reachedIdx = (l: LeadRec) => (l.opp ? 2 + OPP_STAGES.indexOf(l.opp.confirmed ? l.opp.reached : 'contacted') : l.contacted ? 1 : 0)
  const steps: { label: string; idx: number }[] = [
    { label: t('Enquiries', 'الاستفسارات'), idx: 0 },
    { label: t('The AI reached them', 'وصلهم الذكاء الاصطناعي'), idx: 1 },
    { label: t('Qualified, handed to an agent', 'مؤهلون، سُلّموا لوكيل'), idx: 2 },
    { label: L(STAGE_LABEL.confirmed), idx: 4 },
    { label: L(STAGE_LABEL.viewing), idx: 5 },
    { label: L(STAGE_LABEL.offer), idx: 6 },
    { label: L(STAGE_LABEL.booking), idx: 7 },
    { label: L(STAGE_LABEL.won), idx: 8 },
  ]
  const reached = steps.map((s) => list.filter((l) => reachedIdx(l) >= s.idx).length)
  const max = Math.max(1, reached[0])

  const exits = useMemo(() => {
    const m = new Map<ExitReason, LeadRec[]>()
    for (const l of list) {
      const e = exitOf(l)
      if (e) m.set(e, [...(m.get(e) ?? []), l])
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [list])
  const ownerOf = (l: LeadRec) => (l.lastOwner === 'agent' ? agentName(l.agentId) : L(OWNER_LABEL[l.lastOwner]))
  const owners = (rows: LeadRec[]) => {
    const m = new Map<Owner, number>()
    rows.forEach((l) => m.set(l.lastOwner, (m.get(l.lastOwner) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const fmt = (d: string) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short' }).format(new Date(d))
  const stageOf = (l: LeadRec) =>
    l.opp
      ? L(STAGE_LABEL[l.opp.confirmed ? l.opp.reached : 'contacted'])
      : l.contacted
        ? t('With the AI', 'مع الذكاء الاصطناعي')
        : t('Never reached', 'لم يُوصل إليه')

  return (
    <SectionCard
      title={t('Where people drop out, why, and who had them last', 'أين يتوقف الناس، ولماذا، ومن كان معهم آخر مرة')}
      description={t(
        'Every enquiry of the last 90 days through the CRM funnel: the AI first, then the sales agent. Read it by campaign to see where each one loses its people.',
        'كل استفسار في آخر 90 يوماً عبر مسار الـCRM: الذكاء الاصطناعي أولاً ثم وكيل المبيعات. اقرأه حسب الحملة لترى أين تخسر كل حملة ناسها.',
      )}
      contentClassName="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Select value={campaign} onValueChange={setCampaign}>
          <SelectTrigger className="h-9 min-w-48" aria-label={t('Campaign', 'الحملة')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All campaigns and sources', 'كل الحملات والمصادر')}</SelectItem>
            {CODES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
            <SelectItem value="none">{t('Not from a campaign', 'ليست من حملة')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(v) => setSource(v as 'all' | LeadSource)}>
          <SelectTrigger className="h-9 min-w-44" aria-label={t('Source', 'المصدر')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('Every source', 'كل المصادر')}</SelectItem>
            {(Object.keys(SOURCE_LABEL) as LeadSource[]).map((s) => (
              <SelectItem key={s} value={s}>
                {L(SOURCE_LABEL[s])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {env !== 'all' && <span className="text-sm text-muted-foreground">{L(envName(env))}</span>}
      </div>

      {/* the funnel */}
      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => {
          const n = reached[i]
          const prev = i ? reached[i - 1] : n
          const lost = prev - n
          return (
            <li key={s.label} className="grid grid-cols-[minmax(8rem,14rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="text-foreground">{s.label}</span>
              <span className="h-5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-foreground/80" style={{ width: `${Math.max(1, (100 * n) / max)}%` }} />
              </span>
              <span className="tabular min-w-28 text-end">
                <span className="font-medium text-foreground">{n}</span>
                {i > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    · {prev ? Math.round((100 * n) / prev) : 0}% {lost > 0 && t(`· ${lost} out`, `· خرج ${lost}`)}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      {/* why and who */}
      <div className="-mx-2.5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="row-divider-none">
              <TableHead>{t('Why they dropped out', 'لماذا خرجوا')}</TableHead>
              <TableHead className="text-end">{t('People', 'الأشخاص')}</TableHead>
              <TableHead>{t('Who had them last', 'من كان معهم آخر مرة')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {exits.map(([reason, rows]) => (
              <Fragment key={reason}>
                <TableRow className="cursor-pointer" onClick={() => setOpen(open === reason ? null : reason)} aria-expanded={open === reason}>
                  <TableCell className="min-w-56 whitespace-normal font-medium text-foreground">{L(EXIT_LABEL[reason])}</TableCell>
                  <TableCell className="text-end tabular">{rows.length}</TableCell>
                  <TableCell className="min-w-48 whitespace-normal text-sm">
                    {owners(rows)
                      .map(([o, n]) => `${o === 'agent' ? t('Sales agents', 'وكلاء المبيعات') : L(OWNER_LABEL[o])} ${n}`)
                      .join(' · ')}
                  </TableCell>
                  <TableCell>
                    <ChevronDown aria-hidden className={cn('size-4 transition-transform', open === reason && 'rotate-180')} />
                  </TableCell>
                </TableRow>
                {open === reason && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="whitespace-normal">
                      <ul className="flex flex-col divide-y rounded-xl border text-sm">
                        {rows.slice(0, 10).map((l) => (
                          <li key={l.id} className="grid grid-cols-2 gap-x-3 gap-y-0.5 px-3 py-2 md:grid-cols-5">
                            <span className="tabular text-foreground">
                              {l.id} · <bdi dir="ltr">{fmt(l.createdAt)}</bdi>
                            </span>
                            <span>{l.campaignCode ?? L(SOURCE_LABEL[l.source])}</span>
                            <span>{L(envName(l.envId))}</span>
                            <span>{t(`Got to: ${stageOf(l)}`, `وصل إلى: ${stageOf(l)}`)}</span>
                            <span className="font-medium text-foreground">{t(`Last with: ${ownerOf(l)}`, `آخر مع: ${ownerOf(l)}`)}</span>
                          </li>
                        ))}
                      </ul>
                      {rows.length > 10 && (
                        <p className="pt-1 text-xs text-muted-foreground">{t(`and ${rows.length - 10} more`, `و${rows.length - 10} غيرهم`)}</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          'Prototype: a sample of about 700 enquiries following the CRM logic guide. In the real platform this reads the CRM’s lead and deal statuses, with their mandatory reasons.',
          'نموذج أولي: عينة من نحو 700 استفسار تتبع دليل منطق الـCRM. في المنصة الفعلية تُقرأ حالات العملاء المحتملين والصفقات من الـCRM مع أسبابها الإجبارية.',
        )}
      </p>
    </SectionCard>
  )
}
