import { Link } from 'react-router-dom'
import { ArrowRight, History } from 'lucide-react'
import { useI18n } from '@/i18n'
import { LEGACY_AUTHORITY_MATRIX, LEGACY_ROLE_DEFS } from '@/data/legacyReference'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { AccessLegend, AccessMatrix, type MatrixRow } from './AccessMatrix'
import { SubPageHeader } from './SubPageHeader'

/** "Teams and structure" — kept as a Knowledge Base document, explicitly
 * removed from the live v38 portal menu (Programme KB §26). This page is
 * historical reference only: the pre-omnichannel `frontend/src/data/
 * roles.ts` role set and authority matrix, not the live one. The live,
 * CX-manager-editable grid is AI Insights access matrix. */
export default function TeamsStructure() {
  const { t, L } = useI18n()
  const rows: MatrixRow[] = LEGACY_AUTHORITY_MATRIX.map((r) => ({
    key: `${r.group.en}|${r.label.en}`,
    group: L(r.group),
    label: L(r.label),
    values: r.values,
  }))

  return (
    <section className="flex flex-col gap-4">
      <SubPageHeader
        title={t('Teams and structure', 'الفرق والهيكل')}
        description={t(
          'Kept for historical reference — removed from the real portal menu. This is the pre-omnichannel role set, not the live v38 one.',
          'محفوظة للرجوع التاريخي — أُزيلت من قائمة البوابة الفعلية. هذه مجموعة الأدوار قبل إعادة البناء الشاملة، وليست مجموعة v38 الحيّة.',
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
      <StatusBadge tone="warning" icon={<History aria-hidden />} className="self-start">
        {t('Reference only — not live navigation', 'مرجع فقط — ليست ضمن التنقل الفعلي')}
      </StatusBadge>

      <Tabs defaultValue="matrix" className="gap-4">
        <TabsList className="h-10">
          <TabsTrigger value="matrix" className="px-3">
            {t('Authority matrix (legacy)', 'مصفوفة الصلاحيات (قديمة)')}
          </TabsTrigger>
          <TabsTrigger value="roles" className="px-3">
            {t('Roles (legacy)', 'الأدوار (قديمة)')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <SectionCard contentClassName="flex flex-col gap-3">
            <AccessLegend />
            <AccessMatrix caption={t('Legacy authority matrix', 'مصفوفة الصلاحيات القديمة')} roles={LEGACY_ROLE_DEFS} rows={rows} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {LEGACY_ROLE_DEFS.map((r) => (
              <div key={r.id} className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs">
                <span className="text-base font-semibold">{L(r.name)}</span>
                <p className="text-sm text-muted-foreground">{L(r.description)}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
