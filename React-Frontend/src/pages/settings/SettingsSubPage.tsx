import { useI18n } from '../../i18n'
import type { Bi } from '../../types'

/** One generic stub shared by every "Settings and reference" sub-page — the
 * pre-omnichannel `frontend/` scaffold already has working content for most
 * of these (APPLICATION_MODULES.md §C); porting that content is a later
 * build pass, not foundation. */
export default function SettingsSubPage({ title, lede, scaffoldNote }: { title: Bi; lede: Bi; scaffoldNote?: Bi }) {
  const { L, t } = useI18n()
  return (
    <div className="card col">
      <h2>{L(title)}</h2>
      <p className="muted">{L(lede)}</p>
      {scaffoldNote && (
        <div className="card tint text-sm">
          <b>{t('Reuse note: ', 'ملاحظة إعادة استخدام: ')}</b>
          {L(scaffoldNote)}
        </div>
      )}
    </div>
  )
}
