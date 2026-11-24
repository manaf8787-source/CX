import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { canManageUsers } from '@/auth/access'
import { roleDef } from '@/data/roles'
import { useUsers } from '@/data/users'
import { customRoleLabel } from '@/data/customRoles'
import { AUDIT_KIND_LABEL, clearAudit, useAuditLog, type AuditEntry, type AuditKind } from '@/data/auditLog'
import { downloadCsv } from '@/utils/csv'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { EmptyState } from '@/components/common/EmptyState'
import { ViewOnlyNotice } from '@/pages/settings/SubPageHeader'

type KindFilter = 'all' | 'access' | 'pages' | 'admin' | 'actions'

const KIND_GROUP: Record<AuditKind, Exclude<KindFilter, 'all'>> = {
  sign_in: 'access',
  sign_out: 'access',
  invite_accepted: 'access',
  page_opened: 'pages',
  user_invited: 'admin',
  user_reinvited: 'admin',
  user_role_changed: 'admin',
  user_deactivated: 'admin',
  user_reactivated: 'admin',
  invite_withdrawn: 'admin',
  users_reset: 'admin',
  action: 'actions',
}

const ALL = 'all'
const PAGE = 100

/** Local calendar day as YYYY-MM-DD (the date filter compares days, not instants). */
function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Audit log (v43, 19 Nov): one line per thing a person did — signed in, opened a page, invited someone — with the date, the day and the
 * time, filtered by person, kind and day. Newest first. The super admin reads it; nothing here can be edited.
 */
