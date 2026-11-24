import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ChevronDown, Pencil, Plug, Plus, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuditActor } from '@/auth/useAuditActor'
import {
  AUTH_LABEL,
  DIRECTION_LABEL,
  METHOD_LABEL,
  SCHEDULE_LABEL,
  STATUS_LABEL,
  hintOf,
  newIntegration,
  removeIntegration,
  saveIntegration,
  setEnabled,
  testIntegration,
  useIntegrations,
  type Auth,
  type ConnStatus,
  type Direction,
  type Integration,
  type Method,
  type Schedule,
  type Param,
} from '@/data/integrations'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import Feeds from '@/pages/settings/Feeds'
import { useCrmFields } from '@/services/referenceQueries'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * Integrations (owner's request, 23 Nov): one page for the Super admin and the Admin to add, edit, test and switch off every connection
 * with another platform or product, and, on its second tab, the data feeds (what each connection actually delivered today).
 * Not open to the CX users (see `blocked` in auth/access.ts).
 */
const STATUS_TONE: Record<ConnStatus, Tone> = { connected: 'success', not_connected: 'neutral', error: 'danger', paused: 'warning' }
const DIR_ICON: Record<Direction, typeof ArrowDownToLine> = { in: ArrowDownToLine, out: ArrowUpFromLine, both: ArrowLeftRight }

export default function Integrations() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab')
  const tab = asked === 'feeds' || asked === 'crm' ? asked : 'connections'
  const [addRequest, setAddRequest] = useState(0)
  return (
    <div data-density="comfortable" className="flex flex-col gap-5">
      <PageHeader
        title={t('Integrations', 'الربط والتكاملات')}
        description={t(
          'Every connection with another platform or product: what it brings in or sends out, how, and whether it works today. Super admin and Admin only.',
          'كل ربط مع منصة أو منتج آخر: ماذا يجلب أو يرسل، وكيف، وهل يعمل اليوم. للمشرف العام والمشرف فقط.',
        )}
      />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="gap-4">
        {/* 24 Nov (owner): "Add a connection" sits on the tabs row, at the right, aligned with the tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label={t('Integrations', 'الربط والتكاملات')}>
            <TabsTrigger value="connections">{t('Connections', 'الاتصالات')}</TabsTrigger>
            <TabsTrigger value="feeds">{t('Data feeds (what arrived)', 'تغذيات البيانات (ما وصل)')}</TabsTrigger>
            <TabsTrigger value="crm">{t('Fields we need from the CRM', 'الحقول المطلوبة من CRM')}</TabsTrigger>
          </TabsList>
          {tab === 'connections' && (
            <Button size="sm" onClick={() => setAddRequest((n) => n + 1)}>
              <Plus aria-hidden />
              {t('Add a connection', 'أضف اتصالاً')}
            </Button>
          )}
        </div>
        <TabsContent value="connections">
          <Connections addRequest={addRequest} />
        </TabsContent>
        <TabsContent value="feeds">
          <Feeds />
        </TabsContent>
        <TabsContent value="crm">
          <CrmFields />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Connections({ addRequest }: { addRequest: number }) {
  const { t, L, lang } = useI18n()
  const { log } = useAuditActor()
  const items = useIntegrations()
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Integration | null>(null)
  const counts = {
    connected: items.filter((x) => x.status === 'connected').length,
    error: items.filter((x) => x.status === 'error').length,
    waiting: items.filter((x) => x.status === 'not_connected').length,
  }
  // the "Add a connection" button lives on the tabs row (parent); each press opens a new form here
  useEffect(() => {
    if (addRequest > 0) setEditing(newIntegration())
  }, [addRequest])
  const when = (iso?: string) =>
    iso ? new Date(iso).toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="flex flex-col gap-4">
      <InlineNote title={t('How to read this', 'كيف تقرأ هذه الصفحة')}>
        {t(
          `${counts.connected} connected, ${counts.error} with an error, ${counts.waiting} not connected yet. "Brings data in" connections fill the portal; the Data feeds tab shows what each one actually delivered today. Keys and passwords are taken once and never shown again; only the last four characters appear.`,
          `${counts.connected} متصلة، ${counts.error} فيها خطأ، ${counts.waiting} غير متصلة بعد. الاتصالات التي «تجلب البيانات» تملأ البورتال؛ وتبويب تغذيات البيانات يبيّن ما وصل فعلاً من كل منها اليوم. المفاتيح وكلمات المرور تُدخل مرة واحدة ولا تُعرض مجدداً؛ تظهر آخر أربعة أحرف فقط.`,
        )}
      </InlineNote>

      {/* 24 Nov (owner): adding or editing a connection opens in a pop-up, not inside the card */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogTitle>
            {editing && items.some((x) => x.id === editing.id) ? t(`Edit “${editing.name}”`, `تعديل «${editing.name}»`) : t('New connection', 'اتصال جديد')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('Connection settings', 'إعدادات الاتصال')}</DialogDescription>
          {editing && (
            <EditForm
              key={editing.id}
              value={editing}
              onCancel={() => setEditing(null)}
              onSave={(v) => {
                const isNew = !items.some((x) => x.id === v.id)
                saveIntegration(v)
                log(
                  'action',
                  isNew
                    ? { en: `Added the integration "${v.name}"`, ar: `أضاف الربط "${v.name}"` }
                    : { en: `Changed the integration "${v.name}"`, ar: `عدّل الربط "${v.name}"` },
                  '/admin/integrations',
                )
                setEditing(null)
                if (isNew) setOpenId(v.id)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 24 Nov (owner): cards in a grid instead of a long list; an opened or edited card spans the full row */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {items.map((x) => {
          const open = openId === x.id
          const Dir = DIR_ICON[x.direction]
          return (
            <li
              key={x.id}
              className={cn(
                'well flex flex-col gap-3 p-4',
                open && 'md:col-span-2 2xl:col-span-3',
                x.status === 'error' && 'ring-1 ring-(--status-error-solid)/40',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span aria-hidden className="material-light grid size-10 shrink-0 place-items-center rounded-full">
                  <Dir className="size-4" />
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge tone={STATUS_TONE[x.status]} dot>
                    {L(STATUS_LABEL[x.status])}
                  </StatusBadge>
                  <Switch
                    checked={x.enabled}
                    aria-label={`${x.name}: ${t('switched on', 'مُفعّل')}`}
                    onCheckedChange={(v) => {
                      setEnabled(x.id, v)
                      log(
                        'action',
                        { en: `${v ? 'Switched on' : 'Paused'} the integration "${x.name}"`, ar: `${v ? 'فعّل' : 'أوقف'} الربط "${x.name}"` },
                        '/admin/integrations',
                      )
                    }}
                  />
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-medium text-foreground">{x.name}</span>
                <span className="text-xs text-muted-foreground">
                  {L(DIRECTION_LABEL[x.direction])} · {x.scope}
                </span>
                <span className="text-xs text-muted-foreground">
                  {L(SCHEDULE_LABEL[x.schedule])}
                  {x.runAt && (x.schedule === 'daily' || x.schedule === 'weekly') ? ` ${x.runAt}` : ''}
                  {x.lastSync ? ` · ${t('last sync', 'آخر مزامنة')} ${when(x.lastSync)}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : x.id)}
                aria-expanded={open}
                className="mt-auto inline-flex w-fit items-center gap-1 rounded-md text-sm font-medium text-foreground outline-hidden hover:underline focus-visible:ring-2"
              >
                {open ? t('Hide details', 'إخفاء التفاصيل') : t('Details', 'التفاصيل')}
                <ChevronDown aria-hidden className={cn('size-4 transition-transform', open && 'rotate-180')} />
              </button>

              {open && (
                <div className="flex flex-col gap-3 border-t border-line pt-3 text-sm">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    <Fact label={t('What data', 'أي بيانات')} value={x.data || '—'} wide />
                    <Fact label={t('How', 'الطريقة')} value={L(METHOD_LABEL[x.method])} />
                    <Fact label={t('Address (base URL)', 'العنوان (Base URL)')} value={x.baseUrl || '—'} mono />
                    <Fact
                      label={t('Sign-in', 'تسجيل الدخول')}
                      value={`${L(AUTH_LABEL[x.auth])}${x.secretHint ? ` · ${x.secretHint}` : x.auth === 'none' || x.auth === 'oauth' ? '' : ` · ${t('not entered', 'غير مُدخل')}`}`}
                    />
                    <Fact label={t('Owner on their side', 'المسؤول لديهم')} value={x.owner || '—'} />
                    <Fact label={t('Last sync', 'آخر مزامنة')} value={when(x.lastSync)} />
                    {x.lastError && <Fact label={t('Last error', 'آخر خطأ')} value={<span className="text-(--status-error-text)">{x.lastError}</span>} />}
                    {(x.params ?? []).map((p) => (
                      <Fact key={p.key} label={p.label} value={p.secret ? p.value || t('not entered', 'غير مُدخل') : p.value || '—'} mono />
                    ))}
                  </dl>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const r = testIntegration(x.id)
                        if (r.ok) toast.success(t('The connection answered (prototype check).', 'استجاب الاتصال (فحص تجريبي).'))
                        else toast.error(r.reason ? L(r.reason) : t('The check failed.', 'فشل الفحص.'))
                        log(
                          'action',
                          { en: `Tested the integration "${x.name}": ${r.ok ? 'ok' : 'failed'}`, ar: `فحص الربط "${x.name}": ${r.ok ? 'نجح' : 'فشل'}` },
                          '/admin/integrations',
                        )
                      }}
                    >
                      <Plug aria-hidden />
                      {t('Test the connection', 'افحص الاتصال')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...x })}>
                      <Pencil aria-hidden />
                      {t('Edit', 'تعديل')}
                    </Button>
                    {x.custom && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          removeIntegration(x.id)
                          log('action', { en: `Removed the integration "${x.name}"`, ar: `حذف الربط "${x.name}"` }, '/admin/integrations')
                        }}
                      >
                        <Trash2 aria-hidden />
                        {t('Remove', 'حذف')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Fact({ label, value, wide, mono }: { label: string; value: React.ReactNode; wide?: boolean; mono?: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', wide && 'sm:col-span-2')}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('break-words text-foreground', mono && 'tabular')} dir={mono ? 'ltr' : undefined}>
        {value}
      </dd>
    </div>
  )
}

function EditForm({ value, onSave, onCancel }: { value: Integration; onSave: (v: Integration) => void; onCancel: () => void }) {
  const { t, L } = useI18n()
  const [v, setV] = useState<Integration>(value)
  const [secret, setSecret] = useState('')
  const [paramSecrets, setParamSecrets] = useState<Record<string, string>>({})
  const setParam = (i: number, p: Partial<Param>) => set({ params: (v.params ?? []).map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const set = (p: Partial<Integration>) => setV((x) => ({ ...x, ...p }))
  const needsSecret = v.auth !== 'none' && v.auth !== 'oauth'
  const badUrl = v.baseUrl.trim() !== '' && v.baseUrl.trim() !== 'https://' && !/^https:\/\/[^\s]+$/.test(v.baseUrl.trim())
  const ok = v.name.trim() && v.data.trim() && !badUrl

  const pick = <K extends string>(label: string, val: K, onChange: (k: K) => void, options: Record<K, { en: string; ar: string }>) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Select value={val} onValueChange={(k) => onChange(k as K)}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(options) as K[]).map((k) => (
            <SelectItem key={k} value={k}>
              {L(options[k])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )

  return (
    <div className="flex flex-col gap-3" data-testid="integration-form">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Name', 'الاسم')}
          <Input value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('For example: Odoo (HR)', 'مثال: Odoo (الموارد البشرية)')} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Product or area it serves', 'المنتج أو المجال')}
          <Input
            value={v.scope}
            onChange={(e) => set({ scope: e.target.value })}
            placeholder={t('For example: PSI Real Estate · Dubai', 'مثال: PSI العقارية · دبي')}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t('What data it carries', 'أي بيانات يحمل')}
        <Textarea
          rows={2}
          value={v.data}
          onChange={(e) => set({ data: e.target.value })}
          placeholder={t('For example: job positions and applicants', 'مثال: الوظائف والمتقدمون')}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {pick(t('Direction', 'الاتجاه'), v.direction, (k: Direction) => set({ direction: k }), DIRECTION_LABEL)}
        {pick(t('How', 'الطريقة'), v.method, (k: Method) => set({ method: k }), METHOD_LABEL)}
        {pick(t('How often', 'كل كم'), v.schedule, (k: Schedule) => set({ schedule: k }), SCHEDULE_LABEL)}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
          {t('Address (base URL)', 'العنوان (Base URL)')}
          <Input dir="ltr" value={v.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} aria-invalid={badUrl} />
          {badUrl && <span className="text-(--status-error-text)">{t('Use a full https:// address.', 'استخدم عنواناً كاملاً يبدأ بـ https://')}</span>}
        </label>
        {(v.schedule === 'daily' || v.schedule === 'weekly') && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t('At (time)', 'الساعة')}
            <Input type="time" value={v.runAt ?? '06:00'} onChange={(e) => set({ runAt: e.target.value })} />
          </label>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {pick(t('Sign-in', 'تسجيل الدخول'), v.auth, (k: Auth) => set({ auth: k }), AUTH_LABEL)}
        {needsSecret && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {v.secretHint
              ? t(`Key or password (set ${v.secretHint}; type to replace)`, `المفتاح أو كلمة المرور (مضبوط ${v.secretHint}؛ اكتب للاستبدال)`)
              : t('Key or password', 'المفتاح أو كلمة المرور')}
            <Input type="password" autoComplete="off" dir="ltr" value={secret} onChange={(e) => setSecret(e.target.value)} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t('Owner on their side (title)', 'المسؤول لديهم (المسمى)')}
          <Input
            value={v.owner}
            onChange={(e) => set({ owner: e.target.value })}
            placeholder={t('For example: CRM owner (IT)', 'مثال: مالك CRM (تقنية المعلومات)')}
          />
        </label>
      </div>
      {needsSecret && (
        <p className="text-xs text-muted-foreground">
          {t(
            'The key is never shown again. Only its last four characters appear, to show that one is set.',
            'لا يُعرض المفتاح مجدداً. تظهر آخر أربعة أحرف فقط لإظهار أنه مضبوط.',
          )}
        </p>
      )}
      <div className="flex flex-col gap-2 rounded-lg bg-well p-3">
        <span className="text-sm font-medium text-foreground">{t('Settings for this platform', 'إعدادات هذه المنصة')}</span>
        <span className="text-xs text-muted-foreground">
          {t(
            'What this one platform needs besides the address and the key: a page ID, a phone number ID, a database name, a queue name.',
            'ما تحتاجه هذه المنصة تحديداً غير العنوان والمفتاح: معرّف صفحة، معرّف رقم هاتف، اسم قاعدة بيانات، اسم قائمة انتظار.',
          )}
        </span>
        {(v.params ?? []).map((p, i) => (
          <div key={i} className="grid grid-cols-1 items-end gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t('Setting', 'الإعداد')}
              <Input
                value={p.label}
                onChange={(e) => setParam(i, { label: e.target.value, key: p.key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') })}
                className="bg-(--surface-card)"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {p.secret
                ? p.value
                  ? t(`Value (set ${p.value}; type to replace)`, `القيمة (مضبوطة ${p.value}؛ اكتب للاستبدال)`)
                  : t('Value (secret)', 'القيمة (سرية)')
                : t('Value', 'القيمة')}
              <Input
                dir="ltr"
                type={p.secret ? 'password' : 'text'}
                autoComplete="off"
                value={p.secret ? (paramSecrets[p.key] ?? '') : p.value}
                onChange={(e) => (p.secret ? setParamSecrets((x) => ({ ...x, [p.key]: e.target.value })) : setParam(i, { value: e.target.value }))}
                className="bg-(--surface-card)"
              />
            </label>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('Remove this setting', 'احذف هذا الإعداد')}
              onClick={() => set({ params: (v.params ?? []).filter((_, j) => j !== i) })}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="self-start bg-(--surface-card)"
          onClick={() => set({ params: [...(v.params ?? []), { key: '', label: '', value: '' }] })}
        >
          <Plus aria-hidden />
          {t('Add a setting', 'أضف إعداداً')}
        </Button>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('Cancel', 'إلغاء')}
        </Button>
        <Button
          size="sm"
          disabled={!ok}
          onClick={() =>
            onSave({
              ...v,
              name: v.name.trim(),
              baseUrl: v.baseUrl.trim() === 'https://' ? '' : v.baseUrl.trim(),
              secretHint: needsSecret ? (hintOf(secret) ?? v.secretHint) : undefined,
              params: (v.params ?? []).filter((p) => p.label.trim()).map((p) => (p.secret ? { ...p, value: hintOf(paramSecrets[p.key] ?? '') ?? p.value } : p)),
            })
          }
        >
          {t('Save', 'حفظ')}
        </Button>
      </div>
    </div>
  )
}

/** 23 Nov: moved from Teams and structure. The CRM fields every customer record must carry for the portal to work. */
function CrmFields() {
  const { t, L } = useI18n()
  const { data: fields } = useCrmFields()
  return (
    <div className="flex flex-col gap-4">
      <InlineNote title={t('What the CRM connections must deliver', 'ما يجب أن تسلّمه اتصالات CRM')}>
        {t(
          'Read from the CRM, not edited here. Environments, agent pools and which agent served which customer all come from the CRM; a new environment appears after the next sync. What each CRM value means in the portal (stages, sources, activity types) is set by the CX manager on the CRM mapping page.',
          'تُقرأ من CRM ولا تُعدَّل هنا. البيئات ومجموعات الموظفين ومن خدم أي عميل كلها من CRM؛ تظهر البيئة الجديدة بعد المزامنة التالية. معنى كل قيمة من CRM في البورتال (المراحل، المصادر، أنواع الأنشطة) يحدده مدير تجربة العملاء في صفحة ربط قيم CRM.',
        )}
      </InlineNote>
      <div className="rounded-2xl border border-line bg-(--surface-card) p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Field', 'الحقل')}</TableHead>
              <TableHead>{t('Used for', 'يُستخدم في')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(fields ?? []).map((f) => (
              <TableRow key={f.field}>
                <TableCell className="font-medium tabular whitespace-normal text-foreground" dir="ltr">
                  {f.field}
                </TableCell>
                <TableCell className="whitespace-normal">{L(f.usedFor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
