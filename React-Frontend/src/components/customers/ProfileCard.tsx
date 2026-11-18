import { Crown, Fingerprint } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canViewMobiles } from '@/auth/permissions'
import { usePersonas } from '@/services/queries'
import { envNameFromShort } from '@/data/environments'
import { SEGMENT_LABEL, SOURCE_LABEL } from '@/data/customersList'
import type { Person } from '@/types'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/utils'
import { CHANNEL_LABEL } from './channels'

/** FR-2.2 — the CRM profile block: type, environment, units/deals,
 * residence, workplace, income source, preferred channel, language,
 * persona, VIP tag. v40: the type is one of the six (F29), the lead source is shown, and
 * mobile, email and Emirates ID show only to roles that may see customer names (decided 18 Nov:
 * the Internal Audit and Marketing Lead sees the reference and the CRM contact id, nothing personal). */
export function ProfileCard({ person }: { person: Person }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const { data: personas } = usePersonas()
  const persona = personas?.find((p) => p.id === person.personaId)
  const personal = canViewMobiles(role.id)
  const identity = [personal ? person.identity.mobile : undefined, personal ? person.identity.email : undefined, personal ? person.identity.emiratesId : undefined, person.identity.crmContactId].filter(
    (v): v is string => !!v,
  )

  return (
    <SectionCard
      well
      title={t('Profile', 'الملف الشخصي')}
      actions={
        person.vip && (
          <StatusBadge tone="warning" icon={<Crown aria-hidden />}>
            {t('VIP — PSI Club', 'عميل مميز — نادي PSI')}
          </StatusBadge>
        )
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
        <Item label={t('Type', 'النوع')} value={L(SEGMENT_LABEL[person.segment])} />
        <Item label={t('Environment', 'البيئة')} value={L(envNameFromShort(person.environment))} />
        <Item label={t('Source of the lead', 'مصدر العميل المحتمل')} value={L(SOURCE_LABEL[person.sourceOfLead])} />
        <Item label={t('Units/deals', 'الوحدات/الصفقات')} value={String(person.unitsOrDeals)} numeric />
        <Item label={t('Residence', 'مكان الإقامة')} value={person.residence ?? '—'} />
        <Item label={t('Workplace', 'مكان العمل')} value={person.workplace ?? '—'} />
        <Item label={t('Income source', 'مصدر الدخل')} value={person.incomeSource ?? '—'} />
        <Item label={t('Preferred channel', 'القناة المفضلة')} value={L(CHANNEL_LABEL[person.preferredChannel])} />
        <Item label={t('Language', 'اللغة')} value={person.language === 'en' ? t('English', 'الإنجليزية') : t('Arabic', 'العربية')} />
        <Item label={t('Persona', 'الشخصية')} value={persona ? L(persona.name) : t('Not yet assigned', 'لم تُحدَّد بعد')} />
      </dl>
      {identity.length > 0 && (
        <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
          <Fingerprint aria-hidden className="size-4" />
          {t('Identity stitched by', 'هوية موحّدة عبر')}:
          {identity.map((id) => (
            <bdi key={id} dir="ltr" className="pill pill-light tabular">
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
      <dd className={cn('t-ui-strong', numeric ? 'tabular' : 'truncate')}>{value}</dd>
    </div>
  )
}
