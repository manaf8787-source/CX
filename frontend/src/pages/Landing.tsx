import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useRole } from '../auth/RoleContext'
import { ROLE_DEFS } from '../data/roles'
import { SampleBanner } from '../components/ui/Chip'
import type { RoleId } from '../types'

export default function Landing() {
  const { L, t, lang, toggleLang } = useI18n()
  const { setRole } = useRole()
  const navigate = useNavigate()

  function enter(id: RoleId) {
    setRole(id)
    const home = ROLE_DEFS.find((r) => r.id === id)?.home ?? '/overview'
    navigate(home)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="row between">
        <div className="pagehead">
          <div className="row">
            <div className="logo" style={{ width: 40, height: 40, fontSize: 15 }}>CX</div>
            <h1>{t('PSI CX Portal', 'بوابة تجربة العملاء بي إس آي')}</h1>
          </div>
          <p className="lede">{t('One entry per role — no passwords in the prototype. Pick how you want to sign in.', 'مدخل واحد لكل دور — بدون كلمات مرور في النموذج الأولي. اختر طريقة الدخول.')}</p>
        </div>
        <div className="row">
          <SampleBanner />
          <button className="btn s" onClick={toggleLang}>{lang === 'en' ? 'العربية' : 'English'}</button>
        </div>
      </div>

      <div className="grid g3">
        {ROLE_DEFS.map((r) => (
          <button key={r.id} className="card" style={{ textAlign: 'start', cursor: 'pointer' }} onClick={() => enter(r.id)}>
            <div className="card-h"><h2>{L(r.name)}</h2></div>
            <p className="sm muted">{L(r.description)}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
