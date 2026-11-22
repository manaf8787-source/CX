import { useMemo, useState } from 'react'
import { Archive, ArchiveRestore, Copy, Plus, Search, Send } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuditActor } from '@/auth/useAuditActor'
import { useAuth } from '@/auth/session'
import { useEditableSets } from '@/data/surveyEditor'
import {
  createCampaign,
  duplicateCampaign,
  markSent,
  nameTaken,
  setArchived,
  updateCampaign,
  useCampaigns,
  type CampaignChannel,
  type CampaignProduct,
  type SurveyCampaign,
} from '@/data/surveyCampaigns'
import type { EditableQuestion } from '@/data/surveyEditor'
import { answersOf, describeRouting, hasLogic, kindOf } from '@/data/surveyLogic'
import { SurveyBuilder, blankQuestion } from './SurveyBuilder'
import { PRODUCTS } from '@/data/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ProductTag } from '@/components/common/Chip'

/**
 * The Campaigns tab of Surveys (22 Nov): a survey the team sends on purpose to its own people, saved under the name they give it so it
 * can be found, read and reused later. The fixed surveys that go out by themselves are on the Questions and When we ask tabs.
 * Prototype: nothing is sent; "Send" marks it sent and shows sample results.
 */
export const CHANNEL_LABEL: Record<CampaignChannel, { en: string; ar: string }> = {
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  app: { en: 'Pop-up notification in the app', ar: 'إشعار منبثق داخل التطبيق' },
  push: { en: 'Push notification on the phone', ar: 'إشعار دفع على الهاتف' },
  email: { en: 'Email', ar: 'البريد الإلكتروني' },
  sms: { en: 'SMS', ar: 'رسالة نصية' },
  call: { en: 'Phone call by an agent', ar: 'مكالمة هاتفية من وكيل' },
  link: { en: 'Link or QR code to share', ar: 'رابط أو رمز QR للمشاركة' },
}

type View = 'active' | 'archived' | 'all'

