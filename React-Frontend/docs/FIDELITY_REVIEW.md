# Fidelity review against the v38 sources (17 Nov 2026), and against v40 (18 Nov 2026)

> **18 Nov 2026 (v39/v40 pass).** Rows below marked **v40: changed** were built to v38 and are now different; the 36 v40 features (F01 to F36) have their own table at the end (section "v40 features"). The v38 counts and statuses in this file are as of 17 Nov and are not re-counted. Owner decisions of 18 Nov: `DECISIONS-2026-11-18.md`.

Sources, in priority order: `Documents/PSI-CX-Portal-Knowledge-Base-Modules.md` (KB), `Documents/PSI-CX-Programme-Knowledge-Base.md` §28–43 (PKB), the Rules / AI Agents / Journey texts, the two decks, and the v38 prototype export `Documents/PSI CX Portal.html` (proto). Status is **before → after** this pass. Done = built as specified; Partial = built, part missing; Missing = not built; Differs = built, but not as the source says.

Totals before: 52 Done · 22 Partial · 21 Missing · 9 Differs (104 requirements).
Totals after: 93 Done · 9 Partial · 0 Missing · 0 Differs; 2 moved to Open items.
After pass I (18 Nov 2026): the five rows still Partial after pass F ("?" on headings, hand-off rules, AI Insights → proposed action, recovered, Settings) are Done, so every row in the tables below now reads Done. The pass F totals line above also counted items that are not rows here; those that depend on a decision are tracked under Open items, with visible [Proposed] / awaiting-decision placeholders in the UI.

## Sitewide

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Each role sees only its own pages (1 to 5), CX manager full view | KB §2 | Missing → Done | `auth/access.ts`: role page sets from the §2 table; sidebar, Settings sub-nav and an `AccessGuard` redirect to the role's home. **v40: changed** (F35): My inbox, Overview, feeds, mapping, matrix, questions, sample, public mentions added per role; Marketing and Internal Audit and Marketing Lead homes moved (`/home`, `/overview`) |
| Assistant button for CX, Marketing, executives, environment managers only | KB §13 | Differs → Done | Hidden for other roles |
| "?" beside metrics and headings; "What the terms mean" button on every page with search | KB §14 | Missing → Partial → Done | Button on every page (PageHeader); "?" on page titles and section headings across the app (pass I: 22 headings and the shopper-case score and clock), wired to the glossary |
| Glossary terms with what / how calculated / example (NPS, CSAT, CES + §14 table) | KB §14 | Partial → Done | 12 terms added, NPS/CSAT/CES rewritten |
| Not-launched products out of menu and filters | KB §16 | Done | Products group in the sidebar shows live products only |
| Bilingual EN/AR with RTL for every new string | CLAUDE.md | Done | All new strings have Arabic |

## Home (KB §3)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| One search box: name, mobile, ID or unit opens the person | §3 | Partial → Done | Also Emirates ID and CRM id |
| A question in your own words goes to the assistant | §3 | Missing → Done | 3+ words or "?" opens the assistant with the question asked |
| Example requests | §3 | Missing → Done | Three chips, assistant roles only |
| Five live numbers, each a button | §3 | Done | Links only where the role may go. **v40: changed** (F01 to F06): the five tiles, "Needs attention", the signals chart and the patterns list left Home; Home is header with the six steps, Daily brief, "New here", indicators per live product, Your work today, the one search |
| Marketing / env manager limits | §3 | Partial → Done | Links and "Needs attention" gated by role. **v40: changed**: the same limits now apply to the step counts, the brief lines and the indicator cards (`utils/brief.ts`, every link through `canAccessPath`) |

## Customers (KB §4)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| CRM profile, VIP tag, four effort tiles, AI reading in four parts | §4 | Done | |
| Timeline: source badge, who started it, reason, outcome, promise with its due time, text where allowed, problem highlights | §4 | Partial → Done | Outcome and promise due time added. **v40: changed** (F12): every row has an `EV-n` anchor and tag, one `SG-n` button per signal it produced, and `?ev=` highlights, focuses and announces the row |
| Interview and re-survey events on the same timeline | §4, §7 | Missing → Done | Recorded from Close the loop |
| Journey rules (nine) | §4 | Done | |

