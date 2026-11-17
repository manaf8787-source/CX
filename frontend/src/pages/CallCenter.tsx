import { useState } from 'react'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { Tile } from '../components/ui/Tile'
import { Chip } from '../components/ui/Chip'
import { CALL_CENTER_OVERVIEW, IVR_CHANNELS, WHY_CUSTOMERS_CALL } from '../data/callCenter'

export default function CallCenter() {
  const { L, t } = useI18n()
  const [tab, setTab] = useState('overview')
  const o = CALL_CENTER_OVERVIEW

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Call Center & IVR', 'مركز الاتصال والرد الصوتي')} lede={t('Experience only — not for QA. BrightCall is a view-only source; nothing here changes it.', 'للتجربة فقط — ليست لضمان الجودة. برايت كول مصدر للعرض فقط؛ لا شيء هنا يغيّر فيه.')} />
      <Tabs tabs={[{ id: 'overview', label: t('Overview', 'نظرة عامة') }, { id: 'ivr', label: 'IVR' }]} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="main" style={{ gap: 12 }}>
          <div className="grid g4">
            <Tile label={t('Calls answered', 'المكالمات المجابة')} value={o.callsAnswered.toLocaleString()} />
            <Tile label={t('First call to a new lead', 'أول اتصال بعميل محتمل جديد')} value={`${o.firstCallToNewLeadMinutes} ${t('min', 'د')}`} />
            <Tile label={t('Callbacks kept on time', 'المعاودة في الوقت المحدد')} value={`${Math.round(o.callbacksKeptOnTime * 100)}%`} />
            <Tile label={t('Handed to a person when asked', 'تحويل لشخص عند الطلب')} value={`${Math.round(o.handedToPersonWhenAsked * 100)}%`} />
          </div>
          <div className="grid g-21">
            <div className="card">
              <div className="card-h"><h2>{t('Why customers call', 'لماذا يتصل العملاء')}</h2></div>
              <div className="list">
                {WHY_CUSTOMERS_CALL.map((w) => (
                  <div key={L(w.reason)} className="brow">
                    <span className="sm">{L(w.reason)}</span>
                    <div className="track"><i style={{ width: `${w.share * 100}%` }} /></div>
                    <span className="sm mono">{Math.round(w.share * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-h"><h2>{t('Customer rating', 'تقييم العميل')}</h2></div>
              <div className="score-big">{o.customerRating.toFixed(1)}<span className="sm muted"> / 5</span></div>
              <p className="sm muted" style={{ marginTop: 8 }}>{t('Speed to lead: the system rings the agent pool first; only when an agent picks up does it ring the customer.', 'سرعة الاستجابة: يتصل النظام بمجموعة الوكلاء أولاً؛ ولا يتصل بالعميل إلا بعد رد أحد الوكلاء.')}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'ivr' && (
        <div className="main" style={{ gap: 12 }}>
          <div className="grid g3">
            {IVR_CHANNELS.map((c) => (
              <div className="card" key={c.kind}>
                <div className="card-h"><h2 style={{ textTransform: 'capitalize' }}>{c.kind}</h2><Chip kind={c.kind === 'complaints' ? 'crit' : c.kind === 'comments' ? 'acc' : undefined}>{c.count}</Chip></div>
                <p className="sm muted">{t('Routes to', 'يتم توجيهه إلى')}: {L(c.routesTo)}</p>
              </div>
            ))}
          </div>
          <div className="card">
            <p className="sm muted">
              {t('The IVR menu: language (English/Arabic), then Real Estate, HR (careers), or Feedback. The exact split between suggestion, comment and complaint inside Feedback was not confirmed with the call center vendor — to be verified.', 'قائمة الرد الصوتي: اللغة (إنجليزي/عربي)، ثم العقارات، أو الموارد البشرية (وظائف)، أو الملاحظات. التقسيم الدقيق بين الاقتراح والتعليق والشكوى داخل الملاحظات لم يُؤكد بعد مع مزود مركز الاتصال — بحاجة للتحقق.')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
