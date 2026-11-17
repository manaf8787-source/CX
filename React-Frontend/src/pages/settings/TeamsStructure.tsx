import { Link } from 'react-router-dom'
import { ArrowRight, BellRing, Database, History } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useRole } from '@/auth/RoleContext'
import { LEGACY_AUTHORITY_MATRIX, LEGACY_ROLE_DEFS } from '@/data/legacyReference'
import { ROLE_DEFS } from '@/data/roles'
import { INFORMED_RULE, ROLE_SCOPE } from '@/data/v38Reference'
import { useHrPool, useProducts } from '@/services/queries'
import { useCrmFields, useProductRouting } from '@/services/referenceQueries'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ProductTag } from '@/components/common/Chip'
import { LoadingState } from '@/components/common/LoadingState'
import { AccessLegend, AccessMatrix, type MatrixRow } from './AccessMatrix'
import { SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

/** Modules KB §15 / Programme KB §28: Teams and structure shows who is
 * involved in each function and product (titles, not names), the authority
 * matrix, routing and what the CRM provides. Pools and environments are read
 * from the CRM, not edited here. */
export default function TeamsStructure() {
  const { t, L, lang } = useI18n()
  const { role } = useRole()
  const { data: routing, isLoading: routingLoading } = useProductRouting()
  const { data: crmFields } = useCrmFields()
  const { data: hrPool } = useHrPool()
  const { data: products } = useProducts()
  const legacyRows: MatrixRow[] = LEGACY_AUTHORITY_MATRIX.map((r) => ({
    key: `${r.group.en}|${r.label.en}`,
    group: L(r.group),
    label: L(r.label),
    values: r.values,
  }))
  const th = 'px-3 text-xs font-semibold text-muted-foreground'
  const isCx = role.id === 'cxmgr' || role.id === 'cxteam'
  const visibleRouting = (routing ?? []).filter((r) => r.key === 'hr' || isCx || products?.find((p) => p.id === r.key)?.live)

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Teams and structure', 'الفرق والهيكل')}
        description={t(
          'Who works in each function and product, by job title, what each does and what each can see. Pools and environments are read from the CRM.',
          'من يعمل في كل وظيفة ومنتج، حسب المسمى الوظيفي، وماذا يفعل كلٌّ منهم وماذا يرى. المجموعات والبيئات تُقرأ من CRM.',
        )}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/ai-insights-access">
              {t('Open the live access matrix', 'فتح مصفوفة الصلاحيات الحيّة')}
              <ArrowRight aria-hidden className="rtl:rotate-180" />
            </Link>
          </Button>
        }
      />
      {role.id !== 'cxmgr' && <ViewOnlyNotice>{t('You can read this page. Changes need the CX manager.', 'يمكنك قراءة هذه الصفحة. التعديلات تحتاج مدير تجربة العملاء.')}</ViewOnlyNotice>}

      <Tabs defaultValue="roles" className="gap-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="roles" className="px-3">{t('Who does what', 'من يفعل ماذا')}</TabsTrigger>
          <TabsTrigger value="routing" className="px-3">{t('Product routing', 'توجيه المنتجات')}</TabsTrigger>
          <TabsTrigger value="crm" className="px-3">{t('From the CRM', 'من نظام CRM')}</TabsTrigger>
          <TabsTrigger value="hr" className="px-3">{t('HR pool', 'مجموعة الموارد البشرية')}</TabsTrigger>
          <TabsTrigger value="informed" className="px-3">{t('Who is informed', 'من يُبلَّغ')}</TabsTrigger>
          <TabsTrigger value="legacy" className="px-3">{t('Earlier authority matrix', 'مصفوفة الصلاحيات السابقة')}</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <SectionCard
            description={t(
              'Cases are assigned to the people concerned, never to top management. Heads and C-level are informed only. Agent names show only to CX and the agent’s own management; conversation text only to the CX team and CX manager.',
              'تُسند الحالات للمعنيين وليس للإدارة العليا أبداً. الرؤساء والإدارة العليا للعلم فقط. أسماء الموظفين لفريق تجربة العملاء وإدارة الموظف فقط؛ ونص المحادثات لفريق تجربة العملاء ومديره فقط.',
            )}
          >
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={th}>{t('Role', 'الدور')}</TableHead>
                    <TableHead className={th}>{t('Pages', 'الصفحات')}</TableHead>
                    <TableHead className={th}>{t('Sees', 'يرى')}</TableHead>
                    <TableHead className={th}>{t('Can', 'يستطيع')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROLE_SCOPE.map((r) => (
                    <TableRow key={r.role} className="align-top">
                      <TableCell className="min-w-40 px-3 py-3 text-sm font-semibold whitespace-normal">{L(ROLE_DEFS.find((d) => d.id === r.role)!.name)}</TableCell>
                      <TableCell className="min-w-44 px-3 py-3 text-sm whitespace-normal">{L(r.pages)}</TableCell>
                      <TableCell className="min-w-52 px-3 py-3 text-sm whitespace-normal text-muted-foreground">{L(r.sees)}</TableCell>
                      <TableCell className="min-w-52 px-3 py-3 text-sm whitespace-normal">{L(r.can)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="routing">
          <SectionCard
            description={t(
              'Four roles on every case: the case owner (CX) follows up, the assigned person handles it, the corrective action owner confirms the actions, and the informed role receives a notice with no task.',
              'أربعة أدوار في كل حالة: صاحب الحالة (تجربة العملاء) يتابع، والمعيَّن يعالجها، ومسؤول الإجراء التصحيحي يؤكد الإجراءات، والمُبلَّغ يصله إشعار بلا مهمة.',
            )}
          >
            {routingLoading ? (
              <LoadingState rows={4} />
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {visibleRouting.map((r) => (
                  <div key={r.key} className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.key === 'hr' ? <span className="font-semibold">{L(r.label!)}</span> : <ProductTag productId={r.key} lang={lang} />}
                      {r.key !== 'hr' && !products?.find((p) => p.id === r.key)?.live && <StatusBadge tone="neutral">{t('Not launched', 'لم يُطلق بعد')}</StatusBadge>}
                      {r.byEnvironment && <StatusBadge tone="info">{t('By environment', 'حسب البيئة')}</StatusBadge>}
                    </div>
                    <dl className="grid grid-cols-1 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[11rem_minmax(0,1fr)]">
                      <dt className="text-muted-foreground">{t('How it is assigned', 'كيف تُعيَّن')}</dt>
                      <dd>{L(r.mode)}</dd>
                      <dt className="text-muted-foreground">{t('Case owner', 'صاحب الحالة')}</dt>
                      <dd>{L(r.caseOwner)}</dd>
                      <dt className="text-muted-foreground">{t('Assigned to', 'المعيَّن')}</dt>
                      <dd>{L(r.assignedTo)}</dd>
                      <dt className="text-muted-foreground">{t('Corrective action owner', 'مسؤول الإجراء التصحيحي')}</dt>
                      <dd>{L(r.actionOwner)}</dd>
                      <dt className="text-muted-foreground">{t('Informed only', 'للعلم فقط')}</dt>
                      <dd>{L(r.informed)}</dd>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="crm">
          <SectionCard
            title={
              <span className="inline-flex items-center gap-2">
                <Database aria-hidden className="size-4 text-muted-foreground" />
                {t('Fields the portal needs from the CRM for every customer record', 'الحقول التي تحتاجها البوابة من CRM لكل سجل عميل')}
              </span>
            }
            description={t(
              'Read from the CRM, not edited here. Environments, agent pools and which agent served which customer all come from the CRM; a new environment appears after the next sync.',
              'مقروءة من CRM ولا تُعدَّل هنا. البيئات ومجموعات الموظفين ومن خدم أي عميل كلها من CRM؛ تظهر البيئة الجديدة بعد المزامنة التالية.',
            )}
          >
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={th}>{t('Field', 'الحقل')}</TableHead>
                    <TableHead className={th}>{t('Used for', 'يُستخدم في')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(crmFields ?? []).map((f) => (
                    <TableRow key={f.field}>
                      <TableCell className="px-3 font-mono text-xs whitespace-normal" dir="ltr">{f.field}</TableCell>
                      <TableCell className="px-3 text-sm whitespace-normal">{L(f.usedFor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="hr">
          <SectionCard
            description={t(
              'The HR pool is dynamic: HR management gives the emails and mobiles; each member signs in and sees only the cases assigned to them. The HR manager sees the team report and an alert only when the team is late — never a case.',
              'مجموعة الموارد البشرية ديناميكية: تعطي إدارة الموارد البريد والجوال؛ يدخل كل عضو ولا يرى إلا الحالات المعيّنة له. مدير الموارد يرى تقرير الفريق وتنبيهاً عند تأخر الفريق فقط — ولا يرى أي حالة.',
            )}
          >
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={th}>{t('Title', 'المسمى')}</TableHead>
                    <TableHead className={th}>{t('Email', 'البريد')}</TableHead>
                    <TableHead className={th}>{t('Mobile', 'الجوال')}</TableHead>
                    <TableHead className={`${th} text-end`}>{t('Open cases', 'حالات مفتوحة')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(hrPool ?? []).map((m) => (
                    <TableRow key={m.title}>
                      <TableCell className="px-3 text-sm">{m.title}</TableCell>
                      <TableCell className="px-3 font-mono text-xs" dir="ltr">{m.email}</TableCell>
                      <TableCell className="px-3 font-mono text-xs" dir="ltr">{m.mobile}</TableCell>
                      <TableCell className="px-3 text-end text-sm tabular-nums">{m.assignedCases}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t('Real HR pool members are still to be named by HR management.', 'أعضاء مجموعة الموارد البشرية الفعليون لم تحددهم إدارة الموارد بعد.')}</p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="informed">
          <SectionCard
            title={
              <span className="inline-flex items-center gap-2">
                <BellRing aria-hidden className="size-4 text-muted-foreground" />
                {t('Who is informed', 'من يُبلَّغ')}
              </span>
            }
          >
            <p className="text-sm">{L(INFORMED_RULE)}</p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="legacy">
          <SectionCard contentClassName="flex flex-col gap-3">
            <StatusBadge tone="warning" icon={<History aria-hidden />} className="self-start">
              {t('Earlier version (pre-omnichannel roles) — the live grid is the AI Insights access matrix', 'نسخة سابقة (أدوار ما قبل إعادة البناء) — المصفوفة الحية هي مصفوفة صلاحيات رؤى الذكاء الاصطناعي')}
            </StatusBadge>
            <AccessLegend />
            <AccessMatrix caption={t('Earlier authority matrix', 'مصفوفة الصلاحيات السابقة')} roles={LEGACY_ROLE_DEFS} rows={legacyRows} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </section>
  )
}
