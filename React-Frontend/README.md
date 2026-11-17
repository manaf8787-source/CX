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
```

No environment variables are needed — there is nothing to configure yet, since the app has no backend to point at. A `.env.example` will make sense once a real API exists.

## Stack

React 19 + TypeScript + Vite, React Router, TanStack Query, Recharts, React Hook Form + Zod, Lucide icons.

**By explicit decision, there is no Tailwind, no Zustand, and no UI component library.** The original build brief specified Tailwind/Zustand; the user asked instead to keep hand-written CSS (plain CSS custom properties + React Context for theming, i18n and roles — ported from the proven system already in `../frontend/src/theme`) and to design a genuinely fresh, premium visual language on top of it rather than reusing the old scaffold's look. See `docs/IMPLEMENTATION_REPORT.md` for the full reasoning.

## Folder structure

```
src/
  auth/        role context + permission gates (conversation-text / agent-name / informed-only rules)
  components/  shared UI: layout shell, the AI assistant panel, page-local component groups
  data/        static reference data (roles, nav, products, agent registry, glossary, legacy reference)
  hooks/       small shared hooks (e.g. useNow)
  i18n/        EN/AR language + RTL context
  pages/       one file/folder per route — actions/ and settings/ are themselves sub-routed
  services/    the mock-data layer + TanStack Query hooks (the future API seam)
  styles/      design tokens (tokens.css) + base styles
  theme/       light/dark theme context
  types/       domain types, AI-agent output envelope, settings/reference types
  utils/       ported business logic (SLA clocks, effectiveness scoring, runaway classification, journey rules)
```

## Requirements and analysis

Everything this app was built against — the product analysis, functional requirements, roles/permissions, module inventory, UI/UX spec, and implementation plan — lives in [`docs/analysis/`](docs/analysis/). The consolidated build report, including every `[Proposed]` placeholder and open question still unresolved in the source documents, is in [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md).
