# PSI CX Portal — React rebuild

A from-scratch React implementation of the PSI CX Portal prototype (v38, 17 Nov 2026; brought to v40 on 18 Nov 2026, see below), built against the requirements in [`docs/analysis/`](docs/analysis/) rather than against the live `.claude.ai` artifact. **Mock-data-only** — there is no backend yet (go-live is targeted for ~25 Jan 2027); every page reads from a typed, seeded sample dataset behind the `src/services/` layer, which is the seam a real API will plug into later.

This is a separate app from `../frontend/` (the earlier pre-omnichannel scaffold, kept read-only as reference) and from `../PSI CX Portal.html` (the static export of the claude.ai artifact, which remains the canonical interactive prototype per the repo's `CLAUDE.md`).

## Getting started

```bash
npm install
npm run dev        # http://localhost:5174
npm run build       # production build (tsc -b && vite build)
npm run preview     # serve the production build locally
npm run lint         # oxlint
npm run typecheck   # tsc -b --noEmit
npm test            # unit + component tests (Vitest)
npm run test:e2e    # end-to-end smoke tests (Playwright)
npm run check       # typecheck + lint + unit tests + build
```

No environment variables are needed — there is nothing to configure yet, since the app has no backend to point at. A `.env.example` will make sense once a real API exists.

## Stack

React 19 + TypeScript + Vite, **Tailwind CSS v4 + shadcn/ui** (Radix primitives, components copied into `src/components/ui/`), `motion` for animation, React Router, TanStack Query, TanStack Table, Recharts, React Hook Form + Zod, Lucide icons. Theming, i18n/RTL and roles use React Context (no Zustand).

The UI moved from hand-written CSS to Tailwind CSS v4 + shadcn/ui by Manaf's decision on 17 Nov 2026; the migration is complete and no legacy stylesheet remains. Every page is lazy-loaded per route. The look since 18 Nov 2026 is the Meo-inspired design (next section); [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) still holds the RTL, motion, sign-in and how-to-add-a-component notes.

## Design (Meo-inspired, 18 Nov 2026)

Monochrome ink on white, two materials (light raised and dark raised; **selected = dark**), pill controls, large nested radii, shadow rings instead of borders (the only line is the 1px row divider), Plus Jakarta Sans at weights 400 and 500, one spring for state changes. Colour is categorical: product dots, status tags, a few chart categories. The skill is a design language only (no Meo name, logo or copy); the real PSI brand colour has one swap point, `--brand-accent*` in `src/styles/theme.css` **[Proposed]**.

| Where | What |
|---|---|
| [`docs/MEO_DESIGN_SYSTEM.md`](docs/MEO_DESIGN_SYSTEM.md) | **The binding reference**: tokens, the classes pages must use, primitives, shell, shared components, charts, the phone composition, known exceptions, deviations from the skill with reasons, the audit gate (greps and the runtime check) |
| [`docs/MEO_DESIGN_PLAN.md`](docs/MEO_DESIGN_PLAN.md) | The plan and the decisions where the skill and the product disagree |
| [`docs/MEO_PAGES_A.md`](docs/MEO_PAGES_A.md), [`B`](docs/MEO_PAGES_B.md), [`C`](docs/MEO_PAGES_C.md) | What each page did with the system |
| [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md) section 15 | Steps, counts, gates, findings |

Where the product wins over the skill: Arabic uses IBM Plex Sans Arabic with zero letter-spacing (Plus Jakarta Sans has no Arabic glyphs and tracking breaks joining), form fields keep a visible 1px edge ring (WCAG 1.4.11), the framed layout above 1440px is capped at 1600px, a dark theme is derived, and a phone shows stacked rows instead of a 10-column table. Dark theme and RTL are first-class: every change is checked light and dark, EN and AR, at 1440, 1024 and 390px.

## Testing

| Command | What it runs | Time |
|---|---|---|
| `npm test` | **678 tests in 59 files.** Vitest + Testing Library in jsdom: the business rules (pattern thresholds, runaway types, 60-day effectiveness, due-date clocks, mystery-shopper scoring, close-the-loop capacity and sampling), role permissions and page access, the sample session, i18n completeness, the assistant engine, and component tests (KpiTile, DataTable, sign-in, Timeline role gating) | ~25 s |
| `npm run test:coverage` | the same, with v8 coverage for `src/utils`, `src/lib`, `src/auth` | ~4 s |
| `npm run test:e2e` | Playwright (Chromium) against a production build served by `vite preview` on port 4321: **413 of 413 passed** (twice in a row). Sign-in flow, every one of the 33 routes in English and Arabic (one test each), the phone composition and the Meo restyle checks (`meo-restyle`), the v40 specs (`v40-foundation`, `v40-orientation`, `v40-trace`, `v40-people`, `v40-integration`), role gating, the assistant, reduced motion; an **axe-core WCAG 2.1 AA scan** of every route in English/Arabic × light/dark plus the login page and dialogs (fails on any serious or critical violation); and a **keyboard-only** spec (skip link, sidebar, tabs, table sort, dialog focus trap and return, assistant) | ~3 min plus the build (6 workers) |
| `npm run check` | typecheck, lint, unit tests, build | ~10 s |

Unit tests live next to the code (`*.test.ts(x)`); shared helpers are in `src/test/`. End-to-end specs are in `e2e/`.

Before the first E2E run, install the browser once: `npx playwright install chromium`. Test output (`coverage/`, `test-results/`, `playwright-report/`) is git-ignored.

The i18n test fails the build if any bilingual string or inline `t('English', 'Arabic')` call lacks Arabic, so new UI text has to arrive in both languages.

## Sign-in and motion

The app opens on a **sample sign-in** at `/login`: choose one of the six main roles, or one of the other six under "Other roles used in the demo" (and optionally a display name), to see the portal as that role sees it. There is no backend and no password; the session lives in `localStorage`, and Sign out is in the header user menu. See `docs/DESIGN_SYSTEM.md` §9.

Animation uses `motion` (pinned, features lazy-loaded) plus CSS. It covers direction-aware route transitions, staggered sections, count-up KPIs, chart draw-in, hover and press feedback, skeleton shimmer, the assistant's typing indicator, and the login intro. Everything respects `prefers-reduced-motion`. See `docs/DESIGN_SYSTEM.md` §8.

## Routes, menu and roles (v40)

**Main menu** (CX manager and CX team see all of it; every other role sees its own pages): Home `/home`; 1 · Customers `/customers` (tabs: Find a person, Who is leaving `/runaway`, Personas and campaigns `/personas`); My inbox `/inbox`; 2–4 · Signals and fixes `/actions` (Corrective actions, Signals and patterns, AI Insights, Shopper cases, Investigations); 5 · Close the loop `/close-the-loop`; 6 · CX indicators `/overview`; live products `/products/:id`; Settings and reference `/settings` (AI team page, Data feeds, CRM mapping, Escalation matrix, Survey questions, Weekly sample, Public mentions, Surveys and triggers, Rules, Monthly pack, Mystery shopper, Standards, Voice of customer, L&D, Teams, HR team, Admin, AI Insights access, Glossary). Old URLs still work: `/surveys` goes to `/settings/surveys`, `/settings/overview` to `/overview`.

| Role (title) | Lands on | Notes |
|---|---|---|
| CX manager, CX team, Executive, Environment management, Team lead, After-Sales lead, Marketing manager | `/home` | the Daily brief and the six steps on Home |
| L&D manager | `/settings/ld` | Daily brief at the top of that page |
| HR specialist | `/actions` (fixes tab) | Daily brief at the top of that tab |
| HR manager | `/settings/hr-team` | Daily brief at the top, informed only |
| Internal Audit and Marketing Lead | `/overview` | Daily brief at the top; sees references (P-005), never customer names |
| Mystery shopper | `/settings/mystery-shopper` | its own tasks only |

Who opens what is `src/auth/access.ts` (`ROLE_PATHS`), edit rights and the name rules are `src/auth/permissions.ts`; the test is `src/auth/permissions.test.ts`. The three CRM environments (Dubai, Abu Dhabi, PSI Assets) are narrowed by the "Data as of" bar's switch; everything that is still `[Proposed]` carries a badge in the UI (list in `docs/IMPLEMENTATION_REPORT.md` section 14.5).

## Folder structure

```
src/
  auth/        sample sign-in session + route guard, role context, permission gates (conversation-text / agent-name / informed-only rules)
  components/  ui/ (shadcn primitives), common/ (shared building blocks), layout/ (shell, sidebar), plus page-local groups
  data/        static reference data (roles, nav, products, agent registry, glossary, legacy reference)
  hooks/       small shared hooks (useNow, usePersonSearch, use-mobile)
  lib/         cn(), status → tone/label maps, date formatting
  i18n/        EN/AR language + RTL context
  pages/       one file/folder per route — actions/ and settings/ are themselves sub-routed
  services/    the mock-data layer + TanStack Query hooks (the future API seam)
  styles/      theme.css (all tokens, light + dark, product hues, global base rules)
  theme/       light/dark theme context
  types/       domain types, AI-agent output envelope, settings/reference types
  utils/       ported business logic (SLA clocks, effectiveness scoring, runaway classification, journey rules)
```

## Requirements and analysis

**v39/v40 work (18 Nov 2026):**

| Doc | What it is |
|---|---|
| [`docs/V40_DELTA.md`](docs/V40_DELTA.md) | the analysis: 36 features, F01 to F36, verbatim strings |
| [`docs/DECISIONS-2026-11-18.md`](docs/DECISIONS-2026-11-18.md) | the owner's seven decisions of 18 Nov (they win over the delta) |
| [`docs/V40_FOUNDATION_API.md`](docs/V40_FOUNDATION_API.md) | the contract: hooks, primitives, routes, permissions, data files, config keys; which stubs were replaced |
| [`docs/V40_WS_A.md`](docs/V40_WS_A.md), [`V40_WS_B.md`](docs/V40_WS_B.md), [`V40_WS_C.md`](docs/V40_WS_C.md) | what each workstream built, tested, left and asked for |
| [`docs/MEO_DESIGN_PLAN.md`](docs/MEO_DESIGN_PLAN.md) | a restyle plan (Meo-inspired tokens and components, 18 Nov); styling only, no logic or copy changes; not part of the v40 feature work |
| [`docs/FIDELITY_REVIEW.md`](docs/FIDELITY_REVIEW.md) | v38 rows marked where v40 changed them, and F01 to F36 with code and test |
| [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md) section 14 | the integration pass: fixes, decisions applied, `[Proposed]` still badged, known gaps |

Everything this app was built against — the product analysis, functional requirements, roles/permissions, module inventory, UI/UX spec, and implementation plan — lives in [`docs/analysis/`](docs/analysis/). The consolidated build report, including every `[Proposed]` placeholder and open question still unresolved in the source documents, is in [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md).
