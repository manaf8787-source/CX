import { useState } from 'react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuth } from '@/auth/session'
import { useUsers } from '@/data/users'
import { ENVIRONMENTS } from '@/data/environments'
import { OWNER_ROLE_LABEL, resetWorkflow, updateWorkflow, useShopperWorkflow, type ShopperOwnerRole, type ShopperWorkflowConfig } from '@/data/shopperWorkflow'
import type { Bi, EnvId, Severity } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SettingsSection } from './SubPageHeader'

const SEVERITY_LABEL: Record<Severity, Bi> = {
  critical: { en: 'Critical', ar: 'حرجة' },
  medium: { en: 'Medium', ar: 'متوسطة' },
  low: { en: 'Low', ar: 'منخفضة' },
}

/**
 * Settings → Rules as configuration → Mystery shopper workflow (owner, 24 Nov: "build it so we can control it later, dynamic").
 * Every switch, owner, clock and action type here is read by the cases page and the inbox. The CX manager edits; changes save at once
 * and are listed with when and who. The back end stores the same document (`/api/config/mystery-shopper-workflow`).
 */
export function ShopperWorkflowSettings() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const users = useUsers()
  const me = users.find((u) => u.id === session?.userId)?.name ?? 'CX manager'
  const canEdit = role.id === 'cxmgr'
  const { config: cfg, log } = useShopperWorkflow()
  const save = (patch: Partial<ShopperWorkflowConfig>, what: Bi) => updateWorkflow(patch, me, what)
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

  return (
    <SettingsSection
      layout="stacked"
      title={t('Mystery shopper workflow', 'مسار عمل التسوق السري')}
      description={t(
        'Who checks, who decides, what each decision needs, and the clocks. The cases page and the inbox follow these settings; changes apply at once.',
        'من يتحقق، ومن يقرر، وماذا يحتاج كل قرار، والمهل. صفحة الحالات وصندوق الوارد يتبعان هذه الإعدادات؛ وتُطبّق التغييرات فوراً.',
      )}
      actions={
        canEdit && (
          <Button variant="outline" size="sm" onClick={() => resetWorkflow(me)}>
            {t('Back to defaults', 'إعادة للافتراضي')}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-8" data-testid="shopper-workflow">
        {/* the flow */}
        <div className="flex flex-col gap-3">
          <h4 className="t-ui-strong">{t('The flow', 'المسار')}</h4>
          <Toggle
            label={t('The CX manager checks the evidence before the owner sees the case', 'مدير CX يتحقق من الأدلة قبل أن يرى المالك الحالة')}
            hint={t('Off: a new visit goes straight to the owner.', 'عند الإيقاف: تذهب الزيارة الجديدة مباشرة للمالك.')}
            checked={cfg.cxReviewRequired}
            disabled={!canEdit}
            onChange={(v) =>
              save(
                { cxReviewRequired: v },
                v ? { en: 'CX manager check: on', ar: 'تحقق مدير CX: مفعل' } : { en: 'CX manager check: off', ar: 'تحقق مدير CX: متوقف' },
              )
            }
          />
          <Toggle
            label={t('A comment is required when approving', 'التعليق مطلوب عند الاعتماد')}
            hint={t('Approving with changes and rejecting always need one.', 'الاعتماد بتعديل والرفض يحتاجان تعليقاً دائماً.')}
            checked={cfg.commentOnApprove}
            disabled={!canEdit}
            onChange={(v) =>
              save(
                { commentOnApprove: v },
                v
                  ? { en: 'Comment on approve: required', ar: 'التعليق عند الاعتماد: مطلوب' }
                  : { en: 'Comment on approve: optional', ar: 'التعليق عند الاعتماد: اختياري' },
              )
            }
          />
          <Toggle
            label={t('Approved trainings always go to Learning & Development', 'التدريبات المعتمدة تذهب دائماً لقسم التعلم والتطوير')}
            hint={t(
              'Off: the owner chooses an internal 1-to-1 session or sends it to L&D.',
              'عند الإيقاف: يختار المالك جلسة داخلية فردية أو يرسله لقسم التعلم والتطوير.',
            )}
            checked={cfg.trainingRoute === 'ld'}
            disabled={!canEdit}
            onChange={(v) =>
              save(
                { trainingRoute: v ? 'ld' : 'choose' },
                v ? { en: 'Trainings: always L&D', ar: 'التدريبات: دائماً L&D' } : { en: 'Trainings: the owner chooses', ar: 'التدريبات: يختار المالك' },
              )
            }
          />
        </div>

        {/* owners */}
        <div className="flex flex-col gap-3">
          <h4 className="t-ui-strong">{t('Who decides, per environment', 'من يقرر، لكل بيئة')}</h4>
          <p className="text-sm text-muted-foreground">
            {t('The owner decides each proposed action and refers conduct cases to HR.', 'يقرر المالك كل إجراء مقترح ويحيل حالات السلوك للموارد البشرية.')}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ENVIRONMENTS.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-well bg-well px-4 py-2.5 text-sm">
                <span className="text-foreground">{L(e.name)}</span>
                <Select
                  value={cfg.ownerByEnv[e.id as EnvId]}
                  disabled={!canEdit}
                  onValueChange={(v) =>
                    save(
                      { ownerByEnv: { ...cfg.ownerByEnv, [e.id]: v as ShopperOwnerRole } },
                      {
                        en: `${e.name.en}: decided by the ${OWNER_ROLE_LABEL[v as ShopperOwnerRole].en}`,
                        ar: `${e.name.ar}: يقرر ${OWNER_ROLE_LABEL[v as ShopperOwnerRole].ar}`,
                      },
                    )
                  }
                >
                  <SelectTrigger className="h-9 min-w-48" aria-label={t(`Owner for ${e.name.en}`, `المالك لـ ${e.name.ar}`)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OWNER_ROLE_LABEL) as ShopperOwnerRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {L(OWNER_ROLE_LABEL[r])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        </div>

        {/* clocks */}
        <div className="flex flex-col gap-3">
          <h4 className="t-ui-strong">{t('Clocks, by severity', 'المهل حسب الخطورة')}</h4>
          <div className="-mx-2.5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="row-divider-none">
                  <TableHead>{t('Severity', 'الخطورة')}</TableHead>
                  <TableHead>{t('First response (CX manager’s check)', 'أول استجابة (تحقق مدير CX)')}</TableHead>
                  <TableHead>{t('Resolved (every action done)', 'الحل (تنفيذ كل الإجراءات)')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(['critical', 'medium', 'low'] as Severity[]).map((s) => (
                  <TableRow key={s}>
                    <TableCell className="font-medium text-foreground">{L(SEVERITY_LABEL[s])}</TableCell>
                    {(['respondDays', 'resolveDays'] as const).map((k) => (
                      <TableCell key={k}>
                        <NumberSetting
                          key={cfg.version}
                          value={cfg.clocks[s][k]}
                          unit={t('days', 'أيام')}
                          disabled={!canEdit}
                          label={`${L(SEVERITY_LABEL[s])} ${k}`}
                          onSave={(n) =>
                            save(
                              { clocks: { ...cfg.clocks, [s]: { ...cfg.clocks[s], [k]: n } } },
                              {
                                en: `${SEVERITY_LABEL[s].en} ${k === 'respondDays' ? 'first response' : 'resolve'}: ${n} days`,
                                ar: `${SEVERITY_LABEL[s].ar} ${k === 'respondDays' ? 'أول استجابة' : 'الحل'}: ${n} أيام`,
                              },
                            )
                          }
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-well bg-well px-4 py-2.5 text-sm">
              <span className="text-foreground">{t('Remind the owner before a planned date', 'تذكير المالك قبل الموعد المخطط')}</span>
              <NumberSetting
                key={cfg.version}
                value={cfg.remindBeforeDays}
                unit={t('days', 'أيام')}
                disabled={!canEdit}
                label={t('Reminder days', 'أيام التذكير')}
                onSave={(n) => save({ remindBeforeDays: n }, { en: `Reminder: ${n} days before`, ar: `التذكير: قبل ${n} أيام` })}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-well bg-well px-4 py-2.5 text-sm">
              <span className="text-foreground">{t('Not marked done after the date: to the CX manager', 'لم يُعلَّم كمنجز بعد الموعد: لمدير CX')}</span>
              <NumberSetting
                key={cfg.version}
                value={cfg.escalateAfterDays}
                unit={t('days', 'أيام')}
                disabled={!canEdit}
                label={t('Escalation days', 'أيام التصعيد')}
                onSave={(n) => save({ escalateAfterDays: n }, { en: `Escalation: ${n} days after the date`, ar: `التصعيد: بعد ${n} أيام من الموعد` })}
              />
            </div>
          </div>
        </div>

        {/* action kinds */}
        <div className="flex flex-col gap-3">
          <h4 className="t-ui-strong">{t('Types of action and what approving needs', 'أنواع الإجراءات وما يحتاجه الاعتماد')}</h4>
          <div className="-mx-2.5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="row-divider-none">
                  <TableHead>{t('Type', 'النوع')}</TableHead>
                  <TableHead>{t('Date asked for', 'التاريخ المطلوب')}</TableHead>
                  <TableHead>{t('Date required', 'التاريخ إلزامي')}</TableHead>
                  <TableHead>{t('In use', 'مستخدم')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cfg.actionKinds.map((k) => (
                  <TableRow key={k.key}>
                    <TableCell className="font-medium text-foreground">{L(k.label)}</TableCell>
                    <TableCell>{L(k.dateLabel)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={k.dateRequired}
                        disabled={!canEdit}
                        aria-label={t(`${k.label.en}: date required`, `${k.label.ar}: التاريخ إلزامي`)}
                        onCheckedChange={(v) =>
                          save(
                            { actionKinds: cfg.actionKinds.map((x) => (x.key === k.key ? { ...x, dateRequired: v } : x)) },
                            { en: `${k.label.en}: date ${v ? 'required' : 'optional'}`, ar: `${k.label.ar}: التاريخ ${v ? 'إلزامي' : 'اختياري'}` },
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={k.active}
                        disabled={!canEdit}
                        aria-label={t(`${k.label.en}: in use`, `${k.label.ar}: مستخدم`)}
                        onCheckedChange={(v) =>
                          save(
                            { actionKinds: cfg.actionKinds.map((x) => (x.key === k.key ? { ...x, active: v } : x)) },
                            { en: `${k.label.en}: ${v ? 'in use' : 'not in use'}`, ar: `${k.label.ar}: ${v ? 'مستخدم' : 'غير مستخدم'}` },
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* changes */}
        <div className="flex flex-col gap-2">
          <h4 className="t-ui-strong">{t('Changes', 'التغييرات')}</h4>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(`Version ${cfg.version}, the defaults. No changes yet.`, `الإصدار ${cfg.version}، الافتراضي. لا تغييرات بعد.`)}
            </p>
          ) : (
            <ul className="flex flex-col text-sm">
              {log.slice(0, 10).map((c, i) => (
                <li key={`${c.at}-${i}`} className="row-divider flex flex-wrap gap-x-3 py-2">
                  <bdi dir="ltr" className="text-muted-foreground tabular">
                    {fmt(c.at)}
                  </bdi>
                  <span className="text-foreground">{L(c.what)}</span>
                  <span className="text-muted-foreground">· {c.by}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SettingsSection>
  )
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-well bg-well px-4 py-3 text-sm">
      <span className="flex flex-col gap-0.5">
        <span className="text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </label>
  )
}

function NumberSetting({
  value,
  unit,
  disabled,
  label,
  onSave,
}: {
  value: number
  unit: string
  disabled: boolean
  label: string
  onSave: (n: number) => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<string>(String(value))
  const dirty = draft !== String(value) && Number(draft) > 0
  if (disabled)
    return (
      <span className="t-ui-strong tabular">
        {value} <span className="font-normal text-muted-foreground">{unit}</span>
      </span>
    )
  return (
    <span className="inline-flex items-center gap-2">
      <Input
        type="number"
        min={1}
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-9 w-20 text-end tabular"
        aria-label={label}
      />
      <span className="text-muted-foreground">{unit}</span>
      <Button size="sm" className={dirty ? '' : 'invisible'} aria-hidden={!dirty} tabIndex={dirty ? 0 : -1} onClick={() => onSave(Number(draft))}>
        {t('Save', 'حفظ')}
      </Button>
    </span>
  )
}
