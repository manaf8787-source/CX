import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useI18n } from '../i18n'
import { Tile } from '../components/common/Tile'
import { SampleBanner } from '../components/common/SampleBanner'
import { useHomeSummary, usePersons } from '../services/queries'

/** FR-1.1–1.5. The search box resolving to a person vs. routing free text to
 * the assistant is wired against the mock person list; the assistant hand-off
 * itself lives in AssistantPanel (fully mocked, per the user's decision). */
export default function Home() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: summary } = useHomeSummary()
  const { data: persons } = usePersons()
  const [query, setQuery] = useState('')

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const needle = query.trim().toLowerCase()
    const match = persons?.find((p) => p.name.toLowerCase().includes(needle) || p.identity.mobile?.includes(needle))
    if (match) navigate(`/customers/${match.id}`)
    else navigate(`/customers?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className="skeleton-page">
      <div className="topbar">
        <div className="page-head">
          <h1>{t('Home', 'الرئيسية')}</h1>
          <p className="page-lede">{t('One search box. A name, mobile, ID or unit opens a person.', 'مربع بحث واحد. اسم أو رقم جوال أو هوية أو وحدة يفتح ملف الشخص.')}</p>
        </div>
        <SampleBanner />
      </div>

      <form className="card" onSubmit={onSearch}>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <Search size={16} className="muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Name, mobile, ID, unit — or a free-text question for the assistant', 'اسم، جوال، هوية، وحدة — أو سؤال حر للمساعد')}
          />
          <button type="submit" className="btn primary">{t('Search', 'بحث')}</button>
        </div>
      </form>

      <div className="grid grid-5">
        <Tile label={t('Runaway', 'الهاربون')} value={summary?.runawayCount ?? '—'} colorVar="--crit" onClick={() => navigate('/runaway')} />
        <Tile label={t('Open actions', 'الإجراءات المفتوحة')} value={summary?.openActions ?? '—'} colorVar="--warn" onClick={() => navigate('/actions')} />
        <Tile label={t('Personas', 'الشخصيات')} value={summary?.personaCount ?? '—'} colorVar="--brand" onClick={() => navigate('/personas')} />
        <Tile label={t('Journeys', 'الرحلات')} value={summary?.journeysViewed ?? '—'} colorVar="--p-af" onClick={() => navigate('/customers')} />
        <Tile label={t('To call', 'للاتصال')} value={summary?.toCall ?? '—'} colorVar="--good" onClick={() => navigate('/close-the-loop')} />
      </div>
    </div>
  )
}
