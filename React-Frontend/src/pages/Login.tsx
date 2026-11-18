import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { ArrowRight, Check, Info, Layers, Loader2, ShieldCheck, Target } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuth } from '@/auth/session'
import { FOLDED_ROLE_IDS, ROLE_DEFS, SIGN_IN_COPY, foldedRoleDefs, mainRoleDefs, roleDef } from '@/data/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { LangSwitch } from '@/components/common/LangSwitch'
import { ThemeSwitch } from '@/components/common/ThemeSwitch'
import { dirSign, DURATION, EASE_OUT, EXIT } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { RoleDef, RoleId } from '@/types'

const ROLE_IDS = ROLE_DEFS.map((r) => r.id) as [RoleId, ...RoleId[]]

const BRAND_POINTS = [
  { icon: Layers, en: 'Every contact, from every channel, on one timeline', ar: 'كل تواصل، من كل قناة، على خط زمني واحد' },
  { icon: Target, en: 'Signals are counted; a pattern gets one corrective action with an owner', ar: 'الإشارات تُحصى؛ والنمط يحصل على إجراء تصحيحي واحد له مالك' },
  { icon: ShieldCheck, en: 'Each role sees only what it should', ar: 'كل دور يرى ما يخصه فقط' },
]

const brandList = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }
// v40 (F28): six main roles on the sign-in screen; the others sit under "Other roles used in the demo".
const MAIN_ROLES = mainRoleDefs()
const FOLDED_ROLES = foldedRoleDefs()

const brandItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } } }

/** Placeholder brand mark. [Proposed]: the real PSI logo has not been confirmed. */
function BrandMark({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <span
      title={t('Placeholder logo [Proposed]', 'شعار مؤقت [مقترح]')}
      className={cn('flex shrink-0 items-center justify-center rounded-xl bg-gold font-bold text-gold-foreground shadow-sm', className)}
    >
      CX
    </span>
  )
}

/** Thin navy/gold line pattern that drifts slowly; static under reduced motion (theme.css). */
function BrandMotif() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="cx-drift absolute -inset-24 h-[calc(100%+12rem)] w-[calc(100%+12rem)] text-sidebar-foreground/[0.07]">
        <defs>
          <pattern id="cx-lines" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
            <path d="M0 22H44" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cx-lines)" />
      </svg>
      <svg viewBox="0 0 400 400" className="cx-orbit absolute -end-40 -bottom-40 size-[28rem] text-gold/25 lg:size-[36rem]">
        {[60, 100, 140, 180].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray={r === 140 ? '4 10' : undefined} />
        ))}
      </svg>
    </div>
  )
}

function BrandPanel() {
  const { t } = useI18n()
  return (
    <section
      aria-label="PSI CX Portal"
      className="relative isolate flex flex-col overflow-hidden bg-sidebar px-5 py-6 text-sidebar-foreground sm:px-8 lg:min-h-svh lg:justify-between lg:p-12"
    >
      <BrandMotif />
      <m.div variants={brandList} initial="hidden" animate="show" className="relative flex flex-col gap-5 lg:gap-10">
        <m.div variants={brandItem} className="flex items-center gap-3">
          <BrandMark className="size-10 text-base lg:size-12 lg:text-lg" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-lg font-semibold lg:text-xl">PSI CX Portal</span>
            <span className="truncate text-sm text-sidebar-muted-foreground">{t('Customer experience · PSI Real Estate', 'تجربة العملاء · PSI العقارية')}</span>
          </div>
        </m.div>

        <m.p variants={brandItem} className="max-w-md text-xl leading-snug font-semibold text-balance lg:text-3xl lg:leading-tight">
          {t('One record per person.', 'سجل واحد لكل شخص.')}{' '}
          <span className="text-gold">{t('Every channel, one timeline.', 'كل القنوات، خط زمني واحد.')}</span>
        </m.p>

        <m.ul variants={brandList} className="hidden max-w-md flex-col gap-4 lg:flex">
          {BRAND_POINTS.map(({ icon: Icon, en, ar }) => (
            <m.li key={en} variants={brandItem} className="flex items-start gap-3 text-base text-sidebar-foreground/90">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-gold">
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="pt-1">{t(en, ar)}</span>
            </m.li>
          ))}
        </m.ul>
      </m.div>

      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: DURATION.slow }}
        className="relative hidden text-sm text-sidebar-muted-foreground lg:block"
      >
        {t('Prototype v40 · sample data only', 'نموذج أولي الإصدار 40 · بيانات نموذجية فقط')}
      </m.p>
    </section>
  )
}

