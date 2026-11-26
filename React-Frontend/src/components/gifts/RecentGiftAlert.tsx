import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { REASON_LABEL, giftWhy, givenAt, recentGiftsTo, type Gift, type GiftItem } from '@/data/gifts'
import { useRules } from '@/services/queriesV40'
import { InlineNote } from '@/components/common/InlineNote'

/**
 * 26 Nov (owner): not a block. When the customer already got a gift in the last six months, tell CX when, what and why, and link to the full
 * history of that customer so the decision is made with the story. Shown wherever a gift is asked, approved or sent.
 */
export function RecentGiftAlert({
  gifts,
  items,
  personId,
  fullName,
  excludeId,
}: {
  gifts: readonly Gift[]
  items: readonly GiftItem[]
  personId?: string
  fullName?: string
  /** The request being looked at, so it never alerts about itself. */
  excludeId?: string
}) {
  const { t, lang } = useI18n()
  // the window is a rule the CX manager sets (Settings, Rules)
  const months = useRules().giftAlertMonths
  const recent = recentGiftsTo(gifts, { personId, fullName }, new Date(), excludeId, months)
  if (recent.length === 0) return null
  const fmt = (d: string) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { month: 'long', year: 'numeric' }).format(new Date(d))
  const who = personId ? `person=${encodeURIComponent(personId)}` : `name=${encodeURIComponent(fullName ?? '')}`
  const link = `/gifts?tab=history&${who}`
  return (
    <InlineNote
      tone="warning"
      title={t(
        recent.length === 1 ? `This customer already got a gift in the last ${months} months` : `This customer got ${recent.length} gifts in the last ${months} months`,
        recent.length === 1 ? `هذا العميل أخذ هدية خلال آخر ${months} أشهر` : `هذا العميل أخذ ${recent.length} هدايا خلال آخر ${months} أشهر`,
      )}
      action={
        <Link to={link} className="text-sm underline underline-offset-2">
          {t('See the full history', 'شوف السجل الكامل')}
        </Link>
      }
      role="status"
    >
      {recent
        .slice(0, 3)
        .map((g) => {
          const item = items.find((i) => i.id === g.itemId)
          const why = giftWhy(g, lang)
          return t(
            `${fmt(givenAt(g))}: ${item ? item.name.en : g.itemId} (${REASON_LABEL[g.reason].en})${why ? `, because: ${why}` : ''}.`,
            `${fmt(givenAt(g))}: ${item ? item.name.ar : g.itemId} (${REASON_LABEL[g.reason].ar})${why ? `، السبب: ${why}` : ''}.`,
          )
        })
        .join(' ')}
      {recent.length > 3 && ` ${t(`And ${recent.length - 3} more.`, `و${recent.length - 3} أخرى.`)}`}{' '}
      <span className="text-muted-foreground">{t(`A reminder only (window: ${months} months, set in Settings, Rules); you can still go ahead.`, `تنبيه فقط (المدة: ${months} أشهر، من الإعدادات ← القواعد)؛ تقدر تكمل.`)}</span>
    </InlineNote>
  )
}
