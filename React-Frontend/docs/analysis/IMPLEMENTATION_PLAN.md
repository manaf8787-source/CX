# Implementation Plan (Phase 2 — not started; for review)

This is a plan, not yet executed. Nothing in this document has been built. It exists so the user can confirm scope before any React code is written, per the user's own phase gate.

## 1. Tech stack (as specified by the user's master prompt)

React + TypeScript + Vite + Tailwind CSS + React Router + Lucide React icons + TanStack Query + Zustand or Context API + Recharts + React Hook Form + Zod.

Reconciling this with what already exists in `frontend/`: the scaffold uses **plain CSS custom properties + hand-written utility classes**, not Tailwind, and **Context API**, not Zustand, for state (`I18nProvider`, `ThemeContext`, `RoleProvider`, `SettingsProvider` — four small, well-scoped contexts, no prop-drilling problem evident). Two options, to confirm with the user before Phase 2 starts:

- **Option A — adopt Tailwind as specified, mapping the existing CSS variables into `tailwind.config.js` theme tokens** (`colors: { brand: 'var(--brand)', ... }`), so the exact token values from `UI_UX_SPECIFICATION.md` §1 survive the migration. Rebuild the existing utility classes (`.card`, `.tile`, `.chip`, etc.) as Tailwind component classes or small React components.
- **Option B — keep the existing CSS-variable + utility-class approach** (it already works, is already bilingual/RTL-correct, and is already proven against this exact design system) and treat "Tailwind" from the master prompt as a default to override, since a working, correct system already exists.

**[Proposed]** Option A, because the master prompt explicitly names Tailwind and a from-scratch rebuild is what was asked for — but this doubles the design-system porting work for no behavioral gain, since the CSS-variable approach already satisfies every requirement in `UI_UX_SPECIFICATION.md`. Flagging rather than deciding silently, per this repo's working rules.

Context vs. Zustand: the existing four contexts (lang/dir, theme, role, settings) are small and stable; TanStack Query (server state) and Zustand (client state, if adopted) would sit *alongside* them, not replace them — recommend keeping Context for these four cross-cutting concerns regardless of the Zustand decision, since nothing about them benefits from a store library.

## 2. Primary navigation: v38 is the target, not the scaffold's nav

`frontend/src/data/nav.ts` and `App.tsx` implement the **pre-rebuild** navigation (Overview & insights / Products / Complaints / Surveys & shoppers / Admin / My team). Phase 2 must replace this with the v38 structure:

- **Primary nav (role-dependent, 1-7 items):** Home, Customers, Runaway customers, Actions (5 tabs inside), Close the loop, Personas and campaigns, Surveys.
- **One folded entry, "Settings and reference"**, containing everything the scaffold already builds: Overview, Monthly CX pack, Mystery shopper, Standards register, Voice of Customer, Surveys (reference copy), L&D, Intelligent CX team, Teams and structure, Settings, AI Insights access, Glossary.
- Explicitly dropped from any nav (code may be kept as reference, per Programme KB §33): After-Sales call desk, call center desk + IVR simulation, standalone survey engine builder, suggestions log, demo walkthrough, build specification.

## 3. What ports from `frontend/src` vs. what's net-new

See `APPLICATION_MODULES.md` §F for the full breakdown. In priority order for a build sequence:

