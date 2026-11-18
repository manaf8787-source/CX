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

> **Superseded on 17 Nov 2026:** Manaf moved the UI to Tailwind CSS v4 + shadcn/ui; see section 8. State still uses plain React Context (no Zustand). The paragraph below records the earlier decision.

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

## 8. UI migration to shadcn/ui + Tailwind (17 Nov 2026)

**Decision:** Manaf decided on 17 Nov 2026 to replace the hand-written CSS with Tailwind CSS v4 + shadcn/ui, reversing the earlier "no library" choice recorded in section 3. Design guidance came from the `ui-ux-pro-max` skill (installed project-level after review), filtered for a bilingual enterprise dashboard: PSI navy/gold kept (still `[Proposed]`) on neutral slate surfaces, a calm Fluent-like token style with bento KPI grids, IBM Plex Sans + IBM Plex Sans Arabic, dense spacing, CSS-only motion at 150–300ms. Glassmorphism, decorative gradients and emoji icons were rejected.

**What changed (four passes):**
- **A:** Tailwind v4, shadcn/ui (26 components, RTL mode), theme tokens with ≥ 4.5:1 text contrast in both themes, shared building blocks (`PageHeader`, `KpiTile`, `DataTable`, `StatusBadge`, `SectionCard`, empty/loading/error states), new shell (collapsible navy sidebar, header search with Ctrl+K, assistant in a sheet), Home as a bento dashboard. Conventions in `docs/DESIGN_SYSTEM.md`.
- **B:** Actions (5 tabs), Customers (timeline kept as a true chronological timeline), Runaway, Close the loop; all dialogs on shadcn `Dialog` with React Hook Form + Zod; status labels localized.
- **C:** Personas, Surveys, Intelligent CX Team, the assistant's internals, Settings and reference (12 sub-pages, side list on desktop, select on mobile, shared `AccessMatrix`).
- **D (cleanup):** removed `styles/base.css`, `styles/tokens.css` (product hues moved into `theme.css`), all `data-ui-v2` transition guards and the dead `Tile`/`PageStub` components; restored shadcn's standard `--muted`/`--ring` names; made `ui/progress` RTL-aware centrally (removed per-page workarounds); localized the remaining raw status values (L&D requests, standards, mystery-shopper assignments and checklists, survey batches, VoC channels) via `lib/status.ts`; stopped shopper-case clocks on responded/closed cases (new optional `respondedAt`/`closedAt`, set in mock data and by the advance mutation); fixed nested `<main>` landmarks in the shell; pointer cursor on all clickables (Tailwind v4's reset removes it); route-level code splitting.

**Mock-data fixes (pass B, `services/mockData.ts`; the seeded random sequence was kept stable):**
- Signal categories are weighted instead of uniform, and the problem rate went from 28% to 32%, so some patterns genuinely reach the 10-signal minimum sample. Corrective actions had been empty; there are now 4 (proposed, in progress, 60-day check, partial), from 37 signals and 12 threshold-crossing patterns.
- 60-day effectiveness verdicts now agree with each action's status (one action had shown "Partial" with a "Failed" verdict).
- A third of detractors are now uncalled, so the Close-the-loop call button and interview dialog can appear (every detractor previously had an outcome).

**Bundle (gzipped JS):** before 435.8 KB in one chunk (1,469 KB raw); after about 194 KB loaded up front (entry 98 KB + React vendor 81 KB + small shared chunks), with each page, recharts (~100 KB), the forms stack (~39 KB) and the assistant loaded only when needed. No chunk-size warning.

**QA (pass D, production build via `vite preview`, Playwright):** 919 of 920 automated checks passed.
- Every route (7 primary pages, 5 Actions tabs, Intelligent CX Team, 12 Settings sub-pages = 24 routes) in 6 combinations: EN and AR × light and dark at 1440px, plus AR light and EN dark at 375px. Each checked for zero console/page errors, correct `dir`, correct theme, no page-level horizontal scroll, a page heading, and no raw `undefined`/`NaN`.
- Assistant opened from Home (EN) and Signals (AR), 3 questions each, all answered; the sheet opens on the inline-end side in both directions.
- One dialog per page that has one (7), opened and validated with no errors.
- Role gating: CX manager sees "Decide" on Personas, Marketing does not; Exec sees "Informed only" on shopper cases, CX manager sees the owner; the shopper role sees only its own tasks; conversation text on a journey is visible to CX manager and hidden from Exec.
- Pre-delivery checklist (ui-ux-pro-max, adapted for web): visible focus ring, pointer cursor, no emoji, reduced motion respected, text contrast ≥ 4.5:1 on four pages in both themes. The one remaining "failure" is the sidebar rail, which intentionally shows a resize cursor.
- Screenshots of Home, Signals, a customer journey and the access matrix in EN light and AR dark, plus Home at 375px in Arabic, reviewed by eye: clean, correctly mirrored, readable.

