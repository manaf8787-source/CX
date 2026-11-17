# PSI CX Portal — React rebuild

**Status: foundation scaffold only (Phase 2a).** Routing, theming (light/dark),
bilingual EN/AR with full RTL, role switching, the typed mock-data layer, and
the v38 page shells all work end to end. Full page content (dashboards,
timelines, the real "how the AI found this" panels, etc.) is a later build
pass — see `docs/analysis/IMPLEMENTATION_PLAN.md` §3 for the build order.

## Start here

- `docs/analysis/` — the six Phase 1 analysis documents (read these before
  changing scope; they cite every requirement back to its source document).
- `docs/analysis/IMPLEMENTATION_PLAN.md` — what's ported from `frontend/`
  (the pre-omnichannel scaffold, kept read-only as a reference) vs. built
  net-new, and in what order.

## Run it

```
npm install
npm run dev
```

## What exists in this pass

- `src/types/` — core domain types, modeled on the Phase One Integration
  Plan's target schemas (unified interaction record, AI-agent output
  envelope) so a real API swap later is a data-source change, not a type
  change.
- `src/services/mockData.ts` + `services/queries.ts` — a seeded, typed mock
  dataset (sample scale: ~30 people, ~120 interactions, never real PSI
  numbers) behind TanStack Query hooks, with a repository-style seam for the
  eventual real fetch.
- `src/i18n`, `src/theme`, `src/auth` — the bilingual/RTL, light/dark and
  role-context infrastructure, ported from `frontend/src`'s proven pattern.
- `src/styles/tokens.css` — design tokens. Brand colors (navy/gold) and the
  PSI Wallet product color are placeholders pending real brand assets
  (flagged in the file itself); everything else is structural.
- `src/components/layout/` — the app shell (sidebar, topbar, AI assistant
  launcher).
- `src/components/ai/AssistantPanel.tsx` — the AI assistant, fully mocked UI
  only (no real API call), per the explicit Phase 2 scope decision.
- `src/pages/` — all 7 primary v38 pages + Intelligent CX Team + one folded
  "Settings and reference" entry, as route shells. Each stub lists exactly
  which functional requirements (`FR-#.#`) its real content still needs to
  satisfy, so the next build pass has a checklist instead of a blank page.

## What this intentionally does not do yet

No Tailwind, no Zustand, no UI component library — the user asked to keep
the existing CSS-custom-property + Context approach rather than port a
working system to a framework for no behavioral gain. Everything else from
the original tech-stack request (TypeScript, Vite, React Router, Lucide,
TanStack Query, Recharts, React Hook Form, Zod) is in place and ready for
the content build.