1. **Infrastructure (port near-verbatim):** `i18n/index.tsx` (Bi type + lang/dir context), `theme/ThemeContext.tsx`, the CSS custom-property token set (corrected per `UI_UX_SPECIFICATION.md` §1.1), `auth/RoleContext.tsx` pattern (extended with the new roles from `USER_ROLES_AND_PERMISSIONS.md`), `settings/SettingsContext.tsx`.
2. **Business logic (port near-verbatim, re-point at new data shapes):** `lib/sla.ts` (working-hours clock math — needed by both the old Incidents model and the new Corrective Action 60-day verification clock, and by Close the Loop's capacity math), `lib/metrics.ts` (NPS/CSAT math, `scoreChecklist()` — maps directly onto Decision 2's severity model), `lib/incidentWorkflow.ts` (root-cause/corrective/preventive gating — maps onto the Corrective Action lifecycle's "submit fix" step), `lib/people.ts` (role-gated name resolution — this is exactly the pattern NFR-2 requires for agent-name visibility).
3. **Reusable UI primitives (port, restyle if Option A is chosen):** `components/ui/{Tile,Chip,Modal,Tabs,Charts}.tsx`, `components/layout/{Shell,Sidebar,Topbar,PageHeader}.tsx`.
4. **Pages to port+upgrade into "Settings and reference":** Overview, VoiceOfCustomer, MysteryShopper, Standards, Settings, Report, Glossary.
5. **Pages to build net-new, in roughly this dependency order** (each depends conceptually on identity/timeline existing first): the unified person/timeline data contract → Customers (journey) → Home (search) → Runaway customers → Actions (Signals/Patterns tab first, then Corrective Actions, then AI Insights, then Shopper Cases, then Investigations) → Close the loop → Personas and campaigns → Surveys and triggers → the AI assistant (built last, as a thin adapter over the other pages' data, per `APPLICATION_MODULES.md` §B) → Intelligent CX Team page (a read-only viewer over the agent-run audit log) → AI Insights access matrix editor → L&D page.

## 4. Data layer: mock-only, but shaped like the real API

**Confirmed from the Phase One Integration Plan: real APIs are not yet available** — the CRM may only expose "database access" rather than a read API (an open question, Programme KB §43.5), WhatsApp/call-platform integration points are named but not yet connected, and go-live for *any* live data is the week of 25 Jan 2027 at the earliest. So Phase 2 of this React rebuild is **necessarily mock-data-only** — there is nothing real to integrate yet.

However, the Integration Plan also specifies, in detail, the exact shape data will eventually arrive in: the **unified interaction record** (`person_key, source_ref, channel, direction, occurred_at, product, environment, agent, reason, outcome, promise, language, score, text`) and the **AI agent output envelope** (`agent_id, run_id, subject_type, subject_id, payload, evidence[], confidence, rules_applied[], model, lang, supervisor_verdict, created_at`). **Recommendation: model the mock data layer's TypeScript types directly on these two schemas**, not on a simplified ad-hoc shape, so that:
- The "how the AI found this" panel (FR-4.2, NFR-7) always has a real `evidence[]` array to render from day one.
- Swapping a mock fetch for a real API call later is a data-source change, not a type/shape change throughout the UI.
- TanStack Query's cache keys and the eventual real endpoints can share the same entity shapes.

Use TanStack Query against the mock layer from the start (not a plain `useState`/`useEffect` fetch), specifically so loading/error/empty states are real from day one (master prompt §9 requires these) and so the swap to live data later only touches the query functions, not the components.

## 5. Rules as configuration

Every threshold in `FUNCTIONAL_REQUIREMENTS.md` NFR-4 (30-day windows, 5/3/50% signal thresholds, 60-day verification, 90-day hold, calling-hour windows, SLA hours per complaint type) should live in one typed config object/module (mirroring the AI Agents Specification's `rules_applied` config-key naming, e.g. `signals.window_days`, `signals.same_issue`, `ms.visit_floor`), editable through a Settings UI, not scattered as magic numbers through components. This single decision is what makes the eventual "Settings → Rules as configuration" page (already named in the Modules KB) possible without a rewrite.

## 6. Open questions that bear directly on implementation (carried over, not resolved)

From Programme KB §43 and the Rules/Specification documents — flagging these here because they change what Phase 2 should hardcode as sample data vs. leave as an obvious placeholder:
1. The escalation-matrix cells per product (who receives each action kind, by title) — due 28 Nov 2026, not yet filled. Build the matrix as empty/placeholder-filled data, not invented names.
2. Real SLA targets, real HR pool members, real environment names — all currently [Proposed] placeholders in the source docs; keep them visibly placeholder in the UI (the existing prototype does this with its permanent sample-data banner; keep that).
3. Whether the CRM exposes a read API or only database access — irrelevant to Phase 2's mock layer today, but affects how "pluggable" the eventual data-source swap needs to be; favor a clean repository/adapter interface over a tightly-coupled mock.
4. PSI's real brand colors/fonts/logo have not arrived — placeholder navy/gold stands (see `UI_UX_SPECIFICATION.md` §1.1, §5).
5. Mystery shopper severity automation (Agent 4 scoring, "where to shop next" planning) is explicitly phase-two-of-the-AI-agents, not phase one — Phase 2 of this rebuild should still build the Shopper Cases tab's UI (critical/medium/low, same-day case creation for critical) since that's a phase-one page requirement, but the *automatic* severity placement is out of scope; model it as a CX-assigned field for now.
6. The AI assistant's "two engines" requirement (Claude-in-claude.ai vs. a built-in parser fallback) needs a decision on how literally to replicate this in a non-claude.ai-hosted React app — flagging for the user rather than assuming an approach.

## 7. Suggested acceptance checks before calling Phase 2 "done"

Adapting the master prompt's own testing section to this specific project:
- Every one of the 7 primary pages plus "Settings and reference" renders in both English and Arabic with correct RTL layout and no mirrored-icon or broken-logical-property regressions.
- Light and dark theme both render correctly on every page.
- The three visibility rules (NFR-2) are enforced by an automated test per role, not just manual spot-checks — directly mirroring the AI Agents Specification's own acceptance criterion ("No API path returns conversation text to a role outside the CX team and CX manager; verified by an automated access test per role").
- Every number shown anywhere traces back to the mock data layer's typed records — no inline magic numbers in components, so swapping in real data later is mechanical.
- `tsc -b`, `oxlint`, and `vite build` all pass clean (already configured in `frontend/`'s `package.json` scripts — reuse the same scripts/config in `React-Frontend/`).
