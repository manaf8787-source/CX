import { useState } from 'react'
import { MessageCircle, Plus, Trash2 } from 'lucide-react'
import { useI18n, type Lang } from '@/i18n'
import { useAuditActor } from '@/auth/useAuditActor'
import { SURVEY_QUESTIONS_COPY as COPY } from '@/data/surveyQuestions'
import { LEGACY_QUESTION_TYPE_LABEL } from '@/data/surveyVocabulary'
import { CORE_SET_IDS, addQuestion, addSet, removeQuestion, removeSet, resetSets, updateQuestion, useEditableSets, type EditableQuestion, type EditableSet } from '@/data/surveyEditor'
import { PRODUCTS } from '@/data/products'
import type { Product } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProposedBadge } from '@/components/common/ProposedBadge'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { EmptyState } from '@/components/common/EmptyState'

/**
 * The Questions tab of Surveys (22 Nov): the exact questions per product and moment in both languages with the phone preview, and for
 * the CX manager an editor: change the wording, set the type, add or remove a question, add a set for a new moment. Everyone else reads.
 * Changing a question of a measurement set (NPS, CSAT and CES, the re-survey) asks twice, because the indicators compare month to month.
 */
export function SurveyQuestionsTab({ canEdit }: { canEdit: boolean }) {
  const { t, L, lang } = useI18n()
  const sets = useEditableSets()
  const [product, setProduct] = useState<Product['id']>('re')
  const [previewLang, setPreviewLang] = useState<Lang>(lang)

  return (
    <Tabs value={product} onValueChange={(v) => setProduct(v as Product['id'])} className="gap-4">
      <div className="-m-1 overflow-x-auto p-1">
        <TabsList className="min-w-max" aria-label={t('Product', 'المنتج')}>
          {PRODUCTS.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>
              {L(p.name)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {PRODUCTS.map((p) => (
        <TabsContent key={p.id} value={p.id} className="flex flex-col gap-4">
          <ProductSets product={p} sets={sets.filter((s) => s.product === p.id)} previewLang={previewLang} onPreviewLang={setPreviewLang} canEdit={canEdit} />
        </TabsContent>
      ))}
      {canEdit && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => resetSets()}>
            {t('Reset all questions to the original wording', 'إرجاع كل الأسئلة إلى الصياغة الأصلية')}
          </Button>
        </div>
      )}
    </Tabs>
  )
}

