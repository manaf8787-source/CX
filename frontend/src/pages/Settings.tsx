import { useState } from 'react'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { Chip } from '../components/ui/Chip'
import { PRODUCTS } from '../data/products'
import { useSettings } from '../settings/SettingsContext'

interface HrMember { title: string; email: string; mobile: string }

const NOTICE_DEFAULTS = [
  { id: 'late_high_priority', label: { en: 'Notice to heads/C-level: late or high-priority case', ar: 'إشعار للرؤساء/الإدارة العليا: حالة متأخرة أو عالية الأولوية' } },
  { id: 'hr_late', label: { en: 'Late alert to the HR manager', ar: 'تنبيه تأخير لمدير الموارد البشرية' } },
  { id: 'weekly_digest', label: { en: 'Weekly digest to heads and C-level', ar: 'ملخص أسبوعي للرؤساء والإدارة العليا' } },
]

export default function Settings() {
  const { L, t } = useI18n()
  const [tab, setTab] = useState('launch')
  const { isLaunched, toggleLaunch } = useSettings()
  const [hrPool, setHrPool] = useState<HrMember[]>([
    { title: 'HR specialist 1', email: 'hr1@psi.example', mobile: '+971507000001' },
    { title: 'HR specialist 2', email: 'hr2@psi.example', mobile: '+971507000002' },
  ])
  const [draft, setDraft] = useState<HrMember>({ title: '', email: '', mobile: '' })
  const [notices, setNotices] = useState<Record<string, boolean>>({ late_high_priority: true, hr_late: true, weekly_digest: true })

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Settings', 'الإعدادات')} lede={t('CX-manager-only: product launch, the HR pool, and notices.', 'للمدير فقط: إطلاق المنتجات، مجموعة الموارد البشرية، والإشعارات.')} />
      <Tabs tabs={[{ id: 'launch', label: t('Product launch', 'إطلاق المنتج') }, { id: 'hr', label: t('HR pool', 'مجموعة الموارد البشرية') }, { id: 'notices', label: t('Notices', 'الإشعارات') }]} active={tab} onChange={setTab} />

      {tab === 'launch' && (
        <div className="card">
          <div className="list">
            {PRODUCTS.map((p) => (
              <div className="row between item" key={p.id}>
                <div className="row"><span className="ptag" style={{ ['--c' as string]: `var(${p.colorVar})` }}>{L(p.name)}</span></div>
                <label className="row">
                  <input type="checkbox" checked={isLaunched(p.id)} onChange={() => toggleLaunch(p.id)} />
                  {isLaunched(p.id) ? <Chip kind="good">{t('Live', 'مُفعّل')}</Chip> : <Chip>{t('Hidden', 'مخفي')}</Chip>}
                </label>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>{t('Hidden products disappear from menus, cards and filters everywhere in the portal.', 'تختفي المنتجات المخفية من القوائم والبطاقات والفلاتر في كل أنحاء البوابة.')}</p>
        </div>
      )}

      {tab === 'hr' && (
        <div className="card">
          <div className="tw">
            <table>
              <thead><tr><th>{t('Title', 'المسمى')}</th><th>{t('Email', 'البريد الإلكتروني')}</th><th>{t('Mobile', 'الجوال')}</th></tr></thead>
              <tbody>
                {hrPool.map((m, i) => (
                  <tr key={i}><td>{m.title}</td><td className="sm mono">{m.email}</td><td className="sm mono">{m.mobile}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form" style={{ marginTop: 10 }}>
            <label className="f">{t('Title', 'المسمى')}<input type="text" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} /></label>
            <label className="f">{t('Email', 'البريد الإلكتروني')}<input type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} /></label>
            <label className="f">{t('Mobile', 'الجوال')}<input type="text" value={draft.mobile} onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))} /></label>
            <button className="btn primary" disabled={!draft.title || !draft.email} onClick={() => { setHrPool((p) => [...p, draft]); setDraft({ title: '', email: '', mobile: '' }) }}>{t('Add member', 'إضافة عضو')}</button>
          </div>
        </div>
      )}

      {tab === 'notices' && (
        <div className="card list">
          {NOTICE_DEFAULTS.map((n) => (
            <label className="row between item" key={n.id}>
              <span className="sm">{L(n.label)}</span>
              <input type="checkbox" checked={notices[n.id]} onChange={(e) => setNotices((s) => ({ ...s, [n.id]: e.target.checked }))} />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
