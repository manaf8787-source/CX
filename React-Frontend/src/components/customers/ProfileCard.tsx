import { useI18n } from '../../i18n'
import { usePersonas } from '../../services/queries'
import { CHANNEL_LABEL } from './SourceBadge'
import type { Person } from '../../types'

/** FR-2.2 — the CRM profile block: type, environment, units/deals,
 * residence, workplace, income source, preferred channel, language,
 * persona, VIP tag. */
export function ProfileCard({ person }: { person: Person }) {
  const { t, L } = useI18n()
  const { data: personas } = usePersonas()
  const persona = personas?.find((p) => p.id === person.personaId)
  const identity = [person.identity.mobile, person.identity.email, person.identity.emiratesId, person.identity.crmContactId].filter(Boolean)

  return (
    <div className="card">
      <div className="card-head">
        <h2>{t('Profile', 'الملف الشخصي')}</h2>
        {person.vip && <span className="chip warn">{t('VIP — PSI Club', 'عميل مميز — نادي PSI')}</span>}
      </div>
      <div className="grid grid-3" style={{ rowGap: 12 }}>
        <Field label={t('Type', 'النوع')} value={person.type === 'customer' ? t('Customer', 'عميل') : t('Lead', 'عميل محتمل')} />
        <Field label={t('Environment', 'البيئة')} value={person.environment} />
        <Field label={t('Units/deals', 'الوحدات/الصفقات')} value={String(person.unitsOrDeals)} />
        <Field label={t('Residence', 'مكان الإقامة')} value={person.residence ?? '—'} />
        <Field label={t('Workplace', 'مكان العمل')} value={person.workplace ?? '—'} />
        <Field label={t('Income source', 'مصدر الدخل')} value={person.incomeSource ?? '—'} />
        <Field label={t('Preferred channel', 'القناة المفضلة')} value={L(CHANNEL_LABEL[person.preferredChannel])} />
        <Field label={t('Language', 'اللغة')} value={person.language === 'en' ? t('English', 'الإنجليزية') : t('Arabic', 'العربية')} />
        <Field label={t('Persona', 'الشخصية')} value={persona ? L(persona.name) : t('Not yet assigned', 'لم تُحدَّد بعد')} />
      </div>
      {identity.length > 0 && (
        <p className="text-sm muted" style={{ marginTop: 10 }}>
          {t('Identity stitched by', 'هوية موحّدة عبر')}: {identity.join(' · ')}
        </p>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="col" style={{ gap: 2 }}>
      <span className="text-sm muted">{label}</span>
      <span>{value}</span>
    </div>
  )
}
