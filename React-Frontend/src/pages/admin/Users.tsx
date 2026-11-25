import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link2, MoreHorizontal, RotateCcw, UserPlus } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuth } from '@/auth/session'
import { canManageAdmins, canManageUsers } from '@/auth/access'
import { useCallAssignments } from '@/data/callAssignments'
import { useDetractorCallItems } from '@/services/queries'
import { useAuditActor } from '@/auth/useAuditActor'
import { ROLE_DEFS, roleDef } from '@/data/roles'
import { SCREEN_CATALOG, customRoleLabel, deleteCustomRole, saveCustomRole, useCustomRoles, type CustomRole, type ScreenLevel } from '@/data/customRoles'
import { ENVIRONMENTS, envName } from '@/data/environments'
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
import type { EnvId, RoleId } from '@/types'

const STATUS_LABEL: Record<UserStatus, { en: string; ar: string }> = {
  invited: { en: 'Invited', ar: 'مدعو' },
  active: { en: 'Active', ar: 'نشط' },
  disabled: { en: 'Deactivated', ar: 'موقوف' },
}

/** Roles an admin can give from the list. The super admin role is not on it (22 Nov, owner): anything else is a custom role built below. */
const INVITABLE_ROLES: readonly RoleId[] = [
  'cxmgr',
  'cxteam',
  'envmgmt',
  'teamlead',
  'aslead',
  'marketing',
  'auditmkt',
  'ld',
  'hrspec',
  'hrmgr',
  'exec',
  'shopper',
]

const NEW_ROLE = '__new'
type Draft = { name: string; screens: Record<string, ScreenLevel> }
const EMPTY_DRAFT: Draft = { name: '', screens: {} }

/** What a picked role means: a ready-made role id, or a custom role (an existing one, or the draft saved now). */
function resolveRole(choice: string, draft: Draft): { ok: true; roleId: RoleId; customRoleId?: string } | { ok: false; error: { en: string; ar: string } } {
  if (choice === NEW_ROLE) {
    const name = draft.name.trim()
    const screens = Object.fromEntries(Object.entries(draft.screens).filter(([, l]) => l !== 'none')) as CustomRole['screens']
    if (name.length < 2)
      return {
        ok: false,
        error: { en: 'Name the new role.', ar: 'سمِّ الدور الجديد.' },
      }
    if (!Object.keys(screens).length)
      return {
        ok: false,
        error: {
          en: 'Give the role at least one screen.',
          ar: 'امنح الدور شاشة واحدة على الأقل.',
        },
      }
    return {
      ok: true,
      roleId: 'custom',
      customRoleId: saveCustomRole({ name, screens }).id,
    }
  }
  if (choice.startsWith('custom:')) return { ok: true, roleId: 'custom', customRoleId: choice.slice(7) }
  return { ok: true, roleId: choice as RoleId }
}