export default function Login() {
  const { t, L, dir } = useI18n()
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [phase, setPhase] = useState<'idle' | 'pending' | 'leaving'>('idle')

  // A short "signing in" beat, then the card leaves and the app takes over.
  useEffect(() => {
    if (phase !== 'pending') return
    const id = window.setTimeout(() => setPhase('leaving'), 550)
    return () => window.clearTimeout(id)
  }, [phase])

  const from = (location.state as { from?: string } | null)?.from
  const returnTo = from && !from.startsWith('/login') ? from : undefined

  const schema = useMemo(
    () =>
      z.object({
        role: z.enum(ROLE_IDS, { error: t('Choose a role to continue.', 'اختر دوراً للمتابعة.') }),
        displayName: z
          .string()
          .trim()
          .max(40, t('Use 40 characters or fewer.', 'استخدم 40 حرفاً أو أقل.')),
      }),
    [t],
  )
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { displayName: '' } })
  const selected = useWatch({ control, name: 'role' })
  const selectedDef = roleDef(selected ?? null)

  if (session && phase === 'idle') return <Navigate to={returnTo ?? '/home'} replace />

  const onValid = () => setPhase('pending')

  const finish = () => {
    const { role, displayName } = getValues()
    signIn(role, displayName)
    navigate(returnTo ?? roleDef(role)?.home ?? '/home', { replace: true })
  }

  const sign = dirSign(dir)

  const roleCard = (r: RoleDef) => {
    const isSelected = selected === r.id
    return (
      <label
        key={r.id}
        className={cn(
          'group relative flex min-h-14 cursor-pointer flex-col justify-center gap-0.5 rounded-xl border bg-card px-3 py-2.5 pe-9 text-start lg:min-h-12 lg:py-2',
          'transition-[border-color,background-color,box-shadow,translate,scale] duration-200 ease-out',
          'hover:-translate-y-px hover:border-primary/40 hover:shadow-sm active:scale-[0.99]',
          'motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
          'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
          isSelected && 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary dark:bg-primary/10',
        )}
      >
        <input type="radio" value={r.id} className="sr-only" {...register('role')} disabled={phase !== 'idle'} />
        <span className="text-sm font-semibold">{L(r.name)}</span>
        {/* The full description is the card's tooltip and, once the card is chosen, the line under the cards; the card clamps it to four lines. */}
        <span title={L(r.description)} className="line-clamp-4 text-xs text-muted-foreground">
          {L(r.description)}
        </span>
        <AnimatePresence>
          {isSelected && (
            <m.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: EXIT }}
              className="absolute end-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </m.span>
          )}
        </AnimatePresence>
      </label>
    )
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />

      <main className="flex min-w-0 flex-col px-4 pt-4 pb-10 sm:px-8 lg:px-10 lg:pb-4">
        <div className="flex items-center justify-end gap-1">
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
                className="w-full max-w-xl xl:max-w-2xl"
              >
                <form
                  noValidate
                  onSubmit={handleSubmit(onValid)}
                  className="flex flex-col gap-5 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm sm:p-7 lg:gap-4 lg:p-6"
                  aria-busy={phase !== 'idle'}
                >
                  <div className="flex flex-col gap-1.5">
                    <h1 className="text-2xl font-semibold tracking-tight">{L(SIGN_IN_COPY.title)}</h1>
                    <p className="text-muted-foreground">{L(SIGN_IN_COPY.note)}</p>
                  </div>

                  <div role="note" className="flex gap-3 rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info-text">
                    <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <p>
                      <strong className="font-semibold">{t('Sample sign-in — no real authentication.', 'تسجيل دخول نموذجي — بلا مصادقة حقيقية.')}</strong>{' '}
                      {t(
                        'No password is asked for or stored, and every name and number in the portal is sample data.',
                        'لا تُطلب أي كلمة مرور ولا تُحفظ، وكل الأسماء والأرقام في البوابة بيانات نموذجية.',
                      )}
                    </p>
                  </div>

                  <fieldset className="flex min-w-0 flex-col gap-3" aria-invalid={!!errors.role} aria-describedby={errors.role ? 'role-error' : undefined}>
                    <legend className="mb-3 text-sm font-medium lg:mb-2">{t('Sign in as', 'تسجيل الدخول بصفة')}</legend>
                    <div data-group="main-roles" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{MAIN_ROLES.map(roleCard)}</div>
                    <details className="group/other rounded-xl border bg-card px-3 py-2" open={FOLDED_ROLE_IDS.includes(selected as RoleId) || undefined}>
                      <summary className="cursor-pointer text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{L(SIGN_IN_COPY.otherRoles)}</summary>
                      <div data-group="other-roles" className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{FOLDED_ROLES.map(roleCard)}</div>
                    </details>
                    {errors.role && <FieldError id="role-error">{errors.role.message}</FieldError>}
                    <div aria-live="polite" className="min-h-0">
                      <AnimatePresence mode="wait" initial={false}>
                        {selectedDef && (
                          <m.p
                            key={selectedDef.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, transition: EXIT }}
                            className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground"
                          >
                            <span className="font-semibold text-foreground">{L(selectedDef.name)}:</span> {L(selectedDef.description)}
                          </m.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </fieldset>

                  <Field data-invalid={!!errors.displayName}>
                    <FieldLabel htmlFor="login-name">{t('Your name (optional)', 'اسمك (اختياري)')}</FieldLabel>
                    <Input
                      id="login-name"
                      autoComplete="nickname"
                      maxLength={60}
                      aria-invalid={!!errors.displayName}
                      disabled={phase !== 'idle'}
                      className="h-10"
                      {...register('displayName')}
                    />
                    <FieldDescription>{t('Shown in the header. Leave blank to show the role title.', 'يظهر في الشريط العلوي. اتركه فارغاً لعرض اسم الدور.')}</FieldDescription>
                    {errors.displayName && <FieldError>{errors.displayName.message}</FieldError>}
                  </Field>

                  <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={phase !== 'idle'}>
                    {phase === 'idle' ? (
                      <>
                        {selectedDef ? t(`Sign in as ${selectedDef.name.en}`, `تسجيل الدخول بصفة ${selectedDef.name.ar}`) : t('Sign in', 'تسجيل الدخول')}
                        <ArrowRight aria-hidden className="rtl:rotate-180" />
                      </>
                    ) : (
                      <>
                        <Loader2 aria-hidden className="animate-spin" />
                        {t('Signing in…', 'جارٍ تسجيل الدخول…')}
                      </>
                    )}
                  </Button>
                </form>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