export default function AuditLog() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const entries = useAuditLog()
  const users = useUsers()
  const canClear = canManageUsers(role.id)
  const [who, setWho] = useState<string>(ALL)
  const [kind, setKind] = useState<KindFilter>('all')
  const [day, setDay] = useState('')
  const [shown, setShown] = useState(PAGE)

  const locale = lang === 'ar' ? 'ar-AE' : 'en-GB'
  const fmtDate = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }), [locale])
  const fmtDay = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long' }), [locale])
  const fmtTime = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }), [locale])

  // people who appear in the log, even if they were since removed from the directory
  const people = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of entries) if (!map.has(e.userId)) map.set(e.userId, e.email)
    for (const u of users) if (!map.has(u.id)) map.set(u.id, u.email)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [entries, users])

  const filtered = useMemo(
    () => entries.filter((e) => (who === ALL || e.userId === who) && (kind === 'all' || KIND_GROUP[e.kind] === kind) && (!day || dayKey(e.at) === day)),
    [entries, who, kind, day],
  )
  const visible = filtered.slice(0, shown)
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name
  const roleText = (e: AuditEntry, lang2: 'en' | 'ar') =>
    e.roleId === 'custom' ? customRoleLabel(users.find((u) => u.id === e.userId)?.customRoleId) : (roleDef(e.roleId)?.name[lang2] ?? e.roleId)

  const exportCsv = () => {
    downloadCsv(
      `audit-log-${dayKey(new Date().toISOString())}.csv`,
      filtered.map((e) => ({
        date: fmtDate.format(new Date(e.at)),
        day: fmtDay.format(new Date(e.at)),
        time: fmtTime.format(new Date(e.at)),
        name: nameOf(e.userId) ?? '',
        email: e.email,
        role: roleText(e, lang),
        event: L(AUDIT_KIND_LABEL[e.kind]),
        detail: L(e.detail),
        path: e.path,
        timestamp: e.at,
      })),
    )
  }

  const kindTone = (k: AuditKind) =>
    KIND_GROUP[k] === 'access' ? 'info' : KIND_GROUP[k] === 'admin' ? 'warning' : KIND_GROUP[k] === 'actions' ? 'success' : 'neutral'

  const kindOptions: { value: KindFilter; label: string }[] = [
    { value: 'all', label: t('All events', 'كل الأحداث') },
    { value: 'access', label: t('Sign-ins and invitations', 'الدخول والدعوات') },
    { value: 'pages', label: t('Pages opened', 'الصفحات المفتوحة') },
    { value: 'admin', label: t('User administration', 'إدارة المستخدمين') },
    { value: 'actions', label: t('Actions taken', 'الإجراءات المنفذة') },
  ]

  const rowFor = (e: AuditEntry) => {
    const at = new Date(e.at)
    return (
      <TableRow key={e.id}>
        <TableCell className="tabular whitespace-nowrap text-foreground">{fmtDate.format(at)}</TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDay.format(at)}</TableCell>
        <TableCell className="tabular whitespace-nowrap text-foreground" dir="ltr">
          {fmtTime.format(at)}
        </TableCell>
        <TableCell>
          <span className="flex flex-col">
            {nameOf(e.userId) && <span className="font-medium text-foreground">{nameOf(e.userId)}</span>}
            <span className="tabular text-foreground" dir="ltr">
              {e.email}
            </span>
            <span className="text-xs text-muted-foreground">{roleText(e, lang)}</span>
          </span>
        </TableCell>
        <TableCell>
          <StatusBadge tone={kindTone(e.kind)} dot={KIND_GROUP[e.kind] !== 'admin'}>
            {L(AUDIT_KIND_LABEL[e.kind])}
          </StatusBadge>
        </TableCell>
        <TableCell className="text-foreground">
          {L(e.detail)}
          {e.kind === 'page_opened' && (
            <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
              {e.path}
            </span>
          )}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div data-fluid-page className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('Administration', 'الإدارة')}
        title={t('Audit log', 'سجل التدقيق')}
        description={t(
          'Every sign-in, every page opened and every administrative change, per person, with the date, the day and the time. Newest first. Nothing here can be edited.',
          'كل تسجيل دخول وكل صفحة فُتحت وكل تغيير إداري، لكل شخص، مع التاريخ واليوم والساعة. الأحدث أولاً. لا شيء هنا قابل للتعديل.',
        )}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download aria-hidden />
            {t('Download CSV', 'تنزيل CSV')}
          </Button>
        }
      />

      {!canClear && <ViewOnlyNotice>{t('View only.', 'للعرض فقط.')}</ViewOnlyNotice>}

      <InlineNote role="note">
        <span className="text-muted-foreground">
          {t(
            'The log is kept in this browser only and records what happens in it. In the real platform every entry is written on the server, cannot be deleted, and CX actions (approving a fix, closing a case) are logged there too.',
            'السجل محفوظ في هذا المتصفح فقط ويسجّل ما يحدث فيه. في المنصة الحقيقية يُكتب كل سطر على الخادم ولا يُحذف، وتُسجّل فيه إجراءات CX أيضاً (اعتماد حل، إغلاق حالة).',
          )}
        </span>
      </InlineNote>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-56 flex-col gap-1.5">
            <span className="t-small-strong">{t('Person', 'الشخص')}</span>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger className="h-9" aria-label={t('Person', 'الشخص')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80">
                <SelectItem value={ALL}>{t('Everyone', 'الجميع')}</SelectItem>
                {people.map(([id, email]) => (
                  <SelectItem key={id} value={id}>
                    <span dir="ltr">{email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-52 flex-col gap-1.5">
            <span className="t-small-strong">{t('Event', 'الحدث')}</span>
            <Select value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
              <SelectTrigger className="h-9" aria-label={t('Event', 'الحدث')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {kindOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="audit-day" className="t-small-strong">
              {t('Day', 'اليوم')}
            </label>
            <Input id="audit-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} className="h-9 w-44" dir="ltr" />
          </div>
          {(who !== ALL || kind !== 'all' || day) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setWho(ALL)
                setKind('all')
                setDay('')
              }}
            >
              {t('Clear filters', 'مسح الفلاتر')}
            </Button>
          )}
          <span className="ms-auto text-sm text-muted-foreground">
            {t(`${filtered.length} of ${entries.length} entries`, `${filtered.length} من ${entries.length} سطراً`)}
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={t('Nothing recorded yet', 'لا شيء مسجّل بعد')}
            note={t(
              'Sign-ins, pages and administrative changes appear here as they happen.',
              'تظهر هنا تسجيلات الدخول والصفحات والتغييرات الإدارية فور حدوثها.',
            )}
          />
        ) : (
          <>
            <Table density="comfortable">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Date', 'التاريخ')}</TableHead>
                  <TableHead>{t('Day', 'اليوم')}</TableHead>
                  <TableHead>{t('Time', 'الساعة')}</TableHead>
                  <TableHead>{t('Who', 'من')}</TableHead>
                  <TableHead>{t('Event', 'الحدث')}</TableHead>
                  <TableHead>{t('Detail', 'التفصيل')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{visible.map(rowFor)}</TableBody>
            </Table>
            {filtered.length > shown && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)}>
                  {t(`Show ${Math.min(PAGE, filtered.length - shown)} more`, `عرض ${Math.min(PAGE, filtered.length - shown)} أخرى`)}
                </Button>
              </div>
            )}
          </>
        )}
        {canClear && entries.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                clearAudit()
                toast.success(t('Log cleared (prototype only).', 'مُسح السجل (نموذج أولي فقط).'))
              }}
            >
              <Trash2 aria-hidden />
              {t('Clear the log (prototype only)', 'مسح السجل (نموذج أولي فقط)')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