**Known issues remaining:**
- `oxlint` reports 3 `react/only-export-components` warnings (i18n, RoleContext, ThemeContext export a provider and its hook from one file). They affect dev fast-refresh only; fixing them means renaming modules that dozens of files import.
- Environment names (Dubai, Abu Dhabi) stay in English in the Arabic UI because they are sample data values, not labels.
- The sitewide glossary "?" affordance (NFR-6) is still deferred (section 7).

## 9. Sample sign-in and animation (17 Nov 2026)

Requested by Manaf: "add animation in my website and login screen". Details and rules are in `docs/DESIGN_SYSTEM.md` §8 (motion) and §9 (sign-in).

**Sign-in.** A new `/login` page with two parts:
- a navy brand panel: a placeholder logo (marked `[Proposed]`, because the real PSI logo is not confirmed), a tagline and three product points;
- a sign-in card: a bilingual "Sample sign-in — no real authentication" notice, the 12 roles as selectable cards with the selected role's full description underneath (**v40: changed**, section 14: six main roles, the other six folded under "Other roles used in the demo"), an optional display name, and React Hook Form + Zod validation (role required, name ≤ 40 characters). There is no password field.

The session persists in `localStorage`. Every other route redirects to `/login`, then returns to the page the person wanted (or the role's home page). The header gains a user menu with initials and Sign out. The login page has its own language and theme switches, and on phones the brand panel collapses into a compact header.

**Animation.** `motion@14.9.0`, pinned, with LazyMotion so its features load on demand. Across the app:
- route transitions (direction-aware, entrance only) and staggered page sections;
- count-up KPI numbers and chart draw-in;
- button press, card hover lift, and tab and collapsible transitions;
- a shimmer on loading skeletons;
- the assistant's message rise and typing indicator.

The login page adds an intro stagger, a slow line pattern, and the card's entrance and exit. All of it is off or instant under `prefers-reduced-motion`.

**Bug found and fixed during QA.** Signing out and then signing in as a different role sent the new person back to the previous person's page, because the route guard stored that page as the return target before the move to `/login` happened. Sign-out now moves to `/login` and clears the session in one step.

**Bundle (gzipped JS, measured with `gzip -c` on the production build).** The first download is about 206 KB, up from about 194 KB; the extra is the `m` components, the route guard and the header menu. The animation engine (17.5 KB) and the login page (6.6 KB) load only when needed.

**QA (production build via `vite preview`, Playwright): all 614 checks passed.**
- **Sign-in flow:**
  - a signed-out visit to a deep link goes to `/login`, and choosing a role is required;
  - signing in as CX manager returns to `/actions/signals`, a reload keeps the session, and Sign out returns to `/login`, after which protected routes redirect;
  - the Exec lands on Home and sees no conversation text on a journey (the CX manager does); the shopper lands on their own tasks;
  - a signed-in visit to `/login` goes into the app, and no password field exists.
- **All 24 routes:** checked in EN light 1440, AR dark 1440, AR light 375 and EN dark 375. Each stays on its route with the right text direction and theme, a heading, no sideways scroll and no console errors.
- **Login page:** four combinations, with no sideways scroll and no console errors.
- **Motion:**
  - the route transition is moving 90 ms after a click and then comes to rest;
  - the KPI count-up stops on the final number;
  - with reduced motion turned on, there is no page slide, stagger or shimmer, the KPIs show their final value at once, and the login background stays still.
- **Assistant:** the typing indicator appears, then clears as the answer arrives.
- **Screenshots reviewed:** the login page (EN light, AR dark, EN and AR at 375 px, and with a role selected) and a frame caught mid-transition. In the first version the role list scrolled inside its own box, which hid four roles and cut a card in half on phones. It now shows all 12 roles as compact cards, with the selected role's full description below.

**Known issues.** The same 3 `only-export-components` lint warnings as before (i18n, RoleContext, ThemeContext). On a 1440×900 screen the sign-in card is slightly taller than the window, so the button needs a short scroll.

## 10. Fidelity review against the v38 sources (17 Nov 2026)

Full table: `docs/FIDELITY_REVIEW.md`. Of 104 requirements, 52 were Done before this pass; after it, 93 are Done, 9 Partial, none Missing or Differs, and 2 moved to open items.

Main additions:
- **Role-scoped pages** (KB §2): `src/auth/access.ts`, sidebar and Settings sub-nav filtering, an `AccessGuard` that sends a role to its home; the assistant is shown only to CX, Marketing, executives and environment managers.
- **Assistant** (KB §13): questions from the Home/header search, example requests, people lists with "reach via", "why did X go quiet", "similar to X", corrective action plans created as proposed actions, campaign briefs saved for Marketing (shown on Personas), engine label, voice runs when you stop.
- **Actions**: register tiles, classification block (path, receiver, what comes back), "investigate first" decision, AI panel and existing action on pattern cards, L&D and environment scoping, mystery-shopper check request form.
- **Close the loop**: the ten KB reason codes, Agent 8 brief, suggested code, notes, re-survey date, reason column, campaign results; interviews and re-surveys appear on the timeline; promises show their due time.
- **Overview**: two strips, lead funnel, public reputation index, NPS by month and by channel, product-by-channel heatmap, why detractors are unhappy.
- **Reference data** transcribed from the v38 prototype into `src/data/v38Reference.ts` (behind `src/services/referenceQueries.ts`): the 26-standard register, agent job descriptions and stages, public mentions, NPS trend, survey instruments and delivery log, per-product survey rules, routing, CRM fields, escalation template, L&D materials and plan.
- **Pages rebuilt to match the sources**: Standards register (M-01–M-26, L&D documents as LD-xx), Teams and structure (roles, routing, CRM, HR pool, who is informed), Rules (five decisions + escalation template), Intelligent CX team (path, roster stages, nine-field job descriptions, switch-on stages), product pages `/products/:id`, glossary "?" and "What the terms mean" on every page.
- **Sample data corrected**: personas now match KB §8; corrective-action owners follow their kind; a proposed action never carries a decision.
- Login card fits a 1440×900 screen without scrolling.

QA: typecheck and build clean, lint shows the 3 known fast-refresh warnings, initial JS 212 KB gzipped (was ~206 KB). Playwright: 465 of 465 checks — 16 changed pages × EN/AR × light/dark × 1440/375 (no console errors, no sideways scroll, direction and theme correct), login at 1440×900 and 375, role access for 7 roles, assistant plan/brief/people flows, investigate decision, interview brief, glossary popover and dialog, 26-standard register.

## 11. Automated tests (17 Nov 2026)

A permanent test suite, so the business rules and role rules are checked on every change instead of by one-off click-throughs.

**Tools** (exact versions, dev dependencies): Vitest 5.1.0 with jsdom 31.0.1 and Testing Library (React 16.3.3, DOM 10.4.2, jest-dom 7.0.1, user-event 14.6.12); @vitest/coverage-v8 5.1.0; @playwright/test 1.65.1 (Chromium). Scripts: `test`, `test:watch`, `test:coverage`, `test:e2e`, `check`. Tests have their own `tsconfig.test.json`, so the app build keeps browser-only types.

**Unit and component tests: 104 in 11 files.**

| Area | File | What is checked (source) |
|---|---|---|
| Pattern thresholds | `utils/patterns.test.ts` | same issue 4 vs 5, same agent 2 vs 3, environment share 50% vs under 50%, minimum sample 9 vs 10, the "7 customers, 5 from one office, 2 by one agent" example, the rolling window (Rules and Definitions, Decision 1; FR-4.6, FR-4.16) |
| Runaway types | `utils/runaway.test.ts` | each of the six types at its day boundaries, priority order, learning order, the fault summary (KB §5, FR-3.1, FR-3.5) |
| Rules | `utils/rules.test.ts` | due-date clocks, including stopping on closed cases; 60-day effectiveness verdicts (effective, partial, failed, too early); mystery-shopper scoring (a critical fail overrides a high score, under 60% is at least medium); capacity (5 people × 1 hour × 20 days = 400, as in the Rules document); critical calls always included; bucketed sampling; the recovery approximation; reason codes |
| Permissions | `auth/permissions.test.ts` | conversation text only for the CX team and CX manager; agent names only for CX and line management; informed-only roles never act; page access per role (KB §2); who may use the assistant (KB §13); every role can open its own home page |
| Session | `auth/session.test.ts` | sample session round-trip, no password stored, corrupt data, storage blocked |
| i18n | `i18n/completeness.test.ts` | every exported bilingual string and every inline `t('en', 'ar')` call (over 100 found) has Arabic |
| Helpers | `lib/lib.test.ts` | relative time and month formatting in both languages; motion durations stay within 150–400 ms; RTL mirroring; status tone and label maps |
| Assistant | `components/ai/assistantEngine.test.ts` | counts match the sample data; different phrasings are understood; it never reveals conversation text to Exec or Marketing; it answers honestly when nothing matches |
| Components | `components/common/components.test.tsx`, `pages/Login.test.tsx`, `components/customers/Timeline.test.tsx` | KpiTile (value, link, button, loading); DataTable (sort, search, empty states, pages, row click); sign-in (role required, home page per role, deep link kept, Arabic); Timeline role gating (call transcripts never shown, even to the CX manager) |

**Coverage** of `src/utils`, `src/lib`, `src/auth`: 97% of statements, 91% of branches, 99% of functions, 98% of lines.

**End-to-end: 13 Playwright tests, about 15 s** against the production build.
- **Sign-in:** a deep link sends you to the login page and back; the session survives a reload; sign-out works; no password field; a role is required; Executive and Mystery shopper land on their home pages; the shopper can't open Actions.
- **Pages:** all 25 routes in English (left to right) and Arabic (right to left), with no console errors and no sideways scroll; live language switch; 375 px width.
- **Behaviour:** the CX manager sees conversation text and the executive doesn't; the assistant answers a question and its button is hidden for team leads; with reduced motion on, nothing slides or scales.

**Bugs found by the tests**
1. **Fixed:** the assistant didn't understand "How many open corrective actions?", only "open actions", although its own help text tells people to ask about open actions. The pattern in `assistantEngine.ts` now accepts both, and there is a test for it.
2. **Resolved in §12 (17 Nov 2026):** the sample data counted signals over all 180 days, while pattern cards say "in 30 days" and the Rules document sets a rolling 30-day window. The sample was reshaped and the window is now on; see §12.1.

## 12. 30-day window, accessibility audit and performance (17 Nov 2026)

### 12.1 Rolling 30-day pattern window (closes §11, bug 2)
- `MOCK_PATTERNS` now calls `detectPatterns(signals, { windowDays: 30 })`, as Rules and Definitions Decision 1 sets.
- The sample was reshaped, not the rule. Changes in `services/mockData.ts`:
  - 90% of problem contacts fall in the last 29 days; the rest stay 30–180 days back.
  - People are weighted towards the largest market: Dubai 42%, Abu Dhabi 24%, Amman 18%, Sharjah 16%. **v40: changed**: the three CRM environments are Dubai, Abu Dhabi and PSI Assets (45, 30, 25%); Amman and Sharjah are gone (section 14).
  - Signal categories skew by place: Dubai towards slow replies, Sharjah towards repeat contacts. The environment-concentration rule exists for exactly this.
- Result: 37 signals, 34 inside the window, and 11 patterns.
  - Same issue: slow replies (19 signals) and repeat contacts (12) both reach the minimum sample of 10.
  - Environment concentration: Dubai and Sharjah.
  - Same agent: 7 patterns, all below the minimum sample.
- That gives **4 corrective actions** in four different states: proposed, in progress, 60-day check and partial. The 60-day verdicts still match each status.
- Older history stays: 120 interactions, 77 of them older than 30 days.
- Three new unit tests check the sample:
  - every pattern's signals are inside 30 days;
  - 4–6 actions exist across at least 3 states, each from a pattern with the minimum sample;
  - older history is kept.
- Visible side effect: most signals now sit in the last month, so "Signals by month" on Home rises sharply in Oct–Nov. This is sample data only.

### 12.2 Accessibility
`@axe-core/playwright` 4.14.0 (pinned dev dependency) runs `e2e/a11y.spec.ts`. Tags are WCAG 2.0/2.1 A and AA. It scans all 25 routes in English/Arabic × light/dark (100 scans), the login page in the same four combinations, the open assistant sheet, and an open form dialog. A scan fails on any serious or critical violation. Scans wait for animations to settle, so contrast is measured on the final frame, not mid-fade.

| | Before | After |
|---|---|---|
| Tests failing | 105 of 106 | 0 of 106 |
| `label-content-name-mismatch` (serious, WCAG 2.5.3) | 304 nodes | 0 |
| `color-contrast` (serious) | 172 nodes\* | 0 |
| `scrollable-region-focusable` (serious) | 1 | 0 |
| Violations of any impact, all 100 route scans | — | **0** |

\*Most of the 172 were scans taken mid-fade. The genuine ones were two:
- inactive tab labels at 3.9:1 (`ui/tabs` used `text-foreground/60`, now `text-muted-foreground`);
- the sample-size labels on the Overview heat map, which were set at 80% opacity.

Name mismatches fixed:
- the language button now has no `aria-label`; its accessible name is the visible language name plus a hidden hint;
- the account button now uses `sr-only` text in place of an `aria-label`;
- the sidebar logo link's `aria-label` is removed, so its name is the visible "PSI CX Portal".

**Keyboard-only pass (`e2e/keyboard.spec.ts`, 6 tests).** It covers the skip link, sidebar links with Tab and Enter, tabs with the arrow keys, table sorting with Enter (`aria-sort` cycles), the form dialog (focus trapped, Escape closes, focus returns), and the assistant (opened by keyboard, answers, Escape, focus returns). It found two real bugs:
1. **Focus was lost after closing any dialog or sheet.** Radix returns focus only to a `DialogTrigger`, and every dialog here is opened from state, so focus fell to `<body>`. The new `ui/use-restore-focus.ts`, used by `ui/dialog` and `ui/sheet`, remembers what had focus when the dialog opened and returns focus there (WCAG 2.4.3).
2. **Every table cell remounted on any page re-render.** TanStack's `flexRender` treats a `cell` function as a component type, and pages rebuild their columns on each render. The Call button was replaced while its dialog was open, which also wasted render work. `DataTable` now calls `cell` and `header` renderers directly; none use hooks, which was checked by a scan.

### 12.3 Performance
Lighthouse 13.6.0 in headless Chromium against `vite preview`, signed in as CX manager. Desktop and mobile presets (mobile uses 4× CPU throttling). Before is one run; after is the median of three. Accessibility and Best Practices were already 100 and stay 100 on every page.

| Page | Desktop before → after | Mobile before → after | Mobile TBT before → after |
|---|---|---|---|
| Login | 100 → 100 | 88 → 90 | 470 → 400 ms |
| Home | 98 → 99 | 75 → 75–88\* | 1,060 → 300–990 ms\* |
| Customers | 99 → 99 | 84 → 88 | 550 → 450 ms |
| Actions / Signals | **80 → 99** | 75 → 73 | 970 → ~1,000 ms |

\*Mobile Home measured 87–88 (TBT about 300 ms) in six standalone runs, and 75 when measured straight after the Login run. Throttled mobile numbers swing with machine load, so treat them as ranges. CLS is 0–0.005 everywhere.

What changed:
- **Fonts are self-hosted.** The render-blocking Google Fonts stylesheet and its third-party requests are gone. There are 10 woff2 subsets in `public/fonts`, about 300 KB in all; each page loads only the weights it uses. Latin 400/600 are preloaded, and Arabic only for Arabic sessions.
- **The sample data loads in its own chunk.** `services/mockStore.ts` holds it, and every repository call awaits it, so the swap-to-API seam is unchanged. A build plugin preloads the chunk from the HTML, so it still downloads alongside the entry. Initial entry JS went from **212.4 to 187.5 KB gzipped**; the 22 KB data chunk downloads in parallel and runs off the first task.
- **Lighter rendering:**
  - Count-up numbers write to the DOM directly, with no React re-render per frame.
  - Arriving query data renders in a time-sliced transition (`notifyManager` → `startTransition`).
  - Charts mount after first paint inside `DeferredRender`, in a space already reserved for them.
- **Route chunks prefetch on hover or focus of a sidebar link.** An idle prefetch of every page was tried and removed, because importing runs module code and added blocking time.
- **An early inline script** sets `lang`, `dir` and the theme before first paint. This avoids a light-mode flash and a left-to-right jump for Arabic users.

**Remaining:** on throttled mobile, Actions / Signals still has about 1 s of TBT. That is React rendering 11 pattern cards, KPI tiles, an area chart and a table in one view. The next step would be virtualising or collapsing the pattern list, which is a design decision, so it is left as is.

## 13. Partial and deferred items closed (18 Nov 2026)

Pass I closed the five rows of `docs/FIDELITY_REVIEW.md` still marked Partial (every row there now reads Done) and the three items deferred after pass F.

| Item | Source | What was built |
|---|---|---|
| "?" on headings | KB §14 | The existing `TermHelp` popover now sits beside page titles (`PageHeader term`) and 22 section headings, plus the shopper-case visit score and respond clock. Keyboard accessible, both languages. |
| AI Insights → proposed action | KB §6, prototype `SIM` | Insights use the prototype's six categories. Each shows its suggested actions with the recovery sentence, a bar and a small-sample warning under 10. CX manager and CX team can make one a *proposed* corrective action (kind and receiver title editable; a title naming top management is refused in the form and in the mutation). Corrective actions show "From AI Insights" with the figure. |
| Recovered rule | Rules and Definitions, Decision 3 | `recoveryStatus()` implements the 60-day window, "too early", the four recovery events, and silent / detractor / cancel / runaway. Re-surveys count as a rating event. Close the loop shows a "Recovered within 60 days" panel (rate of closed windows, not recovered, too early) and a per-person status with its reason; the re-survey input follows the instrument's scale. |
| Hand-off rules by signal type | KB §6, prototype `HO_RULE` | Four rules under the hand-offs list on Signals. |
| Settings: launch, HR pool, notices | KB §15, prototype Settings | New sub-page `/settings/admin`. Notices and digests: informed titles per product, digest weekly/daily/off and the immediate alert; CX manager edits, CX team reads; PSI Wallet shown as awaiting decision. |
| Signals on a phone | Pass H known issue | Patterns sorted by closeness to threshold; the first four render, the rest only after "Show all patterns (n)". |

**Sample data.** Detractor items now carry an instrument (NPS, CSAT, CES), an incident date and follow-up events, chosen so every branch of the recovered rule appears once: 6 too early, 3 recovered, 3 not recovered (50%). CSAT and CES detractors start at 1 or 2. AI insights use the six prototype categories with the same number of random draws, so the rest of the seeded sample is unchanged.

**[Proposed] in this pass:** "latest decisive event wins" when both kinds fall in the window; the mapping from shopper checklist categories to AI Insights categories; default receiver titles per kind (pending the escalation matrix); PSI Wallet notices. All listed under Open items in the fidelity review.

**Also fixed.** Shopper-case category names now show in Arabic. Two assistant scroll regions are keyboard-focusable (an intermittent axe finding). Two flaky tests were corrected: the assistant-sheet scan now waits for dialog fades, and the reduced-motion test ignores the 0.01 ms transitions the reduced-motion stylesheet leaves.

**Checks.** `npm run check` green (141 unit tests; lint shows the 3 known fast-refresh warnings). `npm run test:e2e`: 135 passed, twice in a row, including the axe scan of every route (now also `/settings/admin`) and 6 new pass-I tests. Lighthouse mobile, Signals, median of three: Performance 88 → 89, TBT 280 → 260 ms, LCP 3.1 → 3.0 s; Accessibility and Best Practices 100.

**Still open (not decidable here):** escalation matrix cells, funnel stages, standards ownership, 28 vs 33 L&D documents, Marketing access to Surveys, Actions scoping for team lead and HR, brand.


## Final status

The app builds, type-checks, and lints clean (3 long-standing fast-refresh warnings). **v40 update (18 Nov): 610 unit tests in 55 files and 334 end-to-end tests pass (section 14); the figures below are the v38 close.** 107 unit tests and 125 end-to-end tests passed then, and the end-to-end tests include a zero-violation axe WCAG 2.1 AA scan of every route in both languages and both themes, plus a keyboard-only pass. A full click-through across every route, both languages/directions, both themes, and all 12 roles found zero console errors and no visual defects. It is a complete, working, mock-data prototype of the v38 PSI CX Portal IA — ready to view and demo, not yet connected to a real backend.


## 14. The v39/v40 pass (18 Nov 2026): foundation, three workstreams, integration

Analysis: `docs/V40_DELTA.md` (36 features, F01 to F36). Contract: `docs/V40_FOUNDATION_API.md`. What each workstream built, left and asked for: `V40_WS_A.md`, `V40_WS_B.md`, `V40_WS_C.md`. Owner decisions of 18 Nov: `DECISIONS-2026-11-18.md`. Feature-by-feature status with code and test: `FIDELITY_REVIEW.md`, section "v40 features". Everything is sample data; nothing is committed by hand (the hourly task does it).

### 14.1 Who built what

| Stage | Scope | Result |
|---|---|---|
| Foundation | types, data files, utilities, hooks (environment switch, rules, indicators, brief, inbox, trace, matrix, feeds, mapping, questions, weekly sample), the shared primitives (`StepStrip`, `NextBox`, `TraceId`, `AgentChip`, `DayChip`, `ProposedBadge`), menu and redirects, role permissions, nine stub pages, sign-in with six main roles | 355 unit tests in 29 files, 188 e2e at hand-over |
| A | Home rebuilt, six-step line, indicators per product, "New here", Your work today, Daily brief (Agent 9), My inbox, "Data as of" bar and environment switch, sign-in polish, demo role switch, Arabic agent chips, Agent 9 text | `V40_WS_A.md` |
| B | Trace card and signal dialog, ids on rows, Rules pointer, What if, hand-offs folded, audit trail, escalation matrix per product, investigation result, next-step box on fixes | `V40_WS_B.md` |
| C | Customers tabs and list with export, consent and DNCR, feeds, CRM mapping, survey questions, public mentions, weekly sample, skipped-survey reasons, Close the loop calling rules, Surveys under Settings | `V40_WS_C.md` |
| Integration (this section) | the failing and stale tests, the carry-over fixes below, the contrast flake on the sign-in page, the full e2e run, the docs | below |

### 14.2 Integration pass: what was fixed

| # | Fix | Where |
|---|---|---|
| 1 | The stub-marker test is replaced by "no `FOUNDATION STUB` marker is left" (every loader still resolves); the markers are removed; test timeouts are 20 s and `findBy`/`waitFor` wait 5 s, so a busy worker does not fail a test | `routes/pages.test.ts`, `vitest.config.ts`, `src/test/setup.ts` |
| 2a | `dayChipLabel` agrees: "1 day left", "1 working day late"; Arabic singular (يوم واحد), dual (يومان, يومين), plural 3 to 10 (أيام), accusative from 11 (يوماً) | `utils/inbox.ts` `daysPhrase` |
| 2b | "No answer": an AI campaign row hands over to a person after `aiNoAnswers` (2, no WhatsApp from the campaign), a CX list row after `callTries` (3, WhatsApp); the row line reads the right limit; the seed follows each row's limit; an inbox row handed over names the CX team | `utils/callSchedule.ts`, `useRecordNoAnswer`, `services/mockData.ts` |
| 2c | `MappingRow.confirmed?`: the page clears a row's `[Proposed]` when confirmed; "Confirm" per row for the CX manager and the Internal Audit and Marketing Lead (`useConfirmMapping`); a changed value takes the confirmation back; data default unconfirmed | `types/v40.ts`, `pages/settings/CrmMapping.tsx` |
| 2d | `useDetractorCallItems()` returns copies, not the register | `services/queries.ts` |
| 2e | Timeline rows are anchors (`id="EV-12"`, `data-ev`); `?ev=` highlights, scrolls, focuses (visible focus ring) and announces politely (an `aria-live` region without `role="status"`, because the e2e "page ready" check treats `role="status"` as a loading indicator) | `components/customers/Timeline.tsx` |
| 2f | `<LandingBrief roles={[...]} />` (the Daily brief) on the L&D page, the HR team page, the Overview for the Internal Audit and Marketing Lead and the fixes tab (the landing of `/actions`) for the HR specialist; shows to those roles only, links filtered by `canAccessPath` | `components/home/LandingBrief.tsx` |
| 2g | Owner titles are bilingual through a lookup (`ownerTitle(owner)` in `data/ownerTitles.ts`: roles, matrix defaults, default receiver per kind, assistant plan owners, "Direct manager (X environment manager)"); `CorrectiveAction.owner` stays a string; free text passes through | fix card, inbox, Monthly pack |
| 2h | Stale text: `services/envScope.ts` comment, `WEEKLY_SAMPLE_COPY.namesNote` (the rule is `canViewCustomerNames`), the dialog and sheet close label bilingual (`إغلاق`), `ESCALATION_ROWS` and `ESCALATION_COLUMNS` removed | various |
| 2i | `useFixDue` returns the stored date for a fix past the proposal (source `recorded` when it has none) and a preview only before; `createActionFromPattern` stamps the due date from the matrix itself (the dialog no longer passes it) | `queriesV40.ts`, `queries.ts`, `fixClockStore.ts` `dueFromMatrix` |
| 2j | Signal dialog severity or source chip: not added, `Signal` has neither field (stated gap) | none |
| 2k | "Confirm default" per unedited matrix cell for the CX manager and the Internal Audit and Marketing Lead: clears the cell's `[Proposed]`, `MatrixRow.confirmed` keeps who and when (a role title), an edit takes it back | `EscalationMatrix.tsx`, `useConfirmMatrixCell` |
| 2l | The fix cards fold their details (lifecycle, matrix line, classification, AI panel, audit trail, Trace card) behind a "Details" button (`aria-expanded`, keyboard); the first card and the `?fix=` one are open; "Expand all" and "Collapse all"; the next-step box and the header always show | `FixCard.tsx`, `Corrective.tsx` |
| 3 | The sign-in contrast failure seen once was a mid-fade frame: the brand panel's entrance is JS-driven and sits in a `section` beside `<main>`, which the helper did not wait for. The four theme and language scans now wait for it; no colour changed. 40 repeated runs green | `e2e/helpers.ts`, `e2e/a11y.spec.ts` |

### 14.3 Checks

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` | the 3 known react-refresh warnings only |
| `npm run test` | 610 tests in 55 files |
| `npm run build` | green |
| `npm run test:e2e` (default port 4321, fresh build) | 334 of 334 passed; new spec `e2e/v40-integration.spec.ts` |

Counts over time: 141 unit and 135 e2e at the v38 close (pass I); 355 and 188 after the foundation; 610 and 334 now. With ten parallel browsers (Playwright's default on this 20-core machine, beside several dev servers) four or five tests per run stalled on a page stuck at "Loading…" and passed alone; `playwright.config.ts` now caps the workers at 6 (`E2E_WORKERS` overrides it), and the full suite is green at 6.

### 14.4 Decisions of 18 Nov applied

| # | Decision | Built as |
|---|---|---|
| 1 | Working week Monday to Friday | `rule_working_days` `[1,2,3,4,5]`, no badge; `utils/workingDays.ts` |
| 2 | One escalation matrix per product, a row per fix kind (eight kinds, two case types) | `EscalationMatrix.tsx`; per-category template removed; per-cell `[Proposed]` and "Confirm default" |
| 3 | A fix's due date from the matrix "Resolve (h)" in working hours from approval; 14 days when the cell is empty; 5-working-day approval window; 60-day check from "done" | `utils/fixClock.ts`, `fixClockStore.ts`, `useFixDue`, `createActionFromPattern` |
| 4 | Public replies are Marketing's, 48 h, CX watches the clock | `PublicMentions.tsx`, `usePublicReplyBreaches`, brief line |
| 5 | Calling 09:00 to 18:00 UAE, 3 attempts for the CX list, WhatsApp after the last; 2 no-answers for an AI campaign | `utils/callSchedule.ts` (per row since the integration pass), note "Legal to confirm the hours", no badge |
| 6 | Weekly sample: 50 by Thursday, no names to Internal Audit, a wrong lowers the pass rate and becomes a supervisor test | `WeeklySample.tsx`, `utils/passRate.ts`, `canViewCustomerNames` |
| 7 | The environment switch narrows everything, the call list included; exports show mobiles only to roles that see names | `utils/envScope.ts`, `peopleCsvRows` |

### 14.5 Still `[Proposed]` in the UI

| Item | Badge |
|---|---|
| Matrix cells still at their default | per cell (confirm with "Confirm default") |
| CRM mapping rows | per row (confirm with "Confirm") |
| Survey wording for PSI Club, Tour Estate, PSI Events | per set |
| Daily brief line set per role | on the brief card |
| Pass-rate formula of the weekly sample | on the pass-rate card |
| Not badged, still proposed | counts under the six steps; "Most urgent" wording; which indicator cards a role with a product sees; the report line RP only for effective or failed fixes; consent flags (tooltip); KPI colour thresholds; customer types; role page deltas (F35) |

### 14.6 Known gaps

| Gap | Note |
|---|---|
| No severity or source chip on the signal dialog | `Signal` has neither field |
| No verdict buttons (effective, partial, failed) on a fix | Agent 6's call; only the seeded verdicts exist |
| Matrix and mapping edits live in the session | as in the prototype; the matrix keeps a confirmation stamp, edits are not audited |
| The Arabic titles of the matrix, the owner lookup and the new copy | written for this build, need native review |
| The inbox is a table that scrolls sideways on a phone, not cards | F34 asked for scroll |
| "Due" dates use the browser locale format | |
| Radix Select cannot be driven in jsdom | the environment switch is proved in e2e |
| Mapping "unmapped values" queue | the page shows rows set to Ignore; no list of unseen values (no data) |
| Home shows each live product's card to roles without a product (CX, Executive, Marketing) | one line in `pages/Home.tsx` if Marketing should not read NPS there |
| Ten parallel e2e workers can starve on a busy machine | the config caps them at 6, see 14.3 |
