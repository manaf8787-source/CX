import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { LEGACY_CAMPAIGNS, LEGACY_QUESTION_TYPE_LABEL, LEGACY_SURVEYS } from '@/data/surveyVocabulary'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProductTag } from '@/components/common/Chip'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SubPageHeader } from './SubPageHeader'

const BATCH_STATUS_LABEL: Record<'scheduled' | 'running' | 'closed', { en: string; ar: string }> = {
  scheduled: { en: 'Scheduled', ar: 'مجدولة' },
  running: { en: 'Running', ar: 'جارية' },
  closed: { en: 'Closed', ar: 'مغلقة' },
}

/** `frontend/src/pages/SurveyEngine.tsx` — the pre-omnichannel branching
 * builder/campaign/batch model — is discontinued from the live v38 menu
 * (Programme KB §33); v38 replaces it with the triggers/caps model on
 * Surveys and triggers. FR-9 keeps only its *question-type vocabulary*
 * (NPS/rating/choice/yes-no/open) as still-valid reference data; the
 * builder page itself, and its campaigns/batches, are historical only. */
export default function SurveysReference() {
  const { t, L, lang } = useI18n()
  const th = 'px-3 text-xs font-semibold text-muted-foreground'

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Surveys (legacy reference)', 'الاستبيانات (مرجع قديم)')}
        description={t(
          'The old survey builder is discontinued. Only its question-type vocabulary is still valid data — the live trigger/cap model is on Surveys and triggers.',
          'منشئ الاستبيانات القديم متوقف. فقط مفردات أنواع الأسئلة لا تزال بيانات صالحة — النموذج الحي للمحفزات والحدود موجود في صفحة الاستبيانات والمحفزات.',
        )}
        actions={
          <Button size="sm" asChild>
            <Link to="/settings/surveys">
              {t('Open Surveys and triggers (live)', 'فتح الاستبيانات والمحفزات (الحيّة)')}
              <ArrowRight aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        }
      />

      <SectionCard title={t('Question-type vocabulary', 'مفردات أنواع الأسئلة')}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LEGACY_QUESTION_TYPE_LABEL).map(([key, label]) => (
            <StatusBadge key={key} tone="info">
              {L(label)}
            </StatusBadge>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t('Legacy survey instruments (reference only)', 'أدوات الاستبيان القديمة (مرجع فقط)')}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {LEGACY_SURVEYS.map((sv) => (
            <div key={sv.id} className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-semibold">{L(sv.name)}</span>
                <ProductTag productId={sv.product} lang={lang} />
              </div>
              <ul className="flex flex-col divide-y">
                {sv.questions.map((q) => (
                  <li key={q.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="min-w-0 text-sm">{L(q.text)}</span>
                    <StatusBadge>{L(LEGACY_QUESTION_TYPE_LABEL[q.type])}</StatusBadge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t('Legacy campaigns (historical, not editable)', 'الحملات القديمة (تاريخية، غير قابلة للتعديل)')}>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className={th}>{t('Campaign', 'الحملة')}</TableHead>
                <TableHead className={th}>{t('Batch', 'الدفعة')}</TableHead>
                <TableHead className={`${th} text-end`}>{t('Audience', 'الجمهور')}</TableHead>
                <TableHead className={`${th} text-end`}>{t('Response rate', 'نسبة الاستجابة')}</TableHead>
                <TableHead className={th}>{t('Status', 'الحالة')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEGACY_CAMPAIGNS.flatMap((c) =>
                c.batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="px-3 text-sm">{L(c.name)}</TableCell>
                    <TableCell className="px-3 text-sm text-muted-foreground">{L(b.name)}</TableCell>
                    <TableCell className="px-3 text-end text-sm tabular-nums">{b.audienceSize}</TableCell>
                    <TableCell className="px-3 text-end text-sm tabular-nums">
                      <bdi dir="ltr">{b.responseRate}%</bdi>
                    </TableCell>
                    <TableCell className="px-3">
                      <StatusBadge tone={b.status === 'running' ? 'success' : 'neutral'}>{L(BATCH_STATUS_LABEL[b.status])}</StatusBadge>
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </section>
  )
}
