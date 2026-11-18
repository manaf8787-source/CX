# PSI CX Portal — React rebuild

A from-scratch React implementation of the PSI CX Portal prototype (v38, 17 Nov 2026), built against the requirements in [`docs/analysis/`](docs/analysis/) rather than against the live `.claude.ai` artifact. **Mock-data-only** — there is no backend yet (go-live is targeted for ~25 Jan 2027); every page reads from a typed, seeded sample dataset behind the `src/services/` layer, which is the seam a real API will plug into later.

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

The UI moved from hand-written CSS to Tailwind CSS v4 + shadcn/ui by Manaf's decision on 17 Nov 2026; the migration is complete and no legacy stylesheet remains. Design direction (palette use, type, density, motion, accessibility checks) was guided by the [`ui-ux-pro-max`](../.claude/skills/ui-ux-pro-max/) skill installed in this repo, adjusted for a bilingual enterprise dashboard. Every page is lazy-loaded per route. **All UI conventions are in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)**, including how to add shadcn components and pages.

## Testing

| Command | What it runs | Time |
|---|---|---|
| `npm test` | Vitest + Testing Library in jsdom: the business rules (pattern thresholds, runaway types, 60-day effectiveness, due-date clocks, mystery-shopper scoring, close-the-loop capacity and sampling), role permissions and page access, the sample session, i18n completeness, the assistant engine, and component tests (KpiTile, DataTable, sign-in, Timeline role gating) | ~3 s |
| `npm run test:coverage` | the same, with v8 coverage for `src/utils`, `src/lib`, `src/auth` | ~4 s |
| `npm run test:e2e` | Playwright (Chromium) against a production build served by `vite preview` on port 4321: sign-in flow, all 25 routes in English and Arabic, role gating, the assistant, reduced motion; an **axe-core WCAG 2.1 AA scan** of every route in English/Arabic × light/dark plus the login page and dialogs (fails on any serious or critical violation); and a **keyboard-only** spec (skip link, sidebar, tabs, table sort, dialog focus trap and return, assistant) | ~50 s plus the build |
| `npm run check` | typecheck, lint, unit tests, build | ~10 s |

Unit tests live next to the code (`*.test.ts(x)`); shared helpers are in `src/test/`. End-to-end specs are in `e2e/`.

Before the first E2E run, install the browser once: `npx playwright install chromium`. Test output (`coverage/`, `test-results/`, `playwright-report/`) is git-ignored.

The i18n test fails the build if any bilingual string or inline `t('English', 'Arabic')` call lacks Arabic, so new UI text has to arrive in both languages.

## Sign-in and motion

The app opens on a **sample sign-in** at `/login`: choose one of the 12 roles (and optionally a display name) to see the portal as that role sees it. There is no backend and no password; the session lives in `localStorage`, and Sign out is in the header user menu. See `docs/DESIGN_SYSTEM.md` §9.

Animation uses `motion` (pinned, features lazy-loaded) plus CSS. It covers direction-aware route transitions, staggered sections, count-up KPIs, chart draw-in, hover and press feedback, skeleton shimmer, the assistant's typing indicator, and the login intro. Everything respects `prefers-reduced-motion`. See `docs/DESIGN_SYSTEM.md` §8.

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

**v39/v40 work (18 Nov 2026):** the analysis is [`docs/V40_DELTA.md`](docs/V40_DELTA.md); the contract that the three build workstreams rely on (new hooks, primitives, routes, permissions, data files, stub pages, config keys) is [`docs/V40_FOUNDATION_API.md`](docs/V40_FOUNDATION_API.md).

Everything this app was built against — the product analysis, functional requirements, roles/permissions, module inventory, UI/UX spec, and implementation plan — lives in [`docs/analysis/`](docs/analysis/). The consolidated build report, including every `[Proposed]` placeholder and open question still unresolved in the source documents, is in [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md).
