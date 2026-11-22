import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuth } from '@/auth/session'
import { canAssignCalls } from '@/auth/permissions'
import { useAuditActor } from '@/auth/useAuditActor'
import { useUsers } from '@/data/users'
import { clearAway, isAwayOn, setAway, todayKey, unavailableReason, useAway } from '@/data/availability'
import { useCallAssignments } from '@/data/callAssignments'
import { useDetractorCallItems } from '@/services/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { IN_CARD, SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

/**
 * Team availability (owner's request, 22 Nov): the CX manager marks a CX team member as on leave. Nobody can give that person
 * new cases while they are away; the cases already with them show on Close the loop, where the manager moves them.
 */
export default function TeamAvailability() {
  const { t, lang } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const { log } = useAuditActor()
  const users = useUsers()
  const away = useAway()
  const assignments = useCallAssignments()
  const { data: items } = useDetractorCallItems()
  const canEdit = canAssignCalls(role.id)
  const team = useMemo(() => users.filter((u) => u.roleId === 'cxteam'), [users])
  const [editing, setEditing] = useState<string | null>(null)
  const [from, setFrom] = useState(todayKey())
  const [to, setTo] = useState('')

  const openWith = (userId: string) =>
    (items ?? []).filter((i) => !i.outcome && i.status !== 'done' && assignments[i.id]?.userId === userId).length
  const fmt = (d: string) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T00:00:00`))

  function save(userId: string, name: string) {
    if (to && to < from) {
      toast.error(t('The return date is before the first day away.', 'تاريخ العودة قبل أول يوم إجازة.'))
      return
    }
    setAway(userId, { from, to: to || undefined, byUserId: session?.userId })
    log('action', {
      en: `Marked ${name} as on leave from ${from}${to ? ` to ${to}` : ''}`,
      ar: `سجّل ${name} في إجازة من ${from}${to ? ` إلى ${to}` : ''}`,
    })
    toast.success(t(`${name} will not get new cases while away.`, `لن يحصل ${name} على حالات جديدة أثناء إجازته.`))
    setEditing(null)
  }

  return (
    <section data-density="comfortable" className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Team availability', 'توفّر الفريق')}
        description={t(
          'Mark a CX team member as on leave. While they are away nobody can give them new cases. The cases already with them are flagged on Close the loop so you can move them.',
          'سجّل موظف CX في إجازة. أثناء غيابه لا يمكن إسناد حالات جديدة له. الحالات التي لديه أصلاً تظهر مميّزة في «إغلاق الحلقة» لتنقلها.',
        )}
      />
      {!canEdit && <ViewOnlyNotice>{t('View only. The CX manager sets who is on leave.', 'للعرض فقط. مدير CX يحدد من هو في إجازة.')}</ViewOnlyNotice>}
      <SectionCard title={t('CX team', 'فريق CX')} contentClassName={IN_CARD}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Name', 'الاسم')}</TableHead>
              <TableHead>{t('Status', 'الحالة')}</TableHead>
              <TableHead>{t('Cases with them', 'الحالات لديه')}</TableHead>
              {canEdit && <TableHead className="text-end">{t('Actions', 'إجراءات')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((u) => {
              const reason = unavailableReason(u, away)
              const period = away[u.id]
              const scheduled = !!period && !isAwayOn(period) && period.from > todayKey()
              const open = openWith(u.id)
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-foreground">{u.name || u.email}</TableCell>
                  <TableCell>
                    {reason === 'left' ? (
                      <StatusBadge tone="neutral">{t('Left (deactivated)', 'غادر (موقوف)')}</StatusBadge>
                    ) : reason === 'leave' ? (
                      <span className="inline-flex flex-col gap-1">
                        <StatusBadge tone="warning" dot>{t('On leave', 'في إجازة')}</StatusBadge>
                        <span className="text-xs text-muted-foreground">
                          {fmt(period!.from)} → {period!.to ? fmt(period!.to) : t('until marked back', 'حتى تسجيل العودة')}
                        </span>
                      </span>
                    ) : scheduled ? (
                      <span className="inline-flex flex-col gap-1">
                        <StatusBadge tone="info">{t('Leave scheduled', 'إجازة مجدولة')}</StatusBadge>
                        <span className="text-xs text-muted-foreground">
                          {fmt(period!.from)} → {period!.to ? fmt(period!.to) : '…'}
                        </span>
                      </span>
                    ) : (
                      <StatusBadge tone="success" dot>{t('Available', 'متاح')}</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="tabular">
                    {open > 0 && reason ? (
                      <Link to="/close-the-loop" className="font-medium text-foreground underline underline-offset-2">
                        {open} {t('to move', 'للنقل')}
                      </Link>
                    ) : (
                      open
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-end">
                      {editing === u.id ? (
                        <div className="flex flex-wrap items-end justify-end gap-2">
                          <label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
                            {t('First day away', 'أول يوم غياب')}
                            <Input type="date" className="h-8 w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
                          </label>
                          <label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
                            {t('Back on (optional)', 'العودة في (اختياري)')}
                            <Input type="date" className="h-8 w-36" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                          </label>
                          <Button size="xs" onClick={() => save(u.id, u.name || u.email)} disabled={!from}>
                            {t('Save', 'حفظ')}
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => setEditing(null)}>
                            {t('Cancel', 'إلغاء')}
                          </Button>
                        </div>
                      ) : reason === 'left' ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : period ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              clearAway(u.id)
                              log('action', { en: `Marked ${u.name} as back at work`, ar: `سجّل عودة ${u.name} إلى العمل` })
                              toast.success(t(`${u.name} is available again.`, `${u.name} متاح من جديد.`))
                            }}
                          >
                            {t('Back at work', 'عاد إلى العمل')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setFrom(todayKey())
                            setTo('')
                            setEditing(u.id)
                          }}
                        >
                          {t('Mark on leave', 'تسجيل إجازة')}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </section>
  )
}