## Runaway customers (KB §5)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Six types, counters, "what we keep doing wrong", detail with journey button, learning order, env scoping | §5 | Done | Classification is a best-effort rule on mock fields (see Open items). **v40: changed** (F17): the page is "Who is leaving", a tab of Customers; people names follow `canViewCustomerNames` |
| Thresholds are settings | §5 | Done | Rules → Other thresholds |

## Actions (KB §6)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Register: proposed, open, late, effective | §6 | Missing → Done | Four tiles |
| Flow incl. reject with reason or send to investigation first | §6, §11 | Partial → Done | "Investigate first" decision requests five interviews |
| Classification block: kind, path, receiver, what comes back | §6 | Partial → Done | Sample owners now follow the kind (Legal for legal, L&D for training gap…). **v40: changed** (F22): the receiver also reads the matrix of the fix's product ("From the matrix" line); owner titles are bilingual (`data/ownerTitles.ts`); the fix cards fold their details |
| "How the AI found this" on every action and every pattern card | §6 | Partial → Done | Added to pattern cards with the action it already has |
| L&D sees only training-gap actions; env manager only its environment | §15, §2 | Missing → Done | |
| Signals: counted, thresholds, public badge, 48h clock, hand-offs | §6 | Done | **v40: changed** (F12, F16, F19, F32): hand-offs folded under the fixes tab, a signals table with `SG-n`, the Rules pointer and "What if"; patterns compute from the rules (stable `PT-nnn`) |
| Hand-off rules by signal type | §6 | Partial → Done | Pass I: the four rules transcribed from the v38 prototype (`HO_RULE`) under the hand-offs list |
| AI Insights: recovery figure in full, bar, small-sample warning, percentages panel, "Send to a case" same category only, two-registers note | §6 | Done | |
| AI Insights suggestions become proposed corrective actions | §6 | Partial → Done | Pass I: suggested actions and recovery figures transcribed from the prototype (`SIM`), each with bar and small-sample warning; CX makes one a *proposed* action (receiver a title, never top management); shows "From AI Insights" on Corrective actions |
| Shopper cases: three severities, clocks, numbered actions, HR pool, direct manager review | §6 | Done | |
| Investigations: weak signals, five interviews or a shopper check form (environment, scenario, what to look for) | §6 | Partial → Done | Form added with validation |

## Close the loop (KB §7)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| List, critical first, capacity = people × hours × 4 × days | §7 | Done | **v40: changed** (F27): calling hours, attempts per row (3 for the CX list, 2 no-answers for an AI campaign), "No answer", "Needs a human", a DNCR person never listed |
| Brief by Agent 8 from the timeline, four questions | §7 | Partial → Done | Brief added |
| Reason codes (the ten in §7) | §7 | Differs → Done | Replaced with the KB list, in order |
| Reason code suggested from the timeline; outcome; notes; re-survey date | §7 | Partial → Done | |
| Reason shown on the list | §7 | Missing → Done | |
| Recovered = 4/5, promoter/passive, transaction, renewal, new lead or clean contact | §7 | Partial → Done | Pass I: the full Decision 3 rule (60-day window, "too early", silent / detractor / cancel / runaway); sample items carry instrument, incident date and follow-up events; recovery rate and delta on Close the loop |
| AI campaigns: segment, script EN/AR, hand-off rules, critical never in a campaign | §7 | Partial → Done | Hand-off rules shown in the form |
| Campaign results as reason codes; people handed to a human | §7 | Missing → Done | |

## Personas and campaigns (KB §8)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Six personas: who, main pain, channels as in the §8 table | §8 | Differs → Done | Seed replaced with KB/proto text (Wallet added to investor and portfolio owner, PKB §35) |
| Recommendation: who, channel and when, campaign type, what not to do, segment size; ranked next campaign | §8 | Partial → Done | Proto recommendations transcribed |
| CX manager approves; Internal Audit and Marketing Lead audits; aggregated only | §8 | Done | |
| Campaign briefs saved for Marketing (from the assistant) | §13 | Missing → Done | Shown on this page |

