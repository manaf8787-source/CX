# Implementation report

Consolidated status of the React rebuild, written at the close of the build. Earlier per-page build passes each reported their own detail to the parent session; this document is the single consolidated view, plus the final QA pass's results.

## 1. What's complete

All 7 v38 primary pages, the AI assistant, the Intelligent CX team page, and all 12 Settings-and-reference sub-pages are built and verified:

- **Home** — one search box, five live tiles wired to real hooks.
- **Customers** — unified per-person timeline across all 16 channels, four-part AI reading, role-gated conversation text/agent names.
- **Runaway customers** — all six FR-3.1 types, classified from real schema fields (see §4, open items).
- **Actions** — 5 tabs: Corrective actions (lifecycle stepper, effectiveness verdict), Signals & patterns (live pattern-threshold meters for all three threshold rules), AI Insights (envelope-grounded, with a persistent "how to read this" panel), Shopper cases (severity rule, HR-review gate), Investigations.
- **Close the loop** — capacity math, critical-always-100% sampling, interview dialog, AI interview campaigns with critical-exclusion enforced twice.
- **Personas and campaigns** — six rule-built personas, ranked next-campaigns table, Marketing-manager-facing recommendations, CX-manager decision flow.
- **Surveys and triggers** — lead funnel, trigger/cap table, "never surveyed" public-channel flag, per-product survey-moments grid (correctly showing no NPS for Events/Wallet).
- **AI assistant** — global slide-over, real keyword-matching engine answering from the same live mock-data hooks every page uses (so its numbers can't disagree with the rest of the app), real browser `SpeechRecognition` for voice input, full EN/AR.
- **Intelligent CX team** — all 10 agents + supervisor transcribed from the AI Agents Specification, envelope-contract explainer, routing matrix, activity feed.
- **Settings and reference** (12 sub-pages) — Overview, Monthly CX pack, Mystery shopper, Standards register, Voice of Customer, Surveys (reference), L&D, Teams and structure, HR team performance, Rules as configuration (live-editable thresholds), AI Insights access matrix, Glossary.

## 2. Ported vs. net-new

Roughly 40% of the app's logic was ported from the old pre-omnichannel scaffold at `../frontend/src` (read-only reference, never modified): the SLA/working-hours clock engine, the incident root-cause/corrective/preventive workflow, checklist scoring (`scoreChecklist`), effectiveness evaluation, CSV export, the role/authority-matrix pattern, and the i18n/RTL + theming infrastructure. The remaining ~60% — Home, Customers, Runaway, Actions' 5 tabs, Close the loop, Personas, Surveys, the AI assistant, Intelligent CX Team, Rules-as-configuration, and the AI Insights access matrix — is net-new; none of it existed in the old scaffold. In every case, **logic was ported, visual design was not** — every page uses the new premium hand-written CSS system in `src/styles/tokens.css`, not the old scaffold's look.

## 3. Stack deviation (by explicit user decision)

The original build brief specified Tailwind + Zustand. The user's instruction was: no CSS/component library, keep (and extend) the working CSS-custom-properties + Context system already proven in the old scaffold, but design the new pages with a genuinely fresh, premium look rather than reusing the old visual style. This was followed throughout: `src/styles/tokens.css` + `src/styles/base.css` hold the design system, `src/theme`/`src/i18n`/`src/auth` hold plain React Context state (no Zustand). TypeScript, Vite, React Router, Lucide, TanStack Query, Recharts, React Hook Form, and Zod were all kept as specified.

## 4. `[Proposed]` placeholders and approximations left in the app

These are flagged in code comments at their point of use, not silently resolved:

- **Brand colors** — navy `#12385B` / gold `#C8963E` are the prototype's actual pair (corrected from a drift in an earlier pass), but a sixth product hue, `--p-wl` (PSI Wallet), doesn't exist in the prototype's tokens — it's a new `[Proposed]` value chosen to sit visually between the other five. Real fonts/logo files are still absent (Programme KB §43.8).
- **Standards register count** — `Standards-Documentation-List-for-LD.docx` states "twenty-eight documents in six groups," but transcribing its six group tables yielded 33 distinct titles. Flagged in `src/pages/settings/Standards.tsx` rather than dropping 5 to force the stated count.
- **Standards register codes** (`M-01…`) — the source documents number by title, not by code; the code scheme is `[Proposed]` so the mystery-shopper checklist and signal rules have something short to reference.
- **Runaway customer classification** — the six FR-3.1 types are derived via `classifyRunaway` (`src/utils/runaway.ts`) from real schema fields (`type`, `unitsOrDeals`, `daysSinceLastContact`, `problemFlags`) in a documented priority order, because no explicit "lost reason" or "lease end" field exists in the mock schema. This is a best-effort approximation of the intended rule, not a verbatim backend rule.
- **Loop-closure recovery** — `isRecovered` (FR-5.5) is approximated as `secondScore >= 4`, since the mock schema has no separate NPS/CSAT scale to distinguish "recovered" from "merely re-surveyed."
- **AI assistant "two engines" question** — still open. The assistant is fully mocked per the user's decision (no real API call), so the underlying Programme KB §43 question of whether the real build eventually calls Claude directly or a built-in parser is untouched by this prototype and remains for a later decision.
- **Agent 4 (mystery shopper severity)** on the Intelligent CX Team page is shown explicitly as "not built in phase one" (per the AI Agents Specification) rather than faked with a plausible-looking stub.

## 5. Mock-data-only state and the API seam

There is no live backend. Every page reads through `src/services/queries.ts` (TanStack Query hooks) backed by `src/services/mockData.ts` (a seeded sample set: ~30 people, ~120 interactions, held constant across every page). A real backend integration replaces the implementations inside `src/services/` — the hook signatures and the domain types in `src/types/domain.ts` / `src/types/ai.ts` / `src/types/reference.ts` were written against the target schemas in the Phase One Omnichannel Integration Plan (the unified interaction record, the AI-agent output envelope) specifically so that swap is mechanical, not a rewrite.

## 6. Open questions carried forward (Programme KB §43, not resolved here)

1. Escalation-matrix cells per product (owed by 28 Nov 2026).
2. Journey stages per service (buying/renting/investing/listing) — funnel stages stay `[Proposed]` until Marketing provides these.
3. Mystery shopper scenario examples per severity.
4. PSI Club detractor-VIP recovery routing (Club admin queue vs. CX call).
5. Whether the CRM exposes a read API, the WhatsApp partner, AI-caller/IVR log locations, which public channels support export, the CRM field list and a sample.
6. AI team: model choice per agent, Arabic support, AI-caller hand-off mechanics, transcript access, cost per thousand messages.
7. The Jira CXP project (not yet created).
8. Real brand colors/fonts/logo, real HR pool/environment names, real SLA targets, call-recording policy, retention periods.
9. Carried-forward older opens: real After-Sales call script, calling hours/consent rules, data residency, real mailboxes.

None of these block the prototype — they're exactly why the app is mock-data-only — but they're the concrete list a developer should resolve before any real integration.

## 7. Final QA results

- `npm install` — clean, 0 vulnerabilities.
- `tsc -b --noEmit` — clean, whole project.
- `oxlint` — clean; 4 pre-existing warnings remain (`react/only-export-components` on the 4 Context files that export both a provider component and a hook — a standard, intentional Context pattern, not a defect).
- `npm run build` — succeeds. One non-blocking advisory: the production JS bundle is ~1.08 MB (321 KB gzipped) and Vite suggests code-splitting; not addressed here since it would mean restructuring route-level imports across every page, which is out of scope for a QA-only pass — worth a dedicated pass later if load time matters before a real pilot.
- **Click-through QA**: a Playwright script (installed temporarily, uninstalled after, no stray devDependency) exercised all 7 primary pages, all 5 Actions tabs, the AI assistant from two different pages, Intelligent CX Team, and all 12 Settings-and-reference sub-pages — each in both EN/LTR and AR/RTL (verified the `dir` attribute actually flipped, not just that no button threw), with dark theme spot-checked on 5 representative pages (verified `data-theme` actually changed), and role-switching exercised across all 12 roles on a representative page. **67 checks, 0 console/page errors.**
- **Visual spot-check**: 5 screenshots across EN/light, AR/RTL, and dark theme — correct RTL mirroring (sidebar, text alignment, number/label flow), correct dark-theme contrast, no overflow or broken layout found.
- **Role-gating re-verification**: confirmed end-to-end on the Mystery shopper sub-page — a `shopper` role sees only "Signed in as a mystery shopper. You see only your own tasks," with just their own open task; a `cxmgr` role sees the full console (all shoppers, checklists, scores, case links). This matches the rule as documented in `FUNCTIONAL_REQUIREMENTS.md` and confirms the gating built by earlier passes still holds at the end of the full build.
- **Glossary wiring (NFR-6)**: deferred, not wired into every page's headings. The data hook (`useGlossaryTerms`) and a dedicated reference page exist and work; wiring a sitewide "?" affordance into every page header is a broad, mechanical edit across every page component rather than a defect fix, so it's documented here as a deferred item rather than attempted inside a QA-only pass.
- No regressions found. No defects required fixing during this pass.

## Final status

The app builds, type-checks, and lints clean; a full click-through across every route, both languages/directions, both themes, and all 12 roles found zero console errors and no visual defects. It is a complete, working, mock-data prototype of the v38 PSI CX Portal IA — ready to view and demo, not yet connected to a real backend.
