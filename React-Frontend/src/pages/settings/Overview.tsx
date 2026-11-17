import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useRole } from '../../auth/RoleContext'
import { SampleBanner } from '../../components/common/SampleBanner'
import { Tile } from '../../components/common/Tile'
import { Chip, ProductTag } from '../../components/common/Chip'
import {
  useCorrectiveActions,
  useProducts,
  useShopperCases,
  useToggleProductLaunch,
  useVocRows,
} from '../../services/queries'
import type { ProductId, VocRow } from '../../types'

function nps(rows: VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  const p = rows.reduce((s, r) => s + r.promoters, 0)
  const d = rows.reduce((s, r) => s + r.detractors, 0)
  return Math.round(((p - d) / n) * 100)
}
function csat(rows: VocRow[]): number | null {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return null
  return Math.round(rows.reduce((s, r) => s + r.csat * r.n, 0) / n)
}
function fmtSigned(v: number | null) {
  if (v == null) return '–'
  return (v > 0 ? '+' : '') + v
}

/** Ported and upgraded from `frontend/src/pages/Overview.tsx`
 * (APPLICATION_MODULES.md §C) — adds the per-product "no group NPS" framing
 * that v38 insists on (FR-7.4): this page never shows one blended number
 * across products, only each product's own line plus links out to the
 * lead funnel and public reputation index that actually live on
 * Surveys and triggers, rather than re-deriving them here. */
export default function SettingsOverview() {
  const { t, lang } = useI18n()
  const { role } = useRole()
  const canEdit = role.id === 'cxmgr'
  const { data: products } = useProducts()
  const { data: vocRows } = useVocRows()
  const { data: actions } = useCorrectiveActions()
  const { data: cases } = useShopperCases()
  const toggleLaunch = useToggleProductLaunch()

  const launched = (products ?? []).filter((p) => p.live)
  const openActions = (actions ?? []).filter((a) => a.status !== 'effective' && a.status !== 'failed').length
  const criticalCases = (cases ?? []).filter((c) => c.severity === 'critical' && c.status !== 'closed').length

  function rowsFor(id: ProductId) {
    return (vocRows ?? []).filter((r) => r.product === id)
  }

  return (
    <div className="col">
      <div className="row between">
        <p className="text-sm muted" style={{ maxWidth: '60ch' }}>
          {t('Headline experience scores, per product — never one blended number (FR-7.4).', 'مؤشرات التجربة الرئيسية لكل منتج — دون رقم إجمالي واحد أبداً.')}
        </p>
        <SampleBanner />
      </div>

      <div className="grid grid-4">
        <Tile label={t('Open corrective actions', 'الإجراءات التصحيحية المفتوحة')} value={openActions} />
        <Tile label={t('Critical shopper cases open', 'حالات متسوق حرجة مفتوحة')} value={criticalCases} colorVar={criticalCases ? '--crit' : undefined} />
        <Tile label={t('Products live', 'المنتجات المفعّلة')} value={`${launched.length} / ${products?.length ?? 6}`} />
        <Tile label={t('Group NPS', 'مؤشر NPS الإجمالي')} value={t('None, by design', 'لا يوجد، بالتصميم')} />
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Per-product experience', 'التجربة لكل منتج')}</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('Product', 'المنتج')}</th><th className="num">NPS</th><th className="num">CSAT</th><th className="num">{t('Responses', 'الردود')}</th></tr></thead>
            <tbody>
              {(products ?? []).map((p) => {
                const rows = rowsFor(p.id)
                return (
                  <tr key={p.id}>
                    <td><ProductTag productId={p.id} lang={lang} />{!p.live && <span className="muted text-sm"> · {t('hidden', 'مخفي')}</span>}</td>
                    <td className="num">{fmtSigned(nps(rows))}</td>
                    <td className="num">{csat(rows) != null ? `${csat(rows)}%` : '–'}</td>
                    <td className="num mono">{rows.reduce((s, r) => s + r.n, 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>{t('Product launch', 'إطلاق المنتج')}</h2></div>
        <div className="col" style={{ gap: 6 }}>
          {(products ?? []).map((p) => (
            <div className="row between" key={p.id}>
              <ProductTag productId={p.id} lang={lang} />
              {canEdit ? (
                <label className="row">
                  <input type="checkbox" checked={p.live} onChange={() => toggleLaunch.mutate({ id: p.id })} />
                  <Chip tone={p.live ? 'good' : undefined}>{p.live ? t('Live', 'مُفعّل') : t('Hidden', 'مخفي')}</Chip>
                </label>
              ) : (
                <Chip tone={p.live ? 'good' : undefined}>{p.live ? t('Live', 'مُفعّل') : t('Hidden', 'مخفي')}</Chip>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm muted" style={{ marginTop: 8 }}>{t('Hidden products disappear from menus, cards and filters everywhere in the portal.', 'تختفي المنتجات المخفية من القوائم والبطاقات والفلاتر في كل أنحاء البوابة.')}</p>
      </div>

      <div className="grid grid-2">
        <div className="card tint">
          <span className="chip accent">{t('Lead funnel', 'مسار العملاء المحتملين')}</span>
          <p className="text-sm" style={{ marginTop: 8 }}>
            {t('The enquiry-to-signed funnel and its source split live on Surveys and triggers.', 'يوجد مسار الاستفسار حتى التوقيع وتوزيع مصادره في صفحة الاستبيانات والمحفزات.')}
          </p>
          <Link to="/surveys" className="btn sm" style={{ marginTop: 8 }}>{t('Open Surveys and triggers', 'فتح الاستبيانات والمحفزات')}</Link>
        </div>
        <div className="card tint">
          <span className="chip warn">{t('Public reputation index', 'مؤشر السمعة العامة')}</span>
          <p className="text-sm" style={{ marginTop: 8 }}>
            {t('Facebook/Instagram/LinkedIn/Google mentions are never surveyed — replied to within 48 hours instead, tracked under Signals & patterns.', 'إشارات فيسبوك وإنستغرام ولينكدإن وجوجل لا تُستطلع أبداً — يُرد عليها خلال 48 ساعة، وتُتابع ضمن الإشارات والأنماط.')}
          </p>
          <Link to="/actions/signals" className="btn sm" style={{ marginTop: 8 }}>{t('Open Signals & patterns', 'فتح الإشارات والأنماط')}</Link>
        </div>
      </div>
    </div>
  )
}
