import { Link } from 'react-router-dom'
import { ArrowRight, Megaphone } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { useAuth } from '@/auth/session'
import { useNow } from '@/hooks/useNow'
import { useRules } from '@/services/queriesV40'
import { usePublicMentions } from '@/services/referenceQueries'
import { mentionStage } from '@/data/publicMentions'
import { SectionCard } from '@/components/common/SectionCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Public mentions on Home (owner, 25 Nov: "they are not here; a small brief with the numbers, and a click takes you to the right place").
 * Four numbers from the same list the Public mentions page shows; each opens that page filtered. A CX team member sees their own first.
 */
export function PublicMentionsBrief() {
  const { t } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const now = useNow()
  const rules = useRules()
  const { data: mentions } = usePublicMentions()
  if (!canAccessPath(role.id, '/settings/public-mentions') || !mentions?.length) return null

  const open = mentions.filter((m) => !m.replied)
  const late = open.filter((m) => mentionStage(m, now, rules) === 'escalated')
  const mine = role.id === 'cxteam' ? open.filter((m) => m.assignee === session?.userId) : []
  const negative = mentions.filter((m) => m.sentiment < 0).length
  const negPct = Math.round((negative / mentions.length) * 100)
  const base = '/settings/public-mentions'

  const tiles = [
    ...(role.id === 'cxteam'
      ? [{ label: t('Waiting for your reply', 'بانتظار ردك'), value: mine.length, to: `${base}?assignee=me&status=open`, bad: mine.length > 0 }]
      : []),
    { label: t('Not replied yet', 'بلا رد بعد'), value: open.length, to: `${base}?status=open`, bad: false },
    {
      label: t(`Past the ${rules.publicReplyHours} h reply time`, `تجاوزت مهلة ${rules.publicReplyHours} ساعة`),
      value: late.length,
      to: `${base}?status=overdue`,
      bad: late.length > 0,
    },
    { label: t('Negative comments', 'تعليقات سلبية'), value: `${negPct}%`, to: base, bad: negPct >= 50 },
  ]

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <Megaphone aria-hidden className="size-4" />
          {t('Public mentions', 'الإشارات العامة')}
        </span>
      }
      description={t(
        `Comments on Facebook, Instagram, LinkedIn, Google and the app stores. ${mentions.length} in total.`,
        `تعليقات فيسبوك وإنستغرام ولينكد إن وGoogle ومتاجر التطبيقات. ${mentions.length} بالمجمل.`,
      )}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to={base}>
            {t('Open', 'افتح')}
            <ArrowRight aria-hidden className="rtl:rotate-180" />
          </Link>
        </Button>
      }
    >
      <ul className={cn('grid grid-cols-2 gap-3', tiles.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
        {tiles.map((x) => (
          <li key={x.label}>
            <Link to={x.to} className="well flex flex-col gap-1 px-4 py-3 outline-hidden transition-colors hover:bg-well-hover focus-visible:ring-2">
              <span className="text-xs text-muted-foreground">{x.label}</span>
              <span className={cn('t-kpi tabular', x.bad ? 'text-(--status-error-text)' : 'text-foreground')}>{x.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
