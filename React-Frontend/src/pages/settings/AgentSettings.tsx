import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { useAuth } from '@/auth/session'
import { canEditAgentSettings } from '@/auth/permissions'
import { useUsers } from '@/data/users'
import { AGENT_REGISTRY } from '@/data/agentRegistry'
import { LOCKS, MODE_LABEL, REVIEWER_LABEL, resetAgent, updateAgent, useAgentSettings, type AgentMode, type Reviewer } from '@/data/agentSettings'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { InlineNote } from '@/components/common/InlineNote'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * Settings tab of the AI team page (owner, 24 Nov). One row per agent: on or paused, how much it may do alone, the confidence line
 * below which a person decides, and who reviews its output. The CX manager edits; everyone else reads. Every change is listed below
 * with when and who. Agent 2's line and pause drive the real classification of public comments (on the next load of the data).
 */
const CONFIDENCE = [50, 60, 65, 70, 75, 80, 85, 90, 95]

export default function AgentSettings() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { session } = useAuth()
  const users = useUsers()
  const me = users.find((u) => u.id === session?.userId)?.name ?? 'CX manager'
  const canEdit = canEditAgentSettings(role.id)
  const { settings, log } = useAgentSettings()
  const nameOf = (key: string) => {
    const a = AGENT_REGISTRY.find((x) => x.key === key)
    if (!a) return key
    return a.id === 'supervisor' ? L(a.name) : `${t('Agent', 'الوكيل')} ${a.id} · ${L(a.name)}`
  }
  const paused = AGENT_REGISTRY.filter((a) => !settings[a.key]?.enabled).length
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

  return (
    <div className="flex flex-col gap-4" data-testid="agent-settings">
      {!canEdit && (
        <InlineNote tone="info">{t('View only. The CX manager changes these settings.', 'للعرض فقط. يغيّر مدير تجربة العملاء هذه الإعدادات.')}</InlineNote>
      )}
      <SectionCard
        title={t('How each agent works', 'كيف يعمل كل وكيل')}
        description={t(
          `On or paused, how much it may do alone, the confidence below which a person decides, and who reviews it. ${paused ? `${paused} paused now.` : 'All agents are on.'} Prompts, models and keys are managed by IT, not here.`,
          `مفعل أو متوقف، وكم يُسمح له أن يفعل وحده، والثقة التي يقرر تحتها شخص، ومن يراجعه. ${paused ? `${paused} متوقف الآن.` : 'كل الوكلاء مفعلون.'} التعليمات والنماذج والمفاتيح تديرها التقنية، وليست هنا.`,
        )}
      >
        <ul className="flex flex-col divide-y">
          {AGENT_REGISTRY.map((a) => {
            const s = settings[a.key]
            const lock = LOCKS[a.key] ?? {}
            const phase = !!a.phaseNote
            const last = log.find((c) => c.agentKey === a.key)
            return (
              <li key={a.key} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0" data-agent={a.key}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{nameOf(a.key)}</span>
                  {phase ? (
                    <StatusBadge tone="neutral">{t('Not in phase one', 'ليس في المرحلة الأولى')}</StatusBadge>
                  ) : s.enabled ? (
                    <StatusBadge tone="success">{t('On', 'مفعل')}</StatusBadge>
                  ) : (
                    <StatusBadge tone="danger">{t('Paused', 'متوقف')}</StatusBadge>
                  )}
                  <span className="text-sm text-muted-foreground">{L(a.task)}</span>
                </div>
                <div className="grid items-start gap-x-6 gap-y-3 text-sm md:grid-cols-[auto_1fr_auto_auto]">
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={s.enabled}
                      disabled={!canEdit || phase || !!lock.enabled}
                      onCheckedChange={(on) =>
                        updateAgent(a.key, { enabled: on }, me, on ? { en: 'Turned on', ar: 'تم التفعيل' } : { en: 'Paused', ar: 'تم الإيقاف' })
                      }
                      aria-label={t(`${nameOf(a.key)} on`, `${nameOf(a.key)} مفعل`)}
                    />
                    <span>{s.enabled ? t('On', 'مفعل') : t('Paused', 'متوقف')}</span>
                  </label>
                  <div className="flex flex-col gap-1">
                    {lock.mode || !canEdit ? (
                      <span className="text-foreground">{L(MODE_LABEL[s.mode])}</span>
                    ) : (
                      <Segmented<AgentMode>
                        label={t('How much it may do alone', 'كم يُسمح له وحده')}
                        value={s.mode}
                        onValueChange={(m) => updateAgent(a.key, { mode: m }, me, { en: `Mode: ${MODE_LABEL[m].en}`, ar: `الطريقة: ${MODE_LABEL[m].ar}` })}
                        options={[
                          { value: 'suggest', label: L(MODE_LABEL.suggest) },
                          { value: 'auto', label: L(MODE_LABEL.auto) },
                        ]}
                      />
                    )}
                    {(lock.mode || lock.enabled) && <span className="text-xs text-muted-foreground">{L((lock.enabled ?? lock.mode)!)}</span>}
                  </div>
                  <label className="flex min-w-36 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t('A person decides below', 'يقرر شخص تحت')}</span>
                    {s.confidence === null ? (
                      <span className="text-muted-foreground">{t('Works from the rules', 'يعمل من القواعد')}</span>
                    ) : (
                      <Select
                        value={String(s.confidence)}
                        disabled={!canEdit}
                        onValueChange={(v) => updateAgent(a.key, { confidence: Number(v) }, me, { en: `Confidence line: ${v}%`, ar: `خط الثقة: ${v}%` })}
                      >
                        <SelectTrigger className="h-9 w-28" aria-label={t('Confidence line', 'خط الثقة')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONFIDENCE.map((c) => (
                            <SelectItem key={c} value={String(c)}>
                              {c}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t('Reviewed by', 'يراجعه')}</span>
                    <Select
                      value={s.reviewer}
                      disabled={!canEdit}
                      onValueChange={(v) =>
                        updateAgent(a.key, { reviewer: v as Reviewer }, me, {
                          en: `Reviewer: ${REVIEWER_LABEL[v as Reviewer].en}`,
                          ar: `المراجع: ${REVIEWER_LABEL[v as Reviewer].ar}`,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 min-w-48" aria-label={t('Reviewed by', 'يراجعه')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(REVIEWER_LABEL) as Reviewer[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {L(REVIEWER_LABEL[r])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
                {(last || canEdit) && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {last && (
                      <span>
                        {t('Last change', 'آخر تغيير')}: {L(last.what)} · {last.by} · <bdi dir="ltr">{fmt(last.at)}</bdi>
                      </span>
                    )}
                    {canEdit && last && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => resetAgent(a.key, me)}>
                        {t('Back to defaults', 'إعادة للافتراضي')}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </SectionCard>

      <SectionCard
        title={t('Changes', 'التغييرات')}
        description={t('Every change to these settings: when, who, what. Nothing is deleted.', 'كل تغيير على هذه الإعدادات: متى، ومن، وماذا. لا يُحذف شيء.')}
      >
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('No changes yet. Every agent runs on the defaults.', 'لا تغييرات بعد. كل الوكلاء يعملون على الإعدادات الافتراضية.')}
          </p>
        ) : (
          <div className="-mx-2.5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="row-divider-none">
                  <TableHead>{t('When', 'متى')}</TableHead>
                  <TableHead>{t('Agent', 'الوكيل')}</TableHead>
                  <TableHead>{t('What', 'ماذا')}</TableHead>
                  <TableHead>{t('By', 'من')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.slice(0, 30).map((c, i) => (
                  <TableRow key={`${c.at}-${i}`}>
                    <TableCell className="tabular">
                      <bdi dir="ltr">{fmt(c.at)}</bdi>
                    </TableCell>
                    <TableCell>{nameOf(c.agentKey)}</TableCell>
                    <TableCell className="whitespace-normal">{L(c.what)}</TableCell>
                    <TableCell>{c.by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
