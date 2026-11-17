import { useState } from 'react'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/layout/PageHeader'
import { Tabs } from '../components/ui/Tabs'
import { Chip, ProductTag } from '../components/ui/Chip'
import { CAMPAIGNS, SURVEYS, survey } from '../data/surveys'
import { validateTemplate } from '../lib/whatsapp'

const CHANNEL_LABEL: Record<string, { en: string; ar: string }> = {
  wa_link: { en: 'WhatsApp: link', ar: 'واتساب: رابط' },
  wa_chat: { en: 'WhatsApp: chat', ar: 'واتساب: محادثة' },
  sms: { en: 'SMS', ar: 'رسالة نصية' },
  email: { en: 'Email', ar: 'بريد إلكتروني' },
}

export default function SurveyEngine() {
  const { L, t } = useI18n()
  const [tab, setTab] = useState('campaigns')
  const [surveyId, setSurveyId] = useState(SURVEYS[0].id)
  const [bodyEn, setBodyEn] = useState('Hi {{1}}, thanks for your recent visit to PSI. How likely are you to recommend us? Reply with your {{2}} rating.')
  const [bodyAr, setBodyAr] = useState('مرحباً {{1}}، شكراً لزيارتك الأخيرة لبي إس آي. ما مدى احتمال ترشيحك لنا؟ أجب بتقييمك {{2}}.')
  const [tiedToTask, setTiedToTask] = useState(true)

  const chosen = survey(surveyId)!
  const { checks, category } = validateTemplate(bodyEn, bodyAr, tiedToTask)
  const allMetaPass = checks.filter((c) => c.source === 'meta').every((c) => c.passed)

  return (
    <div className="main" style={{ gap: 12 }}>
      <PageHeader title={t('Survey Engine', 'محرك الاستبيانات')} lede={t('Campaigns, batches, branching questions and WhatsApp readiness before anything launches.', 'الحملات والدفعات والأسئلة المتفرعة وجاهزية واتساب قبل أي إطلاق.')} />
      <Tabs tabs={[{ id: 'campaigns', label: t('Campaigns', 'الحملات') }, { id: 'builder', label: t('Builder', 'المنشئ') }, { id: 'whatsapp', label: t('WhatsApp readiness', 'جاهزية واتساب') }]} active={tab} onChange={setTab} />

      {tab === 'campaigns' && (
        <div className="list">
          {CAMPAIGNS.map((c) => (
            <div className="card" key={c.id}>
              <div className="card-h"><h2>{L(c.name)}</h2><ProductTag productId={c.product} /></div>
              <div className="tw">
                <table>
                  <thead><tr><th>{t('Batch', 'الدفعة')}</th><th>{t('Survey', 'الاستبيان')}</th><th className="n">{t('Audience', 'الجمهور')}</th><th>{t('Channel', 'القناة')}</th><th>{t('Status', 'الحالة')}</th><th className="n">{t('Response rate', 'نسبة الاستجابة')}</th></tr></thead>
                  <tbody>
                    {c.batches.map((b) => (
                      <tr key={b.id}>
                        <td>{L(b.name)}</td>
                        <td className="sm">{L(survey(b.surveyId)!.name)}</td>
                        <td className="n">{b.audienceSize}</td>
                        <td className="sm">{b.deliveryChannel ? L(CHANNEL_LABEL[b.deliveryChannel]) : t('team call', 'اتصال الفريق')}</td>
                        <td><Chip kind={b.status === 'running' ? 'good' : undefined}>{b.status}</Chip></td>
                        <td className="n">{b.responseRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'builder' && (
        <div className="grid g-12">
          <div className="card">
            <div className="card-h"><h3>{t('Surveys', 'الاستبيانات')}</h3></div>
            <div className="list">
              {SURVEYS.map((s) => (
                <button key={s.id} className={`item ${s.id === surveyId ? 'sel' : ''}`} style={{ textAlign: 'start', cursor: 'pointer' }} onClick={() => setSurveyId(s.id)}>
                  <ProductTag productId={s.product} /> <span className="sm">{L(s.name)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>{L(chosen.name)}</h2></div>
            <div className="list">
              {chosen.questions.map((q, i) => (
                <div className="item" key={q.id}>
                  <div className="row between">
                    <span className="sm">{i + 1}. {L(q.text)}</span>
                    <div className="row">
                      {q.entityTag && <span className="ent">{q.entityTag}</span>}
                      <Chip>{q.type}</Chip>
                    </div>
                  </div>
                  {q.options && <div className="pills" style={{ marginTop: 6 }}>{q.options.map((o) => <Chip key={L(o)}>{L(o)}</Chip>)}</div>}
                </div>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 8 }}>{t('Branching: the first matching rule wins, then the question\'s "next", then the next question in order.', 'التفرّع: تفوز أول قاعدة مطابقة، ثم "التالي" الخاص بالسؤال، ثم السؤال التالي بالترتيب.')}</p>
          </div>
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="grid g-12">
          <div className="card">
            <div className="card-h"><h3>{t('Template', 'القالب')}</h3></div>
            <label className="f">{t('English body', 'النص الإنجليزي')}<textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} /></label>
            <label className="f" style={{ marginTop: 8 }}>{t('Arabic body', 'النص العربي')}<textarea dir="rtl" value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} /></label>
            <label className="row" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={tiedToTask} onChange={(e) => setTiedToTask(e.target.checked)} />
              {t('Tied to a specific order, visit, case or task', 'مرتبطة بطلب أو زيارة أو حالة أو مهمة محددة')}
            </label>
            <div className="pv" style={{ marginTop: 10 }}>
              <b className="sm">{t('Preview', 'معاينة')}</b>
              <p className="sm">{bodyEn.replace('{{1}}', 'Omar').replace('{{2}}', 'NPS')}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>{t('Checks', 'الفحوصات')}</h3>
              <Chip kind={category === 'Utility' ? 'good' : 'warn'}>{category}</Chip>
            </div>
            <div className="list">
              {checks.map((c) => (
                <div className="check" key={c.id}>
                  <span className={`mk ${c.passed ? 'ok' : c.source === 'meta' ? 'crit' : 'warn'}`}>{c.passed ? '✓' : '!'}</span>
                  <div>
                    <span className="sm">{L(c.text)}</span>
                    <span className="ent" style={{ marginInlineStart: 6 }}>{c.source === 'meta' ? t('Meta rule', 'قاعدة ميتا') : t('Our tip', 'نصيحتنا')}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 8 }}>{t('Meta makes the final decision on category and approval, and can recategorise.', 'ميتا تتخذ القرار النهائي بشأن الفئة والاعتماد، وقد تغيّر التصنيف.')}</p>
            <button className="btn primary" disabled={!allMetaPass} style={{ marginTop: 8 }}>{t('Submit to Meta (English)', 'إرسال إلى ميتا (إنجليزي)')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
