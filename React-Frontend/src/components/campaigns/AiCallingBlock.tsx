import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Headset } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canAccessPath } from '@/auth/access'
import { AI_CALL_DAILY, AI_CALL_EXTRA, AI_CAMPAIGNS, useBrightcallMapping } from '@/data/brightcall'
import { bcCampaignsFor, useCampaignLinks } from '@/data/campaignLinks'
import { CONTACT_TOUCHES } from '@/data/contactTouches'
import { summarizeAiCalls } from '@/utils/aiCalls'
import { repeatRows } from '@/utils/contactRepeats'
import { SectionCard } from '@/components/common/SectionCard'

const FROM = '2000-01-01'
const TO = '2100-01-01'

/**
 * The AI calling channel of a campaign (26 Nov, owner): the BrightCall campaigns linked to this Marketing campaign code (or Close the
 * loop campaign id), in overall numbers. Shown on Marketing campaigns; renders nothing when no BrightCall campaign is linked.
 * `budget` and `leads` (the campaign's own) give the cost per lead with the AI calling cost included.
 */
export function AiCallingBlock({ linkedTo, budget, leads }: { linkedTo: string; budget?: number; leads?: number }) {
  const { t, lang } = useI18n()
  const { role } = useRole()
  const links = useCampaignLinks()
  const mapping = useBrightcallMapping()
  const names = bcCampaignsFor(links, linkedTo)
  const key = names.join('|')
  const only = useMemo(() => new Set(key ? key.split('|') : []), [key])
  const s = useMemo(
    () => summarizeAiCalls(AI_CALL_DAILY, AI_CALL_EXTRA, AI_CAMPAIGNS, mapping, { env: 'all', campaign: 'all', from: FROM, to: TO, only }),
    [mapping, only],
  )
  const repeated = useMemo(
    () => repeatRows(CONTACT_TOUCHES, { from: FROM, to: TO, env: 'all', campaign: 'all', campaigns: only }).filter((r) => r.maxInOne >= 2).length,
    [only],
  )
  if (!names.length) return null
  const N = new Intl.NumberFormat(lang === 'ar' ? 'ar-AE' : 'en-GB')
  const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '–')
  const answered = s.byGroup.answered
  const total = (budget ?? 0) + s.cost
  const open = canAccessPath(role.id, '/ai-calls')
  const facts: [string, string][] = [
    [t('Calls', 'المكالمات'), N.format(s.calls)],
    [t('Answer rate', 'نسبة الرد'), pct(answered, s.calls)],
    [t('Dropped at the AI greeting', 'أُغلقت عند التحية'), N.format(s.drops.within_20s)],
    [t('Leads from AI calls', 'محتملون من المكالمات'), N.format(s.leads)],
    [t('AI calling cost', 'تكلفة المكالمات'), `AED ${N.format(Math.round(s.cost))}`],
    [t('Called 2+ times', 'اتصلنا بهم مرتين أو أكثر'), N.format(repeated)],
  ]
  if (budget !== undefined && leads)
    facts.push([t('Cost per lead with AI calls', 'تكلفة الليد مع المكالمات'), `AED ${N.format(Math.round(total / (leads + s.leads)))}`])

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <Headset aria-hidden className="size-4" />
          {t('AI calling (BrightCall)', 'المكالمات بالذكاء الاصطناعي (BrightCall)')}
        </span>
      }
      description={t(`Linked BrightCall campaigns: ${names.join(', ')}.`, `حملات BrightCall المربوطة: ${names.join('، ')}.`)}
      actions={
        open && (
          <Link to="/ai-calls?tab=links" className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {t('Campaign links', 'ربط الحملات')}
          </Link>
        )
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="t-ui-strong tabular">{v}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  )
}
