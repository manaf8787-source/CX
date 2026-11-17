import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { useGlossaryTerms } from '../../services/queries'

/** Ported from `frontend/src/pages/Glossary.tsx`, extended with v38 terms,
 * and given the search box NFR-6 asks for: "a sitewide 'What the terms
 * mean' search modal, sourced from one glossary data file" — this page
 * *is* that one data file's reference view; the sitewide "?" affordance
 * reading the same `useGlossaryTerms()` hook is a later, separate build
 * pass (each page would need its own "?" wiring), not done here. */
export default function Glossary() {
  const { t, L } = useI18n()
  const { data: terms } = useGlossaryTerms()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return terms ?? []
    return (terms ?? []).filter((g) => L(g.term).toLowerCase().includes(needle) || L(g.definition).toLowerCase().includes(needle))
  }, [terms, q, L])

  return (
    <div className="col">
      <p className="text-sm muted">{t('Plain definitions for the terms used across the portal.', 'تعريفات مبسّطة للمصطلحات المستخدمة في البوابة.')}</p>
      <input type="search" placeholder={t('Search terms…', 'ابحث عن مصطلح…')} value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
      <div className="grid grid-2">
        {filtered.map((g) => (
          <div className="card" key={L(g.term)}>
            <b>{L(g.term)}</b>
            <p className="text-sm muted" style={{ marginTop: 4 }}>{L(g.definition)}</p>
          </div>
        ))}
        {!filtered.length && <div className="empty-state">{t('No terms match your search.', 'لا توجد مصطلحات مطابقة لبحثك.')}</div>}
      </div>
    </div>
  )
}
