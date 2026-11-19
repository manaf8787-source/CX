import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { ArrowRight, ChevronDown, Layers, Loader2, ShieldCheck, Target } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuth } from '@/auth/session'
import { canAccessPath } from '@/auth/access'
import { roleDef } from '@/data/roles'
import { acceptInvite, findUserByEmail, findUserByToken, listUsers, type PortalUser } from '@/data/users'
import { audit } from '@/data/auditLog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InlineNote } from '@/components/common/InlineNote'
import { BrandLogo } from '@/components/common/BrandLogo'
import { LangSwitch } from '@/components/common/LangSwitch'
import { ThemeSwitch } from '@/components/common/ThemeSwitch'
import { dirSign, DURATION, EASE_OUT, EXIT } from '@/lib/motion'
import { cn } from '@/lib/utils'

const BRAND_POINTS = [
  { icon: Layers, en: 'Every contact, from every channel, on one timeline', ar: 'كل تواصل، من كل قناة، على خط زمني واحد' },
  { icon: Target, en: 'Signals are counted; a pattern gets one corrective action with an owner', ar: 'الإشارات تُحصى؛ والنمط يحصل على إجراء تصحيحي واحد له مالك' },
  { icon: ShieldCheck, en: 'Each role sees only what it should', ar: 'كل دور يرى ما يخصه فقط' },
]

const brandList = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }
const brandItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } } }

/** The skill's dot-grid motif (the empty-state well): static, decorative, a few dots lit. */
const MOTIF_COLUMNS = 14
const MOTIF_LIT = new Set([16, 17, 30, 31, 32, 45])
const MOTIF_DOTS = Array.from({ length: MOTIF_COLUMNS * 4 }, (_, i) => (
  <span key={i} className={cn('size-2.5 rounded-full', MOTIF_LIT.has(i) ? 'bg-grad-dark shadow-raised-dark' : 'bg-line shadow-dot-off')} />
))

function BrandMotif() {
  return (
    <div aria-hidden className="well hidden w-fit lg:block">
      <div className="grid gap-[7px]" style={{ gridTemplateColumns: `repeat(${MOTIF_COLUMNS}, 10px)` }}>
        {MOTIF_DOTS}
      </div>
    </div>
  )
}

/** The brand side: the soft grey tone (the skill's sidebar), so the tone change is the edge and the sign-in card sits on the white page. */
function BrandPanel() {
  const { t } = useI18n()
  return (
    <section aria-label="PSI CX Portal" className="relative isolate flex flex-col overflow-hidden bg-sidebar px-5 py-6 sm:px-8 lg:min-h-svh lg:justify-between lg:p-12">
      <m.div variants={brandList} initial="hidden" animate="show" className="relative flex flex-col gap-5 lg:gap-12">
        <m.div variants={brandItem} className="flex items-center gap-3">
          <BrandLogo decorative className="h-9 lg:h-11" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="t-h4 truncate lg:text-[20px]">PSI CX Portal</span>
            <span className="truncate text-sm text-muted-foreground">{t('Customer experience · PSI Real Estate', 'تجربة العملاء · PSI العقارية')}</span>
          </div>
        </m.div>

        <m.p variants={brandItem} className="max-w-md text-2xl leading-[1.15] font-medium text-balance lg:text-4xl lg:leading-[1.1]">
          {t('One record per person.', 'سجل واحد لكل شخص.')} <span className="text-muted-foreground">{t('Every channel, one timeline.', 'كل القنوات، خط زمني واحد.')}</span>
        </m.p>

        <m.ul variants={brandList} className="hidden max-w-md flex-col gap-5 lg:flex">
          {BRAND_POINTS.map(({ icon: Icon, en, ar }) => (
            <m.li key={en} variants={brandItem} className="flex items-start gap-3.5">
              <span aria-hidden className="material-light inline-grid size-[30px] shrink-0 place-items-center rounded-full">
                <Icon className="size-4" />
              </span>
              <span className="t-body-m pt-0.5">{t(en, ar)}</span>
            </m.li>
          ))}
        </m.ul>
      </m.div>

      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: DURATION.slow }} className="relative hidden flex-col gap-4 lg:flex">
        <BrandMotif />
        <p className="text-sm text-muted-foreground">{t('Prototype v43 · sample data only', 'نموذج أولي الإصدار 43 · بيانات نموذجية فقط')}</p>
      </m.div>
    </section>
  )
}