## Surveys and triggers (KB §9)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Lead funnel 9,000 → 150, source split, why they stopped | §9 | Done | **v40: changed** (F18, F25): the page is under Settings (`/settings/surveys`, `/surveys` redirects) and skipped surveys state the reason (six reasons) |
| Funnel stages marked [Proposed] until Marketing confirms | PKB §39/§43 | Missing → Done | |
| "When we ask" table incl. enquiry (reach index, no survey) | §9 | Partial → Done | Enquiry row added |
| Instruments with sent / answered / skipped; Agent 10 log | §9 | Missing → Done | Proto sample figures |
| Per product, no group number | §9 | Done | |

## Intelligent CX team (KB §11)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Path every event walks, supervisor between every step, Agent 10 beside Agent 1 | §11 | Missing → Done | |
| Roster: stage (shadow, limited, live, phase 2), pass rate | §11 | Missing → Done | Proto figures |
| Job description in nine fields | §11 | Partial → Done | Inputs, rules, model step, output, supervisor checks, shows on added |
| Supervisor: six checks, verdicts, weekly sample of 50 | §11 | Partial → Done | **v40: changed** (F31): the weekly sample is a page (50 outputs, right or wrong); a wrong lowers the agent's pass rate and adds a supervisor test |
| How it is switched on (shadow, limited, live) | §11 | Missing → Done | |

## Rules as configuration (KB §12)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Five decisions, every number a setting | §12 | Differs → Done | Regrouped by decision; legal-once, drop 50%, hold 90, calls/hour 4, silence 14 added |
| Escalation matrix: template, principles, cells pending | §12 | Missing → Done | Rows: 8 kinds + 2 case types; cells "Pending". **v40: changed** (decided 18 Nov, F22): one table per product with a row per fix kind, editable cells, `[Proposed]` per cell still at its default, "Confirm default"; the per-category template is removed |

## Assistant (KB §13)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| People lists with the reason and "reach via" | §13 | Missing → Done | |
| "Why did X go quiet?", "similar to X" | §13 | Missing → Done | |
| Corrective action plan, created as proposed actions | §13 | Missing → Done | CX team / manager only |
| Campaign brief, saved for Marketing | §13 | Missing → Done | |
| Header says which engine is running | §13 | Missing → Done | "Built-in parser (no connection)" |
| Voice: request runs when you stop | §13 | Partial → Done | |

## Settings and reference (KB §15)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Overview: customers-and-runaways strip, signals-and-actions strip, indicators per product, funnel, reputation index, NPS by month and by channel, heatmap, why detractors | §15, §10 | Partial → Done | **v40: changed** (F08): moved out of Settings to the main menu (`/overview`, "6 · CX indicators"); `/settings/overview` redirects |
| Public reputation index: volume, share negative, Google rating, reply rate and time, per channel | §10 | Missing → Done | Proto sample mentions |
| Standards register: 26 standards M-01–M-26, observe only / draft / approved and scored | §15, PKB §28 | Differs → Done | Transcribed from proto; L&D documents moved to their own list (codes LD-xx) |
| L&D edits the 15 people-facing standards; CX manager approves for scoring | §15 | Missing → Done | |
| L&D page: training-gap actions, requests, complaint types, materials and sessions with coverage, low findings as statistics | §15 | Partial → Done | |
| Teams and structure: titles, authority matrix, routing, what the CRM provides | §15, PKB §28 | Differs → Done | Was "historical only"; rebuilt with roles (§2), routing, CRM fields, HR pool, who is informed |
| Monthly pack, Mystery shopper, VoC, HR team, AI Insights access | §15 | Done | |
| Settings: launch list, HR pool, notices heads receive | §15 | Partial → Done | Pass I: `/settings/admin` holds the launch list, the HR pool and "Notices and digests" (informed titles per product, digest frequency, immediate alert), transcribed from the prototype; CX manager edits, CX team reads |

## Products (KB §16)

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Product page per product with own indicators, website vs app split, "When this product asks" | §16 | Missing → Done | `/products/:id`; Wallet shows its four complaint types |

## Open items (not resolved here)