function ProductSets({ product, sets, previewLang, onPreviewLang, canEdit }: { product: Product; sets: EditableSet[]; previewLang: Lang; onPreviewLang: (l: Lang) => void; canEdit: boolean }) {
  const { t, L } = useI18n()
  const { log } = useAuditActor()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const selected = sets.find((s) => s.id === pickedId) ?? sets[0]

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={L(product.name)}
          description={t(`${sets.length} sets, one per moment`, `${sets.length} مجموعات، واحدة لكل لحظة`)}
          actions={
            canEdit && (
              <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
                <Plus aria-hidden />
                {t('Add a set', 'إضافة مجموعة')}
              </Button>
            )
          }
        >
          {adding && (
            <NewSetForm
              onCancel={() => setAdding(false)}
              onCreate={(name, when) => {
                const s = addSet({ product: product.id, name, when })
                log('action', { en: `Added the survey question set "${name.en}" for ${product.name.en}`, ar: `أضاف مجموعة أسئلة "${name.ar}" لـ ${product.name.ar}` })
                setPickedId(s.id)
                setAdding(false)
              }}
            />
          )}
          {sets.length === 0 && !adding && <EmptyState title={L(COPY.empty)} />}
          <ul className="flex flex-col gap-1" aria-label={t('Question sets', 'مجموعات الأسئلة')}>
            {sets.map((s) => {
              const active = selected?.id === s.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPickedId(s.id)}
                    className="group/set flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-well px-4 py-3 text-start outline-hidden transition-colors duration-200 ease-out hover:bg-row-hover aria-pressed:material-dark aria-pressed:hover:bg-transparent"
                  >
                    <span className="t-ui-strong flex flex-wrap items-center gap-2 group-aria-pressed/set:text-inherit">
                      {L(s.name)}
                      {s.proposed && <ProposedBadge title={L(COPY.proposedNote)} />}
                      {s.custom && <StatusBadge tone="info">{t('Added by you', 'أضفتها أنت')}</StatusBadge>}
                    </span>
                    <span className="text-sm text-muted-foreground group-aria-pressed/set:text-(--on-dark-muted)">
                      {L(s.when)} · {L(COPY.count(s.questions.length))}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </SectionCard>

        <SectionCard
          title={L(COPY.previewCaption)}
          actions={
            <Segmented
              variant="pressed"
              label={t('Preview language', 'لغة المعاينة')}
              options={[
                { value: 'en' as const, label: 'English' },
                { value: 'ar' as const, label: 'العربية' },
              ]}
              value={previewLang}
              onValueChange={onPreviewLang}
            />
          }
        >
          {selected ? <Preview questions={selected.questions} previewLang={previewLang} /> : <EmptyState title={L(COPY.empty)} />}
        </SectionCard>
      </div>

      {selected && (
        <SectionCard
          title={t('Questions', 'الأسئلة')}
          description={`${L(selected.name)} · ${L(selected.when)}`}
          actions={
            canEdit && (
              <Button
                size="sm"
                onClick={() => {
                  addQuestion(selected.id, { en: '', ar: '' })
                }}
              >
                <Plus aria-hidden />
                {t('Add a question', 'إضافة سؤال')}
              </Button>
            )
          }
          contentClassName="flex flex-col gap-3"
        >
          {CORE_SET_IDS.includes(selected.id) && (
            <InlineNote tone="warning">
              {t(
                'These questions feed the NPS, CSAT and CES numbers. Changing the wording or the scale makes this month hard to compare with the months before.',
                'هذه الأسئلة تغذّي أرقام NPS وCSAT وCES. تغيير الصياغة أو المقياس يجعل مقارنة هذا الشهر بالأشهر السابقة صعبة.',
              )}
            </InlineNote>
          )}
          {selected.questions.map((q, i) => (
            <QuestionRow key={`${selected.id}-${i}-${q.en.length === 0 ? 'new' : 'old'}`} set={selected} index={i} q={q} canEdit={canEdit} />
          ))}
          {selected.questions.length === 0 && <p className="text-sm text-muted-foreground">{t('No questions yet.', 'لا توجد أسئلة بعد.')}</p>}
          {canEdit && selected.custom && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  removeSet(selected.id)
                  setPickedId(null)
                  log('action', { en: `Deleted the survey question set "${selected.name.en}"`, ar: `حذف مجموعة الأسئلة "${selected.name.ar}"` })
                }}
              >
                <Trash2 aria-hidden />
                {t('Delete this set', 'حذف هذه المجموعة')}
              </Button>
            </div>
          )}
          {selected.proposed && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <StatusBadge tone="warning">{t('[Proposed]', '[مقترح]')}</StatusBadge>
              {L(COPY.proposedNote)}
            </p>
          )}
        </SectionCard>
      )}
    </>
  )
}

function NewSetForm({ onCreate, onCancel }: { onCreate: (name: { en: string; ar: string }, when: { en: string; ar: string }) => void; onCancel: () => void }) {
  const { t } = useI18n()
  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [whenEn, setWhenEn] = useState('')
  const [whenAr, setWhenAr] = useState('')
  const ok = nameEn.trim() && nameAr.trim() && whenEn.trim() && whenAr.trim()
  return (
    <div className="well mb-3 flex flex-col gap-2 p-3" data-testid="new-set-form">
      <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={t('Set name (English)', 'اسم المجموعة (إنجليزي)')} dir="ltr" />
      <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t('Set name (Arabic)', 'اسم المجموعة (عربي)')} dir="rtl" />
      <Input value={whenEn} onChange={(e) => setWhenEn(e.target.value)} placeholder={t('When it goes out (English)', 'متى تُرسل (إنجليزي)')} dir="ltr" />
      <Input value={whenAr} onChange={(e) => setWhenAr(e.target.value)} placeholder={t('When it goes out (Arabic)', 'متى تُرسل (عربي)')} dir="rtl" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('Cancel', 'إلغاء')}
        </Button>
        <Button size="sm" disabled={!ok} onClick={() => onCreate({ en: nameEn.trim(), ar: nameAr.trim() }, { en: whenEn.trim(), ar: whenAr.trim() })}>
          {t('Create set', 'إنشاء المجموعة')}
        </Button>
      </div>
    </div>
  )
}

