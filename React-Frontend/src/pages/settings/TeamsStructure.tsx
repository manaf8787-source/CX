import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
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
import { IN_CARD, InlineNote, SubPageHeader, ViewOnlyNotice } from './SubPageHeader'

/** Modules KB §15 / Programme KB §28: Teams and structure shows who is
 * involved in each function and product (titles, not names), the authority
 * matrix, routing and what the CRM provides. Pools and environments are read
 * from the CRM, not edited here.
 *
 * Design: a register, so dense. The six views are the segmented tab track; each panel is one card (a table, or wells for the
 * routing of each product). Read-only roles get the view-only note; this page has no editable field. */
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
  const isCx = role.id === 'cxmgr' || role.id === 'cxteam'
  const visibleRouting = (routing ?? []).filter((r) => r.key === 'hr' || isCx || products?.find((p) => p.id === r.key)?.live)

  return (
    <section data-density="dense" className="flex flex-col gap-4">
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
        <div className="-m-1 overflow-x-auto p-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="roles">{t('Who does what', 'من يفعل ماذا')}</TabsTrigger>
            <TabsTrigger value="routing">{t('Product routing', 'توجيه المنتجات')}</TabsTrigger>
            <TabsTrigger value="crm">{t('From the CRM', 'من نظام CRM')}</TabsTrigger>
            <TabsTrigger value="hr">{t('HR pool', 'مجموعة الموارد البشرية')}</TabsTrigger>
            <TabsTrigger value="informed">{t('Who is informed', 'من يُبلَّغ')}</TabsTrigger>
            <TabsTrigger value="legacy">{t('Earlier authority matrix', 'مصفوفة الصلاحيات السابقة')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="roles">
          <SectionCard
            description={t(
              'Cases are assigned to the people concerned, never to top management. Heads and C-level are informed only. Agent names show only to CX and the agent’s own management; conversation text only to the CX team and CX manager.',
              'تُسند الحالات للمعنيين وليس للإدارة العليا أبداً. الرؤساء والإدارة العليا للعلم فقط. أسماء الموظفين لفريق تجربة العملاء وإدارة الموظف فقط؛ ونص المحادثات لفريق تجربة العملاء ومديره فقط.',
            )}
            contentClassName={IN_CARD}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Role', 'الدور')}</TableHead>
                  <TableHead>{t('Pages', 'الصفحات')}</TableHead>
                  <TableHead>{t('Sees', 'يرى')}</TableHead>
                  <TableHead>{t('Can', 'يستطيع')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLE_SCOPE.map((r) => (
                  <TableRow key={r.role} className="align-top">
                    <TableCell className="min-w-40 py-3 font-medium whitespace-normal text-foreground">{L(ROLE_DEFS.find((d) => d.id === r.role)!.name)}</TableCell>
                    <TableCell className="min-w-44 py-3 whitespace-normal text-foreground">{L(r.pages)}</TableCell>
                    <TableCell className="min-w-52 py-3 whitespace-normal">{L(r.sees)}</TableCell>
                    <TableCell className="min-w-52 py-3 whitespace-normal text-foreground">{L(r.can)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {visibleRouting.map((r) => (
                  <div key={r.key} className="well @container flex min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.key === 'hr' ? <span className="t-ui-strong">{L(r.label!)}</span> : <ProductTag productId={r.key} lang={lang} />}
                      {r.key !== 'hr' && !products?.find((p) => p.id === r.key)?.live && <StatusBadge tone="neutral">{t('Not launched', 'لم يُطلق بعد')}</StatusBadge>}
                      {r.byEnvironment && <StatusBadge tone="info">{t('By environment', 'حسب البيئة')}</StatusBadge>}
                    </div>
                    <dl className="grid grid-cols-1 gap-x-3 gap-y-1 text-sm @sm:grid-cols-[9rem_minmax(0,1fr)] @sm:gap-y-2">
                      <dt className="text-muted-foreground">{t('How it is assigned', 'كيف تُعيَّن')}</dt>
                      <dd className="mb-1.5 text-foreground @sm:mb-0">{L(r.mode)}</dd>
                      <dt className="text-muted-foreground">{t('Case owner', 'صاحب الحالة')}</dt>
                      <dd className="mb-1.5 text-foreground @sm:mb-0">{L(r.caseOwner)}</dd>
                      <dt className="text-muted-foreground">{t('Assigned to', 'المعيَّن')}</dt>
                      <dd className="mb-1.5 text-foreground @sm:mb-0">{L(r.assignedTo)}</dd>
                      <dt className="text-muted-foreground">{t('Corrective action owner', 'مسؤول الإجراء التصحيحي')}</dt>
                      <dd className="mb-1.5 text-foreground @sm:mb-0">{L(r.actionOwner)}</dd>
                      <dt className="text-muted-foreground">{t('Informed only', 'للعلم فقط')}</dt>
                      <dd className="text-foreground">{L(r.informed)}</dd>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="crm">
          <SectionCard
            title={t('Fields the portal needs from the CRM for every customer record', 'الحقول التي تحتاجها البوابة من CRM لكل سجل عميل')}
            description={t(
              'Read from the CRM, not edited here. Environments, agent pools and which agent served which customer all come from the CRM; a new environment appears after the next sync.',
              'مقروءة من CRM ولا تُعدَّل هنا. البيئات ومجموعات الموظفين ومن خدم أي عميل كلها من CRM؛ تظهر البيئة الجديدة بعد المزامنة التالية.',
            )}
            contentClassName={IN_CARD}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Field', 'الحقل')}</TableHead>
                  <TableHead>{t('Used for', 'يُستخدم في')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(crmFields ?? []).map((f) => (
                  <TableRow key={f.field}>
                    <TableCell className="font-medium tabular whitespace-normal text-foreground" dir="ltr">{f.field}</TableCell>
                    <TableCell className="whitespace-normal">{L(f.usedFor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="hr">
          <SectionCard
            description={t(
              'The HR pool is dynamic: HR management gives the emails and mobiles; each member signs in and sees only the cases assigned to them. The HR manager sees the team report and an alert only when the team is late — never a case.',
              'مجموعة الموارد البشرية ديناميكية: تعطي إدارة الموارد البريد والجوال؛ يدخل كل عضو ولا يرى إلا الحالات المعيّنة له. مدير الموارد يرى تقرير الفريق وتنبيهاً عند تأخر الفريق فقط — ولا يرى أي حالة.',
            )}
            contentClassName={IN_CARD}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Title', 'المسمى')}</TableHead>
                  <TableHead>{t('Email', 'البريد')}</TableHead>
                  <TableHead>{t('Mobile', 'الجوال')}</TableHead>
                  <TableHead className="text-end">{t('Open cases', 'حالات مفتوحة')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(hrPool ?? []).map((m) => (
                  <TableRow key={m.title}>
                    <TableCell className="font-medium text-foreground">{m.title}</TableCell>
                    <TableCell className="tabular" dir="ltr">{m.email}</TableCell>
                    <TableCell className="tabular" dir="ltr">{m.mobile}</TableCell>
                    <TableCell className="text-end font-medium tabular text-foreground">{m.assignedCases}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 px-2.5 text-sm text-muted-foreground">{t('Real HR pool members are still to be named by HR management.', 'أعضاء مجموعة الموارد البشرية الفعليون لم تحددهم إدارة الموارد بعد.')}</p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="informed">
          <SectionCard title={t('Who is informed', 'من يُبلَّغ')}>
            <p className="t-body-m max-w-[72ch]">{L(INFORMED_RULE)}</p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="legacy">
          <SectionCard contentClassName="flex flex-col gap-4">
            <InlineNote tone="warning">
              {t('Earlier version (pre-omnichannel roles) — the live grid is the AI Insights access matrix', 'نسخة سابقة (أدوار ما قبل إعادة البناء) — المصفوفة الحية هي مصفوفة صلاحيات رؤى الذكاء الاصطناعي')}
            </InlineNote>
            <AccessLegend />
            <AccessMatrix caption={t('Earlier authority matrix', 'مصفوفة الصلاحيات السابقة')} roles={LEGACY_ROLE_DEFS} rows={legacyRows} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </section>
  )
}
