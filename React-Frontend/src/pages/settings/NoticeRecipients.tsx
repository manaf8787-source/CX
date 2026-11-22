import { useState } from 'react'
import { Mail, Plus, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuditActor } from '@/auth/useAuditActor'
import { useUsers } from '@/data/users'
import { addRecipient, removeRecipient, setRecipientTitle, useRecipients } from '@/data/noticeRecipients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { StatusBadge } from '@/components/common/StatusBadge'

/**
 * The "Informed" cell of Notices and digests: the people chosen for one product, each with name, email and an editable job title,
 * and an "Add person" picker over the active users. Read-only for a role that cannot edit.
 */
export function NoticeRecipients({ productId, productLabel, fallbackTitle, canEdit }: { productId: string; productLabel: string; fallbackTitle?: string; canEdit: boolean }) {
  const { t } = useI18n()
  const { log } = useAuditActor()
  const users = useUsers()
  const chosen = useRecipients()[productId] ?? []
  const [open, setOpen] = useState(false)

  const candidates = users.filter((u) => u.status === 'active' && !chosen.some((c) => c.userId === u.id))

  return (
    <div className="flex min-w-60 flex-col gap-2" data-testid={`informed-${productId}`}>
      {chosen.length === 0 && (
        <StatusBadge tone="warning" dot className="self-start">
          {t('Nobody chosen yet', 'لم يُختر أحد بعد')}
          {fallbackTitle ? ` · ${fallbackTitle}` : ''}
        </StatusBadge>
      )}
      {chosen.map((c) => {
        const u = users.find((x) => x.id === c.userId)
        const gone = !u || u.status !== 'active'
        return (
          <div key={c.userId} className="flex flex-col gap-1 rounded-xl border border-line px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium text-foreground">{u?.name || u?.email || c.userId}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                  <Mail aria-hidden className="size-3" />
                  {u?.email ?? '—'}
                </span>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label={t(`Remove ${u?.name ?? 'person'}`, `إزالة ${u?.name ?? 'الشخص'}`)}
                  onClick={() => {
                    removeRecipient(productId, c.userId)
                    log('action', { en: `Removed ${u?.email ?? c.userId} from the ${productLabel} notices`, ar: `أزال ${u?.email ?? c.userId} من إشعارات ${productLabel}` })
                  }}
                >
                  <X aria-hidden />
                </Button>
              )}
            </div>
            {gone && <StatusBadge tone="danger" dot className="self-start">{t('No longer active: choose someone else', 'لم يعد نشطاً: اختر بديلاً')}</StatusBadge>}
            {canEdit ? (
              <Input
                className="h-8 text-sm"
                value={c.title}
                placeholder={t('Job title, for example Head of Sales', 'المسمى الوظيفي، مثل رئيس المبيعات')}
                aria-label={t('Job title', 'المسمى الوظيفي')}
                onChange={(e) => setRecipientTitle(productId, c.userId, e.target.value)}
                onBlur={() => log('action', { en: `Set the ${productLabel} notice job title of ${u?.email ?? c.userId} to "${c.title}"`, ar: `حدّد المسمى الوظيفي في إشعارات ${productLabel} لـ ${u?.email ?? c.userId}: "${c.title}"` })}
              />
            ) : (
              c.title && <span className="text-xs text-muted-foreground">{c.title}</span>
            )}
          </div>
        )
      })}
      {canEdit && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="self-start">
              <Plus aria-hidden />
              {t('Add person', 'إضافة شخص')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <Command>
              <CommandInput placeholder={t('Search name or email', 'ابحث بالاسم أو البريد')} />
              <CommandList>
                <CommandEmpty>{t('No active user. The Admin creates users first.', 'لا يوجد مستخدم نشط. ينشئ الأدمن المستخدمين أولاً.')}</CommandEmpty>
                <CommandGroup>
                  {candidates.map((u) => (
                    <CommandItem
                      key={u.id}
                      value={`${u.name} ${u.email}`}
                      onSelect={() => {
                        addRecipient(productId, u.id)
                        log('action', { en: `Added ${u.email} to the ${productLabel} notices`, ar: `أضاف ${u.email} إلى إشعارات ${productLabel}` })
                        setOpen(false)
                      }}
                    >
                      <span className="flex flex-col">
                        <span className="text-foreground">{u.name || u.email}</span>
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {u.email}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

