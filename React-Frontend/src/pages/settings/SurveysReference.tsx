import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { SampleBanner } from '../../components/common/SampleBanner'
import { Chip, ProductTag } from '../../components/common/Chip'
import { LEGACY_CAMPAIGNS, LEGACY_QUESTION_TYPE_LABEL, LEGACY_SURVEYS } from '../../data/surveyVocabulary'

/** `frontend/src/pages/SurveyEngine.tsx` — the pre-omnichannel branching
 * builder/campaign/batch model — is discontinued from the live v38 menu
 * (Programme KB §33); v38 replaces it with the triggers/caps model on
 * Surveys and triggers. FR-9 keeps only its *question-type vocabulary*
 * (NPS/rating/choice/yes-no/open) as still-valid reference data; the
 * builder page itself, and its campaigns/batches, are historical only. */
export default function SurveysReference() {
  const { t, L, lang } = useI18n()

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted" style={{ maxWidth: '68ch' }}>
          {t('The old survey builder is discontinued. Only its question-type vocabulary is still valid data — the live trigger/cap model is on Surveys and triggers.', 'منشئ الاستبيانات القديم متوقف. فقط مفردات أنواع الأسئلة لا تزال بيانات صالحة — النموذج الحي للمحفزات والحدود موجود في صفحة الاستبيانات والمحفزات.')}
        </p>
        <SampleBanner />
      </div>
      <Link to="/surveys" className="btn primary sm" style={{ alignSelf: 'flex-start' }}>{t('Open Surveys and triggers (live)', 'فتح الاستبيانات والمحفزات (الحيّة)')}</Link>

      <div className="card">
        <div className="card-head"><h2>{t('Question-type vocabulary', 'مفردات أنواع الأسئلة')}</h2></div>
        <div className="row">
          {Object.entries(LEGACY_QUESTION_TYPE_LABEL).map(([key, label]) => (
            <Chip key={key} tone="accent">{L(label)}</Chip>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Legacy survey instruments (reference only)', 'أدوات الاستبيان القديمة (مرجع فقط)')}</h2></div>
        <div className="grid grid-2">
          {LEGACY_SURVEYS.map((sv) => (
            <div className="card tint" key={sv.id}>
              <div className="row between"><b>{L(sv.name)}</b><ProductTag productId={sv.product} lang={lang} /></div>
              <div className="col" style={{ marginTop: 6, gap: 4 }}>
                {sv.questions.map((q) => (
                  <div key={q.id} className="row between">
                    <span className="text-sm">{L(q.text)}</span>
                    <span className="chip">{L(LEGACY_QUESTION_TYPE_LABEL[q.type])}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Legacy campaigns (historical, not editable)', 'الحملات القديمة (تاريخية، غير قابلة للتعديل)')}</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('Campaign', 'الحملة')}</th><th>{t('Batch', 'الدفعة')}</th><th className="num">{t('Audience', 'الجمهور')}</th><th className="num">{t('Response rate', 'نسبة الاستجابة')}</th><th>{t('Status', 'الحالة')}</th></tr></thead>
            <tbody>
              {LEGACY_CAMPAIGNS.flatMap((c) => c.batches.map((b) => (
                <tr key={b.id}>
                  <td className="text-sm">{L(c.name)}</td>
                  <td className="text-sm muted">{L(b.name)}</td>
                  <td className="num">{b.audienceSize}</td>
                  <td className="num">{b.responseRate}%</td>
                  <td><Chip tone={b.status === 'running' ? 'good' : undefined}>{b.status}</Chip></td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