1. Escalation matrix cells (product owners with the Internal Audit and Marketing Lead, by 28 Nov). **v40: changed**: the layout is decided; every cell shows its default with `[Proposed]` until an owner edits or confirms it.
2. Funnel stages per service — [Proposed] until Marketing confirms (PKB §43.2).
3. Standards ownership: KB §15 says L&D owns the 15 people-facing standards; the proto register lists owners as Sales support lead etc. Both shown ("Owner" + "Edited by L&D").
4. Standards documents: the L&D list states 28 documents; transcription gives 33 rows (kept, flagged).
5. Surveys page roles: KB §1 says CX, product teams and Marketing use it; the §2 table does not list it for Marketing. Followed §2.
6. Teams-lead pool, After-Sales "process, speed and communication", HR specialist "attitude" scoping inside Actions: no pool/product field on actions in the sample data; not scoped beyond page access.
7. Which agent writes AI Insights: the ten agents in the spec do not name one; existing label kept.
8. Real brand colours, logo, environment names, HR pool members, SLA targets (PKB §43.8).

9. Recovered precedence: when a recovery event and a not-recovered event both fall inside the 60 days, the Rules document does not say which wins. Pass I uses "the latest decisive event wins". [Proposed]
10. AI Insights → shopper-case "same category" uses a mapping from shopper checklist categories to the six AI Insights categories. [Proposed]
11. Who is informed for PSI Wallet: the prototype's notices list has no Wallet row; shown as awaiting decision. [Proposed]
12. Runaway inside the recovered rule is supported by the rule but not fed in the sample (runaway types carry no date). [Proposed]

## Deferred

None of the three items deferred after pass F remain: "?" on headings, AI Insights → proposed action and the full recovered rule were completed in pass I (18 Nov 2026).


## v40 features (F01 to F36, 18 Nov 2026)

Source: `docs/V40_DELTA.md` section A. Status is the state after the foundation, workstreams A, B, C and the integration pass. Done = built as the delta says; Done, with note = built, one part is a stated gap or a `[Proposed]` choice. Unit tests are in `src/`, e2e in `e2e/`. What each workstream built and left: `V40_WS_A.md`, `V40_WS_B.md`, `V40_WS_C.md`.

