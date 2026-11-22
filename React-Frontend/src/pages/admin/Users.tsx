import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link2, MoreHorizontal, RotateCcw, UserPlus } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuth } from '@/auth/session'
import { canManageUsers } from '@/auth/access'
import { useAuditActor } from '@/auth/useAuditActor'
import { ROLE_DEFS, roleDef } from '@/data/roles'
import { envName } from '@/data/environments'
import {
  inviteLink,
  inviteUser,
  reissueInvite,
  removeUser,
  resetUsers,
  setUserRole,
  setUserStatus,
  useUsers,
  type PortalUser,
  type UserStatus,
} from '@/data/users'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { ViewOnlyNotice } from '@/pages/settings/SubPageHeader'
import type { RoleId } from '@/types'

const STATUS_LABEL: Record<UserStatus, { en: string; ar: string }> = {
  invited: { en: 'Invited', ar: 'مدعو' },
  active: { en: 'Active', ar: 'نشط' },
  disabled: { en: 'Deactivated', ar: 'موقوف' },
}

/** Roles an admin can give. The super admin role itself is given here too (a second admin) [Proposed]. */
const INVITABLE_ROLES: readonly RoleId[] = ['cxmgr', 'cxteam', 'envmgmt', 'teamlead', 'aslead', 'marketing', 'auditmkt', 'ld', 'hrspec', 'hrmgr', 'exec', 'shopper', 'admin']

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Users and access (v43, 19 Nov): the super admin's one page. Invite a person by email with a role, copy the invitation link
 * (no email is sent in the prototype), re-invite, change the role, deactivate or reactivate. The CX manager sees the list only.
 */
