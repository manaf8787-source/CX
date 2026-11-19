import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { ArrowRight, Check, ChevronDown, Layers, Loader2, ShieldCheck, Target } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useAuth } from '@/auth/session'
import { FOLDED_ROLE_IDS, ROLE_DEFS, SIGN_IN_COPY, foldedRoleDefs, mainRoleDefs, roleDef } from '@/data/roles'
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

/** The skill's dot-grid motif (the empty-state well): static, decorative, a few dots lit. Replaces the old drifting line pattern. */
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
          {/* the owner's CX logo (19 Nov): the letters in ink, the point going round */}
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

      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: DURATION.slow }}
        className="relative hidden flex-col gap-4 lg:flex"
      >
        <BrandMotif />
        <p className="text-sm text-muted-foreground">{t('Prototype v42 · sample data only', 'نموذج أولي الإصدار 42 · بيانات نموذجية فقط')}</p>
      </m.div>
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

  /** A role is a row of the sign-in card: a quiet well, and the dark material once it is chosen (selected = dark). The radio itself is
   * visually hidden inside the label, so the label draws the focus ring (`ring-within`). */
  const roleCard = (r: RoleDef) => {
    const isSelected = selected === r.id
    return (
      <label
        key={r.id}
        className={cn(
          'group relative flex min-h-14 cursor-pointer flex-col justify-center gap-0.5 rounded-xl px-3.5 py-3 pe-11 text-start transition-[background-color,color] duration-200 ease-out lg:min-h-12 lg:py-2.5',
          'ring-within',
          isSelected ? 'material-dark' : 'bg-well hover:bg-well-hover',
        )}
      >
        <input type="radio" value={r.id} className="sr-only" {...register('role')} disabled={phase !== 'idle'} />
        <span className="t-ui-strong text-inherit">{L(r.name)}</span>
        {/* The full description is the card's tooltip and, once the card is chosen, the line under the cards; the card clamps it to four lines. */}
        <span title={L(r.description)} className={cn('line-clamp-4 text-xs', isSelected ? 'text-(--on-dark-muted)' : 'text-muted-foreground')}>
          {L(r.description)}
        </span>
        <span aria-hidden className="absolute end-3.5 top-3.5 size-5 rounded-full bg-card shadow-hairline" />
        <AnimatePresence>
          {isSelected && (
            <m.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: EXIT }}
              className="absolute end-3.5 top-3.5 flex size-5 items-center justify-center rounded-full bg-primary-foreground text-primary"
            >
              <Check className="size-3" strokeWidth={2.5} />
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
                className="w-full max-w-xl xl:max-w-2xl"
              >
                <Card variant="frame">
                  <form
                    noValidate
                    onSubmit={handleSubmit(onValid)}
                    className="surface-frame-inner flex flex-col gap-5 p-5 text-card-foreground sm:p-7 lg:gap-4 lg:p-6"
                    aria-busy={phase !== 'idle'}
                  >
                    <div className="flex flex-col gap-1.5">
                      <h1 className="t-page-title">{L(SIGN_IN_COPY.title)}</h1>
                      <p className="t-body-m">{L(SIGN_IN_COPY.note)}</p>
                    </div>

                    {/* the inline notification: a well and a 6px status dot, not a coloured banner */}
                    <InlineNote role="note">
                      <strong className="font-medium">{t('Sample sign-in — no real authentication.', 'تسجيل دخول نموذجي — بلا مصادقة حقيقية.')}</strong>{' '}
                      <span className="text-muted-foreground">
                        {t(
                          'No password is asked for or stored, and every name and number in the portal is sample data.',
                          'لا تُطلب أي كلمة مرور ولا تُحفظ، وكل الأسماء والأرقام في البوابة بيانات نموذجية.',
                        )}
                      </span>
                    </InlineNote>

                    <fieldset className="flex min-w-0 flex-col gap-3" aria-invalid={!!errors.role} aria-describedby={errors.role ? 'role-error' : undefined}>
                      <legend className="t-small-strong mb-3 lg:mb-2">{t('Sign in as', 'تسجيل الدخول بصفة')}</legend>
                      <div data-group="main-roles" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{MAIN_ROLES.map(roleCard)}</div>
                      <details className="group/other" open={FOLDED_ROLE_IDS.includes(selected as RoleId) || undefined}>
                        <summary className="t-small-strong flex min-h-9 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 text-start outline-hidden [&::-webkit-details-marker]:hidden">
                          {L(SIGN_IN_COPY.otherRoles)}
                          <span aria-hidden className="material-light inline-grid size-[26px] shrink-0 place-items-center rounded-full">
                            <ChevronDown className="size-3.5 transition-transform duration-400 ease-spring group-open/other:rotate-180 motion-reduce:transition-none" />
                          </span>
                        </summary>
                        <div data-group="other-roles" className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{FOLDED_ROLES.map(roleCard)}</div>
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
                              className="well px-4 py-3 text-sm text-muted-foreground"
                            >
                              <span className="font-medium text-foreground">{L(selectedDef.name)}:</span> {L(selectedDef.description)}
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

                    {/* roll={false}: a long role title such as "Internal Audit and Marketing Lead" wraps instead of being clipped by the one-line hover roll */}
                    <Button type="submit" size="lg" roll={false} className="h-auto min-h-[46px] w-full whitespace-normal py-2 text-center" disabled={phase !== 'idle'}>
                      {phase === 'idle' ? (
                        <>
                          <span className="text-center">
                            {selectedDef ? t(`Sign in as ${selectedDef.name.en}`, `تسجيل الدخول بصفة ${selectedDef.name.ar}`) : t('Sign in', 'تسجيل الدخول')}
                          </span>
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
                </Card>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