| F | Feature | Status | Code | Tests |
|---|---|---|---|---|
| F01 | Home rebuilt (header with steps, brief, new here, indicators, work today, search) | Done | `pages/Home.tsx`, `components/home/*` | `pages/Home.test.tsx`, `v40-orientation.spec.ts` |
| F02 | Six-step line with a live count per step | Done, with note: the counts are `[Proposed]`, no badge | `components/home/StepLine.tsx`, `common/StepStrip.tsx`, `utils/brief.ts` `stepCounts` | `utils/brief.test.ts`, `common/v40.test.tsx` |
| F03 | CX indicators per live product (NPS, CSAT, CES) with a sentence | Done | `components/home/IndicatorCard.tsx`, `utils/indicators.ts`, `useIndicators` | `Home.test.tsx`, `utils/indicators.test.ts`, orientation spec (one NPS in brief and card) |
| F04 | "?" definitions incl. CES (1 to 5, share 4 or 5) | Done | `data/glossary.ts` | `data/glossary.test.ts` |
| F05 | "New here? Three things to know" (open, remembered closed) | Done | `components/home/StartHere.tsx` | `Home.test.tsx`, orientation spec (reload) |
| F06 | Your work today (same list as My inbox) | Done | `components/home/WorkToday.tsx`, `useInbox` | `Home.test.tsx`, orientation spec |
| F07 | "Where you are, what happens next" box | Done | `common/NextBox.tsx`, `data/steps.ts`; `ActionsLayout`, `FixCard` + `fixNextStep.ts`, `Customers` (`journeyNext`), `CloseTheLoop`, `OverviewPage` | `data/steps.test.ts`, `ActionsLayout.test.tsx`, `fixNextStep.test.ts`, `CloseTheLoop.test.tsx`, `CustomersPages.test.tsx` |
| F08 | Merged menu: six main items in step order, rest under Settings and reference | Done | `data/nav.ts`, `components/layout/*` | `v40-foundation.spec.ts` (EN and AR, per role) |
| F09 | Daily brief by Agent 9, per role; also on the landing page of roles that land outside Home | Done, with note: the line set per role is `[Proposed]` (badge on the card) | `components/home/DailyBrief.tsx`, `LandingBrief.tsx` (mounted on `settings/Ld`, `settings/HrTeamPerf`, `OverviewPage` for Internal Audit and Marketing Lead, `ActionsLayout` fixes tab for the HR specialist), `utils/brief.ts` | `utils/brief.test.ts` (every link for every role), `components/home/LandingBrief.test.tsx`, orientation spec |
| F10 | Trace ids on one chain EV, SG, PT, CA, VR, RP | Done, with note: RP only for effective or failed fixes `[Proposed]` | `utils/trace.ts` | `utils/trace.test.ts` |
| F11 | Trace card on every fix and signal; signal detail dialog | Done, with note: no severity chip (the `Signal` data has no severity or source) | `components/trace/TraceCard.tsx`, `SignalDetailDialog.tsx`, `TraceHost.tsx` | `TraceCard.test.tsx`, `TraceHost.test.tsx`, `v40-trace.spec.ts` |
| F12 | Ids on timeline rows, signal rows, pattern cards; a public mention never links to a person | Done | `components/customers/Timeline.tsx`, `pages/actions/components/SignalsTable.tsx`, `Signals.tsx` | `Timeline.test.tsx` (anchors, focus, live region), `Signals.test.tsx`, `v40-trace.spec.ts` |
| F13 | Data feeds page | Done | `pages/settings/Feeds.tsx`, `data/feeds.ts` | `settings/v40People.test.tsx`, `v40-people.spec.ts` |
| F14 | "Data as of" bar and the environment switch (narrows everything with an environment) | Done | `components/layout/AsOfBar.tsx`, `EnvScopeProvider.tsx`, `services/envScope.ts`, `utils/envScope.ts` | `AsOfBar.test.tsx`, `queriesV40.test.tsx`, `v40-foundation.spec.ts`, orientation spec |
| F15 | CRM mapping page | Done, with note: every row `[Proposed]` until confirmed; "Confirm" per row for the two edit roles (`MappingRow.confirmed`) | `pages/settings/CrmMapping.tsx`, `data/crmMapping.ts`, `useConfirmMapping` | `settings/v40People.test.tsx` |
| F16 | Signals Rules pointer | Done | `components/signals/RulesPointer.tsx` | `Signals.test.tsx`, `v40-trace.spec.ts` |
| F17 | Customers holds search, who is leaving, personas (tabs) | Done | `components/customers/CustomersTabs.tsx`, `pages/Customers.tsx`, `Runaway.tsx`, `Personas.tsx` | `CustomersTabs.test.tsx`, `pages/CustomersPages.test.tsx` |
| F18 | Surveys and triggers under Settings only | Done | `pages/Surveys.tsx`, `data/nav.ts` `LEGACY_REDIRECTS` | `v40-foundation.spec.ts`, `v40-people.spec.ts` |
| F19 | Hand-offs folded under the fixes tab | Done | `pages/actions/components/HandoffsBlock.tsx` | `Corrective.test.tsx`, `passI.spec.ts` |
| F20 | My inbox with day counters | Done | `pages/inbox/Inbox.tsx`, `utils/inbox.ts`, `common/DayChip.tsx` | `pages/inbox/Inbox.test.tsx`, `utils/inbox.test.ts` (singular, dual and plural in both languages), orientation spec |
| F21 | Audit trail on every fix | Done | `pages/actions/components/AuditTrail.tsx`, `utils/audit.ts` | `AuditTrail.test.tsx`, `Corrective.test.tsx` |
| F22 | Escalation matrix per product; the fix reads it; due date from "Resolve (h)" | Done, with note: cells at their default are `[Proposed]` per cell (owners fill by 28 Nov); "Confirm default" per cell for the two edit roles | `pages/settings/EscalationMatrix.tsx`, `MatrixLine.tsx`, `data/escalationDefaults.ts`, `utils/fixClock.ts`, `services/fixClockStore.ts` | `EscalationMatrix.test.tsx`, `fixClock.test.ts`, `queriesV40.test.tsx`, `v40-trace.spec.ts` |
| F23 | Survey questions page per product (EN/AR preview) | Done, with note: PSI Club, Tour Estate, PSI Events sets `[Proposed]` | `pages/settings/SurveyQuestions.tsx`, `data/surveyQuestions.ts` | `settings/v40People.test.tsx` |
| F24 | Consent and DNCR per person | Done, with note: consent flags are sample flags (the tooltip says so) | `components/customers/ConsentRow.tsx`, `consent.ts` | `ConsentRow.test.tsx`, `consent.test.ts` |
| F25 | Skipped surveys state the reason (six reasons sum to the total) | Done | `pages/Surveys.tsx`, `data/v38Reference.ts` `SURVEY_DELIVERY_LAST_MONTH.skippedBy` | `consent.test.ts` (DNCR count), `mockDataV40.test.ts` |
| F26 | Investigation result becomes evidence and proposes a fix | Done | `pages/actions/Investigations.tsx`, `useReturnInvestigation` | `Investigations.test.tsx`, `v40-trace.spec.ts` |
| F27 | Close the loop calling rules (hours, attempts, next working day, WhatsApp after the last; an AI campaign hands over after 2 no-answers) | Done (integration pass: 2 for an AI campaign row, 3 for the CX list; the seed follows each row's limit) | `pages/CloseTheLoop.tsx`, `utils/callSchedule.ts`, `useRecordNoAnswer` | `callSchedule.test.ts`, `CloseTheLoop.test.tsx`, `queriesV40.test.tsx`, `v40-people.spec.ts` |
| F28 | One sign-in with six main roles, the other six folded | Done | `pages/Login.tsx`, `data/roles.ts`, `components/common/RoleSwitch.tsx`, `UserMenu.tsx` | `pages/Login.test.tsx`, `auth.spec.ts`, `a11y.spec.ts` (four combinations) |
| F29 | Customers list with filters and export (mobile column only for roles that see names) | Done | `components/customers/CustomerList.tsx`, `utils/peopleExport.ts` | `CustomerList.test.tsx`, `peopleExport.test.ts`, `v40-people.spec.ts` |
| F30 | Public mentions list with reply status and owner (Marketing; 48 h clock) | Done | `pages/settings/PublicMentions.tsx`, `data/publicMentions.ts` | `settings/v40People.test.tsx` |
| F31 | Weekly sample page (50 outputs; a wrong lowers the pass rate and becomes a test) | Done, with note: the size of the drop is `[Proposed]` (badge on the pass-rate card only) | `pages/settings/WeeklySample.tsx`, `utils/passRate.ts`, `useJudgeSample` | `settings/v40People.test.tsx`, `passRate.test.ts`, `queriesV40.test.tsx` |
| F32 | "What if" on the thresholds | Done | `components/signals/WhatIfCard.tsx`, `utils/patterns.ts` `whatIf` | `WhatIfCard.test.tsx`, `patterns.test.ts`, `v40-trace.spec.ts` |
| F33 | Arabic on agent chips | Done | `common/AgentChip.tsx`, `pages/actions/components/HowAiFoundThis.tsx`, `pages/IntelligentCxTeam.tsx` | `IntelligentCxTeam.test.tsx`, `common/v40.test.tsx`, orientation spec |
| F34 | Tables scroll on mobile | Done | `components/ui/table.tsx` | `v40-people.spec.ts` (12 pages x EN and AR at 375 px) |
| F35 | Role and page permission changes | Done, with note: derived from the code, the owner has not confirmed them (the Internal Audit and Marketing Lead opens Customers) | `auth/access.ts` `ROLE_PATHS`, `auth/permissions.ts` | `auth/permissions.test.ts` |
| F36 | Agent 9 text | Done | `data/agentRegistry.ts`, `data/v38Reference.ts` | `data/agentRegistry.test.ts`, orientation spec |

Counts: 36 features, 36 Done; 10 of them carry a stated note (F02, F09, F10, F11, F15, F22, F23, F24, F31, F35).

Integration-pass changes that touch several rows: owner titles bilingual on every fix (`data/ownerTitles.ts`); `dayChipLabel` agrees for one, two, few and many; the fix cards fold their details (the first and the `?fix=` one open, "Expand all"); `?ev=` on the timeline focuses the row and announces it; the sign-in page's contrast flake was a mid-fade frame of the brand panel's entrance, fixed in the test helper, not in a colour; `useFixDue` returns the stored date past the proposal and a preview only before; `createActionFromPattern` stamps the due date from the matrix itself; the dialog close label is bilingual.

### v40 open items (not decided by the owner)

| Item | Where it shows | Note |
|---|---|---|
| Matrix cells at their default (50 per product) | `[Proposed]` on each cell | Owners fill by 28 Nov; "Confirm default" records a confirmation |
| CRM mapping rows | `[Proposed]` per row until "Confirm" | CRM owner |
| Survey wording for PSI Club, Tour Estate, PSI Events | `[Proposed]` on the set | Product owners |
| Brief line set per role; counts under the steps; "Most urgent" wording; which Home cards a role with a product sees | Badge on the brief card only; the rest unbadged | Owner's yes |
| Pass-rate formula of the weekly sample | `[Proposed]` on the pass-rate card | How much a wrong lowers it |
| Report line RP only for effective or failed fixes | none | Foundation 1b |
| Severity and source of a signal | not shown (no field in the data) | Add `Signal.severity` to show the chip |
| Calling hours | small note "Legal to confirm the hours", no badge | Legal |
| Role page deltas (F35) | none | Owner to confirm, in particular Customers for the Internal Audit and Marketing Lead |

## v40.1 to v42.4 features (19 Nov 2026)

Sources: `docs/V41_DELTA.md` (F28, F29), `docs/V42_DELTA.md` (F30 to F35), the prototype blocks `v40.1` to `v42.3` in `PSI CX Portal.html`, and the owner's decisions in `docs/DECISIONS-2026-11-19.md`. Status key as above. What each piece built, chose and left open is in its own document (last column).

| F | Feature | Status | Code | Tests | Document |
|---|---|---|---|---|---|
| v40.1 | The 60-day check is closed by a person: three verdicts; a partial or failed fix asks for a second step, an investigation first, or is accepted as is | Done, with note: the second step is created by the CX role (no owner-side screen); "did not return for 90 days" is the person's to judge | `pages/actions/components/FixVerdict.tsx`, `services/fixVerdictQueries.ts`, `utils/fixVerdict.ts`, `lib/status.ts` | `FixVerdict.test.tsx`, `fixVerdictQueries.test.tsx`, `fixVerdict.test.ts`, `e2e/v401-verdict.spec.ts` | `V401_VERDICT.md` |
| v40.1 | The automatic readout beside the check follows the 50% rule (`rule_effective_drop`) | Done, with note: the line between partial and failed is "any drop" `[Proposed]` | `utils/effectiveness.ts`, `utils/ruleValues.ts` | `utils/rules.test.ts` | `UI_2026-11-19.md` section 7 |
| F28 | Guided tour on first entry per role; replay from the menu | Done, with note: Marketing has 6 steps, not 7 (it cannot open `/overview` here); the frame is white, not gold | `components/tour/*`, `data/tours.ts` | `tours.test.ts`, `TourProvider.test.tsx`, `placement.test.ts`, `tourStorage.test.ts`, `e2e/v41-tour.spec.ts` | `V41_TOUR.md` |
| F29 | Weekly sample rows show what the agent saw, what it produced, the supervisor line; Open for CX roles | Done; now the list view behind "See all as a list" (F34) | `utils/sampleEvidence.ts`, `pages/settings/WeeklySample.tsx` | `sampleEvidence.test.ts`, `v40People.test.tsx`, `e2e/v40-people.spec.ts` | `V42_SAMPLE.md` |
| F30 | Escalation matrix: the cells of 19 Nov for six products, a data-exposure row, the VIP rule, three rules card | Done, with note: the VIP row is read-only; an edited cell is marked "Edited" | `data/escalationDefaults.ts`, `utils/vipClock.ts`, `utils/matrixFormat.ts`, `pages/settings/EscalationMatrix.tsx`, `pages/actions/components/MatrixLine.tsx` | `escalationDefaults.test.ts` (the document cell for cell), `vipClock.test.ts`, `matrixFormat.test.ts`, `e2e/v42-matrix.spec.ts` | `V42_MATRIX.md` |
| F31 | "Watch the AI team work": one message replayed through nine steps, this week's counters, what the page will not show | Done, with note: the two team-lead roles do not get the page (they cannot open the agents page here) `[Proposed]` | `pages/settings/WatchTeam.tsx`, `data/watchTeam.ts`, `hooks/useWatchReplay.ts`, `utils/watchCounters.ts` | `WatchTeam.test.tsx`, `watchTeam.test.ts`, `useWatchReplay.test.ts`, `e2e/v42-watch.spec.ts` | `V42_WATCH.md` |
| F32 | Weekly sample split by reader: content rows to the CX roles (26), audit rows to the Internal Audit and Marketing Lead (35) | Done, with note: CA-201 is caught by a kind check, since its receiver matches the matrix `[Proposed]` | `utils/sampleCards.ts`, `services/weeklySampleBuild.ts`, `auth/permissions.ts` (`sampleReaderOf`) | `sampleCards.test.ts`, `passRate.test.ts`, `mockDataV40.test.ts`, `e2e/v42-sample.spec.ts` | `V42_SAMPLE.md` |
| F33 | Campaign audit: five checks before a campaign runs, cleared or sent back, numbers after the run; nothing starts before clearance | Done, with note: clearing needs all five checks passed (the prototype lets either verdict be pressed any time) `[Proposed]`; the sample results of four campaigns are invented | `pages/settings/CampaignAudit.tsx`, `data/campaignAudit.ts`, `services/mockCampaignAudit.ts`, `components/campaigns/CampaignGate.tsx` | `CampaignAudit.test.tsx`, `mockCampaignAudit.test.ts`, `campaignAuditQueries.test.tsx`, `CampaignGate.test.tsx`, `e2e/v42-campaign-audit.spec.ts` | `V42_CAMPAIGN_AUDIT.md` |
| F33 | The Internal Audit and Marketing Lead audits and never approves a fix (decision 2) | Done: React already matched; pinned by tests | `auth/permissions.ts`, `data/roles.ts` | `permissions.test.ts`, `e2e/v42-campaign-audit.spec.ts` | `V42_CAMPAIGN_AUDIT.md` |
| F34 | Weekly sample as a card flow in plain words: what the AI was given, what it decided, one question, three answers | Done, with note: the Executive reads the list only | `pages/settings/SampleCardFlow.tsx`, `sampleParts.tsx` | `v40People.test.tsx`, `e2e/v42-sample.spec.ts` | `V42_SAMPLE.md` |
| F35 | PSI Wallet: four question sets, "When this product asks", the "Signals, no survey" card | Done, with note: the Wallet's CES is 1 to 7 while every calculation stays on 1 to 5; the KB's own additions show without a badge, as in the prototype | `data/surveyQuestions.ts`, `data/v38Reference.ts`, `pages/ProductPage.tsx` | `walletSurveyMoments.test.ts`, `ProductPage.test.tsx`, `e2e/v42-wallet.spec.ts` | `V42_WALLET.md` |

Interface requests of the same day (the open sidebar, the frame margin, glass, the switches, the logo): `UI_2026-11-19.md`.

### Open items raised by this pass (for Manaf; none resolved here)

| Item | From |
|---|---|
| Marketing-kind fixes list the Internal Audit and Marketing Lead as first receiver in five of six matrices, but the role has no Actions page and never approves a fix | `V42_CAMPAIGN_AUDIT.md` |
| Is Marketing's persona campaign started in the portal, or only recorded? | `V42_CAMPAIGN_AUDIT.md` |
| "Send back to Marketing" is the wording for an AI interview campaign too, whose owner is the CX team | `V42_CAMPAIGN_AUDIT.md` |
| Which answers count as "easy" on the Wallet's 1 to 7 CES scale | `V42_WALLET.md` |
| The KB's own Wallet refinements and the signals card (Claude's additions in KB section 48): confirm, or badge `[Proposed]` | `V42_WALLET.md` |
| The daily brief line and inbox row for the sample exist for the Internal Audit and Marketing Lead only; the Modules KB says "each reader" | `V42_SAMPLE.md` |
| The partial/failed line of the 60-day readout | `UI_2026-11-19.md` |