type Phase = 'idle' | 'pending' | 'leaving'

/**
 * Sign-in (v43, 19 Nov): email and password, no role picker. The role comes from the user directory the super admin keeps
 * (`data/users.ts`). An invitation link (`/login?invite=<code>`) opens the "set up your account" step instead: the invited person
 * confirms their name, sets a password and is signed in with the role the admin gave them.
 *
 * Prototype: no email is sent and the password is not stored or checked; the card says so.
 */
export default function Login() {
  const { t, dir } = useI18n()
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [phase, setPhase] = useState<Phase>('idle')
  const [target, setTarget] = useState<PortalUser | null>(null)

  const inviteToken = params.get('invite')
  const invited = useMemo(() => (inviteToken ? findUserByToken(inviteToken) : undefined), [inviteToken])
  const badInvite = !!inviteToken && !invited

  // A short "signing in" beat, then the card leaves and the app takes over.
  useEffect(() => {
    if (phase !== 'pending') return
    const id = window.setTimeout(() => setPhase('leaving'), 550)
    return () => window.clearTimeout(id)
  }, [phase])

  const from = (location.state as { from?: string } | null)?.from
  const returnTo = from && !from.startsWith('/login') ? from : undefined

  if (session && phase === 'idle') return <Navigate to={returnTo ?? '/home'} replace />

  const finish = () => {
    if (!target) return
    signIn(target)
    // back to where they were going only if their role may open it; otherwise the role's own home
    const home = roleDef(target.roleId)?.home ?? '/home'
    navigate(returnTo && canAccessPath(target.roleId, returnTo.split('?')[0]) ? returnTo : home, { replace: true })
  }

  const go = (user: PortalUser) => {
    setTarget(user)
    setPhase('pending')
  }

  const sign = dirSign(dir)

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />

      <main className="flex min-w-0 flex-col px-4 pt-4 pb-10 sm:px-8 lg:px-10 lg:pb-4">
        <div className="flex items-center justify-end gap-2">
          <LangSwitch />
          <ThemeSwitch />
        </div>

        <div className="flex flex-1 items-center justify-center py-4 lg:py-2">
          <AnimatePresence onExitComplete={finish}>
            {phase !== 'leaving' && (
              <m.div
                key="card"
                initial={{ opacity: 0, x: 24 * sign }}
                animate={{ opacity: 1, x: 0, transition: { duration: DURATION.slow, ease: EASE_OUT, delay: 0.1 } }}
                exit={{ opacity: 0, scale: 0.98, transition: EXIT }}
                className="w-full max-w-md"
              >
                <Card variant="frame">
                  {invited ? (
                    <AcceptInviteForm user={invited} phase={phase} onDone={go} />
                  ) : (
                    <SignInForm phase={phase} badInvite={badInvite} onDone={go} />
                  )}
                </Card>
                <p className="mt-3 px-1 text-center text-xs text-muted-foreground">
                  {t('No account? Ask the super admin for an invitation — there is no self sign-up.', 'لا حساب لديك؟ اطلب دعوة من المدير العام للنظام — لا يوجد تسجيل ذاتي.')}
                </p>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </main>

    </div>
  )
}

function SubmitButton({ phase, label }: { phase: Phase; label: string }) {
  const { t } = useI18n()
  return (
    <Button type="submit" size="lg" roll={false} className="h-auto min-h-[46px] w-full py-2 text-center" disabled={phase !== 'idle'}>
      {phase === 'idle' ? (
        <>
          <span>{label}</span>
          <ArrowRight aria-hidden className="rtl:rotate-180" />
        </>
      ) : (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          {t('Signing in…', 'جارٍ تسجيل الدخول…')}
        </>
      )}
    </Button>
  )
}

function SignInForm({ phase, badInvite, onDone }: { phase: Phase; badInvite: boolean; onDone: (u: PortalUser) => void }) {
  const { t, L } = useI18n()
  const [lookupError, setLookupError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        email: z.email({ error: t('Enter your work email.', 'أدخل بريدك الوظيفي.') }),
        password: z.string().min(1, t('Enter your password.', 'أدخل كلمة المرور.')),
      }),
    [t],
  )
  type FormValues = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  const onValid = ({ email }: FormValues) => {
    const user = findUserByEmail(email)
    if (!user) {
      setLookupError(t('No account with this email. Ask the super admin for an invitation.', 'لا يوجد حساب بهذا البريد. اطلب دعوة من المدير العام للنظام.'))
      return
    }
    if (user.status === 'disabled') {
      setLookupError(t('This account is deactivated. Ask the super admin to reactivate it.', 'هذا الحساب موقوف. اطلب من المدير العام للنظام إعادة تفعيله.'))
      return
    }
    if (user.status === 'invited') {
      setLookupError(t('Your invitation has not been accepted yet. Open the invitation link you received.', 'لم تُقبل دعوتك بعد. افتح رابط الدعوة الذي وصلك.'))
      return
    }
    setLookupError(null)
    onDone(user)
  }

  const samples = listUsers().filter((u) => u.status === 'active')

  return (
    <form noValidate onSubmit={handleSubmit(onValid)} className="surface-frame-inner flex flex-col gap-5 p-5 text-card-foreground sm:p-7" aria-busy={phase !== 'idle'}>
      <div className="flex flex-col gap-1.5">
        <h1 className="t-page-title">{t('Sign in', 'تسجيل الدخول')}</h1>
        <p className="t-body-m">{t('Use the work email the super admin invited. Your role is set on your account.', 'استخدم البريد الوظيفي الذي دُعيت عليه. دورك محدد على حسابك.')}</p>
      </div>

      {badInvite && (
        <InlineNote role="status" tone="warning">
          <strong className="font-medium">{t('This invitation link is no longer valid.', 'رابط الدعوة هذا لم يعد صالحاً.')}</strong>{' '}
          <span className="text-muted-foreground">{t('It was already used or replaced. Sign in below, or ask for a new invitation.', 'استُخدم من قبل أو استُبدل. سجّل الدخول أدناه، أو اطلب دعوة جديدة.')}</span>
        </InlineNote>
      )}

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="login-email">{t('Work email', 'البريد الوظيفي')}</FieldLabel>
        <Input id="login-email" type="email" autoComplete="username" inputMode="email" dir="ltr" aria-invalid={!!errors.email} disabled={phase !== 'idle'} {...register('email')} />
        {errors.email && <FieldError>{errors.email.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="login-password">{t('Password', 'كلمة المرور')}</FieldLabel>
        <Input id="login-password" type="password" autoComplete="current-password" dir="ltr" aria-invalid={!!errors.password} disabled={phase !== 'idle'} {...register('password')} />
        {errors.password && <FieldError>{errors.password.message}</FieldError>}
        <FieldDescription>{t('Prototype: the password is not stored or checked yet. The real sign-in will use the company directory.', 'نموذج أولي: كلمة المرور لا تُحفظ ولا تُفحص بعد. تسجيل الدخول الحقيقي سيكون عبر دليل الشركة.')}</FieldDescription>
      </Field>

      {lookupError && (
        <InlineNote role="status" tone="error">
          {lookupError}
        </InlineNote>
      )}

      <SubmitButton phase={phase} label={t('Sign in', 'تسجيل الدخول')} />

      <details className="group/samples">
        <summary className="t-small-strong flex min-h-9 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 text-start text-muted-foreground outline-hidden [&::-webkit-details-marker]:hidden">
          {t('Sample accounts for the demo', 'حسابات نموذجية للعرض')}
          <span aria-hidden className="material-light inline-grid size-[26px] shrink-0 place-items-center rounded-full">
            <ChevronDown className="size-3.5 transition-transform duration-400 ease-spring group-open/samples:rotate-180 motion-reduce:transition-none" />
          </span>
        </summary>
        <ul className="mt-2 flex flex-col gap-1">
          {samples.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                disabled={phase !== 'idle'}
                onClick={() => {
                  setValue('email', u.email, { shouldValidate: true })
                  setValue('password', 'sample', { shouldValidate: true })
                  setLookupError(null)
                }}
                className="glass ring-within flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start transition-[background-color] duration-200 hover:bg-well-hover"
              >
                <span className="t-ui-strong truncate">{L(roleDef(u.roleId)?.name ?? { en: u.roleId, ar: u.roleId })}</span>
                <span className="truncate text-xs text-muted-foreground" dir="ltr">
                  {u.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </form>
  )
}

function AcceptInviteForm({ user, phase, onDone }: { user: PortalUser; phase: Phase; onDone: (u: PortalUser) => void }) {
  const { t, L } = useI18n()
  const role = roleDef(user.roleId)

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(2, t('Enter your name.', 'أدخل اسمك.')).max(60, t('Use 60 characters or fewer.', 'استخدم 60 حرفاً أو أقل.')),
          password: z.string().min(8, t('Use at least 8 characters.', 'استخدم 8 أحرف على الأقل.')),
          confirm: z.string(),
        })
        .refine((v) => v.password === v.confirm, { message: t('The two passwords differ.', 'كلمتا المرور مختلفتان.'), path: ['confirm'] }),
    [t],
  )
  type FormValues = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: user.name, password: '', confirm: '' } })

  const onValid = ({ name }: FormValues) => {
    const active = acceptInvite(user.id, name)
    if (active) {
      audit({ userId: active.id, email: active.email, roleId: active.roleId }, 'invite_accepted', { en: 'Accepted the invitation and set a password', ar: 'قبل الدعوة ووضع كلمة مرور' }, '/login')
      onDone(active)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onValid)} className="surface-frame-inner flex flex-col gap-5 p-5 text-card-foreground sm:p-7" aria-busy={phase !== 'idle'}>
      <div className="flex flex-col gap-1.5">
        <h1 className="t-page-title">{t('Set up your account', 'إعداد حسابك')}</h1>
        <p className="t-body-m">
          {t('You were invited as', 'تمت دعوتك بصفة')} <span className="font-medium text-foreground">{role ? L(role.name) : user.roleId}</span>
          {' · '}
          <span dir="ltr">{user.email}</span>
        </p>
      </div>

      {role && (
        <InlineNote role="note">
          <span className="text-muted-foreground">{L(role.description)}</span>
        </InlineNote>
      )}

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="invite-name">{t('Your name', 'اسمك')}</FieldLabel>
        <Input id="invite-name" autoComplete="name" maxLength={60} aria-invalid={!!errors.name} disabled={phase !== 'idle'} {...register('name')} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="invite-password">{t('Choose a password', 'اختر كلمة مرور')}</FieldLabel>
        <Input id="invite-password" type="password" autoComplete="new-password" dir="ltr" aria-invalid={!!errors.password} disabled={phase !== 'idle'} {...register('password')} />
        {errors.password && <FieldError>{errors.password.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.confirm}>
        <FieldLabel htmlFor="invite-confirm">{t('Repeat the password', 'أعد كتابة كلمة المرور')}</FieldLabel>
        <Input id="invite-confirm" type="password" autoComplete="new-password" dir="ltr" aria-invalid={!!errors.confirm} disabled={phase !== 'idle'} {...register('confirm')} />
        {errors.confirm && <FieldError>{errors.confirm.message}</FieldError>}
        <FieldDescription>{t('Prototype: the password is not stored yet.', 'نموذج أولي: كلمة المرور لا تُحفظ بعد.')}</FieldDescription>
      </Field>

      <SubmitButton phase={phase} label={t('Accept and sign in', 'قبول الدعوة وتسجيل الدخول')} />
    </form>
  )
}