function QuestionRow({ set, index, q, canEdit }: { set: EditableSet; index: number; q: EditableQuestion; canEdit: boolean }) {
  const { t, L } = useI18n()
  const { log } = useAuditActor()
  const [en, setEn] = useState(q.en)
  const [ar, setAr] = useState(q.ar)
  const [kind, setKind] = useState(q.kind ?? 'open')
  const [confirming, setConfirming] = useState(false)
  const core = CORE_SET_IDS.includes(set.id)
  const dirty = en !== q.en || ar !== q.ar || kind !== (q.kind ?? 'open')
  const valid = en.trim().length > 0 && ar.trim().length > 0

  function save() {
    updateQuestion(set.id, index, { en: en.trim(), ar: ar.trim(), kind })
    log('action', { en: `Changed question ${index + 1} of "${set.name.en}" from "${q.en}" to "${en.trim()}"`, ar: `غيّر السؤال ${index + 1} في "${set.name.ar}" من "${q.ar}" إلى "${ar.trim()}"` })
    setConfirming(false)
  }

  if (!canEdit) {
    return (
      <div className="well grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
        <p dir="ltr" lang="en" className="text-foreground">
          <span className="me-1.5 font-medium tabular">{index + 1}.</span>
          {q.en}
        </p>
        <p dir="rtl" lang="ar" className="text-foreground">
          {q.ar}
        </p>
      </div>
    )
  }

  return (
    <div className="well flex flex-col gap-2 p-3" data-testid={`question-${set.id}-${index}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="t-ui-strong tabular">{t(`Question ${index + 1}`, `السؤال ${index + 1}`)}</span>
        <div className="flex items-center gap-2">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="h-8 w-40" aria-label={t('Question type', 'نوع السؤال')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LEGACY_QUESTION_TYPE_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {L(label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={t('Delete this question', 'حذف هذا السؤال')}
            onClick={() => {
              removeQuestion(set.id, index)
              if (q.en) log('action', { en: `Deleted question ${index + 1} of "${set.name.en}": "${q.en}"`, ar: `حذف السؤال ${index + 1} في "${set.name.ar}": "${q.ar}"` })
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Textarea value={en} onChange={(e) => setEn(e.target.value)} dir="ltr" lang="en" rows={3} placeholder={t('Question in English', 'السؤال بالإنجليزية')} aria-label={t('Question in English', 'السؤال بالإنجليزية')} />
        <Textarea value={ar} onChange={(e) => setAr(e.target.value)} dir="rtl" lang="ar" rows={3} placeholder={t('Question in Arabic', 'السؤال بالعربية')} aria-label={t('Question in Arabic', 'السؤال بالعربية')} />
      </div>
      {dirty && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {core && q.en && confirming && (
            <span className="me-auto text-sm text-(--status-warning-text)">
              {t('This is a measurement question. Past months will no longer compare exactly. Save anyway?', 'هذا سؤال قياس. لن تقارن الأشهر السابقة بدقة بعد الآن. هل تحفظ رغم ذلك؟')}
            </span>
          )}
          {!valid && <span className="me-auto text-sm text-muted-foreground">{t('Fill both languages to save.', 'عبّئ اللغتين للحفظ.')}</span>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEn(q.en)
              setAr(q.ar)
              setKind(q.kind ?? 'open')
              setConfirming(false)
            }}
          >
            {t('Discard', 'تراجع')}
          </Button>
          <Button size="sm" disabled={!valid} onClick={() => (core && q.en && !confirming ? setConfirming(true) : save())}>
            {core && q.en && confirming ? t('Yes, save', 'نعم، احفظ') : t('Save', 'حفظ')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** The phone-style preview: what the customer receives on WhatsApp or in the app, in their language. */
function Preview({ questions, previewLang }: { questions: EditableQuestion[]; previewLang: Lang }) {
  const { t, L } = useI18n()
  const dir = previewLang === 'ar' ? 'rtl' : 'ltr'
  return (
    <div className="flex flex-col gap-3">
      <figure aria-label={t('Preview of the survey on a phone', 'معاينة الاستبيان على هاتف')} dir={dir} lang={previewLang} className="well mx-auto flex w-full max-w-sm flex-col gap-2 rounded-card-lg p-4">
        <div className="t-ui-strong flex items-center gap-2.5 pb-1">
          <span aria-hidden className="material-light inline-grid size-[30px] place-items-center rounded-full [&_svg]:size-4">
            <MessageCircle />
          </span>
          PSI
        </div>
        <p className="material-light max-w-[88%] rounded-panel rounded-ss-sm px-3.5 py-2.5 text-base text-foreground">{COPY.greeting[previewLang]}</p>
        <ol className="flex flex-col gap-2">
          {questions
            .filter((q) => q[previewLang].trim())
            .map((q, i) => (
              <li key={i} className="material-light max-w-[88%] rounded-panel rounded-ss-sm px-3.5 py-2.5 text-base text-foreground">
                <span className="me-1.5 font-medium tabular">{i + 1}.</span>
                {q[previewLang]}
              </li>
            ))}
        </ol>
      </figure>
      <p className="text-sm text-muted-foreground">{L(COPY.footer)}</p>
    </div>
  )
}

