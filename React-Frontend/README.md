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

React 19 + TypeScript + Vite, **Tailwind CSS v4 + shadcn/ui** (Radix primitives, components copied into `src/components/ui/`), React Router, TanStack Query, TanStack Table, Recharts, React Hook Form + Zod, Lucide icons. Theming, i18n/RTL and roles use React Context (no Zustand).

The UI moved from hand-written CSS to Tailwind + shadcn/ui by the user's decision on 17 Nov 2026. The migration runs page by page; until it finishes, the old stylesheet (`src/styles/base.css`) is loaded in a lower cascade layer for pages not yet migrated. **All UI conventions are in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)**, including the migration status and how to add shadcn components.

## Folder structure

```
src/
  auth/        role context + permission gates (conversation-text / agent-name / informed-only rules)
  components/  ui/ (shadcn primitives), common/ (shared building blocks), layout/ (shell, sidebar), plus page-local groups
  data/        static reference data (roles, nav, products, agent registry, glossary, legacy reference)
  hooks/       small shared hooks (useNow, usePersonSearch, use-mobile)
  lib/         cn(), status → tone/label maps, date formatting
  i18n/        EN/AR language + RTL context
  pages/       one file/folder per route — actions/ and settings/ are themselves sub-routed
  services/    the mock-data layer + TanStack Query hooks (the future API seam)
  styles/      theme.css (shadcn/Tailwind tokens), tokens.css + base.css (legacy, removed when migration ends)
  theme/       light/dark theme context
  types/       domain types, AI-agent output envelope, settings/reference types
  utils/       ported business logic (SLA clocks, effectiveness scoring, runaway classification, journey rules)
```

## Requirements and analysis

Everything this app was built against — the product analysis, functional requirements, roles/permissions, module inventory, UI/UX spec, and implementation plan — lives in [`docs/analysis/`](docs/analysis/). The consolidated build report, including every `[Proposed]` placeholder and open question still unresolved in the source documents, is in [`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md).
