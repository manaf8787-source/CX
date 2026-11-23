import { useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { useNow } from '@/hooks/useNow'
import { AGENTS } from '@/data/agents'
import { SOURCE_LABEL, agentName, assess, leadSample, type Band, type Check, type LeadSource } from '@/data/leadFunnel'
import { cn } from '@/lib/utils'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'

/**
 * Results and assessment of the campaign AI agent (owner, 23 Nov): how well the AI qualifies the leads the campaigns bring, and how
 * the human layers around it perform, measured against the healthy / watch / critical bands in PSI Marketing's CRM logic guide.
 * For Marketing, the Internal Audit and Marketing Lead and the CX side; it sits on the AI team page so there is no new menu item.
 */
const BAND_TONE: Record<Band, 'success' | 'warning' | 'danger' | 'neutral'> = { healthy: 'success', watch: 'warning', critical: 'danger', trend: 'neutral' }
const CODES = ['MKT-2026-031', 'MKT-2026-034', 'MKT-2026-037', 'MKT-2026-040', 'MKT-2026-043']

export default function AiAssessment() {
  const { t, L, lang } = useI18n()
  const now = useNow()
  const [days, setDays] = useState<'30' | '90'>('90')
  const [campaign, setCampaign] = useState('all')
  const [source, setSource] = useState<'all' | LeadSource>('all')
  const all = leadSample(now)
  const list = useMemo(
    () =>
      all.filter(
        (l) =>
          now - Date.parse(l.createdAt) <= Number(days) * 86_400_000 &&
          (campaign === 'all' || (campaign === 'none' ? !l.campaignCode : l.campaignCode === campaign)) &&
          (source === 'all' || l.source === source),
      ),
    [all, now, days, campaign, source],
  )
  const a = useMemo(() => assess(list), [list])
  const bandLabel: Record<Band, string> = {
    healthy: t('Healthy', 'سليم'),
    watch: t('Watch', 'راقب'),
    critical: t('Critical', 'حرج'),
    trend: t('No data', 'لا بيانات'),
  }
  const fmt = (c: Check) =>
    c.value === null
      ? '–'
      : `${c.value.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-US')}${c.unit === '%' ? '%' : c.unit === 'min' ? t(' min', ' د') : t(' h', ' س')}`
  const all5 = [...a.ai, ...a.support, ...a.agentQa, ...a.accuracy, ...a.returnQa]
  const count = (b: Band) => all5.filter((c) => c.band === b).length

  // accuracy by source and by agent
  const bySource = (Object.keys(SOURCE_LABEL) as LeadSource[])
    .map((s) => {
      const rows = list.filter((l) => l.source === s)
      const x = assess(rows)
      return {
        s,
        n: rows.length,
        q: x.ai.find((c) => c.id === 'qrate')!,
        junk: x.ai.find((c) => c.id === 'junk')!,
        acc: x.accuracy.find((c) => c.id === 'ai_acc')!,
      }
    })
    .filter((r) => r.n > 0)
  const byAgent = AGENTS.filter((ag) => ag.kind === 'sales' && ag.crm)
    .map((ag) => {
      const rows = list.filter((l) => l.opp?.agentId === ag.id)
      const ret = rows.filter((l) => l.opp!.returned)
      const rev = ret.filter((l) => l.opp!.returned!.decision !== 'pending')
      const over = rev.filter((l) => ['overturned', 'reassigned'].includes(l.opp!.returned!.decision)).length
      const fast = rows.filter((l) => l.opp!.firstCallMin <= 5).length
      return {
        ag,
        n: rows.length,
        retPct: rows.length ? Math.round((100 * ret.length) / rows.length) : null,
        overPct: rev.length ? Math.round((100 * over) / rev.length) : null,
        fastPct: rows.length ? Math.round((100 * fast) / rows.length) : null,
      }
    })
    .filter((r) => r.n > 0)

  const Group = ({ title, description, checks }: { title: string; description: string; checks: Check[] }) => (
    <SectionCard title={title} description={description}>
      <div className="-mx-2.5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="row-divider-none">
              <TableHead>{t('Check', 'الفحص')}</TableHead>
              <TableHead className="text-end">{t('Now', 'الآن')}</TableHead>
              <TableHead>{t('Target', 'الهدف')}</TableHead>
              <TableHead>{t('Status', 'الحالة')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="min-w-56 whitespace-normal">
                  <span className="font-medium text-foreground">{L(c.label)}</span>
                  <span className="block text-xs text-muted-foreground">{L(c.measured)}</span>
                </TableCell>
                <TableCell className="text-end tabular font-medium text-foreground">
                  <bdi dir="ltr">{fmt(c)}</bdi>
                </TableCell>
                <TableCell className="text-sm">{L(c.target)}</TableCell>
                <TableCell>
                  <StatusBadge tone={BAND_TONE[c.band]} dot>
                    {bandLabel[c.band]}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  )

  return (
    <div className="flex flex-col gap-4">
      <InlineNote
        tone="info"
        title={t('How the AI does with the leads the campaigns bring', 'أداء الذكاء الاصطناعي مع العملاء المحتملين الذين تجلبهم الحملات')}
      >
        {t(
          'Every enquiry goes to the AI first (chatbot, AI call). Customer Support joins when the client asks for a person, Agent QA decides what the AI cannot, and only qualified leads with a booked viewing reach a sales agent. Each check is measured against the targets in PSI Marketing’s CRM logic guide (to be validated before go-live). For Marketing, the Internal Audit and Marketing Lead and the CX team.',
          'كل استفسار يذهب أولاً للذكاء الاصطناعي (الشات بوت، المكالمة الآلية). تنضم خدمة العملاء عندما يطلب العميل إنساناً، ويقرر Agent QA ما لا يحسمه الذكاء الاصطناعي، ولا يصل للوكيل إلا المؤهل الذي حجز معاينة. كل فحص مقاس على أهداف دليل منطق الـCRM من التسويق (تُعتمد قبل الإطلاق). للتسويق ومسؤول التدقيق الداخلي والتسويق وفريق CX.',
        )}
      </InlineNote>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          variant="pressed"
          label={t('Period', 'الفترة')}
          value={days}
          onValueChange={(v) => setDays(v as '30' | '90')}
          options={[
            { value: '30', label: t('Last 30 days', 'آخر 30 يوماً') },
            { value: '90', label: t('Last 90 days', 'آخر 90 يوماً') },
          ]}
        />
        <Select value={campaign} onValueChange={setCampaign}>
          <SelectTrigger className="h-9 min-w-48" aria-label={t('Campaign', 'الحملة')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All campaigns and sources', 'كل الحملات والمصادر')}</SelectItem>
            {CODES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
            <SelectItem value="none">{t('Not from a campaign', 'ليست من حملة')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(v) => setSource(v as 'all' | LeadSource)}>
          <SelectTrigger className="h-9 min-w-44" aria-label={t('Source', 'المصدر')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('Every source', 'كل المصادر')}</SelectItem>
            {(Object.keys(SOURCE_LABEL) as LeadSource[]).map((s) => (
              <SelectItem key={s} value={s}>
                {L(SOURCE_LABEL[s])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {t(`${a.counts.leads} enquiries · ${a.counts.handed} handed to agents`, `${a.counts.leads} استفساراً · ${a.counts.handed} سُلّمت للوكلاء`)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['healthy', 'watch', 'critical'] as Band[]).map((b) => (
          <StatusBadge key={b} tone={BAND_TONE[b]} dot className={cn('text-sm')}>
            {bandLabel[b]}: {count(b)}
          </StatusBadge>
        ))}
      </div>

      <Group
        title={t('1 · The AI (chatbot and AI call)', '1 · الذكاء الاصطناعي (الشات بوت والمكالمة الآلية)')}
        description={t('Speed, reach and outcome of every enquiry.', 'السرعة والوصول والنتيجة لكل استفسار.')}
        checks={a.ai}
      />
      <Group
        title={t('2 · AI qualification accuracy', '2 · دقة تأهيل الذكاء الاصطناعي')}
        description={t(
          'Did the AI hand over the right people? Measured by what the sales agent confirmed.',
          'هل سلّم الذكاء الاصطناعي الأشخاص الصحيحين؟ يُقاس بما أكده الوكيل.',
        )}
        checks={a.accuracy}
      />
      <Group
        title={t('3 · Customer Support (inside the chat)', '3 · خدمة العملاء (داخل المحادثة)')}
        description={t(
          'When the client asks for a person. It answers, does not sell, and hands back to the AI.',
          'حين يطلب العميل إنساناً. تجيب ولا تبيع، وتعيده للذكاء الاصطناعي.',
        )}
        checks={a.support}
      />
      <Group
        title={t('4 · Agent QA (what the AI could not decide)', '4 · Agent QA (ما لم يحسمه الذكاء الاصطناعي)')}
        description={t('Low confidence, missing answers, VIP, possible duplicates.', 'ثقة منخفضة، أجوبة ناقصة، VIP، احتمال تكرار.')}
        checks={a.agentQa}
      />
      <Group
        title={t('5 · Return QA (opportunities the agent sent back)', '5 · Return QA (الفرص التي أرجعها الوكيل)')}
        description={t(
          'An agent cannot drop a client on their word: QA checks with the client first.',
          'لا يستطيع الوكيل إسقاط عميل على كلمته: يتحقق QA مع العميل أولاً.',
        )}
        checks={a.returnQa}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title={t('By source', 'حسب المصدر')}
          description={t('Judge a source by qualification, not by volume.', 'احكم على المصدر بالتأهيل لا بالحجم.')}
        >
          <div className="-mx-2.5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="row-divider-none">
                  <TableHead>{t('Source', 'المصدر')}</TableHead>
                  <TableHead className="text-end">{t('Leads', 'محتملون')}</TableHead>
                  <TableHead className="text-end">{t('Qualified', 'مؤهلون')}</TableHead>
                  <TableHead className="text-end">{t('Junk', 'Junk')}</TableHead>
                  <TableHead className="text-end">{t('AI accuracy', 'دقة الذكاء')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySource.map((r) => (
                  <TableRow key={r.s}>
                    <TableCell className="font-medium text-foreground">{L(SOURCE_LABEL[r.s])}</TableCell>
                    <TableCell className="text-end tabular">{r.n}</TableCell>
                    {[r.q, r.junk, r.acc].map((c) => (
                      <TableCell key={c.id} className="text-end">
                        <StatusBadge tone={BAND_TONE[c.band]}>{c.value === null ? '–' : `${c.value}%`}</StatusBadge>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
        <SectionCard
          title={t('By sales agent', 'حسب وكيل المبيعات')}
          description={t(
            'A high overturn rate means coaching; a high upheld rate for one source means the AI script.',
            'نسبة نقض عالية تعني تدريباً؛ ونسبة تأييد عالية لمصدر تعني نص الذكاء الاصطناعي.',
          )}
        >
          <div className="-mx-2.5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="row-divider-none">
                  <TableHead>{t('Agent', 'الوكيل')}</TableHead>
                  <TableHead className="text-end">{t('Received', 'استلم')}</TableHead>
                  <TableHead className="text-end">{t('Called in 5 min', 'اتصل خلال 5 د')}</TableHead>
                  <TableHead className="text-end">{t('Returned', 'أرجع')}</TableHead>
                  <TableHead className="text-end">{t('Overturned by QA', 'نقضها QA')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byAgent.map((r) => (
                  <TableRow key={r.ag.id}>
                    <TableCell className="font-medium text-foreground">{agentName(r.ag.id)}</TableCell>
                    <TableCell className="text-end tabular">{r.n}</TableCell>
                    <TableCell className="text-end">
                      <StatusBadge tone={r.fastPct === null ? 'neutral' : r.fastPct >= 80 ? 'success' : r.fastPct >= 60 ? 'warning' : 'danger'}>
                        {r.fastPct ?? '–'}%
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-end">
                      <StatusBadge tone={r.retPct === null ? 'neutral' : r.retPct < 15 ? 'success' : r.retPct <= 25 ? 'warning' : 'danger'}>
                        {r.retPct ?? '–'}%
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-end">
                      <StatusBadge tone={r.overPct === null ? 'neutral' : r.overPct < 10 ? 'success' : r.overPct <= 25 ? 'warning' : 'danger'}>
                        {r.overPct ?? '–'}%
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          'Prototype: a sample of about 700 enquiries. In the real platform each number is calculated from the CRM’s time stamps, in working minutes.',
          'نموذج أولي: عينة من نحو 700 استفسار. في المنصة الفعلية يُحسب كل رقم من الأختام الزمنية في الـCRM، بدقائق العمل.',
        )}
      </p>
    </div>
  )
}
