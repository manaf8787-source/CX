import { Check, Info, PhoneOff, ShieldCheck, X } from 'lucide-react'
import type { Person } from '@/types'
import { useI18n } from '@/i18n'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CONSENT_CHANNELS, CONSENT_CHANNEL_LABEL, SKIP_REASON_LABEL, surveyReach } from './consent'

/**
 * Consent and DNCR as the CRM holds them (v40 F24), on the person's page before the effort tiles: "Consent (from the CRM):",
 * then DNCR (critical) or "Consent given" (good), then WhatsApp, Email and SMS (a warning chip when there is no consent).
 * Under it the surveys line says what the flags mean and which reason a skipped survey carries (F25).
 * The flags are sample data until the CRM owner confirms the source (the tooltip says so).
 */
export function ConsentRow({ person }: { person: Pick<Person, 'consent'> }) {
  const { t, L } = useI18n()
  const { consent } = person
  const reach = surveyReach(person)
  const sampleNote = t('Sample flags, as the CRM would hold them. Confirm the consent source with the CRM owner.', 'علامات افتراضية كما سيحملها CRM. يؤكَّد مصدر الموافقة مع مالك CRM.')

  return (
    <section aria-label={t('Consent', 'الموافقة')} className="flex flex-col gap-2 rounded-xl border bg-card px-4 py-3" title={sampleNote}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('Consent (from the CRM):', 'الموافقة (من CRM):')}</span>
        {consent.dncr ? (
          <StatusBadge tone="danger" icon={<PhoneOff aria-hidden />}>
            {t('DNCR · no calls, no surveys by call', 'DNCR · لا مكالمات ولا استبيانات بالهاتف')}
          </StatusBadge>
        ) : (
          <StatusBadge tone="success" icon={<ShieldCheck aria-hidden />}>
            {t('Consent given', 'موافقة مسجلة')}
          </StatusBadge>
        )}
        {CONSENT_CHANNELS.map((c) => (
          <StatusBadge key={c} tone={consent[c] ? 'success' : 'warning'} icon={consent[c] ? <Check aria-hidden /> : <X aria-hidden />}>
            {L(CONSENT_CHANNEL_LABEL[c])}
            <span className="sr-only">: {consent[c] ? t('yes', 'نعم') : t('no', 'لا')}</span>
          </StatusBadge>
        ))}
      </div>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
        <Info aria-hidden className="size-3.5 shrink-0" />
        {reach.skipped.length > 0 ? (
          <>
            <span>{t('Surveys skipped for this person, reason logged:', 'استبيانات متخطّاة لهذا الشخص، والسبب مسجَّل:')}</span>
            {reach.skipped.map((r) => (
              <StatusBadge key={r} tone="neutral">
                {L(SKIP_REASON_LABEL[r])}
              </StatusBadge>
            ))}
          </>
        ) : (
          <span>
            {reach.channelsWithoutConsent.length > 0
              ? t(
                  `No survey on ${reach.channelsWithoutConsent.map((c) => CONSENT_CHANNEL_LABEL[c].en).join(' or ')}: no consent. `,
                  `لا استبيان عبر ${reach.channelsWithoutConsent.map((c) => CONSENT_CHANNEL_LABEL[c].ar).join(' أو ')}: بلا موافقة. `,
                )
              : ''}
            {t('A skipped survey states why: DNCR, inside a cap, no consent or duplicate.', 'كل استبيان متخطّى يذكر السبب: DNCR أو داخل سقف أو بلا موافقة أو مكرر.')}
          </span>
        )}
      </p>
    </section>
  )
}