export function SurveyCampaignsTab({ canCreate }: { canCreate: boolean }) {
  const { t, L, lang } = useI18n()
  const { log } = useAuditActor()
  const { session } = useAuth()
  const campaigns = useCampaigns()
  const [view, setView] = useState<View>('active')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const shown = useMemo(
    () => campaigns.filter((c) => (view === 'all' || (view === 'archived') === c.archived) && c.name.toLowerCase().includes(query.trim().toLowerCase())),
    [campaigns, view, query],
  )
  const day = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="flex flex-col gap-4" data-testid="survey-campaigns">
      <SectionCard
        title={t('Campaigns', 'الحملات')}
        description={t(
          'A survey you send on purpose to your own list of people. Give it a name: it is saved under that name, you can find it later, read what was asked and how it went, and start the next one from it.',
          'استبيان ترسله عن قصد إلى قائمتك من الناس. أعطه اسماً: يُحفظ بهذا الاسم، وتجده لاحقاً وترى ما سُئل وكيف سار، وتبدأ منه الحملة التالية.',
        )}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => setCreating((v) => !v)}>
              <Plus aria-hidden />
              {t('New campaign', 'حملة جديدة')}
            </Button>
          )
        }
        contentClassName="flex flex-col gap-4"
      >
        {creating && (
          <CampaignForm
            onCancel={() => setCreating(false)}
            onSave={(v) => {
              const c = createCampaign({ ...v, createdBy: session?.email ?? '' })
              log('action', { en: `Created the survey campaign "${c.name}"`, ar: `أنشأ حملة الاستبيان "${c.name}"` })
              setCreating(false)
              setOpenId(c.id)
            }}
          />
        )}

        <div className="flex flex-wrap items-end gap-3">
          <label className="relative flex min-w-56 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            {t('Find a campaign', 'ابحث عن حملة')}
            <Search aria-hidden className="pointer-events-none absolute start-3 top-[29px] size-3.5" />
            <Input
              className="h-9 ps-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Type part of the name', 'اكتب جزءاً من الاسم')}
            />
          </label>
          <Segmented<View>
            label={t('Show', 'اعرض')}
            variant="pressed"
            value={view}
            onValueChange={setView}
            options={[
              { value: 'active', label: t('Active', 'النشطة') },
              { value: 'archived', label: t('Archived', 'المؤرشفة') },
              { value: 'all', label: t('All', 'الكل') },
            ]}
          />
        </div>

        {shown.length === 0 ? (
          <EmptyState
            title={
              campaigns.length === 0
                ? t('No campaigns yet. Create the first one and it will be kept here.', 'لا توجد حملات بعد. أنشئ أول حملة وستُحفظ هنا.')
                : t('No campaign matches.', 'لا توجد حملة مطابقة.')
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((c) => (
              <CampaignRow
                key={c.id}
                c={c}
                open={openId === c.id}
                onToggle={() => setOpenId(openId === c.id ? null : c.id)}
                canEdit={canCreate}
                day={day}
                L={L}
              />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

function CampaignRow({
  c,
  open,
  onToggle,
  canEdit,
  day,
  L,
}: {
  c: SurveyCampaign
  open: boolean
  onToggle: () => void
  canEdit: boolean
  day: Intl.DateTimeFormat
  L: (b: { en: string; ar: string }) => string
}) {
  const { t, lang } = useI18n()
  const { log } = useAuditActor()
  const { session } = useAuth()
  const [name, setName] = useState(c.name)
  const [audience, setAudience] = useState(c.audience)
  const [sendOn, setSendOn] = useState(c.sendOn)
  const dup = name.trim() !== c.name && nameTaken(name, c.id)
  const dirty = name.trim() !== c.name || audience !== c.audience || sendOn !== c.sendOn
  const rate = c.sentCount ? Math.round(((c.answeredCount ?? 0) / c.sentCount) * 100) : null

  return (
    <li className="well flex flex-col gap-3 p-3" data-testid={`campaign-${c.id}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-start outline-hidden focus-visible:ring-2"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-medium text-foreground">{c.name}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <CampaignProductTag product={c.product} lang={lang} />
            {L(CHANNEL_LABEL[c.channel])} · {day.format(new Date(c.sendOn))}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {c.archived && <StatusBadge tone="neutral">{t('Archived', 'مؤرشفة')}</StatusBadge>}
          <StatusBadge tone={c.status === 'sent' ? 'success' : 'warning'} dot>
            {c.status === 'sent' ? t('Sent', 'أُرسلت') : t('Draft', 'مسودة')}
          </StatusBadge>
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          {c.status === 'sent' && (
            <p className="text-sm text-foreground" data-testid="campaign-results">
              {t(
                `Sent to ${c.sentCount} people, ${c.answeredCount} answered (${rate}%). Sample results.`,
                `أُرسلت إلى ${c.sentCount} شخص، أجاب ${c.answeredCount} (${rate}%). نتائج تجريبية.`,
              )}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('Name', 'الاسم')}
              <Input value={name} disabled={!canEdit} onChange={(e) => setName(e.target.value)} aria-invalid={dup} />
              {dup && <span className="text-(--status-error-text)">{t('A campaign with this name already exists.', 'توجد حملة بهذا الاسم.')}</span>}
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('Send date', 'تاريخ الإرسال')}
              <Input type="date" value={sendOn} disabled={!canEdit || c.status === 'sent'} onChange={(e) => setSendOn(e.target.value)} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('Who it goes to', 'لمن تُرسل')}
            <Textarea value={audience} disabled={!canEdit || c.status === 'sent'} rows={2} onChange={(e) => setAudience(e.target.value)} />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('What was asked (a copy, kept as it was)', 'ما سُئل (نسخة محفوظة كما كانت)')}</span>
            <ol className="flex flex-col gap-1 text-sm text-foreground">
              {c.questions.map((q, i) => (
                <li key={i}>
                  <span className="me-1.5 font-medium tabular">{i + 1}.</span>
                  {lang === 'ar' ? q.ar : q.en}
                  {hasLogic(c.questions) && <span className="ms-2 text-xs text-muted-foreground">({describeRouting(c.questions, i, t, L)})</span>}
                </li>
              ))}
            </ol>
          </div>
          {canEdit && (
            <div className="flex flex-wrap justify-end gap-2">
              {dirty && (
                <Button
                  size="sm"
                  disabled={!name.trim() || dup}
                  onClick={() => {
                    updateCampaign(c.id, { name: name.trim(), audience, sendOn })
                    log('action', { en: `Updated the survey campaign "${name.trim()}"`, ar: `حدّث حملة الاستبيان "${name.trim()}"` })
                  }}
                >
                  {t('Save changes', 'حفظ التغييرات')}
                </Button>
              )}
              {c.status === 'draft' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    markSent(c.id)
                    log('action', { en: `Sent the survey campaign "${c.name}" (prototype)`, ar: `أرسل حملة الاستبيان "${c.name}" (نموذج)` })
                  }}
                >
                  <Send aria-hidden />
                  {t('Send (prototype)', 'إرسال (نموذج)')}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const copy = duplicateCampaign(c.id, session?.email ?? '')
                  if (copy) log('action', { en: `Reused "${c.name}" as the start of "${copy.name}"`, ar: `استخدم "${c.name}" كبداية لـ "${copy.name}"` })
                }}
              >
                <Copy aria-hidden />
                {t('Use as the start of a new one', 'ابدأ منها حملة جديدة')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setArchived(c.id, !c.archived)
                  log('action', {
                    en: `${c.archived ? 'Restored' : 'Archived'} the survey campaign "${c.name}"`,
                    ar: `${c.archived ? 'استعاد' : 'أرشف'} حملة الاستبيان "${c.name}"`,
                  })
                }}
              >
                {c.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                {c.archived ? t('Restore', 'استعادة') : t('Archive', 'أرشفة')}
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/** The product tag of a campaign, or "General" when it belongs to no product. */
export function CampaignProductTag({ product, lang }: { product: CampaignProduct; lang: 'en' | 'ar' }) {
  if (product === 'general') return <span className="pill pill-light">{lang === 'ar' ? 'عام، دون منتج' : 'General, no product'}</span>
  return <ProductTag productId={product} lang={lang} />
}

const GENERAL = 'general'
const OWN = '__own__'

function CampaignForm({
  onSave,
  onCancel,
}: {
  onSave: (v: {
    name: string
    product: CampaignProduct
    basedOn: string
    questions: EditableQuestion[]
    audience: string
    channel: CampaignChannel
    sendOn: string
  }) => void
  onCancel: () => void
}) {
  const { t, L } = useI18n()
  const sets = useEditableSets()
  const [name, setName] = useState('')
  const [product, setProduct] = useState<CampaignProduct>(GENERAL)
  const [source, setSource] = useState<string>(OWN)
  const [questions, setQuestions] = useState<EditableQuestion[]>([blankQuestion()])
  const [audience, setAudience] = useState('')
  const [channel, setChannel] = useState<CampaignChannel>('whatsapp')
  const [sendOn, setSendOn] = useState(() => new Date().toISOString().slice(0, 10))

  const options = product === GENERAL ? [] : sets.filter((s) => s.product === product)
  const dup = name.trim() !== '' && nameTaken(name)
  const missing = questions.findIndex((q) => !q.en.trim() || (kindOf(q) === 'choice' && answersOf(q).length < 2))
  const ok = name.trim() && !dup && missing === -1 && audience.trim()

  const pickSource = (id: string, forProduct: CampaignProduct = product) => {
    setSource(id)
    if (id === OWN) return setQuestions([blankQuestion()])
    const found = sets.find((s) => s.id === id && s.product === forProduct)
    if (found) setQuestions(found.questions.map((q) => ({ ...q })))
  }
  return (
    <div className="well flex flex-col gap-3 p-4" data-testid="campaign-form">
      <h3 className="t-ui-strong">{t('New campaign', 'حملة جديدة')}</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Campaign name', 'اسم الحملة')}
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('For example: Dubai viewings, October follow-up', 'مثال: معاينات دبي، متابعة أكتوبر')}
            aria-invalid={dup}
          />
          {dup && <span className="text-(--status-error-text)">{t('A campaign with this name already exists.', 'توجد حملة بهذا الاسم.')}</span>}
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Send date', 'تاريخ الإرسال')}
          <Input type="date" value={sendOn} onChange={(e) => setSendOn(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Product (optional)', 'المنتج (اختياري)')}
          <Select
            value={product}
            onValueChange={(v) => {
              setProduct(v as CampaignProduct)
              pickSource(OWN, v as CampaignProduct)
            }}
          >
            <SelectTrigger aria-label={t('Product', 'المنتج')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENERAL}>{t('Not tied to a product', 'غير مرتبطة بمنتج')}</SelectItem>
              {PRODUCTS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {L(p.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Questions', 'الأسئلة')}
          <Select value={source} onValueChange={(v) => pickSource(v)}>
            <SelectTrigger aria-label={t('Where the questions start from', 'من أين تبدأ الأسئلة')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OWN}>{t('Write my own', 'أكتب أسئلتي بنفسي')}</SelectItem>
              {options.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {t('Start from: ', 'ابدأ من: ')}
                  {L(s.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Channel', 'القناة')}
          <Select value={channel} onValueChange={(v) => setChannel(v as CampaignChannel)}>
            <SelectTrigger aria-label={t('Channel', 'القناة')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHANNEL_LABEL) as CampaignChannel[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {L(CHANNEL_LABEL[k])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('Who it goes to', 'لمن تُرسل')}
        <Textarea
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          rows={2}
          placeholder={t('For example: Dubai clients who viewed a unit in October', 'مثال: عملاء دبي الذين عاينوا وحدة في أكتوبر')}
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-line pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="t-ui-strong">{t('What you ask', 'ما الذي تسأله')}</span>
          <span className="text-xs text-muted-foreground">
            {t(
              'Build the survey question by question. Pick a question on the left to edit it on the right, and choose where each answer goes next. Changes here affect this campaign only, never the standing surveys.',
              'ابنِ الاستبيان سؤالاً سؤالاً. اختر سؤالاً من المسار لتعدّله، وحدّد إلى أين تذهب كل إجابة. التغييرات هنا تخص هذه الحملة فقط، وليس الاستبيانات الدائمة.',
            )}
          </span>
        </div>
        <SurveyBuilder questions={questions} onChange={setQuestions} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {missing !== -1 && (
          <span className="me-auto text-xs text-muted-foreground">
            {t(
              `Question ${missing + 1} needs its English wording (and two options for a choice).`,
              `السؤال ${missing + 1} يحتاج صياغة بالإنجليزية (وخيارين للاختيار).`,
            )}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('Cancel', 'إلغاء')}
        </Button>
        <Button
          size="sm"
          disabled={!ok}
          onClick={() =>
            onSave({
              name,
              product,
              basedOn: source === OWN ? 'custom' : source,
              questions: questions.map((q) => ({ ...q, en: q.en.trim(), ar: q.ar.trim() || q.en.trim() })),
              audience: audience.trim(),
              channel,
              sendOn,
            })
          }
        >
          {t('Save campaign', 'حفظ الحملة')}
        </Button>
      </div>
    </div>
  )
}

