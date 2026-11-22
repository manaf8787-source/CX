import { ArrowDown, ArrowUp, Eye, Minus } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useUsers } from '@/data/users'
import { useRecipients } from '@/data/noticeRecipients'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

/**
 * An example of the digest a head receives, so the CX manager can see what "Digest" means before choosing how often. One message for a
 * product and a period: only numbers and counts, no customer names, no case text, nothing to do ("informed, never a task").
 *
 * Written for a head who is not a CX expert (owner, 22 Nov): every number says in plain words what it is and whether it is good or bad,
 * a green arrow means better and a red arrow means worse (so "customers leaving" going down is a green arrow down), and the bad news
 * has its own section that says what happened to customers and what is already being done about it.
 * Prototype: the figures are an example, not read from the data.
 */
type Direction = 'up' | 'down' | 'same'

interface Metric {
  label: string
  /** What the number means, in words for someone outside CX. */
  plain: string
  value: string
  change: string
  direction: Direction
  /** Whether this change is good news. A fall in "customers leaving" is good. */
  good: boolean | null
}

export function DigestPreview({ productId, productLabel, frequency }: { productId: string; productLabel: string; frequency: 'weekly' | 'daily' | 'off' }) {
  const { t } = useI18n()
  const users = useUsers()
  const chosen = useRecipients()[productId] ?? []
  const to = chosen.map((c) => users.find((u) => u.id === c.userId)).filter(Boolean)
  const daily = frequency === 'daily'
  const period = daily ? t('Sunday 22 Nov 2026', 'الأحد 22 نوفمبر 2026') : t('16 to 22 Nov 2026', '16 إلى 22 نوفمبر 2026')
  const before = daily ? t('yesterday', 'أمس') : t('last week', 'الأسبوع الماضي')

  const metrics: Metric[] = [
    {
      label: t('Recommend score (NPS)', 'مؤشر التوصية (NPS)'),
      plain: t('How likely customers are to recommend us. Above 0 is good, above 30 is strong.', 'مدى استعداد العملاء لتوصية الآخرين بنا. فوق 0 جيد وفوق 30 قوي.'),
      value: '+29',
      change: t(`up 3 points on ${before}`, `أعلى بـ 3 نقاط من ${before}`),
      direction: 'up',
      good: true,
    },
    {
      label: t('Happy customers (CSAT)', 'العملاء الراضون (CSAT)'),
      plain: t('Out of 100 customers who answered, how many said they were satisfied.', 'من كل 100 عميل أجابوا، كم قالوا إنهم راضون.'),
      value: '86%',
      change: t(`down 2 points on ${before}`, `أقل بنقطتين من ${before}`),
      direction: 'down',
      good: false,
    },
    {
      label: t('Cases past their promised date', 'حالات تجاوزت الموعد الذي وعدنا به'),
      plain: t('Customers we promised an answer or a fix by a date, and the date has passed.', 'عملاء وعدناهم بجواب أو حل في موعد، وقد مرّ الموعد.'),
      value: '2',
      change: t(`up from 1 ${before}`, `ارتفعت من 1 في ${before}`),
      direction: 'up',
      good: false,
    },
    {
      label: t('Customers leaving', 'عملاء يبتعدون'),
      plain: t('Customers who have gone quiet, did not renew or went to someone else.', 'عملاء توقفوا عن التواصل أو لم يجددوا أو ذهبوا إلى غيرنا.'),
      value: '6',
      change: t(`down from 9 ${before}`, `انخفضت من 9 في ${before}`),
      direction: 'down',
      good: true,
    },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t(`See an example digest for ${productLabel}`, `عرض مثال للخلاصة لـ ${productLabel}`)}>
          <Eye aria-hidden />
          {t('Example', 'مثال')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('What the digest looks like', 'كيف تبدو الخلاصة')}</DialogTitle>
          <DialogDescription>
            {t('An example with sample numbers. One short email for the whole period, not one email per case.', 'مثال بأرقام تجريبية. رسالة بريد قصيرة واحدة عن الفترة كلها، وليست رسالة لكل حالة.')}
          </DialogDescription>
        </DialogHeader>

        <div className="well flex flex-col gap-4 p-4 text-sm" data-testid="digest-example">
          <div className="flex flex-col gap-0.5 border-b border-line pb-3 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{t('To: ', 'إلى: ')}</span>
              <bdi dir="ltr">{to.length ? to.map((u) => u!.email).join(', ') : t('nobody chosen yet', 'لم يُختر أحد بعد')}</bdi>
            </span>
            <span>
              <span className="font-medium text-foreground">{t('Subject: ', 'الموضوع: ')}</span>
              {productLabel} · {daily ? t('daily', 'يومية') : t('weekly', 'أسبوعية')} {t('customer experience summary', 'ملخص تجربة العملاء')} · {period}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-base font-medium text-foreground">{t(`${productLabel}: good on recommendations, two things to watch`, `${productLabel}: جيدة في التوصية، وأمران يستحقان الانتباه`)}</p>
            <p className="text-muted-foreground">
              {t(
                'Customers are recommending us more and fewer are leaving. But satisfaction slipped a little and two customers are still waiting past the date we promised them.',
                'العملاء يوصون بنا أكثر وعدد من يبتعدون أقل. لكن الرضا تراجع قليلاً وعميلان ما زالا ينتظران بعد الموعد الذي وعدناهما به.',
              )}
            </p>
          </div>

          <ul className="flex flex-col" aria-label={t('The numbers', 'الأرقام')}>
            {metrics.map((m) => (
              <li key={m.label} className="row-divider flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-foreground">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.plain}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="tabular text-lg font-medium text-foreground">{m.value}</span>
                  <Trend m={m} />
                </span>
              </li>
            ))}
          </ul>

          <section aria-label={t('What needs attention', 'ما يحتاج انتباهاً')} className="flex flex-col gap-2 rounded-xl border border-(--status-error-solid)/30 bg-(--status-error-bg) p-3">
            <h4 className="font-medium text-(--status-error-text)">{t('What needs your attention', 'ما يحتاج انتباهك')}</h4>
            <ul className="flex flex-col gap-2 text-foreground">
              <Point
                title={t('2 customers are waiting past the date we promised', 'عميلان ينتظران بعد الموعد الذي وعدناهما به')}
                body={t('One of them is high priority. They asked for help and we said when we would come back; we did not. This is how customers decide we cannot be trusted.', 'طلبا المساعدة وقلنا متى سنعود إليهما، ولم نفعل. هكذا يقرر العملاء أنه لا يمكن الوثوق بنا.')}
                next={t('Already with the CX team, who are calling them.', 'الأمر الآن عند فريق CX الذي يتصل بهما.')}
              />
              <Point
                title={t('Satisfaction slipped from 88% to 86%', 'الرضا تراجع من 88% إلى 86%')}
                body={t('Most of the customers who scored us low said nobody called them back after they asked about a unit.', 'معظم من منحونا درجة منخفضة قالوا إن أحداً لم يعاود الاتصال بهم بعد استفسارهم عن وحدة.')}
                next={t('A fix is waiting for approval from the CX manager.', 'إجراء تصحيحي ينتظر اعتماد مدير CX.')}
              />
            </ul>
          </section>

          <section aria-label={t('What went well', 'ما سار جيداً')} className="flex flex-col gap-1 rounded-xl border border-(--status-success-solid)/30 bg-(--status-success-bg) p-3">
            <h4 className="font-medium text-(--status-success-text)">{t('What went well', 'ما سار جيداً')}</h4>
            <p className="text-foreground">{t('6 customers are leaving, down from 9. More customers said they would recommend us.', '6 عملاء يبتعدون، بعد أن كانوا 9. وأكثر عملاء قالوا إنهم سيوصون بنا.')}</p>
          </section>

          <p className="text-xs text-muted-foreground">
            {t('Green arrow: better than before. Red arrow: worse than before. You are informed only, there is nothing you need to do. No customer names are in this email.', 'السهم الأخضر: أفضل من السابق. السهم الأحمر: أسوأ من السابق. أنت مُبلَّغ فقط ولا شيء مطلوب منك. لا توجد أسماء عملاء في هذه الرسالة.')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The arrow and the change: green when the change is good news, red when it is bad, whichever way the number moved. */
function Trend({ m }: { m: Metric }) {
  const Icon = m.direction === 'up' ? ArrowUp : m.direction === 'down' ? ArrowDown : Minus
  const tone = m.good === null ? 'text-muted-foreground' : m.good ? 'text-(--status-success-text)' : 'text-(--status-error-text)'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`} data-good={m.good === null ? 'none' : m.good ? 'yes' : 'no'}>
      <Icon aria-hidden className="size-3.5" />
      {m.change}
    </span>
  )
}

function Point({ title, body, next }: { title: string; body: string; next: string }) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="font-medium">{title}</span>
      <span className="text-sm">{body}</span>
      <span className="text-xs text-muted-foreground">{next}</span>
    </li>
  )
}