/** The role's name as shown for a person: a custom role by the name the admin gave it. */
function roleLabelOf(u: Pick<PortalUser, 'roleId' | 'customRoleId' | 'envId'>, L: (b: { en: string; ar: string }) => string): string {
  if (u.roleId === 'custom') return customRoleLabel(u.customRoleId)
  if (u.roleId === 'envmgmt') return `${L(envName(u.envId ?? 'dub'))} – CEO`
  const r = roleDef(u.roleId)
  return r ? L(r.name) : u.roleId
}

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
  const [leaving, setLeaving] = useState<PortalUser | null>(null)
  const assignments = useCallAssignments()
  const { data: callItems } = useDetractorCallItems()
  // open cases the person holds: they stay with them until the manager moves them, so the dialog says so
  const heldBy = (id: string) => (callItems ?? []).filter((i) => !i.outcome && i.status !== 'done' && assignments[i.id]?.userId === id).length
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleFor, setRoleFor] = useState<PortalUser | null>(null)
  const [lastInvite, setLastInvite] = useState<PortalUser | null>(null)

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) =>
        a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'invited' ? -1 : b.status === 'invited' ? 1 : a.status === 'active' ? -1 : 1,
      ),
    [users],
  )
  const counts = useMemo(
    () => ({
      active: users.filter((u) => u.status === 'active').length,
      invited: users.filter((u) => u.status === 'invited').length,
      disabled: users.filter((u) => u.status === 'disabled').length,
    }),
    [users],
  )

  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

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

      {!canEdit && (
        <ViewOnlyNotice>
          {t('View only. The super admin invites users and changes roles.', 'للعرض فقط. المدير العام للنظام يدعو المستخدمين ويغيّر الأدوار.')}
        </ViewOnlyNotice>
      )}

      {lastInvite && lastInvite.status === 'invited' && (
        <InlineNote
          role="status"
          tone="success"
          title={t(`${lastInvite.name || lastInvite.email} was invited`, `تمت دعوة ${lastInvite.name || lastInvite.email}`)}
        >
          <span className="text-muted-foreground">
            {t('Send them this link; it opens the "set up your account" step.', 'أرسل له هذا الرابط؛ يفتح خطوة "إعداد حسابك".')}
          </span>
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

      <Card className="flex flex-col gap-4 px-(--card-pad)">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="t-h4">{t('Directory', 'الدليل')}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge tone="success">
              {counts.active} {t('active', 'نشط')}
            </StatusBadge>
            <StatusBadge tone="info">
              {counts.invited} {t('invited', 'مدعو')}
            </StatusBadge>
            {counts.disabled > 0 && (
              <StatusBadge tone="neutral">
                {counts.disabled} {t('deactivated', 'موقوف')}
              </StatusBadge>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  resetUsers()
                  log('users_reset', {
                    en: 'Restored the sample directory',
                    ar: 'أعاد الدليل النموذجي',
                  })
                  setLastInvite(null)
                  toast.success(t('Sample directory restored.', 'أُعيد الدليل النموذجي.'))
                }}
              >
                <RotateCcw aria-hidden />
                {t('Reset sample users', 'إعادة المستخدمين النموذجيين')}
              </Button>
            )}
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
                  <TableCell className="tabular">
                    <span dir="ltr">{u.email}</span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col">
                      <span className="text-foreground">{roleLabelOf(u, L)}</span>
                      {r?.envId && <span className="text-xs text-muted-foreground">{L(envName(u.envId ?? r.envId))}</span>}
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
                      {(u.roleId === 'admin' || u.roleId === 'useradmin') && !canManageAdmins(role.id) ? (
                        <span className="text-xs text-muted-foreground">{t('Only the super admin', 'المدير العام فقط')}</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {u.status === 'active' && !me && (
                            <Button variant="outline" size="xs" className="text-(--status-error-text)" onClick={() => setLeaving(u)}>
                              {t('Deactivate', 'إيقاف')}
                            </Button>
                          )}
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
                              <DropdownMenuItem disabled={me || u.roleId === 'admin'} onSelect={() => setRoleFor(u)}>
                                {t('Change role', 'تغيير الدور')}
                              </DropdownMenuItem>
                              {u.status !== 'active' && (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    const next = reissueInvite(u.id)
                                    if (next) {
                                      log('user_reinvited', {
                                        en: `Re-invited ${next.email}`,
                                        ar: `أعاد دعوة ${next.email}`,
                                      })
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
                                  variant="destructive"
                                  onSelect={() => {
                                    setUserStatus(u.id, 'disabled')
                                    log('user_deactivated', {
                                      en: `Deactivated ${u.email}`,
                                      ar: `أوقف ${u.email}`,
                                    })
                                    toast.success(
                                      t('Deactivated. They cannot sign in until reactivated.', 'تم الإيقاف. لا يستطيع تسجيل الدخول حتى إعادة التفعيل.'),
                                    )
                                  }}
                                >
                                  {t('Deactivate', 'إيقاف')}
                                </DropdownMenuItem>
                              )}
                              {u.status === 'disabled' && (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setUserStatus(u.id, 'active')
                                    log('user_reactivated', {
                                      en: `Reactivated ${u.email}`,
                                      ar: `أعاد تفعيل ${u.email}`,
                                    })
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
                                      log('invite_withdrawn', {
                                        en: `Withdrew the invitation of ${u.email}`,
                                        ar: `سحب دعوة ${u.email}`,
                                      })
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
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <CustomRolesCard canEdit={canEdit} />

      {leaving && (
        <Dialog open onOpenChange={(o) => !o && setLeaving(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('Deactivate this person?', 'إيقاف هذا الشخص؟')}</DialogTitle>
              <DialogDescription>
                {t(
                  `${leaving.name || leaving.email} will be signed out now and cannot sign in again. Nothing is deleted: their history stays in the audit log, and you can reactivate them later. Use this when someone resigns or leaves.`,
                  `سيُسجَّل ${leaving.name || leaving.email} خروجه الآن ولن يستطيع الدخول مجدداً. لا يُحذف شيء: يبقى سجله في سجل التدقيق ويمكنك إعادة تفعيله لاحقاً. استخدم هذا عند الاستقالة أو المغادرة.`,
                )}
              </DialogDescription>
            </DialogHeader>
            {heldBy(leaving.id) > 0 && (
              <InlineNote role="status" tone="warning">
                {t(
                  `${heldBy(leaving.id)} open call ${heldBy(leaving.id) === 1 ? 'case is' : 'cases are'} with them. After deactivating, the CX manager sees them flagged on Close the loop and moves them to someone else.`,
                  `${heldBy(leaving.id)} حالة اتصال مفتوحة لديه. بعد الإيقاف يراها مدير CX مميّزة في «إغلاق الحلقة» وينقلها إلى شخص آخر.`,
                )}
              </InlineNote>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLeaving(null)}>
                {t('Cancel', 'إلغاء')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setUserStatus(leaving.id, 'disabled')
                  log('user_deactivated', {
                    en: `Deactivated ${leaving.email}`,
                    ar: `أوقف ${leaving.email}`,
                  })
                  toast.success(
                    t(
                      'Deactivated. They are signed out and cannot sign in until reactivated.',
                      'تم الإيقاف. خرج من النظام ولا يستطيع الدخول حتى إعادة التفعيل.',
                    ),
                  )
                  setLeaving(null)
                }}
              >
                {t('Deactivate', 'إيقاف')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {inviteOpen && (
        <InviteDialog
          invitedBy={session?.userId}
          onClose={() => setInviteOpen(false)}
          onInvited={(u) => {
            log('user_invited', {
              en: `Invited ${u.email} as ${roleLabelOf(u, (b) => b.en)}`,
              ar: `دعا ${u.email} بصفة ${roleLabelOf(u, (b) => b.ar)}`,
            })
            setLastInvite(u)
            setInviteOpen(false)
          }}
        />
      )}
      {roleFor && (
        <ChangeRoleDialog
          user={roleFor}
          onClose={() => setRoleFor(null)}
          onChanged={(label) =>
            log('user_role_changed', {
              en: `Changed ${roleFor.email} to ${label}`,
              ar: `غيّر ${roleFor.email} إلى ${label}`,
            })
          }
        />
      )}
    </div>
  )
}

/** Which of the three environments an Environment manager looks after. */
function EnvPicker({ value, onChange }: { value: EnvId; onChange: (v: EnvId) => void }) {
  const { t, L } = useI18n()
  return (
    <Field>
      <FieldLabel htmlFor="env-pick">{t('Environment', 'البيئة')}</FieldLabel>
      <Select value={value} onValueChange={(v) => onChange(v as EnvId)}>
        <SelectTrigger id="env-pick" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {ENVIRONMENTS.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {L(e.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>
        {t('They see only the people, cases and agents of this environment.', 'يرى الأشخاص والحالات والوكلاء في هذه البيئة فقط.')}
      </FieldDescription>
    </Field>
  )
}

function RoleSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const { t, L } = useI18n()
  const custom = useCustomRoles()
  const { role } = useRole()
  const ids: readonly RoleId[] = canManageAdmins(role.id) ? ['useradmin', ...INVITABLE_ROLES] : INVITABLE_ROLES
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-80">
        {ids.map((rid) => {
          const r = ROLE_DEFS.find((d) => d.id === rid)!
          return (
            <SelectItem key={rid} value={rid}>
              {L(r.name)}
            </SelectItem>
          )
        })}
        {custom.map((c) => (
          <SelectItem key={c.id} value={`custom:${c.id}`}>
            {c.name} · {t('custom', 'مخصص')}
          </SelectItem>
        ))}
        <SelectItem value={NEW_ROLE}>{t('Other: build a new role…', 'أخرى: ابنِ دوراً جديداً…')}</SelectItem>
      </SelectContent>
    </Select>
  )
}

/** The screens, one row each, with No access / View only / Can edit. Used for a new role and when editing one. */
function ScreenPicker({ screens, onChange }: { screens: Record<string, ScreenLevel>; onChange: (next: Record<string, ScreenLevel>) => void }) {
  const { t, L } = useI18n()
  const { role } = useRole()
  const canSeeAdminScreens = canManageAdmins(role.id)
  const levels: { v: ScreenLevel; en: string; ar: string }[] = [
    { v: 'none', en: 'No access', ar: 'لا وصول' },
    { v: 'view', en: 'View only', ar: 'عرض فقط' },
    { v: 'edit', en: 'Can edit', ar: 'يعدّل' },
  ]
  return (
    <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-xl border border-line p-3" role="group" aria-label={t('Screens', 'الشاشات')}>
      {SCREEN_CATALOG.filter((g) => canSeeAdminScreens || !g.screens.some((sc) => sc.path.startsWith('/admin'))).map((g) => (
        <div key={g.label.en} className="flex flex-col gap-1.5">
          <span className="t-small-strong text-muted-foreground">{L(g.label)}</span>
          {g.screens.map((sc) => {
            const cur = screens[sc.path] ?? 'none'
            return (
              <div key={sc.path} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-foreground">{L(sc.label)}</span>
                <span className="inline-flex gap-1" role="radiogroup" aria-label={L(sc.label)}>
                  {levels.map((l) => (
                    <button
                      key={l.v}
                      type="button"
                      role="radio"
                      aria-checked={cur === l.v}
                      onClick={() => onChange({ ...screens, [sc.path]: l.v })}
                      className={`rounded-full px-2.5 py-1 text-xs outline-hidden transition-colors focus-visible:ring-2 ${cur === l.v ? 'bg-foreground text-background' : 'bg-(--surface-well) text-muted-foreground hover:text-foreground'}`}
                    >
                      {t(l.en, l.ar)}
                    </button>
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** Shown when "Other: build a new role" is picked: the name, then the screens. */
function NewRoleFields({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="new-role-name">{t('Role name', 'اسم الدور')}</FieldLabel>
        <Input
          id="new-role-name"
          maxLength={40}
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder={t('For example: Admin', 'مثال: مسؤول')}
        />
      </Field>
      <Field>
        <FieldLabel>{t('What this role can do, screen by screen', 'ما يستطيعه هذا الدور، شاشة بشاشة')}</FieldLabel>
        <ScreenPicker screens={draft.screens} onChange={(screens) => onChange({ ...draft, screens })} />
        <FieldDescription>{t('The role is saved and can be given to more people later.', 'يُحفظ الدور ويمكن منحه لأشخاص آخرين لاحقاً.')}</FieldDescription>
      </Field>
    </div>
  )
}

function InviteDialog({ invitedBy, onClose, onInvited }: { invitedBy?: string; onClose: () => void; onInvited: (u: PortalUser) => void }) {
  const { t, L } = useI18n()
  const [choice, setChoice] = useState<string>('cxteam')
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [env, setEnv] = useState<EnvId>('dub')
  const [error, setError] = useState<string | null>(null)
  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().trim().max(40, t('Use 40 characters or fewer.', 'استخدم 40 حرفاً أو أقل.')),
        lastName: z.string().trim().max(40, t('Use 40 characters or fewer.', 'استخدم 40 حرفاً أو أقل.')),
        email: z.email({
          error: t('Enter a valid work email.', 'أدخل بريداً وظيفياً صالحاً.'),
        }),
      }),
    [t],
  )
  type FormValues = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  })
  const def = choice === NEW_ROLE || choice.startsWith('custom:') ? undefined : roleDef(choice as RoleId)

  const onValid = (v: FormValues) => {
    const picked = resolveRole(choice, draft)
    if (!picked.ok) {
      setError(L(picked.error))
      return
    }
    const res = inviteUser({
      email: v.email,
      name: `${v.firstName} ${v.lastName}`.trim(),
      roleId: picked.roleId,
      customRoleId: picked.customRoleId,
      envId: env,
      invitedBy,
    })
    if (!res.ok) {
      setError(
        res.reason === 'exists'
          ? t('This email already has an account.', 'هذا البريد له حساب بالفعل.')
          : t('Enter a valid work email.', 'أدخل بريداً وظيفياً صالحاً.'),
      )
      return
    }
    toast.success(t('Invitation created.', 'أُنشئت الدعوة.'))
    onInvited(res.user)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <form noValidate onSubmit={handleSubmit(onValid)} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t('Invite a user', 'دعوة مستخدم')}</DialogTitle>
            <DialogDescription>
              {t('They get a link, set a password and land on the pages their role allows.', 'يصله رابط، يضع كلمة مرور، ويصل إلى الصفحات التي يسمح بها دوره.')}
            </DialogDescription>
          </DialogHeader>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="invite-email">
              {t('Work email', 'البريد الوظيفي')}
              <span aria-hidden className="text-(--status-error-text)">
                *
              </span>
            </FieldLabel>
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
          <Field>
            <FieldLabel htmlFor="invite-role">{t('Role', 'الدور')}</FieldLabel>
            <RoleSelect id="invite-role" value={choice} onChange={setChoice} />
            {def && <FieldDescription>{L(def.description)}</FieldDescription>}
          </Field>
          {choice === 'envmgmt' && <EnvPicker value={env} onChange={setEnv} />}
          {choice === NEW_ROLE && <NewRoleFields draft={draft} onChange={setDraft} />}

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

function ChangeRoleDialog({ user, onClose, onChanged }: { user: PortalUser; onClose: () => void; onChanged: (label: string) => void }) {
  const { t, L } = useI18n()
  const current = user.roleId === 'custom' ? `custom:${user.customRoleId}` : user.roleId
  const [choice, setChoice] = useState<string>(current)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [env, setEnv] = useState<EnvId>(user.envId ?? 'dub')
  const [error, setError] = useState<string | null>(null)
  const def = choice === NEW_ROLE || choice.startsWith('custom:') ? undefined : roleDef(choice as RoleId)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Change role', 'تغيير الدور')}</DialogTitle>
          <DialogDescription dir="ltr" className="text-start">
            {user.email}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="change-role">{t('Role', 'الدور')}</FieldLabel>
          <RoleSelect id="change-role" value={choice} onChange={setChoice} />
          {def && <FieldDescription>{L(def.description)}</FieldDescription>}
        </Field>
        {choice === 'envmgmt' && <EnvPicker value={env} onChange={setEnv} />}
        {choice === NEW_ROLE && <NewRoleFields draft={draft} onChange={setDraft} />}
        {error && (
          <InlineNote role="status" tone="error">
            {error}
          </InlineNote>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Cancel', 'إلغاء')}
          </Button>
          <Button
            type="button"
            disabled={choice === current}
            onClick={() => {
              const picked = resolveRole(choice, draft)
              if (!picked.ok) {
                setError(L(picked.error))
                return
              }
              setUserRole(user.id, picked.roleId, picked.customRoleId, env)
              onChanged(roleLabelOf(picked, L))
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

/** The custom roles built so far: edit the screens of one, or delete one nobody uses. */
function CustomRolesCard({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n()
  const roles = useCustomRoles()
  const users = useUsers()
  const { log } = useAuditActor()
  const [editing, setEditing] = useState<CustomRole | null>(null)
  if (!roles.length) return null
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="t-h4">{t('Custom roles', 'الأدوار المخصصة')}</h2>
      <ul className="flex flex-col divide-y divide-line">
        {roles.map((r) => {
          const inUse = users.filter((u) => u.customRoleId === r.id).length
          const view = Object.values(r.screens).filter((l) => l === 'view').length
          const edit = Object.values(r.screens).filter((l) => l === 'edit').length
          return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="flex flex-col">
                <span className="font-medium text-foreground">{r.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t(
                    `${edit} screens to edit · ${view} view only · given to ${inUse} ${inUse === 1 ? 'person' : 'people'}`,
                    `${edit} شاشة للتعديل · ${view} للعرض فقط · ممنوح لـ ${inUse}`,
                  )}
                </span>
              </span>
              {canEdit && (
                <span className="flex gap-1.5">
                  <Button variant="outline" size="xs" onClick={() => setEditing(r)}>
                    {t('Edit screens', 'تعديل الشاشات')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={inUse > 0}
                    title={inUse > 0 ? t('Given to someone: change their role first.', 'ممنوح لشخص: غيّر دوره أولاً.') : undefined}
                    onClick={() => {
                      deleteCustomRole(r.id)
                      log('user_role_changed', {
                        en: `Deleted the custom role “${r.name}”`,
                        ar: `حذف الدور المخصص «${r.name}»`,
                      })
                      toast.success(t('Role deleted.', 'حُذف الدور.'))
                    }}
                  >
                    {t('Delete', 'حذف')}
                  </Button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <EditRoleBody
            role={editing}
            onClose={() => setEditing(null)}
            onSaved={(name) =>
              log('user_role_changed', {
                en: `Changed the screens of the custom role “${name}”`,
                ar: `غيّر شاشات الدور المخصص «${name}»`,
              })
            }
          />
        </Dialog>
      )}
    </Card>
  )
}

function EditRoleBody({ role, onClose, onSaved }: { role: CustomRole; onClose: () => void; onSaved: (name: string) => void }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<Draft>({
    name: role.name,
    screens: { ...role.screens },
  })
  const [error, setError] = useState<string | null>(null)
  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{t('Edit custom role', 'تعديل دور مخصص')}</DialogTitle>
        <DialogDescription>{t('Changes apply the next time each person signs in.', 'تسري التغييرات عند تسجيل دخول كل شخص القادم.')}</DialogDescription>
      </DialogHeader>
      <NewRoleFields draft={draft} onChange={setDraft} />
      {error && (
        <InlineNote role="status" tone="error">
          {error}
        </InlineNote>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('Cancel', 'إلغاء')}
        </Button>
        <Button
          type="button"
          onClick={() => {
            const screens = Object.fromEntries(Object.entries(draft.screens).filter(([, l]) => l !== 'none')) as CustomRole['screens']
            if (draft.name.trim().length < 2 || !Object.keys(screens).length) {
              setError(t('Name the role and give it at least one screen.', 'سمِّ الدور وامنحه شاشة واحدة على الأقل.'))
              return
            }
            saveCustomRole({ id: role.id, name: draft.name, screens })
            onSaved(draft.name.trim())
            toast.success(t('Role saved.', 'حُفظ الدور.'))
            onClose()
          }}
        >
          {t('Save', 'حفظ')}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
