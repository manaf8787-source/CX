import { Crown, Fingerprint } from 'lucide-react'
import { useI18n } from '@/i18n'
import { usePersonas } from '@/services/queries'
import type { Person } from '@/types'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CHANNEL_LABEL } from './channels'

/** FR-2.2 — the CRM profile block: type, environment, units/deals,
 * residence, workplace, income source, preferred channel, language,
 * persona, VIP tag. */
export function ProfileCard({ person }: { person: Person }) {
  const { t, L } = useI18n()
  const { data: personas } = usePersonas()
  const persona = personas?.find((p) => p.id === person.personaId)
  const identity = [person.identity.mobile, person.identity.email, person.identity.emiratesId, person.identity.crmContactId].filter(Boolean)

  return (
    <SectionCard
      title={t('Profile', 'الملف الشخصي')}
      actions={
        person.vip && (
          <StatusBadge tone="warning" icon={<Crown aria-hidden />}>
            {t('VIP — PSI Club', 'عميل مميز — نادي PSI')}
          </StatusBadge>
        )
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
        <Item label={t('Type', 'النوع')} value={person.type === 'customer' ? t('Customer', 'عميل') : t('Lead', 'عميل محتمل')} />
        <Item label={t('Environment', 'البيئة')} value={person.environment} />
        <Item label={t('Units/deals', 'الوحدات/الصفقات')} value={String(person.unitsOrDeals)} numeric />
        <Item label={t('Residence', 'مكان الإقامة')} value={person.residence ?? '—'} />
        <Item label={t('Workplace', 'مكان العمل')} value={person.workplace ?? '—'} />
        <Item label={t('Income source', 'مصدر الدخل')} value={person.incomeSource ?? '—'} />
        <Item label={t('Preferred channel', 'القناة المفضلة')} value={L(CHANNEL_LABEL[person.preferredChannel])} />
        <Item label={t('Language', 'اللغة')} value={person.language === 'en' ? t('English', 'الإنجليزية') : t('Arabic', 'العربية')} />
        <Item label={t('Persona', 'الشخصية')} value={persona ? L(persona.name) : t('Not yet assigned', 'لم تُحدَّد بعد')} />
      </dl>
      {identity.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
          <Fingerprint aria-hidden className="size-4" />
          {t('Identity stitched by', 'هوية موحّدة عبر')}:
          {identity.map((id) => (
            <bdi key={id} dir="ltr" className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {id}
            </bdi>
          ))}
        </p>
      )}
    </SectionCard>
  )
}

function Item({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={numeric ? 'text-sm font-medium tabular-nums' : 'truncate text-sm font-medium'}>{value}</dd>
    </div>
  )
}