export default function Users() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const users = useUsers()
  const { log } = useAuditActor()
  const canEdit = canManageUsers(role.id)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleFor, setRoleFor] = useState<PortalUser | null>(null)
  const [lastInvite, setLastInvite] = useState<PortalUser | null>(null)

  const sorted = useMemo(
    () => [...users].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'invited' ? -1 : b.status === 'invited' ? 1 : a.status === 'active' ? -1 : 1)),
    [users],
  )
  const counts = useMemo(
    () => ({ active: users.filter((u) => u.status === 'active').length, invited: users.filter((u) => u.status === 'invited').length, disabled: users.filter((u) => u.status === 'disabled').length }),
    [users],
  )

  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const copyLink = async (u: PortalUser) => {
    const ok = await copy(inviteLink(u))
    toast[ok ? 'success' : 'message'](ok ? t('Invitation link copied.', 'نُسخ رابط الدعوة.') : inviteLink(u))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('Administration', 'الإدارة')}
        title={t('Users and access', 'المستخدمون والصلاحيات')}
        description={t(
          'Who can open the portal and with which role. Invite a person by email; the role decides which pages they see. Nothing here touches customers or cases.',
          'من يستطيع فتح البوابة وبأي دور. ادعُ الشخص بالبريد؛ والدور يحدد الصفحات التي يراها. لا شيء هنا يمسّ العملاء أو الحالات.',
        )}
        actions={
          canEdit && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus aria-hidden />
              {t('Invite a user', 'دعوة مستخدم')}
            </Button>
          )
        }
      />

      {!canEdit && <ViewOnlyNotice>{t('View only. The super admin invites users and changes roles.', 'للعرض فقط. المدير العام للنظام يدعو المستخدمين ويغيّر الأدوار.')}</ViewOnlyNotice>}

      <InlineNote role="note">
        <strong className="font-medium">{t('Prototype.', 'نموذج أولي.')}</strong>{' '}
        <span className="text-muted-foreground">
          {t(
            'No email is sent: copy the invitation link and pass it on. The directory is kept in this browser only. In the real platform the invitation is emailed and sign-in is the company directory.',
            'لا يُرسل بريد: انسخ رابط الدعوة وأرسله بنفسك. الدليل محفوظ في هذا المتصفح فقط. في المنصة الحقيقية تُرسل الدعوة بالبريد ويكون تسجيل الدخول عبر دليل الشركة.',
          )}
        </span>
      </InlineNote>

      {lastInvite && lastInvite.status === 'invited' && (
        <InlineNote role="status" tone="success" title={t(`${lastInvite.name || lastInvite.email} was invited`, `تمت دعوة ${lastInvite.name || lastInvite.email}`)}>
          <span className="text-muted-foreground">{t('Send them this link; it opens the "set up your account" step.', 'أرسل له هذا الرابط؛ يفتح خطوة "إعداد حسابك".')}</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code dir="ltr" className="well max-w-full truncate rounded-md px-2.5 py-1.5 text-xs">
              {inviteLink(lastInvite)}
            </code>
            <Button variant="outline" size="xs" onClick={() => copyLink(lastInvite)}>
              <Link2 aria-hidden />
              {t('Copy link', 'نسخ الرابط')}
            </Button>
          </div>
        </InlineNote>
      )}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="t-h4">{t('Directory', 'الدليل')}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge tone="success">{counts.active} {t('active', 'نشط')}</StatusBadge>
            <StatusBadge tone="info">{counts.invited} {t('invited', 'مدعو')}</StatusBadge>
            {counts.disabled > 0 && <StatusBadge tone="neutral">{counts.disabled} {t('deactivated', 'موقوف')}</StatusBadge>}
          </div>
        </div>

        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('Name', 'الاسم')}</TableHead>
              <TableHead>{t('Email', 'البريد')}</TableHead>
              <TableHead>{t('Role', 'الدور')}</TableHead>
              <TableHead>{t('Status', 'الحالة')}</TableHead>
              <TableHead>{t('Since', 'منذ')}</TableHead>
              {canEdit && <TableHead className="text-end">{t('Actions', 'إجراءات')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((u) => {
              const r = roleDef(u.roleId)
              const me = session?.userId === u.id
              return (
                <TableRow key={u.id} data-status={u.status}>
                  <TableCell className="font-medium text-foreground">
                    {u.name || <span className="text-muted-foreground">{t('(name not set yet)', '(الاسم لم يُحدد بعد)')}</span>}
                    {me && <span className="ms-2 text-xs text-muted-foreground">{t('(you)', '(أنت)')}</span>}
                  </TableCell>
                  <TableCell className="tabular" dir="ltr">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col">
                      <span className="text-foreground">{r ? L(r.name) : u.roleId}</span>
                      {r?.envId && <span className="text-xs text-muted-foreground">{L(envName(r.envId))}</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={u.status === 'active' ? 'success' : u.status === 'invited' ? 'info' : 'neutral'} dot={u.status !== 'disabled'}>
                      {L(STATUS_LABEL[u.status])}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">{dateFmt.format(new Date(u.activatedAt ?? u.invitedAt))}</TableCell>
                  {canEdit && (
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        {u.status === 'invited' && (
                          <Button variant="outline" size="xs" onClick={() => copyLink(u)}>
                            <Link2 aria-hidden />
                            {t('Copy link', 'نسخ الرابط')}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={t(`More actions: ${u.email}`, `إجراءات أخرى: ${u.email}`)}>
                              <MoreHorizontal aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="truncate font-normal text-muted-foreground" dir="ltr">
                              {u.email}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={me} onSelect={() => setRoleFor(u)}>
                              {t('Change role', 'تغيير الدور')}
                            </DropdownMenuItem>
                            {u.status !== 'active' && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  const next = reissueInvite(u.id)
                                  if (next) {
                                    log('user_reinvited', { en: `Re-invited ${next.email}`, ar: `أعاد دعوة ${next.email}` })
                                    setLastInvite(next)
                                    toast.success(t('New invitation link issued; the old one no longer works.', 'صدر رابط دعوة جديد؛ القديم لم يعد يعمل.'))
                                  }
                                }}
                              >
                                {t('Re-invite (new link)', 'إعادة الدعوة (رابط جديد)')}
                              </DropdownMenuItem>
                            )}
                            {u.status === 'active' && (
                              <DropdownMenuItem
                                disabled={me}
                                onSelect={() => {
                                  setUserStatus(u.id, 'disabled')
                                  log('user_deactivated', { en: `Deactivated ${u.email}`, ar: `أوقف ${u.email}` })
                                  toast.success(t('Deactivated. They cannot sign in until reactivated.', 'تم الإيقاف. لا يستطيع تسجيل الدخول حتى إعادة التفعيل.'))
                                }}
                              >
                                {t('Deactivate', 'إيقاف')}
                              </DropdownMenuItem>
                            )}
                            {u.status === 'disabled' && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  setUserStatus(u.id, 'active')
                                  log('user_reactivated', { en: `Reactivated ${u.email}`, ar: `أعاد تفعيل ${u.email}` })
                                  toast.success(t('Reactivated.', 'أُعيد التفعيل.'))
                                }}
                              >
                                {t('Reactivate', 'إعادة التفعيل')}
                              </DropdownMenuItem>
                            )}
                            {u.status === 'invited' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={() => {
                                    removeUser(u.id)
                                    log('invite_withdrawn', { en: `Withdrew the invitation of ${u.email}`, ar: `سحب دعوة ${u.email}` })
                                    if (lastInvite?.id === u.id) setLastInvite(null)
                                    toast.success(t('Invitation withdrawn.', 'سُحبت الدعوة.'))
                                  }}
                                >
                                  {t('Withdraw invitation', 'سحب الدعوة')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {canEdit && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                resetUsers()
                log('users_reset', { en: 'Restored the sample directory', ar: 'أعاد الدليل النموذجي' })
                setLastInvite(null)
                toast.success(t('Sample directory restored.', 'أُعيد الدليل النموذجي.'))
              }}
            >
              <RotateCcw aria-hidden />
              {t('Reset sample users', 'إعادة المستخدمين النموذجيين')}
            </Button>
          </div>
        )}
      </Card>

      {inviteOpen && (
        <InviteDialog
          invitedBy={session?.userId}
          onClose={() => setInviteOpen(false)}
          onInvited={(u) => {
            log('user_invited', { en: `Invited ${u.email} as ${roleDef(u.roleId)?.name.en ?? u.roleId}`, ar: `دعا ${u.email} بصفة ${roleDef(u.roleId)?.name.ar ?? u.roleId}` })
            setLastInvite(u)
            setInviteOpen(false)
          }}
        />
      )}
      {roleFor && (
        <ChangeRoleDialog
          user={roleFor}
          onClose={() => setRoleFor(null)}
          onChanged={(r) => log('user_role_changed', { en: `Changed ${roleFor.email} to ${roleDef(r)?.name.en ?? r}`, ar: `غيّر ${roleFor.email} إلى ${roleDef(r)?.name.ar ?? r}` })}
        />
      )}
    </div>
  )
}

function RoleSelect({ value, onChange, id }: { value: RoleId; onChange: (r: RoleId) => void; id?: string }) {
  const { L } = useI18n()
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RoleId)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-80">
        {INVITABLE_ROLES.map((id) => {
          const r = ROLE_DEFS.find((d) => d.id === id)!
          return (
            <SelectItem key={id} value={id}>
              {L(r.name)}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

function InviteDialog({ invitedBy, onClose, onInvited }: { invitedBy?: string; onClose: () => void; onInvited: (u: PortalUser) => void }) {
  const { t, L } = useI18n()
  const [roleId, setRoleId] = useState<RoleId>('cxteam')
  const [error, setError] = useState<string | null>(null)
  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().trim().max(40, t('Use 40 characters or fewer.', 'استخدم 40 حرفاً أو أقل.')),
        lastName: z.string().trim().max(40, t('Use 40 characters or fewer.', 'استخدم 40 حرفاً أو أقل.')),
        email: z.email({ error: t('Enter a valid work email.', 'أدخل بريداً وظيفياً صالحاً.') }),
      }),
    [t],
  )
  type FormValues = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { firstName: '', lastName: '', email: '' } })
  const def = roleDef(roleId)

  const onValid = (v: FormValues) => {
    const res = inviteUser({ email: v.email, name: `${v.firstName} ${v.lastName}`.trim(), roleId, invitedBy })
    if (!res.ok) {
      setError(res.reason === 'exists' ? t('This email already has an account.', 'هذا البريد له حساب بالفعل.') : t('Enter a valid work email.', 'أدخل بريداً وظيفياً صالحاً.'))
      return
    }
    toast.success(t('Invitation created.', 'أُنشئت الدعوة.'))
    onInvited(res.user)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form noValidate onSubmit={handleSubmit(onValid)} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t('Invite a user', 'دعوة مستخدم')}</DialogTitle>
            <DialogDescription>{t('They get a link, set a password and land on the pages their role allows.', 'يصله رابط، يضع كلمة مرور، ويصل إلى الصفحات التي يسمح بها دوره.')}</DialogDescription>
          </DialogHeader>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="invite-email">{t('Work email', 'البريد الوظيفي')}</FieldLabel>
            <Input id="invite-email" type="email" inputMode="email" dir="ltr" autoFocus aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="invite-first">{t('First name (optional)', 'الاسم الأول (اختياري)')}</FieldLabel>
              <Input id="invite-first" maxLength={40} aria-invalid={!!errors.firstName} {...register('firstName')} />
              {errors.firstName && <FieldError>{errors.firstName.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="invite-last">{t('Last name (optional)', 'اسم العائلة (اختياري)')}</FieldLabel>
              <Input id="invite-last" maxLength={40} aria-invalid={!!errors.lastName} {...register('lastName')} />
              {errors.lastName && <FieldError>{errors.lastName.message}</FieldError>}
            </Field>
          </div>
          <FieldDescription>
            {t('Only the email is required. The person enters their own first and last name when they accept the invitation, and it appears next to their email in the audit log.', 'البريد وحده مطلوب. يدخل الشخص اسمه الأول واسم عائلته بنفسه عند قبول الدعوة، ويظهر بجانب بريده في سجل التدقيق.')}
          </FieldDescription>

          <Field>
            <FieldLabel htmlFor="invite-role">{t('Role', 'الدور')}</FieldLabel>
            <RoleSelect id="invite-role" value={roleId} onChange={setRoleId} />
            {def && <FieldDescription>{L(def.description)}</FieldDescription>}
          </Field>

          {error && (
            <InlineNote role="status" tone="error">
              {error}
            </InlineNote>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button type="submit">
              <UserPlus aria-hidden />
              {t('Create invitation', 'إنشاء الدعوة')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChangeRoleDialog({ user, onClose, onChanged }: { user: PortalUser; onClose: () => void; onChanged: (r: RoleId) => void }) {
  const { t, L } = useI18n()
  const [roleId, setRoleId] = useState<RoleId>(user.roleId)
  const def = roleDef(roleId)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Change role', 'تغيير الدور')}</DialogTitle>
          <DialogDescription dir="ltr" className="text-start">
            {user.email}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="change-role">{t('Role', 'الدور')}</FieldLabel>
          <RoleSelect id="change-role" value={roleId} onChange={setRoleId} />
          {def && <FieldDescription>{L(def.description)}</FieldDescription>}
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Cancel', 'إلغاء')}
          </Button>
          <Button
            type="button"
            disabled={roleId === user.roleId}
            onClick={() => {
              setUserRole(user.id, roleId)
              onChanged(roleId)
              toast.success(t('Role changed; it applies at their next sign-in.', 'تغيّر الدور؛ يسري عند تسجيل الدخول القادم.'))
              onClose()
            }}
          >
            {t('Save', 'حفظ')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
